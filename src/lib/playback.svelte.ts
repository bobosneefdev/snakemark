import { snakeAt, type Point, type Run } from './game';

/**
 * Drives a Run at the display's native refresh rate: requestAnimationFrame fires once per
 * vsync, so on a 144/240 Hz monitor the snake is redrawn 144/240 times a second. Game steps
 * advance on a fixed clock and the board tweens between them every frame.
 */
export class Playback {
	/** game steps per second at 1× */
	readonly baseRate: number;
	speed = $state(1);
	playing = $state(false);
	/** fractional step position, e.g. 12.4 = 40% of the way from step 12 to 13 */
	position = $state(0);
	fps = $state(0);
	onend: (() => void) | undefined;

	#raf = 0;
	#last = 0;
	#frames: number[] = [];

	readonly run: Run;

	constructor(run: Run, baseRate = 8) {
		this.run = run;
		this.baseRate = baseRate;
	}

	step = $derived(Math.floor(this.position));
	done = $derived.by(() => this.position >= this.run.steps);
	snake = $derived.by(() => snakeAt(this.run, this.step));
	view = $derived.by(() => {
		const next = Math.min(this.step + 1, this.run.steps);
		const t = this.position - this.step;
		return {
			snake: t > 0 ? snakeAt(this.run, next) : this.snake,
			tween: t > 0 ? { prev: this.snake as Point[], t } : null,
			foodIndex: this.run.foodAt[t > 0 ? next : this.step],
			length: this.run.lengths[this.step]
		};
	});

	play = () => {
		if (this.done) this.position = 0;
		this.playing = true;
		this.#last = performance.now();
		cancelAnimationFrame(this.#raf);
		this.#raf = requestAnimationFrame(this.#tick);
	};

	pause = () => {
		this.playing = false;
		cancelAnimationFrame(this.#raf);
	};

	#tick = (now: number) => {
		const dt = Math.min(now - this.#last, 100);
		this.#last = now;
		this.#frames.push(now);
		while (this.#frames[0] < now - 1000) this.#frames.shift();
		this.fps = this.#frames.length;

		this.position = Math.min(this.position + (dt / 1000) * this.baseRate * this.speed, this.run.steps);
		if (this.done) {
			this.playing = false;
			this.onend?.();
			return;
		}
		this.#raf = requestAnimationFrame(this.#tick);
	};

	destroy = () => cancelAnimationFrame(this.#raf);
}
