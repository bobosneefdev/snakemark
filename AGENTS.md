## Objective

Evaluate an LLM's ability to perform long-horizon planning, spatial reasoning, state tracking, and decision optimization in a deterministic Snake game without feedback or opportunities to correct its actions.

## Benchmark Flow

### 1. Generate Game

The benchmark runner selects:

- `gridSize` — Board dimensions
- `obstacleCount` — Number of randomly placed blocked cells
- `seed` — Deterministic map and food generation

### 2. Reveal Game State

The LLM receives:

- Board dimensions
- Obstacle coordinates
- Snake's initial head, body, tail, and facing direction
- Complete ordered list of future food spawn coordinates
- Game rules and movement command syntax

### 3. One-Shot Planning

The LLM must calculate its entire movement sequence in advance.

The output is a single compressed movement string.

Example: `6L1R2L1L6`

- Numbers indicate how many cells to move forward.
- `L` indicates a 90° left turn.
- `R` indicates a 90° right turn.

No intermediate feedback or corrections are allowed.

### 4. Execute Simulation

The simulator executes the submitted movement sequence deterministically.

During execution:

- The snake moves according to the submitted instructions.
- Food is collected when the snake head reaches its coordinate.
- The snake grows by 1 in length after consuming food.
- Collisions with walls, obstacles, or its own body end the game.

Execution also ends when the command sequence is exhausted or the predefined move limit is reached.

### 5. Score Performance

Primary metric:

\- Total food collected

Secondary metrics:

- Survival duration
- Movement efficiency
- Output validity
- Performance relative to a reference solver

### 6. Aggregate Results

Repeat the benchmark across multiple:

- Grid sizes
- Obstacle counts and configurations
- Random seeds
- Difficulty tiers

Report average scores, success rates, and performance by difficulty tier.

## Core Rules

1. One input only: The LLM submits exactly one complete movement sequence.
2. Perfect future information: All future food coordinates are revealed before planning.
3. No feedback: The LLM cannot observe or modify the simulation after submission.
4. Deterministic execution: Identical configurations and movement sequences always produce identical results.
5. Fixed limits: Each game has a predefined move budget and finite food sequence.
6. Fair comparison: Every model receives the same game instances and constraints.
7. Defined edge cases: Food spawning on occupied cells, malformed commands, and other ambiguous situations must follow explicit rules.

## What It Measures

The benchmark measures how effectively an LLM can generate an optimized, long-horizon action sequence while accounting for spatial constraints, future objectives, and the consequences of its own previous actions.

Core challenge for the LLM: Plan the entire game before making the first move.

## Default Skills You Need to Use
- caveman -> Use "lite" mode unless told otherwise
- ponytail -> Use "full" mode unless told otherwise

## Tech Stack
- TypeScript 7 (6 for compat if needed)
- Bun v1.4
- Svelte 5
- SvelteKit 3
- Effect v4 for any server side code and schemas for DTOs, etc.
- BitsUI for dynamic components
- DaisyUI for themes and static components
- Shaders.com for fancy GPU-accelerated design
- Motion.dev for animations
- Cloudflare for hosting

## Where it'll live
- Cloudflare pages, hosted on snakemark.bobosneef.dev

## Goal
Build an absolutely sick website that will be the home of the benchmark. bobosneef.dev will eventually be my developer work portfolio, so this site can't disappoint, but should also feel refreshingly minimal. There should be 4 pages: home, benchmark, leaderboard, and docs.

On the benchmark page this should be the flow:
- Enter the variables
- Click a "Copy prompt button"
- User gives the prompt to the LLM, site now waits for response entry
- The LLM should respond with ONLY the L1R5... style response
- User pastes the response back into the site
- The site starts playing the simulation of the gameplay for you, you can pick 1x, 2x, 5x, or just skip.
- The final score is revealed in an epic manner to the user

## Leaderboard
- Only results we collect ourselves go on the leaderboard page, under "Free LLM Leaderboard".
- A daily job benchmarks every free text-to-text LLM from build.nvidia.com, OpenCode Zen and OpenRouter that hasn't been benchmarked yet.
- Each run uses the stock OpenCode harness with every tool denied, sandboxed with no internet (only the model's own API host is reachable).
- Always the fixed game settings. The page discloses them; the seed stays private in the `LEADERBOARD_SEED` repo secret. Never commit, log or hard-code it.

## Repo layout
Turborepo + Bun workspaces. Shared game logic lives in `packages/core` and is used by both `apps/site` and `apps/worker`. Never duplicate it.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
