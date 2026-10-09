# SnakeBench

One-shot Snake planning benchmark for LLMs. Live at **https://snakebench.bobosneef.dev**.

The model gets the full board and every future food, then must reply with one movement
string (`6L1R2L1L6`). The site plays it back and scores it. See `/docs` on the site for
the full rules.

## Develop

```sh
bun install
bun run dev        # http://localhost:5173
bun run test       # engine tests (parser, simulator, generator, reference solver)
bun run check      # svelte-check + TypeScript
```

## Deploy

The site is fully prerendered and served as static assets on Cloudflare Workers. No
server code, secrets or environment variables are needed.

```sh
bunx wrangler login   # once
bun run deploy        # build + upload; custom domain is set in wrangler.jsonc
```

## Layout

- `src/lib/game.ts`: everything game-related: seeded generation, parser, simulator,
  reference solver, prompt builder, grading.
- `src/lib/Board.svelte`: canvas board renderer.
- `src/lib/playback.svelte.ts`: `requestAnimationFrame` playback, runs at the display's
  refresh rate and tweens between game steps.
- `src/routes/benchmark/`: the four-step flow: Configure, Prompt, Simulate, Score.
- WebGPU shaders (`shaders`) load lazily and only where a GPU adapter exists.
