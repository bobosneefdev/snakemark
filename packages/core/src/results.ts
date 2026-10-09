import { Schema } from 'effect';
import { EndReason, Grade, score } from './game';

/** Leaderboard data written by apps/worker and read by the site at build time. */
export const Provider = Schema.Literals(['opencode', 'nvidia', 'openrouter']);
export type Provider = typeof Provider.Type;

export const Entry = Schema.Struct({
	provider: Provider,
	/** provider-local model id, as Pi names it after `provider/` */
	model: Schema.String,
	name: Schema.String,
	food: Schema.Int,
	steps: Schema.Int,
	efficiency: Schema.Number,
	end: EndReason,
	grade: Grade,
	/** the model hit the per-run time limit before answering; scored as an invalid response */
	timedOut: Schema.Boolean,
	/** raw final answer; kept in the repo for auditing, never shipped to the site */
	response: Schema.String,
	seconds: Schema.Number,
	ranAt: Schema.String,
	harness: Schema.String
});
export interface Entry extends Schema.Schema.Type<typeof Entry> {}

export const Results = Schema.Struct({
	reference: Schema.Struct({ food: Schema.Int, steps: Schema.Int }),
	entries: Schema.Array(Entry)
});
export interface Results extends Schema.Schema.Type<typeof Results> {}
export const decodeResults = Schema.decodeUnknownSync(Results);

export const entryKey = (e: { provider: Provider; model: string }) => `${e.provider}/${e.model}`;

/** Highest score (food, minus the crash penalty) first; fewer moves breaks ties, same as the game's own goal. */
export const rank = (entries: readonly Entry[]) =>
	[...entries].sort((a, b) => score(b) - score(a) || a.steps - b.steps || a.name.localeCompare(b.name));
