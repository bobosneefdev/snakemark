<script lang="ts">
	import { animate, stagger } from 'motion';
	import type { Component } from 'svelte';
	import { loadShader } from '#lib/gpu.js';
	import { crashed, CRASH_PENALTY, END_LABELS, grade, score, type Run } from '@snakebench/core';

	interface Props {
		run: Run;
		reference: Run;
		response: string;
		onreplay: () => void;
		oncontinue: () => void;
	}
	let { run, reference, response, onreplay, oncontinue }: Props = $props();

	const total = $derived(run.game.food.length);
	const letter = $derived(grade(run, reference.food));
	const great = $derived(letter === 'S' || letter === 'A');
	const rays = $derived(great ? '#9dff9a' : letter === 'F' ? '#ff6b5a' : '#ffd36b');
	const points = $derived(score(run));
	const vsRef = $derived(reference.food ? Math.round((points / reference.food) * 100) : 0);

	let Burst: Component<{ color: string; great: boolean }> | undefined = $state();
	$effect(() => loadShader(() => import('#lib/Burst.svelte'), (c) => (Burst = c)));

	let shown = $state(0);
	let stage: HTMLElement | undefined = $state();

	$effect(() => {
		if (!stage) return;
		const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
		const q = (s: string) => stage!.querySelectorAll<HTMLElement>(s);
		if (reduced) {
			shown = run.food;
			q('[data-burst], [data-grade], [data-stat]').forEach((el) => (el.style.opacity = '1'));
			return;
		}
		const count = animate(0, run.food, {
			duration: Math.min(2.2, 0.6 + run.food * 0.05),
			ease: [0.16, 1, 0.3, 1],
			onUpdate: (v) => (shown = Math.round(v))
		});
		const anims = [
			count,
			animate(q('[data-burst]'), { opacity: [0, 1], scale: [0.6, 1] }, { duration: 1.6, ease: 'easeOut' }),
			animate(q('[data-label]'), { opacity: [0, 1], y: [10, 0] }, { duration: 0.5 }),
			animate(
				q('[data-grade]'),
				{ opacity: [0, 1], scale: [3, 1], rotate: [-12, 0], filter: ['blur(12px)', 'blur(0px)'] },
				{ delay: count.duration + 0.1, type: 'spring', bounce: 0.45, duration: 0.8 }
			),
			animate(q('[data-stat]'), { opacity: [0, 1], y: [16, 0] }, { delay: stagger(0.08, { startDelay: count.duration + 0.5 }), duration: 0.5 })
		];
		return () => anims.forEach((a) => a.stop());
	});

</script>

<section bind:this={stage} class="flex flex-col items-center gap-10" aria-labelledby="score-title">
	<div class="relative grid w-full max-w-2xl place-items-center overflow-hidden rounded-box py-16 sm:py-24">
		<div data-burst class="absolute inset-0 -z-10 bg-[radial-gradient(circle,color-mix(in_oklab,var(--ray)_35%,transparent),transparent_65%)] opacity-0" style="--ray: {rays}" aria-hidden="true">
			{#if Burst}<Burst color={rays} {great} />{/if}
		</div>

		<p data-label class="pl-[0.3em] font-mono text-xs tracking-[0.3em] text-base-content/60 uppercase">Food collected</p>
		<h1 id="score-title" class="relative text-[clamp(6rem,22vw,12rem)] leading-none font-semibold tracking-tighter tabular-nums">
			{shown}<span class="absolute bottom-[0.12em] left-full text-[0.35em] text-base-content/40">/{total}</span>
		</h1>
		<p data-label class="text-sm text-base-content/70">{END_LABELS[run.end]}</p>
		{#if crashed(run.end)}
			<p data-label class="mt-1 font-mono text-xs text-error">Crash penalty: scored {points} ({CRASH_PENALTY * 100}%)</p>
		{/if}

		<div
			data-grade
			class="absolute top-6 right-6 grid size-20 place-items-center rounded-full border-2 font-mono text-4xl font-bold opacity-0 sm:size-24 sm:text-5xl {great
				? 'border-primary text-primary'
				: letter === 'F'
					? 'border-error text-error'
					: 'border-secondary text-secondary'}"
			role="img"
			aria-label="Grade {letter}"
		>
			{letter}
		</div>
	</div>

	<dl class="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
		{#each [['Moves survived', run.steps.toLocaleString()], ['Efficiency', `${Math.round(run.efficiency * 100)}%`], ['vs reference', `${vsRef}%`], ['Reference food', `${reference.food}/${total}`]] as [k, v] (k)}
			<div data-stat class="rounded-box bg-base-200/70 p-4 opacity-0">
				<dt class="text-xs text-base-content/50">{k}</dt>
				<dd class="font-mono text-2xl tabular-nums">{v}</dd>
			</div>
		{/each}
	</dl>

	<div data-stat class="flex flex-wrap justify-center gap-3 opacity-0">
		{#if run.end !== 'invalid'}
			<button type="button" class="btn" onclick={onreplay}>Replay</button>
		{/if}
		<button type="button" class="btn btn-primary" onclick={oncontinue}>Continue</button>
	</div>

	{#if response.trim()}
		<details data-stat class="collapse-arrow collapse w-full max-w-2xl border border-base-300 opacity-0">
			<summary class="collapse-title text-sm text-base-content/60">Submitted response</summary>
			<pre class="collapse-content overflow-x-auto font-mono text-xs break-all whitespace-pre-wrap">{response.trim()}</pre>
		</details>
	{/if}
</section>
