import { Option, Schema } from 'effect';
import { Provider } from '@snakemark/core/results';

/** The slice of OpenCode's model catalog (models.opencode.ai/api.json, a models.dev mirror) we use. */
const CatalogModel = Schema.Struct({
	id: Schema.String,
	name: Schema.String,
	status: Schema.optionalKey(Schema.String),
	cost: Schema.optionalKey(Schema.Struct({ input: Schema.Number, output: Schema.Number })),
	modalities: Schema.optionalKey(Schema.Struct({ input: Schema.Array(Schema.String), output: Schema.Array(Schema.String) })),
	provider: Schema.optionalKey(Schema.Struct({ api: Schema.optionalKey(Schema.String) }))
});
const CatalogProvider = Schema.Struct({
	api: Schema.String,
	env: Schema.Array(Schema.String),
	models: Schema.Record(Schema.String, CatalogModel)
});
export const Catalog = Schema.Struct({
	opencode: CatalogProvider,
	nvidia: CatalogProvider,
	openrouter: CatalogProvider
});
export interface Catalog extends Schema.Schema.Type<typeof Catalog> {}

export interface Candidate {
	provider: Provider;
	model: string;
	name: string;
	/** the only host the sandbox may reach */
	host: string;
	/** env var OpenCode reads the provider key from */
	keyEnv: string;
}

// Free text-output models that aren't chat LLMs: embedders, rerankers, classifiers, domain tools.
// ponytail: name-based, so a new non-chat family can slip in; it just scores F until added here.
const NOT_CHAT = /embed|rerank|retriever|guard|safety|bge|esm|paligemma|deplot|usdcode|usdvalidate|translate|voice|detector|speaker|^openrouter\/free$/i;

/** Free, live, text-in/text-out chat models from the three providers. */
export function candidates(catalog: Catalog): Candidate[] {
	return Provider.literals.flatMap((provider) => {
		const p = catalog[provider];
		return Object.values(p.models)
			.filter(
				(m) =>
					m.cost?.input === 0 &&
					m.cost.output === 0 &&
					m.status !== 'deprecated' &&
					m.modalities?.input.includes('text') === true &&
					m.modalities.output.length === 1 &&
					m.modalities.output[0] === 'text' &&
					!NOT_CHAT.test(m.id)
			)
			.map((m) => ({
				provider,
				model: m.id,
				name: m.name,
				host: new URL(m.provider?.api ?? p.api).host,
				keyEnv: p.env[0]
			}));
	});
}

const Event = Schema.Union([
	Schema.Struct({ type: Schema.tag('text'), part: Schema.Struct({ text: Schema.String }) }),
	Schema.Struct({ type: Schema.tag('error'), error: Schema.Struct({ message: Schema.String }) })
]);
const decodeEvent = Schema.decodeUnknownOption(Schema.fromJsonString(Event));

/** Reads `opencode run --format json` output: the last text the model wrote, and any error. */
export function readEvents(stdout: string) {
	let text: string | undefined;
	let error: string | undefined;
	for (const line of stdout.split('\n')) {
		const e = Option.getOrUndefined(decodeEvent(line));
		if (e?.type === 'text') text = e.part.text;
		else if (e?.type === 'error') error = e.error.message;
	}
	return { text, error };
}
