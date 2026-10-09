<script lang="ts">
	import Board from '#lib/Board.svelte';
	import { Playback } from '#lib/playback.svelte.js';
	import { generate, parse, simulate, solve } from '@snakebench/core';

	// A fixed demo game so the hero looks the same for everyone.
	const game = generate({ gridSize: 14, obstacleCount: 14, foodCount: 20, seed: 2026 });
	const parsed = parse(solve(game));
	const run = simulate(game, parsed.ok ? parsed.commands : null);
	const demo = new Playback(run, 14);
	let again: ReturnType<typeof setTimeout> | undefined;
	demo.onend = () => (again = setTimeout(demo.play, 1500));

	$effect(() => {
		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduced) demo.position = run.steps;
		else demo.play();
		return () => {
			clearTimeout(again);
			demo.destroy();
		};
	});

	const steps = [
		['Generate', 'Pick a seed. Every board is 32×32 with 256 obstacles and 512 food. Same seed, same board, every time.'],
		['Reveal', 'The model sees everything up front: walls, its body, and every food that will ever spawn.'],
		['Plan', 'It replies with one compressed string like 6L1R2L1L6. No retries, no feedback.'],
		['Simulate', 'The plan runs deterministically. Score is food eaten before the first mistake.']
	];
</script>

<svelte:head>
	<title>SnakeBench: one-shot Snake planning for LLMs</title>
	<meta
		name="description"
		content="SnakeBench tests how well an LLM plans a whole game of Snake in one shot: long-horizon planning, spatial reasoning and state tracking with zero feedback."
	/>
</svelte:head>

<section class="grid items-center gap-12 pt-8 pb-20 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
	<div class="flex flex-col gap-6">
		<p data-reveal style="--i: 0" class="badge badge-outline badge-sm font-mono text-primary">LLM benchmark</p>
		<h1 data-reveal style="--i: 1" class="text-5xl leading-[0.95] font-semibold tracking-tighter text-balance sm:text-7xl">
			Plan every move.<br /><span class="text-base-content/40">Before the first one.</span>
		</h1>
		<p data-reveal style="--i: 2" class="max-w-md text-lg text-pretty text-base-content/70">
			SnakeBench gives a model the full map and every future food, then asks for the whole game as
			one string. No feedback. No second chances. Just planning.
		</p>
		<div data-reveal style="--i: 3" class="flex flex-wrap gap-3">
			<a href="/benchmark" class="btn btn-primary">Run the benchmark</a>
			<a href="/docs" class="btn btn-ghost">How it works</a>
		</div>
	</div>

	<figure data-reveal style="--i: 4" class="relative mx-auto w-full max-w-md">
		<div class="absolute -inset-8 -z-10 rounded-full bg-primary/10 blur-3xl"></div>
		<Board
			{game}
			snake={demo.view.snake}
			tween={demo.view.tween}
			foodIndex={demo.view.foodIndex}
			lookahead={3}
			label="Reference solver playing a demo game"
		/>
		<figcaption class="mt-3 flex justify-between font-mono text-xs text-base-content/50">
			<span>reference solver · seed 2026</span>
			<span>food {demo.view.foodIndex}/{game.food.length}</span>
		</figcaption>
	</figure>
</section>

<section class="border-t border-base-300/60 py-16" aria-labelledby="flow">
	<h2 id="flow" class="mb-10 font-mono text-xs tracking-widest text-base-content/50 uppercase">The loop</h2>
	<ol class="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
		{#each steps as [title, body], i (title)}
			<li class="flex flex-col gap-2">
				<span class="font-mono text-xs text-primary">0{i + 1}</span>
				<h3 class="text-lg font-medium">{title}</h3>
				<p class="text-sm text-pretty text-base-content/60">{body}</p>
			</li>
		{/each}
	</ol>
</section>

<section class="border-t border-base-300/60 py-16" aria-labelledby="measures">
	<div class="grid gap-10 lg:grid-cols-2">
		<h2 id="measures" class="text-3xl font-semibold tracking-tight text-balance">
			Snake is easy to play.<br /><span class="text-base-content/40">It is hard to plan blind.</span>
		</h2>
		<ul class="grid gap-4 text-sm text-base-content/70 sm:grid-cols-2">
			<li><strong class="block text-base-content">Long-horizon planning</strong>Dozens of foods, hundreds of moves, one answer.</li>
			<li><strong class="block text-base-content">Spatial reasoning</strong>Coordinates, walls and turns relative to facing.</li>
			<li><strong class="block text-base-content">State tracking</strong>The body grows and trails behind. Never bite it.</li>
			<li><strong class="block text-base-content">Optimization</strong>Fewer moves breaks ties. Detours cost points.</li>
		</ul>
	</div>
</section>
