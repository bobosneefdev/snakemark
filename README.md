# SnakeBench

One-shot Snake planning benchmark for LLMs. Live at **https://snakebench.bobosneef.dev**.

The model gets the full board and every future food, then must reply with one movement
string (`6L1R2L1L6`). The site plays it back and scores it. See `/docs` on the site for
the full rules.

## Develop

```sh
bun install
bun run dev        # http://localhost:5173
bun run test       # engine + worker tests
bun run check      # svelte-check + TypeScript
```

## Deploy

The site is fully prerendered and served as static assets on Cloudflare Workers.

```sh
bunx wrangler login   # once
bun run deploy        # build + upload; custom domain is set in apps/site/wrangler.jsonc
```

## Layout

Turborepo monorepo on Bun workspaces.

- `packages/core`: shared by the site and the worker, so both score games identically.
  - `src/game.ts`: seeded generation, parser, simulator, reference solver, prompt builder, grading.
  - `src/results.ts` + `results.json`: leaderboard schema and data.
- `apps/site`: SvelteKit site.
  - `src/lib/Board.svelte`: canvas board renderer.
  - `src/lib/playback.svelte.ts`: `requestAnimationFrame` playback, tweens between game steps.
  - `src/routes/benchmark/`: the four-step flow: Configure, Prompt, Simulate, Score.
  - `src/routes/leaderboard/`: reads `results.json` at build time.
  - WebGPU shaders (`shaders`) load lazily and only where a GPU adapter exists.
- `apps/worker`: the daily leaderboard runner.

## Leaderboard

`.github/workflows/leaderboard.yml` runs daily. It lists every free text model from OpenCode
Zen, NVIDIA and OpenRouter using OpenCode's model catalog. It skips models already in
`packages/core/results.json` and runs the rest on the Brutal preset. The seed is private,
hard-coded in `apps/worker/src/seed.ts`. New results are committed and the site redeploys.

Each run is stock OpenCode (`opencode run`, version pinned in the workflow) inside
bubblewrap. Every namespace is unshared, so the sandbox has no network. Its only way out is a
host-side proxy that tunnels to that model's API host and nothing else. Models that error
(rate limits, outages) are not recorded and are retried the next day. A model still running
after 15 minutes scores as an invalid response.

Repo secrets: `OPENCODE_API_KEY`, `NVIDIA_API_KEY`, `OPENROUTER_API_KEY`,
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. Providers without a key are skipped.

Run it locally on Linux with `bwrap` and `opencode` installed:

```sh
OPENROUTER_API_KEY=... bun run bench
```
