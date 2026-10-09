import { expect, test } from 'bun:test';
import { Schema } from 'effect';
import { Catalog, candidates, readEvents } from './opencode';

const model = (id: string, extra: object = {}) => ({
	id,
	name: id,
	cost: { input: 0, output: 0 },
	modalities: { input: ['text'], output: ['text'] },
	...extra
});
const provider = (api: string, env: string, models: object[]) => ({
	api,
	env: [env],
	models: Object.fromEntries(models.map((m) => [(m as { id: string }).id, m]))
});

test('candidates keeps only free, live, text chat models', () => {
	const catalog = Schema.decodeUnknownSync(Catalog)({
		opencode: provider('https://opencode.ai/zen/v1', 'OPENCODE_API_KEY', [
			model('big-pickle'),
			model('paid', { cost: { input: 1, output: 2 } }),
			model('old-free', { status: 'deprecated' })
		]),
		nvidia: provider('https://integrate.api.nvidia.com/v1', 'NVIDIA_API_KEY', [
			model('baai/bge-m3'),
			model('flux', { modalities: { input: ['text'], output: ['image'] } }),
			model('z-ai/glm-5.3')
		]),
		openrouter: provider('https://openrouter.ai/api/v1', 'OPENROUTER_API_KEY', [model('openrouter/free'), model('x/y:free')])
	});
	expect(candidates(catalog).map((c) => `${c.provider}/${c.model}@${c.host}`)).toEqual([
		'opencode/big-pickle@opencode.ai',
		'nvidia/z-ai/glm-5.3@integrate.api.nvidia.com',
		'openrouter/x/y:free@openrouter.ai'
	]);
});

test('readEvents takes the last text and reports errors', () => {
	const out = [
		'{"type":"step_start","part":{}}',
		'{"type":"text","part":{"text":"thinking out loud"}}',
		'not json',
		'{"type":"text","part":{"text":"3R2L5"}}'
	].join('\n');
	expect(readEvents(out)).toEqual({ text: '3R2L5', error: undefined });
	expect(readEvents('{"type":"error","error":{"type":"provider.auth","message":"401"}}')).toEqual({ text: undefined, error: '401' });
});
