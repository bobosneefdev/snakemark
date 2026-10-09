import { animate, stagger } from 'motion';
import type { Attachment } from 'svelte/attachments';

/** Fades and lifts every `[data-reveal]` descendant in sequence on mount. */
export const reveal =
	(delay = 0): Attachment<HTMLElement> =>
	(node) => {
		const items = node.querySelectorAll('[data-reveal]');
		const a = animate(
			items,
			{ opacity: [0, 1], y: [14, 0], filter: ['blur(6px)', 'blur(0px)'] },
			{ duration: 0.7, delay: stagger(0.07, { startDelay: delay }), ease: [0.22, 1, 0.36, 1] }
		);
		return () => a.stop();
	};
