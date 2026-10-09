import { Option, Schema } from 'effect';
import { Provider } from '@snakemark/core/results';

/** The slice of Pi's bundled model catalog (`pi --mode rpc`, `get_available_models`) we use. */
const CatalogModel = Schema.Struct({
	type: Schema.String,
	id: Schema.String,
	name: Schema.String,
	provider: Schema.String,
	baseUrl: Schema.String,
	input: Schema.Array(Schema.String),
	cost: Schema.Struct({ input: Schema.Number, output: Schema.Number })
});
export const Catalog = Schema.Array(CatalogModel);
export interface Catalog extends Schema.Schema.Type<typeof Catalog> {}

/** env var Pi reads each provider's key from */
export const KEY_ENV: Record<Provider, string> = {
	opencode: 'OPENCODE_API_KEY',
	nvidia: 'NVIDIA_API_KEY',
	openrouter: 'OPENROUTER_API_KEY'
};

export interface Candidate {
	provider: Provider;
	model: string;
	name: string;
	/** the only host the sandbox may reach */
	host: string;
	keyEnv: string;
}

// Free text-output models that aren't chat LLMs (embedders, rerankers, classifiers, domain tools), plus
// OpenRouter's routers, which pick a different model per request.
// ponytail: name-based, so a new non-chat family can slip in; it just scores F until added here.
const NOT_CHAT =
	/embed|rerank|retriever|guard|safety|bge|esm|paligemma|deplot|usdcode|usdvalidate|translate|voice|detector|speaker|^auto$|^openrouter\/(free|fusion)$/i;

/** Free text chat models from the three providers. */
export function candidates(catalog: Catalog): Candidate[] {
	const isProvider = Schema.is(Provider);
	return catalog.flatMap((m) =>
		isProvider(m.provider) &&
		m.type === 'chat' &&
		m.cost.input === 0 &&
		m.cost.output === 0 &&
		m.input.includes('text') &&
		!NOT_CHAT.test(m.id)
			? [
					{
						provider: m.provider,
						model: m.id,
						name: m.name,
						host: new URL(m.baseUrl).host,
						keyEnv: KEY_ENV[m.provider]
					}
				]
			: []
	);
}

const Event = Schema.Struct({
	type: Schema.Literal('message_end'),
	message: Schema.Struct({
		role: Schema.String,
		content: Schema.Array(
			Schema.Struct({
				type: Schema.String,
				text: Schema.optionalKey(Schema.String)
			})
		),
		stopReason: Schema.optionalKey(Schema.String),
		errorMessage: Schema.optionalKey(Schema.String)
	})
});
const decodeEvent = Schema.decodeUnknownOption(Schema.fromJsonString(Event));

/** Reads `pi --mode json` output: the text of the model's last message, or the error that ended it. */
export function readEvents(stdout: string) {
	let text: string | undefined;
	let error: string | undefined;
	for (const line of stdout.split('\n')) {
		const m = Option.getOrUndefined(decodeEvent(line))?.message;
		if (m?.role !== 'assistant') continue;
		const failed = m.stopReason === 'error' || m.stopReason === 'aborted';
		text = failed ? undefined : m.content.flatMap((c) => (c.type === 'text' && c.text !== undefined ? [c.text] : [])).join('');
		error = failed ? (m.errorMessage ?? m.stopReason) : undefined;
	}
	return { text, error };
}
