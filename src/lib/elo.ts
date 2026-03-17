// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Starting ELO for every newly ranked vendor (DEFAULT_ELO=1000 system). */
export const DEFAULT_ELO = 1000;

/** @deprecated Use DEFAULT_ELO. Kept for any legacy references. */
export const STARTING_RATING = DEFAULT_ELO;

/** K-factor: max ELO swing per comparison. */
export const K = 32;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Sentiment tag a user assigns to a vendor. */
export type Tag = 'good' | 'bad' | 'very_bad';

export interface EloUpdateResult {
  newWinnerElo: number;
  newLoserElo: number;
}

/** Minimum shape required to call assignRankPositions(). */
export interface RankableRow {
  vendor_id: string;
  elo_score: number;
  updated_at: string;
}

export type RankedRow<T extends RankableRow = RankableRow> = T & {
  rank_position: number;
};

/** A candidate returned from comparison selection — tag needed for preference ordering. */
export interface ComparisonCandidate {
  vendor_id: string;
  elo_score: number;
  tag: Tag;
}

// ---------------------------------------------------------------------------
// Tag preference ordering
// ---------------------------------------------------------------------------

/**
 * When selecting comparison restaurants, prefer same-sentiment vendors first.
 * Good → compare against other good vendors first (fair, meaningful comparison).
 * Bad/Very Bad → compare downward in sentiment first.
 */
export const TAG_PREFERENCE: Record<Tag, Tag[]> = {
  good:     ['good', 'bad', 'very_bad'],
  bad:      ['bad', 'very_bad', 'good'],
  very_bad: ['very_bad', 'bad', 'good'],
};

// ---------------------------------------------------------------------------
// ELO calculation
// ---------------------------------------------------------------------------

/**
 * Calculates new ELO scores after one comparison (winner beat loser).
 *
 * - Equal ELOs → each side swings ±K/2 = ±16
 * - Heavy favourite wins → tiny gain (expected outcome)
 * - Underdog wins → large gain (surprising outcome, lots of info)
 * - Always zero-sum: points gained = points lost
 */
export function calculateEloUpdate(winnerElo: number, loserElo: number): EloUpdateResult {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 - expectedWinner;
  return {
    newWinnerElo: winnerElo + K * (1 - expectedWinner),
    newLoserElo: loserElo + K * (0 - expectedLoser),
  };
}

/** @deprecated Use calculateEloUpdate. Kept for any remaining callers. */
export function calculateElo(
  ratingA: number,
  ratingB: number,
  aWon: boolean,
): { newA: number; newB: number } {
  const { newWinnerElo, newLoserElo } = aWon
    ? calculateEloUpdate(ratingA, ratingB)
    : calculateEloUpdate(ratingB, ratingA);
  return aWon
    ? { newA: newWinnerElo, newB: newLoserElo }
    : { newA: newLoserElo, newB: newWinnerElo };
}

// ---------------------------------------------------------------------------
// Rank assignment
// ---------------------------------------------------------------------------

/**
 * Assigns rank_position to every vendor in a user's personal list.
 *
 * - Primary sort: elo_score DESC (higher ELO = better rank)
 * - Tiebreaker: updated_at DESC (more recently updated = higher rank when tied)
 *
 * Pure function — no DB calls. Rank 1 = best.
 */
export function assignRankPositions<T extends RankableRow>(items: T[]): RankedRow<T>[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => {
    if (b.elo_score !== a.elo_score) return b.elo_score - a.elo_score;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return sorted.map((item, i) => ({ ...item, rank_position: i + 1 }));
}

// ---------------------------------------------------------------------------
// Comparison candidate selection
// ---------------------------------------------------------------------------

/**
 * Orders a pool of candidates so same-sentiment vendors surface first.
 * Shuffles within each group (Fisher-Yates) for variety.
 */
export function groupCandidatesByTagPreference(
  candidates: ComparisonCandidate[],
  preferredTag: Tag,
): ComparisonCandidate[] {
  const preferenceOrder = TAG_PREFERENCE[preferredTag];
  const grouped = new Map<Tag, ComparisonCandidate[]>([
    ['good', []],
    ['bad', []],
    ['very_bad', []],
  ]);
  for (const c of candidates) grouped.get(c.tag)!.push(c);

  const result: ComparisonCandidate[] = [];
  for (const prefTag of preferenceOrder) {
    const group = [...grouped.get(prefTag)!];
    fisherYatesShuffle(group);
    result.push(...group);
  }
  return result;
}

function fisherYatesShuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ---------------------------------------------------------------------------
// Display score conversion (used for community_score on vendor cards)
// ---------------------------------------------------------------------------

/**
 * Maps a raw ELO average to a 1-10 display score shown on vendor cards.
 *
 * Range: 800-1200 → 1-10  (centred on DEFAULT_ELO=1000 → 5.5)
 * Used for community_score stored on vendors table, NOT for personal rankings
 * (personal rankings show rank position, not a score).
 */
export function eloToDisplayScore(elo: number): number {
  const clamped = Math.max(800, Math.min(1200, elo));
  const score = ((clamped - 800) / 400) * 9 + 1;
  return Math.round(score * 10) / 10;
}

// ---------------------------------------------------------------------------
// Community score (used by migration 006 RPC reference + admin display)
// ---------------------------------------------------------------------------

/**
 * Compute the community score for a vendor as a weighted average of all
 * users' personal ELO scores. Higher rating_count = more trusted rater.
 */
export function communityScore(
  ratings: Array<{
    personal_score: number;
    gps_verified: boolean;
    user_rating_count: number;
  }>,
): number {
  if (ratings.length === 0) return 0;

  let totalWeight = 0;
  let weightedSum = 0;

  for (const r of ratings) {
    const gpsWeight = r.gps_verified ? 1 : 0.4;
    const trustWeight = Math.min(1, 0.6 + (r.user_rating_count / 50) * 0.4);
    const weight = gpsWeight * trustWeight;
    weightedSum += r.personal_score * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : 0;
}

// ---------------------------------------------------------------------------
// Internal helpers (kept for legacy callers)
// ---------------------------------------------------------------------------

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function newRating(oldRating: number, expected: number, actual: number): number {
  return Math.round((oldRating + K * (actual - expected)) * 100) / 100;
}
