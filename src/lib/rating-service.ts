/**
 * rating-service.ts — All DB interactions for the rating flow.
 *
 * Call order for a normal rating session:
 *   1. getExistingTag()               — check if user has tagged this vendor before
 *   2. saveTag()                      — save (or update) the sentiment tag
 *   3. selectComparisonCandidates()   — pick up to 2 vendors to compare against
 *   4. processComparison() × 0–2     — for each comparison card the user completes
 *
 * Tables used:
 *   personal_rankings  (user_id, vendor_id, elo_score, rank_position, updated_at)
 *   user_tags          (user_id, vendor_id, tag, created_at)  UNIQUE(user_id, vendor_id)
 *   comparisons        (user_id, winner_vendor_id, loser_vendor_id, created_at)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  DEFAULT_ELO,
  calculateEloUpdate,
  assignRankPositions,
  groupCandidatesByTagPreference,
  type Tag,
  type ComparisonCandidate,
} from './elo';

// ---------------------------------------------------------------------------
// getExistingTag
// ---------------------------------------------------------------------------

/**
 * Returns the user's existing tag for a vendor, or null if they haven't tagged it.
 * Call this BEFORE saveTag so the UI can show the previous choice.
 */
export async function getExistingTag(
  supabase: SupabaseClient,
  userId: string,
  vendorId: string,
): Promise<Tag | null> {
  const { data, error } = await supabase
    .from('user_tags')
    .select('tag')
    .eq('user_id', userId)
    .eq('vendor_id', vendorId)
    .maybeSingle();

  if (error) throw error;
  return (data?.tag as Tag) ?? null;
}

// ---------------------------------------------------------------------------
// saveTag
// ---------------------------------------------------------------------------

/**
 * Saves the user's sentiment tag for a vendor.
 *
 * - New tag: inserts into user_tags, adds vendor to personal_rankings at DEFAULT_ELO=1000.
 * - Re-tag (edge case): updates the tag. Existing ELO is preserved — not reset to 1000.
 *
 * Returns { wasExisting: true } if the user had already tagged this vendor.
 */
