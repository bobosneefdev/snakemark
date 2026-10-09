<script lang="ts">
	import type { Game, Point } from './game';

	interface Props {
		game: Game;
		/** head first */
		snake?: Point[];
		/** index of the food currently on the board; null hides food, game.food.length means all eaten */
		foodIndex?: number | null;
		/** how many upcoming foods to ghost in */
		lookahead?: number;
		crash?: Point | null;
		/** 0..1, interpolates the snake between the previous and current step */
		tween?: { prev: Point[]; t: number } | null;
		label: string;
		class?: string;
	}

	let {
		game,
		snake = game.snake,
		foodIndex = 0,
		lookahead = 0,
		crash = null,
		tween = null,
		label,
		class: cls = ''
	}: Props = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	let width = $state(0);
	let dpr = $state(1);

	const token = (el: Element, name: string) => getComputedStyle(el).getPropertyValue(name).trim();
	let colors: Record<'grid' | 'bg' | 'wall' | 'snake' | 'eye' | 'food' | 'crash', string> | undefined;

	$effect(() => {
		if (!canvas || !width) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		const { size } = game;
		const px = Math.round(width * dpr);
		if (canvas.width !== px) canvas.width = canvas.height = px;
		const c = px / size;
		// read theme tokens once; this effect runs every animation frame during playback
		colors ??= {
			grid: token(canvas, '--color-base-300'),
			bg: token(canvas, '--color-base-200'),
			wall: token(canvas, '--color-neutral'),
			snake: token(canvas, '--color-primary'),
			eye: token(canvas, '--color-primary-content'),
			food: token(canvas, '--color-secondary'),
			crash: token(canvas, '--color-error')
		};

		ctx.clearRect(0, 0, px, px);
		ctx.fillStyle = colors.bg;
		ctx.fillRect(0, 0, px, px);

		// grid dots
		ctx.fillStyle = colors.grid;
		const dot = Math.max(1, c * 0.06);
		for (let y = 0; y < size; y++)
			for (let x = 0; x < size; x++) ctx.fillRect((x + 0.5) * c - dot / 2, (y + 0.5) * c - dot / 2, dot, dot);

		const rect = (x: number, y: number, inset: number, r: number) => {
			ctx.beginPath();
			ctx.roundRect(x * c + inset, y * c + inset, c - inset * 2, c - inset * 2, r);
			ctx.fill();
		};

		ctx.fillStyle = colors.wall;
		for (const [x, y] of game.obstacles) rect(x, y, c * 0.06, c * 0.18);

		// upcoming food, fading out
		if (foodIndex !== null) {
			for (let k = lookahead; k >= 1; k--) {
				const f = game.food[foodIndex + k];
				if (!f) continue;
				ctx.globalAlpha = 0.28 * (1 - (k - 1) / lookahead);
				ctx.strokeStyle = colors.food;
				ctx.lineWidth = Math.max(1, c * 0.07);
				ctx.beginPath();
				ctx.arc((f[0] + 0.5) * c, (f[1] + 0.5) * c, c * 0.22, 0, Math.PI * 2);
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
			const f = game.food[foodIndex];
			if (f) {
				ctx.fillStyle = colors.food;
				ctx.shadowColor = colors.food;
				ctx.shadowBlur = c * 0.6;
				ctx.beginPath();
				ctx.arc((f[0] + 0.5) * c, (f[1] + 0.5) * c, c * 0.3, 0, Math.PI * 2);
				ctx.fill();
				ctx.shadowBlur = 0;
			}
		}

		// snake as one thick stroked polyline; head and tail glide between cells when tweening
		const center = ([x, y]: Point) => [(x + 0.5) * c, (y + 0.5) * c] as const;
		const lerp = (a: Point, b: Point, t: number) => center([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
		const pts = snake.map(center);
		if (tween?.prev.length) {
			const { prev, t } = tween;
			pts[0] = lerp(prev[0], snake[0], t);
			// the old tail cell shrinks away unless the snake just grew
			if (prev.length === snake.length) pts.push(lerp(prev[prev.length - 1], snake[snake.length - 1], t));
		}
		ctx.lineCap = ctx.lineJoin = 'round';
		ctx.strokeStyle = colors.snake;
		ctx.shadowColor = colors.snake;
		ctx.shadowBlur = c * 0.5;
		ctx.lineWidth = c * 0.62;
		ctx.beginPath();
		pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
		ctx.stroke();
		ctx.shadowBlur = 0;

		// eyes, facing the direction of travel
		const [hx, hy] = pts[0];
		const dx = Math.sign(snake[0][0] - snake[1][0]);
		const dy = Math.sign(snake[0][1] - snake[1][1]);
		ctx.fillStyle = colors.eye;
		for (const side of [-1, 1]) {
			ctx.beginPath();
			ctx.arc(hx + dx * c * 0.1 - dy * side * c * 0.14, hy + dy * c * 0.1 + dx * side * c * 0.14, c * 0.07, 0, Math.PI * 2);
			ctx.fill();
		}

		if (crash) {
			ctx.strokeStyle = colors.crash;
			ctx.lineWidth = c * 0.12;
			const [x, y] = crash;
			const [cx, cy] = [Math.min(Math.max(x, -0.3), size - 0.7) + 0.5, Math.min(Math.max(y, -0.3), size - 0.7) + 0.5];
			ctx.beginPath();
			ctx.moveTo((cx - 0.3) * c, (cy - 0.3) * c);
			ctx.lineTo((cx + 0.3) * c, (cy + 0.3) * c);
			ctx.moveTo((cx + 0.3) * c, (cy - 0.3) * c);
			ctx.lineTo((cx - 0.3) * c, (cy + 0.3) * c);
			ctx.stroke();
		}
	});
</script>

<svelte:window bind:devicePixelRatio={dpr} />

<div bind:clientWidth={width} role="img" aria-label={label} class="aspect-square w-full overflow-hidden rounded-box ring-1 ring-base-300 {cls}">
	<canvas bind:this={canvas} class="size-full" aria-hidden="true"></canvas>
</div>
