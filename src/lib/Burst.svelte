<script lang="ts">
	import { Shader, SunBurst, FilmGrain, Vignette } from 'shaders/svelte';

	let { color, great }: { color: string; great: boolean } = $props();
</script>

<Shader class="size-full" disableTelemetry>
	<SunBurst {color} background="#0b120e" rayCount={great ? 20 : 12} softness={0.5} radius={0.9} feather={0.7} speed={great ? 0.35 : 0.15} />
	<FilmGrain strength={0.15} />
	<Vignette color="#0b120e" intensity={1} radius={0.45} />
</Shader>
