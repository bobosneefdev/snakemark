import { Schema } from 'effect';

export type Point = readonly [x: number, y: number];
/** 0 = up, 1 = right, 2 = down, 3 = left */
export type Dir = 0 | 1 | 2 | 3;
export type Command = number | 'L' | 'R';
export const EndReason = Schema.Literals(['cleared', 'wall', 'obstacle', 'self', 'commands', 'limit', 'invalid']);
export type EndReason = typeof EndReason.Type;

const DX = [0, 1, 0, -1] as const;
const DY = [-1, 0, 1, 0] as const;
const DIR_NAMES = ['UP (toward y−1)', 'RIGHT (toward x+1)', 'DOWN (toward y+1)', 'LEFT (toward x−1)'];

export const maxObstacles = (gridSize: number) => Math.floor(gridSize * gridSize * 0.2);

const int = (minimum: number, maximum: number) => Schema.Int.check(Schema.isBetween({ minimum, maximum }));

export const Config = Schema.Struct({
	gridSize: int(6, 32),
	obstacleCount: int(0, maxObstacles(32)),
	foodCount: int(1, 100),
	seed: int(0, 2 ** 32 - 1)
}).check(
	Schema.makeFilter(
		(c) =>
			c.obstacleCount <= maxObstacles(c.gridSize) ||
			`At most ${maxObstacles(c.gridSize)} obstacles fit on a ${c.gridSize}×${c.gridSize} board`
	)
);
export interface Config extends Schema.Schema.Type<typeof Config> {}
export const decodeConfig = Schema.decodeUnknownResult(Config);

export const TIERS = {
	easy: { gridSize: 18, obstacleCount: 36, foodCount: 35 },
	medium: { gridSize: 24, obstacleCount: 90, foodCount: 60 },
	hard: { gridSize: 28, obstacleCount: 140, foodCount: 80 },
	brutal: { gridSize: 32, obstacleCount: maxObstacles(32), foodCount: 100 }
} as const;
export type Tier = keyof typeof TIERS;

export interface Game {
	config: Config;
	size: number;
	obstacles: Point[];
	/** head first */
	snake: Point[];
	direction: Dir;
	food: Point[];
	moveLimit: number;
}

export interface Run {
	game: Game;
	/** every cell the head has visited, oldest first; starts with the initial body tail→head */
	trail: Point[];
	/** snake length after each step (index 0 = start) */
	lengths: number[];
	/** index of the active food after each step */
	foodAt: number[];
	steps: number;
	food: number;
	end: EndReason;
	crash: Point | null;
	/** Manhattan lower bound for the food eaten ÷ steps actually taken to eat it */
	efficiency: number;
}

