<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { Component } from 'svelte';
	import { loadShader } from '#lib/gpu.js';
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	let Backdrop: Component | undefined = $state();
	$effect(() => loadShader(() => import('#lib/Backdrop.svelte'), (c) => (Backdrop = c)));

	const links = [
		['/', 'Home'],
		['/benchmark', 'Benchmark'],
		['/docs', 'Docs']
	] as const;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#0b120e" />
</svelte:head>

<a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 btn btn-sm">
	Skip to content
</a>

<!-- CSS glow is the base layer; the WebGPU mesh gradient fades in over it when available -->
<div aria-hidden="true" class="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(ellipse_at_top,oklch(30%_0.08_150/.45),transparent_60%)]"></div>
{#if Backdrop}<Backdrop />{/if}

<div class="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 sm:px-8">
	<header class="flex items-center justify-between py-6">
		<a href="/" class="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight">
			<span class="grid size-6 place-items-center rounded-md bg-primary text-primary-content">
				<svg viewBox="0 0 16 16" class="size-3.5" fill="currentColor" aria-hidden="true">
					<path d="M2 2h8v4H6v2h8v6H2v-4h8V8H2z" />
				</svg>
			</span>
			snakebench
		</a>
		<nav aria-label="Main">
			<ul class="flex gap-0.5 text-sm sm:gap-1">
				{#each links as [href, label] (href)}
					{@const active = href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href)}
					<li>
						<a
							{href}
							aria-current={active ? 'page' : undefined}
							class="rounded-field px-2.5 py-1.5 transition-colors sm:px-3 hover:text-base-content {active
								? 'bg-base-300/60 text-base-content'
								: 'text-base-content/60'}">{label}</a
						>
					</li>
				{/each}
			</ul>
		</nav>
	</header>

	<main id="main" class="flex-1">
		{@render children()}
	</main>

	<footer class="flex flex-col gap-2 py-10 text-xs text-base-content/40 sm:flex-row sm:justify-between">
		<span>Plan everything. Watch it unfold.</span>
		<a href="https://bobosneef.dev" class="hover:text-base-content/70">bobosneef.dev</a>
	</footer>
</div>
