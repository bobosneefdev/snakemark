<script lang="ts">
	import Board from '#lib/Board.svelte';
	import { randomSeed, SETTINGS, type Game } from '@snakemark/core';

	interface Props {
		seed: number;
		game: Game | null;
		error: string | null;
		onnext: () => void;
	}
	let { seed = $bindable(), game, error, onnext }: Props = $props();
</script>

<section class="grid gap-10 lg:grid-cols-[1fr_1.1fr]" aria-labelledby="config-title">
	<div class="flex flex-col gap-8">
		<header class="flex flex-col gap-2">
			<h1 id="config-title" class="text-3xl font-semibold tracking-tight">Pick a seed</h1>
			<p class="text-sm text-base-content/60">
				Every game is a {SETTINGS.gridSize}×{SETTINGS.gridSize} board with {SETTINGS.obstacleCount} obstacles and {SETTINGS.foodCount} food. The seed is the only variable,
				so the same seed always builds the same board and every result on it is directly comparable.
			</p>
		</header>

		<label class="flex flex-col gap-3">
			<span class="text-sm text-base-content/70">Seed</span>
			<div class="join w-full">
				<input
					type="number"
					inputmode="numeric"
					min="0"
					max="4294967295"
					bind:value={seed}
					class="input join-item w-full font-mono"
				/>
				<button type="button" class="btn join-item" onclick={() => (seed = randomSeed())}>
					Randomize
				</button>
			</div>
		</label>

		{#if error}
			<p role="alert" class="alert alert-error alert-soft text-sm">{error}</p>
		{/if}

		<button type="button" class="btn btn-primary" disabled={!game} onclick={onnext}>
			Continue to prompt
		</button>
	</div>

	<figure class="order-first mx-auto flex w-full max-w-[min(100%,50dvh)] flex-col gap-3 lg:order-none lg:sticky lg:top-6 lg:max-w-none lg:self-start">
		{#if game}
			<Board
				{game}
				lookahead={4}
				label="Preview of a {game.size} by {game.size} board with {game.obstacles.length} obstacles"
			/>
			<figcaption class="flex flex-wrap justify-between gap-2 font-mono text-xs text-base-content/50">
				<span>{game.size}×{game.size} · {game.obstacles.length} obstacles · {game.food.length} food</span>
				<span>move limit {game.moveLimit}</span>
			</figcaption>
		{:else}
			<div class="grid aspect-square place-items-center rounded-box bg-base-200 text-sm text-base-content/40">
				Fix the seed to preview the board
			</div>
		{/if}
	</figure>
</section>
