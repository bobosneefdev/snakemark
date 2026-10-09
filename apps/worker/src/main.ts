/**
 * Daily leaderboard run: benchmark every free model we haven't scored yet on the fixed settings,
 * then rewrite packages/core/results.json. Models that error (rate limit, outage) are skipped and
 * retried on the next run; only real answers and timeouts are recorded.
 */
import { BunRuntime, BunServices } from '@effect/platform-bun';
import { Config, Duration, Effect, FileSystem, Option, Redacted, Result, Schema, Semaphore } from 'effect';
import { FetchHttpClient, HttpClient } from 'effect/http';
import { ChildProcess, ChildProcessSpawner } from 'effect/process';
import { buildPrompt, decodeSeed, generate, grade, parse, simulate, solve, SETTINGS } from '@snakemark/core';
import { decodeResults, entryKey, Results, type Entry, type Provider } from '@snakemark/core/results';
import { Catalog, candidates, readEvents, type Candidate } from './opencode';
import { runSandboxed } from './sandbox';

const RESULTS = Bun.resolveSync('@snakemark/core/results.json', import.meta.dir);
const CATALOG_URL = 'https://models.opencode.ai/api.json';

const main = Effect.gen(function* () {
	// Private on purpose: the site discloses the settings but never the seed, so nobody can regenerate the
	// board and tune against it. Comes from the LEADERBOARD_SEED repo secret; never log or commit it.
	// Changing it makes stored results incomparable, so reset packages/core/results.json too.
	const seed = Number(Redacted.value(yield* Config.Redacted('LEADERBOARD_SEED')));
	if (Result.isFailure(decodeSeed(seed))) return yield* Effect.die('LEADERBOARD_SEED must be an integer from 0 to 2^32 - 1');
	const game = generate({ ...SETTINGS, seed });
	const prompt = buildPrompt(game);
	const play = (response: string) => {
		const parsed = parse(response);
		return simulate(game, parsed.ok ? parsed.commands : null);
	};
	const reference = play(solve(game));

	const fs = yield* FileSystem.FileSystem;
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;

	const opencode = yield* Config.String('OPENCODE_BIN').pipe(Config.withDefault(Bun.which('opencode') ?? 'opencode'));
	const harness = `OpenCode ${(yield* spawner.string(ChildProcess.make(opencode, ['--version']))).trim()}`;
	const keys: Record<Provider, Option.Option<Redacted.Redacted>> = {
		opencode: yield* Config.option(Config.Redacted('OPENCODE_API_KEY')),
		nvidia: yield* Config.option(Config.Redacted('NVIDIA_API_KEY')),
		openrouter: yield* Config.option(Config.Redacted('OPENROUTER_API_KEY'))
	};

	const http = HttpClient.filterStatusOk(yield* HttpClient.HttpClient);
	const catalogText = yield* http.get(CATALOG_URL).pipe(Effect.flatMap((r) => r.text));
	const catalog = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Catalog))(catalogText);

	const results: Results = decodeResults(JSON.parse(yield* fs.readFileString(RESULTS)));
	const entries = new Map(results.entries.map((e) => [entryKey(e), e]));
	const pending = candidates(catalog).filter((c) => !entries.has(entryKey(c)) && Option.isSome(keys[c.provider]));
	yield* Effect.log(`${harness}: ${pending.length} model(s) to benchmark, ${entries.size} already scored`);

	// One writer at a time so a slow write can't land after a newer one.
	const writer = yield* Semaphore.make(1);
	const save = Semaphore.withPermits(writer, 1)(
		fs.writeFileString(
			RESULTS,
			JSON.stringify(
				{ reference: { food: reference.food, steps: reference.steps }, entries: [...entries.values()] } satisfies Results,
				null,
				'\t'
			) + '\n'
		)
	);

	// Stop starting new runs once the budget is spent, so the CI job ends before its hard limit; the rest wait for tomorrow.
	const budget = yield* Config.Duration('BENCH_BUDGET').pipe(Config.withDefault(Duration.hours(5)));
	const deadline = Date.now() + Duration.toMillis(budget);

	const bench = (c: Candidate) =>
		Effect.gen(function* () {
			if (Date.now() > deadline) return;
			const key = Option.getOrThrow(keys[c.provider]);
			const outcome = yield* runSandboxed(c, key, prompt, catalogText, opencode);
			const { text, error } = Option.match(outcome.stdout, {
				onNone: () => ({ text: '', error: undefined }),
				onSome: readEvents
			});
			if (Option.isSome(outcome.stdout) && text === undefined) {
				return yield* Effect.logWarning(`${entryKey(c)}: no answer (${error ?? 'empty output'}), retrying next run`);
			}
			const response = text ?? '';
			const run = play(response);
			const entry: Entry = {
				provider: c.provider,
				model: c.model,
				name: c.name,
				food: run.food,
				steps: run.steps,
				efficiency: Math.round(run.efficiency * 1000) / 1000,
				end: run.end,
				grade: grade(run, reference.food),
				timedOut: Option.isNone(outcome.stdout),
				response,
				seconds: outcome.seconds,
				ranAt: new Date().toISOString(),
				harness
			};
			entries.set(entryKey(c), entry);
			yield* save;
			yield* Effect.log(`${entryKey(c)}: ${entry.food}/${game.food.length} food, grade ${entry.grade}, ${entry.seconds}s`);
		}).pipe(Effect.catchCause((cause) => Effect.logError(`${entryKey(c)} failed`, cause)));

	// Providers run in parallel; each provider's models run one at a time to stay under free-tier rate limits.
	const byProvider = Map.groupBy(pending, (c) => c.provider);
	yield* Effect.forEach(byProvider.values(), (models) => Effect.forEach(models, bench, { discard: true }), {
		concurrency: 'unbounded',
		discard: true
	});
	yield* save;
});

main.pipe(Effect.provide([BunServices.layer, FetchHttpClient.layer]), BunRuntime.runMain);
