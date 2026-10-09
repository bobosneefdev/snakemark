import type { Component } from 'svelte';

type GPU = { requestAdapter(): Promise<unknown> };
let adapter: Promise<boolean> | undefined;

/**
 * Loads a shader component only where WebGPU actually has an adapter, after the page is idle.
 * The shader engine is ~2.5 MB, so it must never block the page or load where it can't run.
 */
export function loadShader<P extends Record<string, unknown>>(
	load: () => Promise<{ default: Component<P> }>,
	set: (c: Component<P>) => void
) {
	let cancelled = false;
	const go = () => {
		const gpu = (navigator as Navigator & { gpu?: GPU }).gpu;
		adapter ??= gpu ? gpu.requestAdapter().then(Boolean, () => false) : Promise.resolve(false);
		adapter.then(async (ok) => {
			if (!ok || cancelled) return;
			const m = await load();
			if (!cancelled) set(m.default);
		});
	};
	// Safari has no requestIdleCallback
	const idle = typeof requestIdleCallback === 'function';
	const id = idle ? requestIdleCallback(go, { timeout: 1500 }) : window.setTimeout(go, 200);
	return () => {
		cancelled = true;
		if (idle) cancelIdleCallback(id);
		else clearTimeout(id);
	};
}