export async function saveTag(
  supabase: SupabaseClient,
  userId: string,
  vendorId: string,
  tag: Tag,
): Promise<{ wasExisting: boolean }> {
  const wasExisting = (await getExistingTag(supabase, userId, vendorId)) !== null;

  // Upsert user_tags — inserts new or updates existing tag on conflict.
  const { error: tagError } = await supabase.from('user_tags').upsert(
    { user_id: userId, vendor_id: vendorId, tag },
    { onConflict: 'user_id,vendor_id' },
  );
  if (tagError) throw tagError;

  // Add to personal_rankings only if row doesn't exist yet.
  // ignoreDuplicates: true → INSERT ... ON CONFLICT DO NOTHING
  // This preserves existing ELO on re-tags (does not reset to 1000).
  const { error: rankError } = await supabase.from('personal_rankings').upsert(
    {
      user_id: userId,
      vendor_id: vendorId,
      elo_score: DEFAULT_ELO,
      rank_position: 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,vendor_id', ignoreDuplicates: true },
  );
  if (rankError) throw rankError;

  // Update user rating_count for new tags only (best-effort).
  if (!wasExisting) {
    try {
      await supabase.rpc('increment_user_rating_count', { user_id: userId });
    } catch { /* non-fatal */ }
  }

  return { wasExisting };
}

// ---------------------------------------------------------------------------
// selectComparisonCandidates
// ---------------------------------------------------------------------------

/**
 * Selects up to 2 vendors for the comparison phase.
 *
 * Selection strategy:
 * 1. Fetch all other vendors the user has tagged (excluding the one just rated).
 * 2. Sort by tag preference (same-sentiment first).
 * 3. Shuffle within each tag group.
 * 4. Return first 2.
 *
 * Returns [] if user has 0 other tagged vendors (first-ever tag → skip comparison).
 * Returns [one] if user has exactly 1 other tagged vendor → show 1 comparison card.
 */
export async function selectComparisonCandidates(
  supabase: SupabaseClient,
  userId: string,
  newlyTaggedVendorId: string,
  tag: Tag,
): Promise<ComparisonCandidate[]> {
  // Fetch all other tags for this user.
  const { data: tags, error: tErr } = await supabase
    .from('user_tags')
    .select('vendor_id, tag')
    .eq('user_id', userId)
    .neq('vendor_id', newlyTaggedVendorId);

  if (tErr) throw tErr;
  if (!tags || tags.length === 0) return [];

  // Fetch ELO scores for those vendors.
  const vendorIds = tags.map((t) => t.vendor_id);
  const { data: rankings, error: rkErr } = await supabase
    .from('personal_rankings')
    .select('vendor_id, elo_score')
    .eq('user_id', userId)
    .in('vendor_id', vendorIds);

  if (rkErr) throw rkErr;

  // Join tags + ELO in memory.
  const eloMap = new Map(rankings?.map((r) => [r.vendor_id, r.elo_score as number]) ?? []);
  const candidates: ComparisonCandidate[] = tags.map((t) => ({
    vendor_id: t.vendor_id,
    tag: t.tag as Tag,
    elo_score: eloMap.get(t.vendor_id) ?? DEFAULT_ELO,
  }));

  // Apply tag-preference ordering, return up to 2.
  const ordered = groupCandidatesByTagPreference(candidates, tag);
  return ordered.slice(0, 2);
}

// ---------------------------------------------------------------------------
// processComparison
// ---------------------------------------------------------------------------

/**
 * Saves a comparison result and runs ELO update + community score refresh.
 *
 * Call once per comparison card the user completes (BETTER or WORSE).
 * If the user closes the app before this is called, the tag is already saved —
 * the comparison is skipped and no record is written (edge case #5 from spec).
 */
export async function processComparison(
  supabase: SupabaseClient,
  userId: string,
  winnerVendorId: string,
  loserVendorId: string,
): Promise<void> {
  // Persist the comparison result.
  const { error: compError } = await supabase.from('comparisons').insert({
    user_id: userId,
    winner_vendor_id: winnerVendorId,
    loser_vendor_id: loserVendorId,
  });
  if (compError) throw compError;

  // Update ELO scores and recalculate all rank positions.
  await runEloUpdateAndRecalculate(supabase, userId, winnerVendorId, loserVendorId);

  // Refresh community_score on both vendors (best-effort).
  try {
    await Promise.all([
      supabase.rpc('update_vendor_community_score', { vendor_id: winnerVendorId }),
      supabase.rpc('update_vendor_community_score', { vendor_id: loserVendorId }),
    ]);
  } catch { /* non-fatal */ }
}

// ---------------------------------------------------------------------------
// runEloUpdateAndRecalculate
// ---------------------------------------------------------------------------

/**
 * Fetches ELO scores for both vendors, applies the ELO formula, saves them,
 * then recalculates rank_position for ALL of this user's vendors.
 *
 * Why recalculate all ranks: a score change can shift the position of vendors
 * that weren't involved in this comparison (e.g. winner jumps over #3).
 */
export async function runEloUpdateAndRecalculate(
  supabase: SupabaseClient,
  userId: string,
  winnerVendorId: string,
  loserVendorId: string,
): Promise<void> {
  // Ensure both vendors have a personal_rankings row before running ELO maths.
  // Guards against the case where a candidate was in user_tags but its
  // personal_rankings insert silently failed in an earlier saveTag call.
  await supabase.from('personal_rankings').upsert(
    [
      { user_id: userId, vendor_id: winnerVendorId, elo_score: DEFAULT_ELO, rank_position: 1, updated_at: new Date().toISOString() },
      { user_id: userId, vendor_id: loserVendorId,  elo_score: DEFAULT_ELO, rank_position: 1, updated_at: new Date().toISOString() },
    ],
    { onConflict: 'user_id,vendor_id', ignoreDuplicates: true },
  );

  const { data: rows, error: fetchError } = await supabase
    .from('personal_rankings')
    .select('vendor_id, elo_score, updated_at')
    .eq('user_id', userId)
    .in('vendor_id', [winnerVendorId, loserVendorId]);

  if (fetchError) throw fetchError;
  if (!rows || rows.length !== 2) {
    throw new Error(
      `ELO update failed: expected 2 rows for user ${userId}, ` +
        `vendors [${winnerVendorId}, ${loserVendorId}], got ${rows?.length ?? 0}.`,
    );
  }

  const winnerRow = rows.find((r) => r.vendor_id === winnerVendorId)!;
  const loserRow = rows.find((r) => r.vendor_id === loserVendorId)!;

  const { newWinnerElo, newLoserElo } = calculateEloUpdate(
    winnerRow.elo_score,
    loserRow.elo_score,
  );

  const now = new Date().toISOString();

  // Use UPDATE (not upsert) to avoid resetting rank_position to DEFAULT on conflict
  const [winnerUpdate, loserUpdate] = await Promise.all([
    supabase.from('personal_rankings')
      .update({ elo_score: newWinnerElo, updated_at: now })
      .eq('user_id', userId).eq('vendor_id', winnerVendorId),
    supabase.from('personal_rankings')
      .update({ elo_score: newLoserElo, updated_at: now })
      .eq('user_id', userId).eq('vendor_id', loserVendorId),
  ]);
  if (winnerUpdate.error) throw winnerUpdate.error;
  if (loserUpdate.error) throw loserUpdate.error;

  // Single RPC replaces N individual UPDATE queries (O(1) vs O(N))
  const { error: rankError } = await supabase.rpc('recalculate_user_ranks', { p_user_id: userId });
  if (rankError) throw rankError;
}

// recalculateAllRanks replaced by the recalculate_user_ranks Supabase RPC (migration 013).
// The RPC does a single SQL UPDATE instead of N round-trips.
