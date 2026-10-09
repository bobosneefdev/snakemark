<script lang="ts">
	import { crashed, CRASH_PENALTY, END_LABELS, score } from '@snakemark/core';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const { entries, reference, settings } = $derived(data);

	const PROVIDERS = { opencode: 'OpenCode Zen', nvidia: 'NVIDIA', openrouter: 'OpenRouter' } as const;
	const updated = $derived(entries.map((e) => e.ranAt).sort().at(-1));
	const date = (iso: string) => new Date(iso).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
	const gradeClass = (g: string) =>
		g === 'S' || g === 'A' ? 'text-primary' : g === 'F' ? 'text-error' : 'text-secondary';
</script>

<svelte:head>
	<title>Leaderboard · Snakemark</title>
	<meta name="description" content="Free LLMs ranked on Snakemark, benchmarked automatically every day on one private seed." />
</svelte:head>

<div class="flex flex-col gap-12 pt-4 pb-10">
	<header class="flex flex-col gap-4">
		<h1 data-reveal style="--i: 0" class="text-5xl font-semibold tracking-tighter sm:text-6xl">Leaderboard</h1>
		<p data-reveal style="--i: 1" class="max-w-xl text-lg text-pretty text-base-content/70">
			Every model here was run by us, on the same board, with the same prompt. No self-reported
			scores.
		</p>
	</header>

	<section aria-labelledby="free" class="flex flex-col gap-6">
		<div data-reveal style="--i: 2" class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<h2 id="free" class="text-2xl font-semibold tracking-tight">Free LLM Leaderboard</h2>
				<p class="mt-1 text-sm text-base-content/50">
					Free text models from NVIDIA, OpenCode Zen and OpenRouter. New ones are picked up daily.
				</p>
			</div>
			{#if updated}<p class="font-mono text-xs text-base-content/40">updated {date(updated)}</p>{/if}
		</div>

		<ul data-reveal style="--i: 3" class="grid gap-3 text-sm sm:grid-cols-3">
			<li class="rounded-box bg-base-200/70 p-4">
				<span class="badge badge-sm badge-primary font-mono">Fixed settings</span>
				<p class="mt-2 text-base-content/70">
					{settings.gridSize}×{settings.gridSize} grid, {settings.obstacleCount} obstacles, {settings.foodCount}
					food, like every game. One fixed seed, kept private so nobody can tune against the board.
				</p>
			</li>
			<li class="rounded-box bg-base-200/70 p-4">
				<span class="badge badge-sm badge-outline font-mono">One shot</span>
				<p class="mt-2 text-base-content/70">
					Each model gets the exact prompt from the <a href="/benchmark" class="link">benchmark page</a>,
					once. Its final answer is scored as-is. Bad output scores 0. Crashing keeps only
					{CRASH_PENALTY * 100}% of the food.
				</p>
			</li>
			<li class="rounded-box bg-base-200/70 p-4">
				<span class="badge badge-sm badge-outline font-mono">Sandboxed</span>
				<p class="mt-2 text-base-content/70">
					Stock OpenCode with every tool denied and no internet. It can reach its own model API and
					nothing else. 15 minute limit.
				</p>
			</li>
		</ul>

		{#if entries.length}
			<div data-reveal style="--i: 4" class="overflow-x-auto">
				<table class="table">
					<thead>
						<tr class="text-base-content/50">
							<th class="w-10">#</th>
							<th>Model</th>
							<th class="min-w-48">Food</th>
							<th class="text-right">Moves</th>
							<th class="text-right">Efficiency</th>
							<th class="text-center">Grade</th>
						</tr>
					</thead>
					<tbody>
						{#each entries as e, i (`${e.provider}/${e.model}`)}
							<tr class="hover:bg-base-200/50">
								<td class="font-mono text-base-content/40">{i + 1}</td>
								<td>
									<div class="font-medium">{e.name}</div>
									<div class="font-mono text-xs text-base-content/40">
										{PROVIDERS[e.provider]} · {e.model}
									</div>
								</td>
								<td>
									<div class="flex items-center gap-3">
										<progress class="progress w-24 progress-primary" value={e.food} max={settings.foodCount}></progress>
										<span class="font-mono tabular-nums">{e.food}</span>
									</div>
									<div class="mt-1 text-xs text-base-content/40">
										{e.timedOut ? 'Timed out' : END_LABELS[e.end]}
										{#if crashed(e.end)}<span class="text-error/80">· scored {score(e)}</span>{/if}
									</div>
								</td>
								<td class="text-right font-mono tabular-nums">{e.steps.toLocaleString()}</td>
								<td class="text-right font-mono tabular-nums">{Math.round(e.efficiency * 100)}%</td>
								<td class="text-center font-mono text-lg font-bold {gradeClass(e.grade)}">{e.grade}</td>
							</tr>
						{/each}
					</tbody>
					<tfoot>
						<tr class="text-base-content/50">
							<td></td>
							<td>Reference solver</td>
							<td class="font-mono tabular-nums">{reference.food}</td>
							<td class="text-right font-mono tabular-nums">{reference.steps.toLocaleString()}</td>
							<td colspan="2"></td>
						</tr>
					</tfoot>
				</table>
			</div>
		{:else}
			<div data-reveal style="--i: 4" class="rounded-box border border-dashed border-base-300 py-16 text-center">
				<p class="font-mono text-sm text-primary">0 / ∞</p>
				<p class="mt-2 text-base-content/60">The first daily run hasn't landed yet. Check back tomorrow.</p>
			</div>
		{/if}
	</section>
</div>
