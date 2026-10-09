<script lang="ts">
	import { ToggleGroup } from 'bits-ui';
	import Board from '#lib/Board.svelte';
	import { Playback } from '#lib/playback.svelte.js';
	import type { Run } from '#lib/game.js';

	let { run, ondone }: { run: Run; ondone: () => void } = $props();

	// ~8 steps/s at 1× reads well on any board size; the frame rate itself follows the display
	// svelte-ignore state_referenced_locally
	const pb = new Playback(run, 8);
	pb.onend = () => setTimeout(ondone, 900);

	$effect(() => {
		pb.play();
		return pb.destroy;
	});

	const speeds = ['1', '2', '5'];
	const ended = $derived(pb.done);
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.target instanceof HTMLElement && e.target.closest('input, textarea, button, [role="radio"]')) return;
		if (e.key === ' ') {
			e.preventDefault();
			if (pb.playing) pb.pause();
			else pb.play();
		}
	}}
/>

<section
	class="grid gap-6 lg:grid-cols-[minmax(0,min(100%,calc(100dvh_-_12rem)))_16rem] lg:justify-center"
	aria-labelledby="play-title"
>
	<div class="flex flex-col gap-5 lg:col-start-2">
		<header class="flex flex-col gap-1">
			<span class="font-mono text-xs text-primary">Live playback</span>
			<h1 id="play-title" class="text-2xl font-semibold tracking-tight">Watching the plan unfold</h1>
			<span class="font-mono text-xs text-base-content/40 tabular-nums" title="Frames drawn per second">{pb.fps} fps</span>
		</header>

		<dl class="grid grid-cols-3 gap-2 font-mono lg:grid-cols-1">
			{#each [['Food', pb.view.foodIndex, run.game.food.length], ['Move', pb.step, run.steps], ['Length', pb.view.length, null]] as [label, value, of] (label)}
				<div class="rounded-box bg-base-200/70 px-4 py-3">
					<dt class="text-[10px] tracking-widest text-base-content/50 uppercase">{label}</dt>
					<dd class="text-xl tabular-nums">
						{value}{#if of !== null}<span class="text-base-content/30">/{of}</span>{/if}
					</dd>
				</div>
			{/each}
		</dl>

		<progress
			class="progress w-full progress-primary"
			value={pb.position}
			max={Math.max(1, run.steps)}
			aria-label="Playback progress"
		></progress>

		<div class="flex items-center gap-3">
			<button
				type="button"
				class="btn btn-square"
				onclick={() => (pb.playing ? pb.pause() : pb.play())}
				aria-label={pb.playing ? 'Pause' : 'Play'}
			>
				{#if pb.playing}
					<svg viewBox="0 0 16 16" class="size-4" fill="currentColor" aria-hidden="true"><path d="M4 2h3v12H4zM9 2h3v12H9z" /></svg>
				{:else}
					<svg viewBox="0 0 16 16" class="size-4" fill="currentColor" aria-hidden="true"><path d="M4 2l10 6-10 6z" /></svg>
				{/if}
			</button>
			<ToggleGroup.Root
				type="single"
				value={String(pb.speed)}
				onValueChange={(v) => v && (pb.speed = Number(v))}
				aria-label="Playback speed"
				class="join flex-1"
			>
				{#each speeds as s (s)}
					<ToggleGroup.Item value={s} class="btn join-item flex-1 font-mono data-[state=on]:btn-primary">{s}×</ToggleGroup.Item>
				{/each}
			</ToggleGroup.Root>
		</div>
		<button type="button" class="btn btn-ghost" onclick={ondone}>Skip to score →</button>
		<p class="hidden text-xs text-base-content/40 lg:block">Space to pause. Renders at your display's refresh rate.</p>
	</div>

	<div class="lg:col-start-1 lg:row-start-1">
		<Board
			game={run.game}
			snake={pb.view.snake}
			tween={pb.view.tween}
			foodIndex={pb.view.foodIndex}
			lookahead={2}
			crash={ended ? run.crash : null}
			label="Simulation of the submitted plan"
		/>
	</div>
</section>
