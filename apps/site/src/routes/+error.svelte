<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} · Snakemark</title></svelte:head>

<section class="flex flex-col items-center gap-4 py-32 text-center">
	<p class="font-mono text-sm text-error">{page.status}</p>
	<h1 class="text-4xl font-semibold tracking-tight">Crashed into a wall.</h1>
	<p class="text-base-content/60">{page.status === 404 ? "This page doesn't exist." : page.error?.message}</p>
	<a href="/" class="btn mt-4 btn-primary">Back home</a>
</section>
