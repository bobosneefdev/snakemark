<script lang="ts">
	import { Shader, MeshGradient, FilmGrain, Vignette } from 'shaders/svelte';

</script>

<div aria-hidden="true" class="pointer-events-none fixed inset-0 -z-10 animate-[fade_2s_ease-out]">
	<Shader class="h-full w-full" disableTelemetry style="opacity: 0.55">
		<MeshGradient
			colorA="#07110c"
			colorB="#1d5c34"
			stops={null}
			count={4}
			swirl={0.6}
			speed={0.25}
			colorSpace="oklab"
		/>
		<FilmGrain strength={0.12} />
		<Vignette color="#060a08" intensity={0.9} radius={0.55} />
	</Shader>
</div>
