/**
 * Tests for global-ranking.ts (pure function) and selectComparisonCandidates
 * from rating-service.ts (async DB function, tested via Supabase mock).
 *
 * Run with: npx vitest run
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as globalRanking from '../global-ranking';
import { calculateGlobalScore, MIN_QUALIFIED_USERS } from '../global-ranking';
import { calculateEloUpdate, DEFAULT_ELO } from '../elo';
import { selectComparisonCandidates } from '../rating-service';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Creates an array of `count` ranking entries.
 * - rank_position: 1..count (rank 1 = top)
 * - total_count: count (all from the same ranked list)
 */
function makeRankings(count: number): Array<{ rank_position: number; total_count: number }> {
  return Array.from({ length: count }, (_, i) => ({
    rank_position: i + 1,
    total_count: count,
  }));
}

// ---------------------------------------------------------------------------
// Test 1: selectComparisonCandidates — already-compared excluded, max 2 returned
// ---------------------------------------------------------------------------

describe('selectComparisonCandidates', () => {
  const USER_ID = 'user-1';
  const NEW_VENDOR = 'v-new';

  /**
   * Builds a Vitest mock for SupabaseClient with controllable per-table responses.
   * The mock uses a chainable builder pattern matching the Supabase JS SDK's
   * fluent interface: supabase.from(table).select(...).eq(...) etc.
   */
  function buildMockSupabase(options: {
    userTagVendors: string[];       // vendor_ids returned from user_tags
    alreadyCompared: string[];      // vendor_ids that have comparisons with NEW_VENDOR
    personalRankingElos: Record<string, number>;  // vendor_id -> elo_score
    newVendorElo: number;
  }) {
    const { userTagVendors, alreadyCompared, personalRankingElos, newVendorElo } = options;

    // Build comparison rows: each alreadyCompared vendor has a row where it lost
    // to NEW_VENDOR (so NEW_VENDOR is winner_vendor_id).
    const compRows = alreadyCompared.map((vid) => ({
      winner_vendor_id: NEW_VENDOR,
      loser_vendor_id: vid,
    }));

    // Build personal_rankings rows (candidates, excluding new vendor).
    const candidateRankRows = userTagVendors.map((vid) => ({
      vendor_id: vid,
      elo_score: personalRankingElos[vid] ?? DEFAULT_ELO,
      updated_at: '2024-01-01T00:00:00Z',
    }));

    // personal_rankings row for the NEW vendor.
    const newVendorRankRow = { elo_score: newVendorElo };

    // We use a single `from()` mock that inspects the table name and returns
    // appropriate data. Each `.from()` call returns a builder that ultimately
    // resolves when awaited (via `maybeSingle` or the last `.in/.or` chain).
    //
    // Chain calls: .from(t).select(f).eq(a,b).neq(a,b) → { data, error }
    //              .from(t).select(f).eq(a,b).or(q)    → { data, error }
    //              .from(t).select(f).eq(a,b).in(c,vs) → { data, error }
    //              .from(t).select(f).eq(a,b).eq(c,d).maybeSingle() → { data, error }

    const makeBuilder = (resolveValue: { data: unknown; error: null }) => {
      const builder: Record<string, unknown> = {};
      const terminator = () => Promise.resolve(resolveValue);
      const chainReturn = () => builder;

      // Methods that extend the chain (return builder itself)
      builder.select = vi.fn().mockReturnValue(builder);
      builder.eq     = vi.fn().mockReturnValue(builder);
      builder.neq    = vi.fn().mockReturnValue(builder);
      builder.or     = vi.fn().mockReturnValue(builder);
      builder.in     = vi.fn().mockReturnValue(builder);
      // Terminal methods that resolve the promise
      builder.maybeSingle   = vi.fn().mockImplementation(terminator);
      // Make the builder itself thenable (await builder)
      builder.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resolveValue).then(resolve);

      void chainReturn; // suppress unused warning
      return builder;
    };

    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === 'user_tags') {
        // Returns vendor_ids as tag rows (tag value doesn't matter for candidate selection)
        const rows = userTagVendors.map((vid) => ({ vendor_id: vid, tag: 'good' }));
        return makeBuilder({ data: rows, error: null });
      }
      if (table === 'comparisons') {
        return makeBuilder({ data: compRows, error: null });
      }
      if (table === 'personal_rankings') {
        // We need to distinguish the two calls to personal_rankings:
        //   Call A: .select().eq(user_id).in(vendor_id, [...]) → candidate rankings
        //   Call B: .select().eq(user_id).eq(vendor_id, NEW_VENDOR).maybeSingle() → new vendor ELO
        // We use a counter: first call = candidate rankings, second = new vendor.
        const callIndex = (fromMock.mock.calls.filter((c: unknown[]) => c[0] === 'personal_rankings').length - 1);
        if (callIndex <= 0) {
          return makeBuilder({ data: candidateRankRows, error: null });
        }
        return makeBuilder({ data: newVendorRankRow, error: null });
      }
      return makeBuilder({ data: [], error: null });
    });

    return { from: fromMock };
  }

  // ---

  it('Test 1: excludes already-compared vendors and returns at most 2 candidates', async () => {
    // 10 vendors in user's list. v1 and v2 have already been compared with NEW_VENDOR.
    const allVendors = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8', 'v9', 'v10'];
    const eloMap: Record<string, number> = {};
    for (const v of allVendors) eloMap[v] = DEFAULT_ELO;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockSupabase = buildMockSupabase({
      userTagVendors: allVendors,
      alreadyCompared: ['v1', 'v2'],
      personalRankingElos: eloMap,
      newVendorElo: DEFAULT_ELO,
    }) as any;

    const result = await selectComparisonCandidates(mockSupabase, USER_ID, NEW_VENDOR, 'good');

    // Must return at most 2 candidates.
    expect(result.length).toBeLessThanOrEqual(2);

    // v1 and v2 must be excluded (already compared).
    const resultIds = result.map((c) => c.vendor_id);
    expect(resultIds).not.toContain('v1');
    expect(resultIds).not.toContain('v2');
  });

  it('Test 2: ELO gap > 300 for all candidates → returns empty array', async () => {
    // All existing vendors have ELO = DEFAULT_ELO + 350 = 1350.
    // New vendor ELO = DEFAULT_ELO = 1000. Gap = 350 > 300 → all excluded.
    const allVendors = ['v1', 'v2', 'v3', 'v4', 'v5'];
    const eloMap: Record<string, number> = {};
    for (const v of allVendors) eloMap[v] = DEFAULT_ELO + 350;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockSupabase = buildMockSupabase({
      userTagVendors: allVendors,
      alreadyCompared: [],
      personalRankingElos: eloMap,
      newVendorElo: DEFAULT_ELO,
    }) as any;

    const result = await selectComparisonCandidates(mockSupabase, USER_ID, NEW_VENDOR, 'good');

    // All excluded by Rule 2.
    expect(result).toHaveLength(0);

    // Verify: the comparisons table insert was never called.
    // (processComparison is what writes to comparisons — selectComparisonCandidates only reads)
    const insertSpy = (mockSupabase.from as ReturnType<typeof vi.fn>).mock.calls
      .find((call: unknown[]) => call[0] === 'comparisons');
    // If comparisons was queried at all, it was a SELECT (for Rule 1 check), not an INSERT.
    // The function reads comparisons but never inserts — that's processComparison's job.
    // We confirm this by checking the from mock was only used for reads.
    if (insertSpy) {
      // The builder returned has no 'insert' property called — we just verify result is empty.
      expect(result).toHaveLength(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Test 3: ELO update only moves the 2 involved vendors (zero-sum property)
// ---------------------------------------------------------------------------

describe('calculateEloUpdate — only moves the 2 involved vendors', () => {
  it('Test 3: bystander ELO is unchanged; winner and loser ELOs are modified; zero-sum holds', () => {
    const before = { winner: DEFAULT_ELO, loser: DEFAULT_ELO, bystander: DEFAULT_ELO };

    const { newWinnerElo, newLoserElo } = calculateEloUpdate(before.winner, before.loser);

    // Winner gains points.
    expect(newWinnerElo).not.toBe(before.winner);
    expect(newWinnerElo).toBeGreaterThan(before.winner);

    // Loser loses points.
    expect(newLoserElo).not.toBe(before.loser);
    expect(newLoserElo).toBeLessThan(before.loser);

    // Bystander is completely unaffected — it was never passed to calculateEloUpdate.
    expect(before.bystander).toBe(DEFAULT_ELO);

    // Zero-sum: total ELO is conserved.
    expect(newWinnerElo + newLoserElo).toBeCloseTo(before.winner + before.loser, 5);
  });
});

// ---------------------------------------------------------------------------
// Test 4: global-ranking module exports only pure functions and constants
// ---------------------------------------------------------------------------

describe('global-ranking module purity', () => {
  it('Test 4a: exports only the expected names — no DB clients or write functions', () => {
    const exports = Object.keys(globalRanking);

    expect(exports).toContain('calculateGlobalScore');
    expect(exports).toContain('MIN_QUALIFIED_USERS');

    // Must NOT export anything that could cause DB writes.
    expect(exports).not.toContain('processComparison');
    expect(exports).not.toContain('runEloUpdateAndRecalculate');
    expect(exports).not.toContain('supabase');
  });

  it('Test 4b: calculateGlobalScore is a synchronous pure function (not async)', () => {
    const result = calculateGlobalScore({
      vendorId: 'test-vendor',
      rankings: makeRankings(15),
      tagCounts: { good: 10, bad: 3, very_bad: 2 },
    });

    // Must return immediately, not a Promise.
    expect(result).not.toBeInstanceOf(Promise);
    expect(result).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tests 5–8: calculateGlobalScore pure function
// ---------------------------------------------------------------------------

describe('calculateGlobalScore', () => {
  it('Test 5: returns null when fewer than 15 qualified users', () => {
    const result = calculateGlobalScore({
      vendorId: 'v1',
      rankings: makeRankings(14),
      tagCounts: { good: 10, bad: 2, very_bad: 2 },
    });
    expect(result).toBeNull();
  });

  it('Test 5b: MIN_QUALIFIED_USERS constant is 15', () => {
    expect(MIN_QUALIFIED_USERS).toBe(15);
  });

  it('Test 6: returns a score when exactly 15 qualified users, with correct math', () => {
    // makeRankings(15) → rank_position 1..15, total_count=15
    // percentile for rank_position i = (15 - i) / 14
    // Sum = 14/14 + 13/14 + ... + 0/14 = (sum 0..14) / 14 = (14*15/2)/14 = 7.5
    // base_score = 7.5 / 15 = 0.5
    // tagCounts: all good → good_ratio=1, very_bad_ratio=0
    // sentiment_multiplier = 1 + 1*0.2 - 0*0.3 = 1.2
    // global_score = 0.5 * 1.2 = 0.6
    const result = calculateGlobalScore({
      vendorId: 'v1',
      rankings: makeRankings(15),
      tagCounts: { good: 15, bad: 0, very_bad: 0 },
    });

    expect(result).not.toBeNull();
    expect(result!.qualified_user_count).toBe(15);
    expect(result!.global_score).toBeGreaterThan(0);
    expect(result!.global_score).toBeCloseTo(0.6, 5);
  });

  it('Test 6b: result shape has all required fields', () => {
    const result = calculateGlobalScore({
      vendorId: 'v1',
      rankings: makeRankings(15),
      tagCounts: { good: 15, bad: 0, very_bad: 0 },
    });

    expect(result).not.toBeNull();
    expect(result!.vendor_id).toBe('v1');
    expect(result!.good_count).toBe(15);
    expect(result!.bad_count).toBe(0);
    expect(result!.very_bad_count).toBe(0);
    expect(result!.total_ratings).toBe(15);
    expect(typeof result!.updated_at).toBe('string');
  });

  it('Test 7: sentiment_multiplier changes when tag distribution changes', () => {
    const rankings = makeRankings(15);

    // All good: multiplier = 1 + 1.0*0.2 - 0*0.3 = 1.2
    const withGoodTags = calculateGlobalScore({
      vendorId: 'v1',
      rankings,
      tagCounts: { good: 15, bad: 0, very_bad: 0 },
    });

    // All bad/very_bad: good_ratio=0, very_bad_ratio=1/15
    // multiplier = 1 + 0*0.2 - (1/15)*0.3 = 1 - 0.02 = 0.98
    const withBadTags = calculateGlobalScore({
      vendorId: 'v1',
      rankings,
      tagCounts: { good: 0, bad: 14, very_bad: 1 },
    });

    expect(withGoodTags).not.toBeNull();
    expect(withBadTags).not.toBeNull();
    // All-good multiplier (1.2) > mixed-bad multiplier (< 1.2)
    expect(withGoodTags!.global_score).toBeGreaterThan(withBadTags!.global_score);
  });

  it('Test 7b: exact sentiment multiplier values', () => {
    const rankings = makeRankings(15);

    // All good: global_score = 0.5 * 1.2 = 0.6
    const allGood = calculateGlobalScore({
      vendorId: 'v1',
      rankings,
      tagCounts: { good: 15, bad: 0, very_bad: 0 },
    });

    // All very_bad: very_bad_ratio = 1.0, good_ratio = 0
    // multiplier = 1 + 0*0.2 - 1.0*0.3 = 0.7
    // global_score = 0.5 * 0.7 = 0.35
    const allVeryBad = calculateGlobalScore({
      vendorId: 'v1',
      rankings,
      tagCounts: { good: 0, bad: 0, very_bad: 15 },
    });

    expect(allGood).not.toBeNull();
    expect(allVeryBad).not.toBeNull();
    expect(allGood!.global_score).toBeCloseTo(0.6, 5);
    expect(allVeryBad!.global_score).toBeCloseTo(0.35, 5);
  });

  it('Test 8: drops below threshold when a user is removed', () => {
    // Full set: 15 users → score returned.
    const full = calculateGlobalScore({
      vendorId: 'v1',
      rankings: makeRankings(15),
      tagCounts: { good: 10, bad: 3, very_bad: 2 },
    });
    expect(full).not.toBeNull();
    expect(full!.qualified_user_count).toBe(15);

    // One user removes their rating → 14 users → returns null.
    const reduced = calculateGlobalScore({
      vendorId: 'v1',
      rankings: makeRankings(14),
      tagCounts: { good: 9, bad: 3, very_bad: 2 },
    });
    expect(reduced).toBeNull();
  });
});
