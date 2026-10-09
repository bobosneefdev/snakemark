import { SETTINGS } from '@snakebench/core';
import { decodeResults, rank } from '@snakebench/core/results';
import raw from '@snakebench/core/results.json';

// Runs only at prerender: raw responses stay in the repo and never reach the browser.
export const load = () => {
	const { reference, entries } = decodeResults(raw);
	return {
		reference,
		settings: SETTINGS,
		entries: rank(entries).map(({ response: _, ...e }) => e)
	};
};