/** mulberry32: tiny, fast, deterministic across JS engines */
export function rng(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export const randomSeed = () => Math.floor(Math.random() * 2 ** 32);

/** true when every non-blocked cell is reachable from every other */
function connected(blocked: Uint8Array, size: number) {
	const total = size * size;
	let start = -1;
	let free = 0;
	for (let i = 0; i < total; i++) if (!blocked[i]) (free++, start < 0 && (start = i));
	if (start < 0) return true;
	const seen = new Uint8Array(total);
	const stack = [start];
	seen[start] = 1;
	let count = 0;
	while (stack.length) {
		const i = stack.pop()!;
		count++;
		const x = i % size;
		const y = (i - x) / size;
		for (let d = 0; d < 4; d++) {
			const nx = x + DX[d];
			const ny = y + DY[d];
			const j = ny * size + nx;
			if (nx >= 0 && ny >= 0 && nx < size && ny < size && !blocked[j] && !seen[j]) {
				seen[j] = 1;
				stack.push(j);
			}
		}
	}
	return count === free;
}

export function generate(config: Config): Game {
	const { gridSize: size, obstacleCount, foodCount, seed } = config;
	const rand = rng(seed);
	const cell = () => Math.floor(rand() * size * size);
	const mid = Math.floor(size / 2);
	const snake: Point[] = [
		[mid, mid],
		[mid, mid + 1],
		[mid, mid + 2]
	];

	// The snake and the two cells in front of it never get obstacles, so move one is always survivable.
	const reserved = new Set([...snake, [mid, mid - 1], [mid, mid - 2]].map(([x, y]) => y * size + x));
	const blocked = new Uint8Array(size * size);
	const obstacles: Point[] = [];
	for (let tries = 0; obstacles.length < obstacleCount && tries < obstacleCount * 50; tries++) {
		const i = cell();
		if (blocked[i] || reserved.has(i)) continue;
		blocked[i] = 1;
		// Never wall off part of the board.
		if (!connected(blocked, size)) {
			blocked[i] = 0;
			continue;
		}
		obstacles.push([i % size, Math.floor(i / size)]);
	}

	// Food never spawns behind a chokepoint: if blocking one cell cuts a region off from the rest
	// of the board, that region is a pocket the snake could only enter, eat and die in.
	const pocket = new Uint8Array(size * size);
	const label = new Int32Array(size * size);
	for (let v = 0; v < size * size; v++) {
		if (blocked[v]) continue;
		blocked[v] = 1;
		label.fill(-1);
		const sizes: number[] = [];
		for (let s0 = 0; s0 < size * size; s0++) {
			if (blocked[s0] || label[s0] >= 0) continue;
			const id = sizes.length;
			const stack = [s0];
			label[s0] = id;
			let n = 0;
			while (stack.length) {
				const i = stack.pop()!;
				n++;
				const x = i % size;
				const y = (i - x) / size;
				for (let d = 0; d < 4; d++) {
					const nx = x + DX[d];
					const ny = y + DY[d];
					const j = ny * size + nx;
					if (nx >= 0 && ny >= 0 && nx < size && ny < size && !blocked[j] && label[j] < 0) {
						label[j] = id;
						stack.push(j);
					}
				}
			}
			sizes.push(n);
		}
		blocked[v] = 0;
		if (sizes.length < 2) continue;
		const main = sizes.indexOf(Math.max(...sizes));
		for (let i = 0; i < size * size; i++) if (label[i] >= 0 && label[i] !== main) pocket[i] = 1;
	}

	const food: Point[] = [];
	let prev = -1;
	while (food.length < foodCount) {
		const i = cell();
		// First food avoids the starting snake; later food only avoids the cell the head is on.
		if (blocked[i] || pocket[i] || i === prev || (prev < 0 && reserved.has(i))) continue;
		food.push([i % size, Math.floor(i / size)]);
		prev = i;
	}

	return { config, size, obstacles, snake, direction: 0, food, moveLimit: foodCount * size * 4 };
}

export type Parsed = { ok: true; commands: Command[]; moves: number } | { ok: false; error: string };

/** Whitespace and backticks are ignored and letters are case-insensitive; anything else is invalid. */
export function parse(raw: string): Parsed {
	const s = raw.replace(/[\s`]/g, '').toUpperCase();
	if (!s) return { ok: false, error: 'Response is empty.' };
	const bad = s.search(/[^0-9LR]/);
	if (bad >= 0) return { ok: false, error: `Unexpected character "${s[bad]}" at position ${bad + 1}.` };
	const commands: Command[] = [];
	let moves = 0;
	for (const [tok] of s.matchAll(/\d+|[LR]/g)) {
		if (tok === 'L' || tok === 'R') commands.push(tok);
		else {
			const n = Number(tok);
			if (n === 0) return { ok: false, error: 'Move counts must be at least 1.' };
			commands.push(n);
			moves += n;
		}
	}
	return { ok: true, commands, moves };
}

const dist = (a: Point, b: Point) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

export function simulate(game: Game, commands: Command[] | null): Run {
	const { size, food } = game;
	const blocked = new Uint8Array(size * size);
	for (const [x, y] of game.obstacles) blocked[y * size + x] = 1;
	const occupied = new Uint8Array(size * size);
	for (const [x, y] of game.snake) occupied[y * size + x] = 1;

	const trail: Point[] = [...game.snake].reverse();
	const lengths = [game.snake.length];
	const foodAt = [0];
	let tail = 0;
	let len = game.snake.length;
	let dir = game.direction;
	let eaten = 0;
	let steps = 0;
	let ideal = 0;
	let stepsAtLastEat = 0;
	let crash: Point | null = null;
	let end: EndReason = commands ? 'commands' : 'invalid';

	run: for (const c of commands ?? []) {
		if (c === 'L' || c === 'R') {
			dir = ((dir + (c === 'L' ? 3 : 1)) % 4) as Dir;
			continue;
		}
		for (let i = 0; i < c; i++) {
			if (steps >= game.moveLimit) {
				end = 'limit';
				break run;
			}
			const head = trail[trail.length - 1];
			const nx = head[0] + DX[dir];
			const ny = head[1] + DY[dir];
			const j = ny * size + nx;
			if (nx < 0 || ny < 0 || nx >= size || ny >= size) {
				[end, crash] = ['wall', [nx, ny]];
				break run;
			}
			if (blocked[j]) {
				[end, crash] = ['obstacle', [nx, ny]];
				break run;
			}
			const target = food[eaten];
			const eating = nx === target[0] && ny === target[1];
			// The tail leaves its cell during the move unless the snake is growing.
			if (eating) len++;
			else {
				const [tx, ty] = trail[tail++];
				occupied[ty * size + tx]--;
			}
			if (occupied[j]) {
				[end, crash] = ['self', [nx, ny]];
				break run;
			}
			occupied[j]++;
			trail.push([nx, ny]);
			steps++;
			if (eating) {
				ideal += dist(eaten ? food[eaten - 1] : game.snake[0], target);
				stepsAtLastEat = steps;
				eaten++;
			}
			lengths.push(len);
			foodAt.push(eaten);
			if (eaten === food.length) {
				end = 'cleared';
				break run;
			}
		}
	}

	return {
		game,
		trail,
		lengths,
		foodAt,
		steps,
		food: eaten,
		end,
		crash,
		efficiency: eaten ? ideal / stepsAtLastEat : 0
	};
}

/** The snake (head first) after `step` moves. */
export function snakeAt(run: Run, step: number): Point[] {
	const headIdx = run.game.snake.length - 1 + step;
	return run.trail.slice(headIdx - run.lengths[step] + 1, headIdx + 1).reverse();
}

/**
 * Reference solver: BFS to the next food, but only take the path if the snake can still reach
 * its own tail afterwards (so it never seals itself in). Otherwise it stalls by following its
 * tail until a safe path opens up. Not optimal, just a consistent, honest baseline.
 */
export function solve(game: Game): string {
	const { size, food } = game;
	const total = size * size;
	const blocked = new Uint8Array(total);
	for (const [x, y] of game.obstacles) blocked[y * size + x] = 1;
	const adj: number[][] = [];
	for (let i = 0; i < total; i++) {
		const x = i % size;
		const y = (i - x) / size;
		adj.push([y > 0 ? i - size : -1, x < size - 1 ? i + 1 : -1, y < size - 1 ? i + size : -1, x > 0 ? i - 1 : -1]);
	}
	type State = { body: number[]; occupied: Uint8Array; eaten: number };
	const foodCell = (s: State) => (s.eaten < food.length ? food[s.eaten][1] * size + food[s.eaten][0] : -1);
	const head = (s: State) => s.body[s.body.length - 1];
	const clone = (s: State): State => ({ body: [...s.body], occupied: s.occupied.slice(), eaten: s.eaten });
	// Same rule as simulate(): the tail vacates first unless this move eats.
	const legal = (s: State, n: number) =>
		n >= 0 && !blocked[n] && (!s.occupied[n] || (n === s.body[0] && n !== foodCell(s)));
	const apply = (s: State, n: number) => {
		if (n === foodCell(s)) s.eaten++;
		else s.occupied[s.body.shift()!] = 0;
		s.body.push(n);
		s.occupied[n] = 1;
	};
	/**
	 * Shortest path (cells, excluding the head). Time-aware: the body cell `k` places from the tail
	 * is free once the snake has made more than `k` moves, since the tail has moved off it by then.
	 */
	const path = (s: State, goal: number) => {
		const order = new Int32Array(total).fill(-1);
		s.body.forEach((c, k) => (order[c] = k));
		const eat = foodCell(s);
		const from = new Int32Array(total).fill(-1);
		const time = new Int32Array(total);
		const h = head(s);
		from[h] = h;
		const queue = [h];
		for (let q = 0; q < queue.length; q++) {
			const t = time[queue[q]] + 1;
			for (const n of adj[queue[q]]) {
				if (n < 0 || from[n] >= 0 || blocked[n]) continue;
				// The tail stays put on the move that eats, so a food cell needs one extra move of clearance.
				if (order[n] >= 0 && order[n] >= (n === eat ? t - 1 : t)) continue;
				from[n] = queue[q];
				time[n] = t;
				if (n === goal) {
					const out: number[] = [];
					for (let i = goal; i !== h; i = from[i]) out.push(i);
					return out.reverse();
				}
				if (n !== eat) queue.push(n);
			}
		}
		return null;
	};
	const openArea = (s: State) => {
		const seen = s.occupied.slice();
		const stack = [head(s)];
		let area = 0;
		while (stack.length) {
			for (const n of adj[stack.pop()!]) {
				if (n >= 0 && !seen[n] && !blocked[n]) {
					seen[n] = 1;
					area++;
					stack.push(n);
				}
			}
		}
		return area;
	};
	const safe = (s: State) => s.body.length < 4 || path(s, s.body[0]) !== null;

	let state: State = { body: game.snake.map(([x, y]) => y * size + x).reverse(), occupied: new Uint8Array(total), eaten: 0 };
	for (const i of state.body) state.occupied[i] = 1;
	const cells: number[] = [];
	const commit = (n: number) => (apply(state, n), cells.push(n));
	let stalled = 0;

	while (state.eaten < food.length && cells.length < game.moveLimit) {
		const route = path(state, foodCell(state));
		if (route) {
			const after = clone(state);
			route.forEach((n) => apply(after, n));
			if (safe(after) || stalled > total) {
				route.forEach(commit);
				stalled = 0;
				continue;
			}
		}
		// Stall: the legal step that keeps the tail reachable and stays farthest from the tail.
		let best = -1;
		let bestScore = -1;
		for (const n of adj[head(state)]) {
			if (!legal(state, n)) continue;
			const after = clone(state);
			apply(after, n);
			const toTail = after.body.length < 4 ? [] : path(after, after.body[0]);
			// Prefer keeping the tail in reach (longest route = most slack); else the most open space.
			const score = toTail ? total + toTail.length : openArea(after);
			if (score > bestScore) [best, bestScore] = [n, score];
		}
		if (best < 0) break;
		commit(best);
		stalled++;
	}

	const dirs = cells.map((n, i) => adj[i ? cells[i - 1] : game.snake[0][1] * size + game.snake[0][0]].indexOf(n) as Dir);
	return encode(dirs.slice(0, game.moveLimit), game.direction);
}

/** Absolute directions → compressed relative command string. */
export function encode(dirs: Dir[], start: Dir): string {
	let out = '';
	let facing = start;
	let run = 0;
	for (const d of dirs) {
		if (d !== facing) {
			if (run) out += run;
			out += (d - facing + 4) % 4 === 1 ? 'R' : 'L';
			facing = d;
			run = 0;
		}
		run++;
	}
	return run ? out + run : out;
}

export const Grade = Schema.Literals(['S', 'A', 'B', 'C', 'D', 'F']);
export type Grade = typeof Grade.Type;

export function grade(run: Run, referenceFood: number): Grade {
	if (run.end === 'invalid') return 'F';
	if (run.end === 'cleared') return 'S';
	const r = run.food / Math.max(1, referenceFood);
	return r >= 0.9 ? 'A' : r >= 0.7 ? 'B' : r >= 0.5 ? 'C' : r >= 0.25 ? 'D' : 'F';
}

export const END_LABELS: Record<EndReason, string> = {
	cleared: 'Cleared every food',
	wall: 'Crashed into a wall',
	obstacle: 'Crashed into an obstacle',
	self: 'Bit its own tail',
	commands: 'Ran out of commands',
	limit: 'Hit the move limit',
	invalid: 'Invalid response'
};

const fmt = ([x, y]: Point) => `(${x},${y})`;

export function buildPrompt(game: Game): string {
	const { size, snake } = game;
	const n = size - 1;
	return `You are playing SnakeBench, a one-shot Snake planning benchmark.
Plan the ENTIRE game before your first move. You will get no feedback and no chance to correct anything.

## Board
- Grid: ${size}×${size}. Cells are (x,y). x grows to the right (0…${n}), y grows downward (0…${n}). (0,0) is the top-left cell.
- Obstacles (${game.obstacles.length}): ${game.obstacles.map(fmt).join(' ') || 'none'}

## Snake
- Head: ${fmt(snake[0])}, facing ${DIR_NAMES[game.direction]}.
- Body from head to tail: ${snake.map(fmt).join(' ')} (length ${snake.length}).

## Food
Food appears one at a time, in this exact order. Only the current food is on the board; the next one appears the instant the current one is eaten.
${game.food.map((p, i) => `${i + 1}. ${fmt(p)}`).join('\n')}

## Rules
- Each move advances the head one cell in the direction it faces. The body follows the head.
- Eating: when the head enters the current food's cell, the snake eats it and grows by 1 (the tail stays put on that move).
- Death: moving off the grid, into an obstacle, or into your own body ends the game. The tail vacates its cell during a move, so entering the cell your tail occupies is safe, except on a move where you eat.
- Food can appear under the snake's body. It is only eaten when the head enters its cell.
- The game ends when you die, all food is eaten, your commands run out, or after ${game.moveLimit} moves.

## Commands
- A positive integer N: move forward N cells.
- L: turn 90° left. R: turn 90° right. Turns are relative to the current facing and do not move the snake. Facing UP, L faces LEFT and R faces RIGHT.
- Example: 3R2L5 means forward 3, turn right, forward 2, turn left, forward 5.

## Goal
Eat as many foods as possible, in order. Fewer moves breaks ties.

## Output
Reply with ONLY the command string, for example 3R2L5. No spaces, no explanation, no code fences.`;
}
