import { expect, test } from 'bun:test';
import { Result } from 'effect';
import { decodeSeed, grade, score, encode, generate, parse, simulate, SETTINGS, snakeAt, solve, type Game } from './game';

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

test('seed validation', () => {
	expect(Result.isSuccess(decodeSeed(1))).toBe(true);
	expect(Result.isFailure(decodeSeed(-1))).toBe(true);
	expect(Result.isFailure(decodeSeed(1.5))).toBe(true);
	expect(Result.isFailure(decodeSeed(2 ** 32))).toBe(true);
});

test('generation is deterministic', () => {
	const c = { ...SETTINGS, seed: 42 };
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

test('reference solver plays legal games', () => {
	for (let seed = 0; seed < 3; seed++) {
		const game = generate({ ...SETTINGS, seed });
		expect(game.food.length).toBe(SETTINGS.foodCount);
		const run = simulate(game, cmds(solve(game)));
		expect(['cleared', 'commands']).toContain(run.end);
		expect(run.food).toBeGreaterThan(0);
	}
});

test('crashing keeps 75% of the food, rounded down; running out is free', () => {
	expect(score({ food: 10, end: 'wall' })).toBe(7);
	expect(score({ food: 10, end: 'self' })).toBe(7);
	expect(score({ food: 10, end: 'commands' })).toBe(10);
	expect(grade({ food: 10, end: 'commands' }, 10)).toBe('A');
	expect(grade({ food: 10, end: 'obstacle' }, 10)).toBe('B');
});
