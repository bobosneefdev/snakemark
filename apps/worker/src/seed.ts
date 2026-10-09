/**
 * The seed for every leaderboard run. Private on purpose: the site discloses the Brutal preset but
 * never this number, so nobody can regenerate the exact board to tune a model against it.
 * Only this worker imports it; the site must never import from apps/worker.
 * Changing it makes every stored result incomparable, so reset packages/core/results.json too.
 */
export const LEADERBOARD_SEED = 1186923840;
