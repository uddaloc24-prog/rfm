/**
 * GLOBAL RANKING MODULE — READ ONLY on personal_rankings and user_tags.
 * Never call ELO update. Never call comparison selection.
 * Never write to personal_rankings. Ever.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Minimum number of distinct users who must have ranked a vendor before it
 * receives a global score. Mirrors the HAVING COUNT(DISTINCT user_id) >= 15
 * guard in calculate_and_upsert_global_scores() SQL RPC.
 */
export const MIN_QUALIFIED_USERS = 15;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GlobalScore {
  vendor_id: string;
  global_score: number;
  good_count: number;
  bad_count: number;
  very_bad_count: number;
  total_ratings: number;
  qualified_user_count: number;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// calculateGlobalScore
// ---------------------------------------------------------------------------

/**
 * Calculates the global score for a single vendor using percentile-based ranking.
 * Returns null if the vendor has fewer than MIN_QUALIFIED_USERS distinct rankers.
 *
 * This is a TypeScript mirror of the SQL RPC calculate_and_upsert_global_scores().
 * Use this for unit testing and one-off calculations.
 * For production batch updates, use the SQL RPC (runs hourly via pg_cron).
 *
 * Algorithm:
 *   1. Require rankings.length >= MIN_QUALIFIED_USERS (15); else return null.
 *   2. For each ranking entry:
 *        percentile = total_count === 1
 *          ? 1.0
 *          : (total_count - rank_position) / (total_count - 1)
 *      Where total_count is the total number of vendors ranked by that user.
 *   3. base_score = average of all percentile values.
 *   4. total = good + bad + very_bad
 *      good_ratio     = total > 0 ? good     / total : 0
 *      very_bad_ratio = total > 0 ? very_bad / total : 0
 *   5. sentiment_multiplier = 1 + (good_ratio * 0.2) - (very_bad_ratio * 0.3)
 *   6. global_score = base_score * sentiment_multiplier
 *
 * Pure function — no side effects, no DB calls.
 */
export function calculateGlobalScore(params: {
  vendorId: string;
  rankings: Array<{ rank_position: number; total_count: number }>;
  tagCounts: { good: number; bad: number; very_bad: number };
}): GlobalScore | null {
  const { vendorId, rankings, tagCounts } = params;

  // Step 1: gate on minimum qualified users
  if (rankings.length < MIN_QUALIFIED_USERS) {
    return null;
  }

  // Step 2 + 3: compute percentile for each user's ranking, then average
  let percentileSum = 0;
  for (const { rank_position, total_count } of rankings) {
    const percentile =
      total_count === 1
        ? 1.0
        : (total_count - rank_position) / Math.max(1, total_count - 1);
    percentileSum += percentile;
  }
  const base_score = percentileSum / rankings.length;

  // Step 4: tag ratios
  const { good, bad, very_bad } = tagCounts;
  const total = good + bad + very_bad;
  const good_ratio = total > 0 ? good / total : 0;
  const very_bad_ratio = total > 0 ? very_bad / total : 0;

  // Step 5: sentiment multiplier
  const sentiment_multiplier = 1 + good_ratio * 0.2 - very_bad_ratio * 0.3;

  // Step 6: final global score
  const global_score = base_score * sentiment_multiplier;

  return {
    vendor_id: vendorId,
    global_score,
    good_count: good,
    bad_count: bad,
    very_bad_count: very_bad,
    total_ratings: total,
    qualified_user_count: rankings.length,
    updated_at: new Date().toISOString(),
  };
}
