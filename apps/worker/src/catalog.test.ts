import { expect, test } from 'bun:test';
import { Schema } from 'effect';
import { Catalog, candidates, readEvents } from './catalog';

const model = (provider: string, id: string, extra: object = {}) => ({
	type: 'chat',
	id,
	name: id,
	provider,
	baseUrl: `https://${provider}.example/v1`,
	input: ['text'],
	cost: { input: 0, output: 0 },
	...extra
});

test('candidates keeps only free text chat models from our providers', () => {
	const catalog = Schema.decodeUnknownSync(Catalog)([
		model('opencode', 'big-pickle'),
		model('opencode', 'paid', { cost: { input: 1, output: 2 } }),
		model('anthropic', 'free-but-not-ours'),
		model('nvidia', 'baai/bge-m3'),
		model('nvidia', 'jev', { type: 'classifier' }),
		model('nvidia', 'z-ai/glm-5.3'),
		model('openrouter', 'openrouter/free'),
		model('openrouter', 'auto'),
		model('openrouter', 'x/y:free')
	]);
	expect(candidates(catalog).map((c) => `${c.provider}/${c.model}@${c.host} ${c.keyEnv}`)).toEqual([
		'opencode/big-pickle@opencode.example OPENCODE_API_KEY',
		'nvidia/z-ai/glm-5.3@nvidia.example NVIDIA_API_KEY',
		'openrouter/x/y:free@openrouter.example OPENROUTER_API_KEY'
	]);
});

test('readEvents takes the last assistant message and reports errors', () => {
	const end = (message: object) => JSON.stringify({ type: 'message_end', message });
	const out = [
		'{"type":"session","version":3}',
		end({ role: 'user', content: [{ type: 'text', text: 'prompt' }] }),
		'not json',
		end({
			role: 'assistant',
			content: [{ type: 'thinking' }, { type: 'text', text: '3R2L5' }],
			stopReason: 'stop'
		})
	].join('\n');
	expect(readEvents(out)).toEqual({ text: '3R2L5', error: undefined });
	expect(
		readEvents(
			end({
				role: 'assistant',
				content: [],
				stopReason: 'error',
				errorMessage: '401'
			})
		)
	).toEqual({
		text: undefined,
		error: '401'
	});
	expect(readEvents('')).toEqual({ text: undefined, error: undefined });
});
