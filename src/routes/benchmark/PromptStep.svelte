<script lang="ts">
	import { buildPrompt, parse, type Game } from '#lib/game.js';

	interface Props {
		game: Game;
		response: string;
		onback: () => void;
		onrun: () => void;
	}
	let { game, response = $bindable(), onback, onrun }: Props = $props();

	const prompt = $derived(buildPrompt(game));
	const parsed = $derived(response.trim() ? parse(response) : null);
	let copied = $state(false);
	let copyFailed = $state(false);
	let promptEl: HTMLTextAreaElement | undefined = $state();

	async function copy() {
		try {
			await navigator.clipboard.writeText(prompt);
			copied = true;
			copyFailed = false;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// clipboard can be blocked (permissions, insecure context): select the text for a manual copy
			copyFailed = true;
			promptEl?.select();
		}
	}
</script>

<section class="grid gap-10 lg:grid-cols-2" aria-labelledby="prompt-title">
	<div class="flex flex-col gap-5">
		<header class="flex flex-col gap-2">
			<span class="font-mono text-xs text-primary">01 · Copy</span>
			<h1 id="prompt-title" class="text-3xl font-semibold tracking-tight">Hand it to your model</h1>
			<p class="text-sm text-base-content/60">
				Paste this into any LLM in a fresh chat. It contains the full board, every future food, and
				the rules. Nothing else is needed.
			</p>
		</header>
		<button type="button" class="btn btn-primary btn-lg" onclick={copy} aria-live="polite">
			{copied ? 'Copied to clipboard' : 'Copy prompt'}
		</button>
		{#if copyFailed}
			<p role="alert" class="text-sm text-warning">Couldn't reach the clipboard. The prompt is selected below; copy it manually.</p>
		{/if}
		<details class="collapse-arrow collapse border border-base-300 bg-base-200/60">
			<summary class="collapse-title text-sm">Show the prompt ({prompt.length.toLocaleString()} characters)</summary>
			<div class="collapse-content">
				<textarea
					bind:this={promptEl}
					readonly
					value={prompt}
					aria-label="Generated prompt"
					class="textarea h-80 w-full font-mono text-xs"
				></textarea>
			</div>
		</details>
		<button type="button" class="btn self-start btn-ghost btn-sm" onclick={onback}>← Change seed</button>
	</div>

	<form
		class="flex flex-col gap-5"
		onsubmit={(e) => {
			e.preventDefault();
			if (parsed?.ok) onrun();
		}}
	>
		<header class="flex flex-col gap-2">
			<span class="font-mono text-xs text-primary">02 · Paste</span>
			<h2 class="text-3xl font-semibold tracking-tight">Paste its answer</h2>
			<p class="text-sm text-base-content/60">
				Only the command string, like <code class="font-mono text-base-content">6L1R2L1L6</code>.
				Spaces and line breaks are ignored.
			</p>
		</header>
		<label class="flex flex-col gap-2">
			<span class="sr-only">Model response</span>
			<textarea
				bind:value={response}
				rows="8"
				spellcheck="false"
				autocomplete="off"
				placeholder="3R2L5…"
				class="textarea w-full font-mono text-sm {parsed && !parsed.ok ? 'textarea-error' : ''}"
				aria-invalid={parsed ? !parsed.ok : undefined}
				aria-describedby="response-status"
			></textarea>
		</label>
		<p id="response-status" class="min-h-5 font-mono text-xs" aria-live="polite">
			{#if parsed?.ok}
				<span class="text-success">✓ {parsed.commands.length} commands · {parsed.moves} moves</span>
			{:else if parsed}
				<span class="text-error">{parsed.error} It will score zero.</span>
			{/if}
		</p>
		<div class="flex flex-wrap gap-3">
			<button type="submit" class="btn flex-1 btn-primary" disabled={!parsed?.ok}>Run simulation</button>
			{#if parsed && !parsed.ok}
				<button type="button" class="btn btn-outline btn-error" onclick={onrun}>Score it anyway</button>
			{/if}
		</div>
	</form>
</section>
