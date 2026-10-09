<script lang="ts">
	import { onMount } from 'svelte';
	import { Result } from 'effect';
	import { decodeConfig, generate, parse, simulate, solve, type Run } from '#lib/game.js';
	import ConfigStep from './ConfigStep.svelte';
	import PromptStep from './PromptStep.svelte';
	import PlayStep from './PlayStep.svelte';
	import ScoreStep from './ScoreStep.svelte';

	const STAGES = ['Configure', 'Prompt', 'Simulate', 'Score'] as const;
	let stage = $state(0);

	let form = $state({ gridSize: 18, obstacleCount: 36, foodCount: 35, seed: 1 });
	let response = $state('');

	// persist the config across reloads; loaded after mount so prerendered markup hydrates cleanly
	const CONFIG_KEY = 'snakebench:config';
	onMount(() => {
		try {
			const saved = JSON.parse(localStorage.getItem(CONFIG_KEY) ?? '{}');
			for (const k of Object.keys(form) as (keyof typeof form)[]) if (typeof saved[k] === 'number') form[k] = saved[k];
		} catch {}
	});
	$effect(() => localStorage.setItem(CONFIG_KEY, JSON.stringify(form)));

	const decoded = $derived(decodeConfig(form));
	const game = $derived(Result.isSuccess(decoded) ? generate(decoded.success) : null);
	const error = $derived(Result.isFailure(decoded) ? String(decoded.failure.message).split('\n')[0] : null);

	let run: Run | null = $state(null);
	let reference: Run | null = $state(null);
	// bumping this remounts the playback, which restarts it
	let take = $state(0);

	function start() {
		if (!game) return;
		const parsed = parse(response);
		run = simulate(game, parsed.ok ? parsed.commands : null);
		const ref = parse(solve(game));
		reference = simulate(game, ref.ok ? ref.commands : null);
		take++;
		// an invalid response has nothing to play back
		stage = run.end === 'invalid' ? 3 : 2;
		scrollTo({ top: 0 });
	}

	const go = (to: number) => {
		stage = to;
		scrollTo({ top: 0 });
	};
</script>

<svelte:head>
	<title>Benchmark · SnakeBench</title>
	<meta name="description" content="Generate a SnakeBench game, prompt your LLM, and watch its one-shot plan play out." />
</svelte:head>

<div class="flex flex-col gap-10 pt-4 pb-10">
	<nav aria-label="Benchmark progress">
		<ul class="steps w-full text-xs">
			{#each STAGES as label, i (label)}
				<li class="step {i <= stage ? 'step-primary' : ''}" aria-current={i === stage ? 'step' : undefined}>
					{label}
				</li>
			{/each}
		</ul>
	</nav>

	{#if stage === 0 || !game}
		<ConfigStep bind:form {game} {error} onnext={() => go(1)} />
	{:else if stage === 1}
		<PromptStep {game} bind:response onback={() => go(0)} onrun={start} />
	{:else if stage === 2 && run}
		{#key take}
			<PlayStep {run} ondone={() => go(3)} />
		{/key}
	{:else if stage === 3 && run && reference}
		<ScoreStep
			{run}
			{reference}
			{response}
			onreplay={() => {
				take++;
				go(2);
			}}
			onretry={() => {
				response = '';
				go(1);
			}}
			onnew={() => {
				response = '';
				go(0);
			}}
		/>
	{/if}
</div>
