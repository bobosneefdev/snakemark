<script lang="ts">
	import { SETTINGS } from '@snakebench/core';

	const toc = [
		['overview', 'Overview'],
		['flow', 'Benchmark flow'],
		['board', 'Board and coordinates'],
		['commands', 'Command syntax'],
		['rules', 'Rules and edge cases'],
		['scoring', 'Scoring'],
		['settings', 'Fixed settings'],
		['determinism', 'Determinism'],
		['leaderboard', 'Leaderboard runs']
	] as const;
</script>

<svelte:head>
	<title>Docs · SnakeBench</title>
	<meta name="description" content="Rules, command syntax, edge cases and scoring for SnakeBench." />
</svelte:head>

<div class="grid gap-12 pt-4 pb-10 lg:grid-cols-[12rem_1fr]">
	<aside class="hidden lg:block">
		<nav aria-label="On this page" class="sticky top-6">
			<ul class="menu menu-sm w-full p-0 text-base-content/60">
				{#each toc as [id, label] (id)}
					<li><a href="#{id}">{label}</a></li>
				{/each}
			</ul>
		</nav>
	</aside>

	<article class="prose-docs flex max-w-2xl flex-col gap-14">
		<section id="overview">
			<h1 class="mb-4 text-4xl font-semibold tracking-tight">Docs</h1>
			<p>
				SnakeBench measures how well a language model plans a long sequence of actions with no
				feedback. The model sees a whole Snake game up front, the board, the walls, its body and the
				full ordered list of food that will ever spawn, and must answer with one movement string. The
				simulator then plays that string exactly as written.
			</p>
			<p>It tests long-horizon planning, spatial reasoning, state tracking and optimization at once.</p>
		</section>

		<section id="flow">
			<h2>Benchmark flow</h2>
			<ol>
				<li><strong>Seed.</strong> Pick a seed. Everything else is fixed. A live preview shows the exact board.</li>
				<li><strong>Prompt.</strong> Copy the generated prompt into any LLM, then paste its answer back.</li>
				<li><strong>Simulate.</strong> Watch the plan play out at 1×, 2× or 5×, or skip straight to the end.</li>
				<li><strong>Score.</strong> See food collected, survival, efficiency and how it stacks up against the reference solver.</li>
			</ol>
		</section>

		<section id="board">
			<h2>Board and coordinates</h2>
			<ul>
				<li>Cells are <code>(x,y)</code>. <code>(0,0)</code> is the top-left. <code>x</code> grows right, <code>y</code> grows down.</li>
				<li>The snake starts with length 3 at the centre column, head at <code>(⌊n/2⌋, ⌊n/2⌋)</code>, body trailing downward, facing up.</li>
				<li>Obstacles never sit on the snake or the two cells straight ahead of it, and never cut off part of the board.</li>
			</ul>
		</section>

		<section id="commands">
			<h2>Command syntax</h2>
			<p>A response is a sequence of tokens:</p>
			<ul>
				<li><code>N</code>, a positive integer: move forward <code>N</code> cells.</li>
				<li><code>L</code> / <code>R</code>: turn 90° left or right, relative to the current facing. Turning does not move the snake.</li>
			</ul>
			<p>
				Example: <code>6L1R2L1L6</code> means forward 6, turn left, forward 1, turn right, forward 2,
				and so on. Whitespace and backticks are stripped and letters are case-insensitive. Anything
				else, or a <code>0</code>, makes the response invalid.
			</p>
		</section>

		<section id="rules">
			<h2>Rules and edge cases</h2>
			<ul>
				<li><strong>One food at a time.</strong> Only the current food is on the board. The next appears the moment it is eaten.</li>
				<li><strong>Growth.</strong> Eating grows the snake by 1: the tail stays put on that move.</li>
				<li><strong>Tail chasing.</strong> The tail vacates its cell during a move, so moving into the tail's cell is safe, except on a move that eats.</li>
				<li><strong>Food placement.</strong> Food never spawns on an obstacle or inside a pocket the board could only reach through a single cell. It can spawn under the snake's body, and is only eaten when the head enters that cell. Consecutive foods never share a cell.</li>
				<li><strong>Death.</strong> Leaving the grid, entering an obstacle, or entering your own body ends the game immediately. The fatal move does not count.</li>
				<li><strong>Running out.</strong> The game also ends when commands are exhausted, all food is eaten, or the move limit (<code>food × grid × 4</code>) is reached.</li>
				<li><strong>Malformed responses</strong> score 0 food and an F. Nothing is guessed or repaired.</li>
				<li><strong>No tools.</strong> The model must plan by reasoning alone. The prompt forbids writing or running code, solvers, simulators, search or any other tool. Run it with tools and code execution turned off. A tool-assisted answer is not a valid result.</li>
				<li><strong>Trailing turns</strong> after the last move are allowed and do nothing.</li>
			</ul>
		</section>

		<section id="scoring">
			<h2>Scoring</h2>
			<ul>
				<li><strong>Food collected</strong> is the primary score.</li>
				<li><strong>Moves survived</strong> counts every successful move.</li>
				<li><strong>Efficiency</strong> is the sum of Manhattan distances between consecutive food pickups divided by the moves actually used to reach the last one. 100% means no detours at all, which walls and the body rarely allow.</li>
				<li><strong>vs reference</strong> compares food collected to a built-in solver: BFS to each food, only taking paths that keep its tail reachable, otherwise following its tail until a safe path opens. It is a solid baseline, not an optimal player.</li>
			</ul>
			<div class="overflow-x-auto">
				<table class="table table-sm">
					<thead><tr><th>Grade</th><th>Meaning</th></tr></thead>
					<tbody>
						<tr><td class="font-mono">S</td><td>Ate every food</td></tr>
						<tr><td class="font-mono">A</td><td>≥ 90% of the reference solver's food</td></tr>
						<tr><td class="font-mono">B</td><td>≥ 70%</td></tr>
						<tr><td class="font-mono">C</td><td>≥ 50%</td></tr>
						<tr><td class="font-mono">D</td><td>≥ 25%</td></tr>
						<tr><td class="font-mono">F</td><td>Below 25%, or an invalid response</td></tr>
					</tbody>
				</table>
			</div>
		</section>

		<section id="settings">
			<h2>Fixed settings</h2>
			<p>
				Every game uses the same settings. Only the seed changes, so any two results on the same seed
				can be compared directly. The settings are deliberately brutal so that even the strongest
				models have room to improve. Report results averaged across several seeds.
			</p>
			<div class="overflow-x-auto">
				<table class="table table-sm">
					<thead><tr><th>Grid</th><th>Obstacles</th><th>Food</th><th>Move limit</th></tr></thead>
					<tbody>
						<tr>
							<td class="font-mono">{SETTINGS.gridSize}×{SETTINGS.gridSize}</td>
							<td class="font-mono">{SETTINGS.obstacleCount}</td>
							<td class="font-mono">{SETTINGS.foodCount}</td>
							<td class="font-mono">{SETTINGS.foodCount * SETTINGS.gridSize * 4}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</section>

		<section id="determinism">
			<h2>Determinism</h2>
			<p>
				Boards and food come from a seeded <code>mulberry32</code> generator, so the same seed
				always builds the same game in every browser. The simulator has no randomness. To compare
				models fairly, give each one the same seed, in a fresh conversation, with the prompt unchanged.
			</p>
		</section>

		<section id="leaderboard">
			<h2>Leaderboard runs</h2>
			<p>
				The <a href="/leaderboard">leaderboard</a> only lists results we collect ourselves. Once a day, every
				free text model from NVIDIA, OpenCode Zen and OpenRouter that isn't on the board yet gets one
				attempt.
			</p>
			<ul>
				<li>The same fixed settings as every game, on one seed we keep private so nobody can tune against the board.</li>
				<li>The prompt is exactly what the benchmark page copies. The model's final message is scored as-is.</li>
				<li>The harness is stock OpenCode with every tool denied, in a sandbox with no internet. Only the model's own API is reachable.</li>
				<li>Runs over 15 minutes score as invalid. Provider errors are not recorded and are retried the next day.</li>
			</ul>
		</section>
	</article>
</div>

<style>
	.prose-docs :global(h2) {
		font-size: 1.5rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		margin-bottom: 0.75rem;
		scroll-margin-top: 1.5rem;
	}
	.prose-docs :global(section) {
		scroll-margin-top: 1.5rem;
	}
	.prose-docs :global(p),
	.prose-docs :global(li) {
		color: color-mix(in oklab, var(--color-base-content) 72%, transparent);
		line-height: 1.7;
	}
	.prose-docs :global(p + p),
	.prose-docs :global(p + ul),
	.prose-docs :global(ul + p),
	.prose-docs :global(p + div) {
		margin-top: 0.75rem;
	}
	.prose-docs :global(ul) {
		list-style: disc;
		padding-left: 1.25rem;
	}
	.prose-docs :global(ol) {
		list-style: decimal;
		padding-left: 1.25rem;
	}
	.prose-docs :global(li + li) {
		margin-top: 0.35rem;
	}
	.prose-docs :global(strong) {
		color: var(--color-base-content);
		font-weight: 500;
	}
	.prose-docs :global(a) {
		color: var(--color-primary);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.prose-docs :global(code) {
		font-family: var(--font-mono);
		font-size: 0.85em;
		color: var(--color-primary);
	}
</style>
