<script lang="ts">
	import { Slider, ToggleGroup } from 'bits-ui';
	import Board from '#lib/Board.svelte';
	import { maxObstacles, randomSeed, TIERS, type Game, type Tier } from '#lib/game.js';

	interface Props {
		form: { gridSize: number; obstacleCount: number; foodCount: number; seed: number };
		game: Game | null;
		error: string | null;
		onnext: () => void;
	}
	let { form = $bindable(), game, error, onnext }: Props = $props();

	const tier = $derived(
		(Object.keys(TIERS) as Tier[]).find((k) => {
			const t = TIERS[k];
			return t.gridSize === form.gridSize && t.obstacleCount === form.obstacleCount && t.foodCount === form.foodCount;
		}) ?? ''
	);
	const obstacleMax = $derived(maxObstacles(form.gridSize));

	function setGrid(size: number) {
		form.gridSize = size;
		form.obstacleCount = Math.min(form.obstacleCount, maxObstacles(size));
	}
</script>

{#snippet field(label: string, value: number, min: number, max: number, onchange: (v: number) => void)}
	<div class="flex flex-col gap-3">
		<div class="flex items-baseline justify-between text-sm">
			<span class="text-base-content/70">{label}</span>
			<output class="font-mono tabular-nums">{value}</output>
		</div>
		<Slider.Root
			type="single"
			{value}
			{min}
			{max}
			onValueChange={onchange}
			class="relative flex h-5 w-full touch-none items-center select-none"
		>
			<span class="relative h-1.5 w-full grow overflow-hidden rounded-full bg-base-300">
				<Slider.Range class="absolute h-full bg-primary" />
			</span>
			<Slider.Thumb
				index={0}
				aria-label={label}
				class="block size-4 cursor-grab rounded-full border-2 border-primary bg-base-100 shadow transition-transform hover:scale-110 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none active:cursor-grabbing"
			/>
		</Slider.Root>
	</div>
{/snippet}

<section class="grid gap-10 lg:grid-cols-[1fr_1.1fr]" aria-labelledby="config-title">
	<div class="flex flex-col gap-8">
		<header class="flex flex-col gap-2">
			<h1 id="config-title" class="text-3xl font-semibold tracking-tight">Configure the course</h1>
			<p class="text-sm text-base-content/60">
				Pick a tier or tune it yourself. The same settings and seed always build the same board, so
				every model can face the exact same game.
			</p>
		</header>

		<div class="flex flex-col gap-3">
			<span class="text-sm text-base-content/70" id="tier-label">Difficulty tier</span>
			<ToggleGroup.Root
				type="single"
				value={tier}
				onValueChange={(v) => {
					if (v) Object.assign(form, TIERS[v as Tier]);
				}}
				aria-labelledby="tier-label"
				class="join w-full"
			>
				{#each Object.keys(TIERS) as t (t)}
					<ToggleGroup.Item
						value={t}
						class="btn join-item flex-1 capitalize btn-sm data-[state=on]:btn-primary"
					>
						{t}
					</ToggleGroup.Item>
				{/each}
			</ToggleGroup.Root>
		</div>

		{@render field('Grid size', form.gridSize, 6, 32, setGrid)}
		{@render field('Obstacles', form.obstacleCount, 0, obstacleMax, (v) => (form.obstacleCount = v))}
		{@render field('Food', form.foodCount, 1, 256, (v) => (form.foodCount = v))}

		<label class="flex flex-col gap-3">
			<span class="text-sm text-base-content/70">Seed</span>
			<div class="join w-full">
				<input
					type="number"
					inputmode="numeric"
					min="0"
					max="4294967295"
					bind:value={form.seed}
					class="input join-item w-full font-mono"
				/>
				<button type="button" class="btn join-item" onclick={() => (form.seed = randomSeed())}>
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
				Fix the settings to preview the board
			</div>
		{/if}
	</figure>
</section>
