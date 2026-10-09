import { expect, test } from 'bun:test';
import { Result } from 'effect';
import { decodeConfig, encode, generate, parse, simulate, snakeAt, solve, TIERS, type Game } from './game';

const blank = (food: Game['food'], size = 8): Game => ({
	config: { gridSize: size, obstacleCount: 0, foodCount: food.length, seed: 0 },
	size,
	obstacles: [],
	snake: [
		[4, 4],
		[4, 5],
		[4, 6]
	],
	direction: 0,
	food,
	moveLimit: 1000
});
const cmds = (s: string) => {
	const p = parse(s);
	if (!p.ok) throw new Error(p.error);
	return p.commands;
};

test('parse', () => {
	expect(parse(' 6l1R `2` ')).toEqual({ ok: true, commands: [6, 'L', 1, 'R', 2], moves: 9 });
	expect(parse('3X').ok).toBe(false);
	expect(parse('0').ok).toBe(false);
	expect(parse('').ok).toBe(false);
});

test('config validation', () => {
	expect(Result.isSuccess(decodeConfig({ gridSize: 10, obstacleCount: 20, foodCount: 5, seed: 1 }))).toBe(true);
	expect(Result.isFailure(decodeConfig({ gridSize: 10, obstacleCount: 21, foodCount: 5, seed: 1 }))).toBe(true);
	expect(Result.isFailure(decodeConfig({ gridSize: 5.5, obstacleCount: 0, foodCount: 5, seed: 1 }))).toBe(true);
});

test('generation is deterministic', () => {
	const c = { ...TIERS.hard, seed: 42 };
	expect(generate(c)).toEqual(generate(c));
	expect(generate(c).obstacles.length).toBe(c.obstacleCount);
});

test('eat, grow, wall', () => {
	const run = simulate(blank([[4, 2], [6, 2]]), cmds('2R9'));
	expect(run.food).toBe(2);
	expect(run.end).toBe('cleared');
	expect(run.steps).toBe(4);
	expect(snakeAt(run, 2)).toEqual([
		[4, 2],
		[4, 3],
		[4, 4],
		[4, 5]
	]);
	expect(simulate(blank([[0, 0]]), cmds('9')).end).toBe('wall');
});

test('tail chasing is safe, biting body is not', () => {
	// Length 4 loop: the head enters the cell the tail just left.
	const g = blank([[4, 3], [0, 0]]);
	expect(simulate(g, cmds('1R1R1R1R1')).end).toBe('commands');
	// Length 5 doing a tight U-turn hits its own body.
	expect(simulate(blank([[4, 3], [4, 2], [0, 0]]), cmds('2R1R1R1')).end).toBe('self');
});

test('obstacle and move limit', () => {
	const g = { ...blank([[0, 0]]), obstacles: [[4, 2]] as Game['obstacles'] };
	expect(simulate(g, cmds('5')).end).toBe('obstacle');
	expect(simulate({ ...blank([[0, 0]]), moveLimit: 2 }, cmds('3')).end).toBe('limit');
});

test('encode round-trips', () => {
	expect(encode([0, 0, 1, 1, 0, 3], 0)).toBe('2R2L1L1');
});

test('reference solver plays legal games on every tier', () => {
	for (const tier of Object.values(TIERS)) {
		for (let seed = 0; seed < 5; seed++) {
			const game = generate({ ...tier, seed });
			const run = simulate(game, cmds(solve(game)));
			expect(['cleared', 'commands']).toContain(run.end);
			expect(run.food).toBeGreaterThan(0);
		}
	}
});
