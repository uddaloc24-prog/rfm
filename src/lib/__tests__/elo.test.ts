/**
 * Tests for the pure functions in elo.ts.
 *
 * Compatible with Vitest and Jest (same API).
 * Run with: npx vitest  OR  npx jest
 */

import { describe, it, expect } from 'vitest';
import {
  K,
  DEFAULT_ELO,
  calculateEloUpdate,
  assignRankPositions,
  groupCandidatesByTagPreference,
  TAG_PREFERENCE,
  type ComparisonCandidate,
} from '../elo';

// ---------------------------------------------------------------------------
// calculateEloUpdate
// ---------------------------------------------------------------------------

describe('calculateEloUpdate', () => {
  it('equal ELOs → each side swings by exactly K/2', () => {
    const { newWinnerElo, newLoserElo } = calculateEloUpdate(1000, 1000);
    expect(newWinnerElo).toBeCloseTo(1000 + K / 2); // 1016
    expect(newLoserElo).toBeCloseTo(1000 - K / 2);  // 984
  });

  it('is zero-sum — total ELO is conserved', () => {
    const pairs: [number, number][] = [
      [1000, 1000],
      [1200, 800],
      [900, 1400],
      [1600, 1550],
    ];
    for (const [w, l] of pairs) {
      const { newWinnerElo, newLoserElo } = calculateEloUpdate(w, l);
      expect(newWinnerElo + newLoserElo).toBeCloseTo(w + l, 5);
    }
  });

  it('heavy favourite wins → small gain (expected outcome)', () => {
    const { newWinnerElo } = calculateEloUpdate(1400, 1000);
    const gain = newWinnerElo - 1400;
    expect(gain).toBeGreaterThan(0);
    expect(gain).toBeLessThan(K * 0.1);
  });

  it('underdog wins → large gain (surprise outcome)', () => {
    const { newWinnerElo } = calculateEloUpdate(1000, 1400);
    const gain = newWinnerElo - 1000;
    expect(gain).toBeGreaterThan(K * 0.85);
    expect(gain).toBeLessThanOrEqual(K);
  });

  it('loser always loses points', () => {
    const cases: [number, number][] = [[1000, 1000], [800, 1200], [1200, 800]];
    for (const [w, l] of cases) {
      const { newLoserElo } = calculateEloUpdate(w, l);
      expect(newLoserElo).toBeLessThan(l);
    }
  });

  it('winner always gains points', () => {
    const cases: [number, number][] = [[1000, 1000], [800, 1200], [1200, 800]];
    for (const [w, l] of cases) {
      const { newWinnerElo } = calculateEloUpdate(w, l);
      expect(newWinnerElo).toBeGreaterThan(w);
    }
  });

  it('uses K=32 as the cap', () => {
    const { newWinnerElo } = calculateEloUpdate(200, 2200);
    expect(newWinnerElo - 200).toBeCloseTo(K, 0);
  });
});

// ---------------------------------------------------------------------------
// assignRankPositions
// ---------------------------------------------------------------------------

describe('assignRankPositions', () => {
  it('assigns rank 1 to the highest ELO', () => {
    const items = [
      { vendor_id: 'a', elo_score: 900,  updated_at: '2024-01-01T00:00:00Z' },
      { vendor_id: 'b', elo_score: 1100, updated_at: '2024-01-01T00:00:00Z' },
      { vendor_id: 'c', elo_score: 1000, updated_at: '2024-01-01T00:00:00Z' },
    ];
    const ranked = assignRankPositions(items);
    const byId = Object.fromEntries(ranked.map(r => [r.vendor_id, r.rank_position]));

    expect(byId['b']).toBe(1);
    expect(byId['c']).toBe(2);
    expect(byId['a']).toBe(3);
  });

  it('tiebreaker: more recently updated vendor gets higher rank', () => {
    const items = [
      { vendor_id: 'a', elo_score: 1000, updated_at: '2024-01-01T00:00:00Z' },
      { vendor_id: 'b', elo_score: 1000, updated_at: '2024-01-02T00:00:00Z' },
    ];
    const ranked = assignRankPositions(items);
    const byId = Object.fromEntries(ranked.map(r => [r.vendor_id, r.rank_position]));

    expect(byId['b']).toBe(1);
    expect(byId['a']).toBe(2);
  });

  it('ranks are contiguous integers starting at 1', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      vendor_id: String(i),
      elo_score: 1000 + i * 10,
      updated_at: '2024-01-01T00:00:00Z',
    }));
    const ranked = assignRankPositions(items);
    const positions = ranked.map(r => r.rank_position).sort((a, b) => a - b);
    expect(positions).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not mutate the original array', () => {
    const items = [
      { vendor_id: 'a', elo_score: 900,  updated_at: '2024-01-01T00:00:00Z' },
      { vendor_id: 'b', elo_score: 1100, updated_at: '2024-01-01T00:00:00Z' },
    ];
    const original = items.map(x => ({ ...x }));
    assignRankPositions(items);
    expect(items[0].vendor_id).toBe(original[0].vendor_id);
    expect(items[1].vendor_id).toBe(original[1].vendor_id);
  });

  it('handles a single item — rank_position = 1', () => {
    const ranked = assignRankPositions([
      { vendor_id: 'only', elo_score: 1000, updated_at: '2024-01-01T00:00:00Z' },
    ]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0].rank_position).toBe(1);
  });

  it('handles an empty array', () => {
    expect(assignRankPositions([])).toEqual([]);
  });

  it('preserves extra properties on the rows', () => {
    const items = [
      { vendor_id: 'a', elo_score: 1050, updated_at: '2024-01-01T00:00:00Z', name: 'Taaza' },
      { vendor_id: 'b', elo_score: 950,  updated_at: '2024-01-01T00:00:00Z', name: 'MTR' },
    ];
    const ranked = assignRankPositions(items);
    expect(ranked.find(r => r.vendor_id === 'a')!.name).toBe('Taaza');
    expect(ranked.find(r => r.vendor_id === 'b')!.name).toBe('MTR');
  });
});

// ---------------------------------------------------------------------------
// groupCandidatesByTagPreference
// ---------------------------------------------------------------------------

describe('groupCandidatesByTagPreference', () => {
  const c = (id: string, tag: ComparisonCandidate['tag']): ComparisonCandidate => ({
    vendor_id: id,
    tag,
    elo_score: DEFAULT_ELO,
  });

  it('groups in the correct preference order for each tag type', () => {
    const candidates: ComparisonCandidate[] = [
      c('good1', 'good'),
      c('bad1',  'bad'),
      c('vb1',   'very_bad'),
    ];

    const goodResult = groupCandidatesByTagPreference(candidates, 'good');
    expect(goodResult[0].tag).toBe('good');
    expect(goodResult[1].tag).toBe('bad');
    expect(goodResult[2].tag).toBe('very_bad');

    const badResult = groupCandidatesByTagPreference(candidates, 'bad');
    expect(badResult[0].tag).toBe('bad');
    expect(badResult[1].tag).toBe('very_bad');
    expect(badResult[2].tag).toBe('good');

    const vbResult = groupCandidatesByTagPreference(candidates, 'very_bad');
    expect(vbResult[0].tag).toBe('very_bad');
    expect(vbResult[1].tag).toBe('bad');
    expect(vbResult[2].tag).toBe('good');
  });

  it('all items are returned (none dropped)', () => {
    const candidates = [c('a', 'good'), c('b', 'good'), c('c', 'bad'), c('d', 'very_bad')];
    const result = groupCandidatesByTagPreference(candidates, 'good');
    expect(result).toHaveLength(4);
    expect(result.map(r => r.vendor_id).sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('handles empty candidates list', () => {
    expect(groupCandidatesByTagPreference([], 'good')).toEqual([]);
  });

  it('handles all candidates having the same tag', () => {
    const candidates = [c('a', 'good'), c('b', 'good'), c('c', 'good')];
    const result = groupCandidatesByTagPreference(candidates, 'good');
    expect(result).toHaveLength(3);
    expect(result.every(r => r.tag === 'good')).toBe(true);
  });

  it('handles a tag with no matching candidates — falls back to others', () => {
    const candidates = [c('a', 'bad'), c('b', 'bad')];
    const result = groupCandidatesByTagPreference(candidates, 'good');
    expect(result).toHaveLength(2);
    expect(result.every(r => r.tag === 'bad')).toBe(true);
  });

  it('TAG_PREFERENCE covers all three tags with all three values', () => {
    const allTags = ['good', 'bad', 'very_bad'] as const;
    for (const tag of allTags) {
      expect(TAG_PREFERENCE[tag]).toHaveLength(3);
      expect([...TAG_PREFERENCE[tag]].sort()).toEqual(['bad', 'good', 'very_bad']);
    }
  });
});

// ---------------------------------------------------------------------------
// Integration: calculateEloUpdate feeds into assignRankPositions
// ---------------------------------------------------------------------------

describe('ELO update integration', () => {
  it('rank order changes correctly after a comparison', () => {
    let items = [
      { vendor_id: 'A', elo_score: 1000, updated_at: '2024-01-01T00:00:00Z' },
      { vendor_id: 'B', elo_score: 1000, updated_at: '2024-01-01T00:00:00Z' },
    ];

    const { newWinnerElo: newA, newLoserElo: newB } = calculateEloUpdate(
      items[0].elo_score,
      items[1].elo_score,
    );

    const now = new Date().toISOString();
    items = [
      { vendor_id: 'A', elo_score: newA, updated_at: now },
      { vendor_id: 'B', elo_score: newB, updated_at: now },
    ];

    const ranked = assignRankPositions(items);
    const byId = Object.fromEntries(ranked.map(r => [r.vendor_id, r.rank_position]));

    expect(byId['A']).toBe(1);
    expect(byId['B']).toBe(2);
  });

  it('repeated wins build a clear ranking over multiple comparisons', () => {
    let elos: Record<string, number> = { A: 1000, B: 1000, C: 1000 };
    const now = () => new Date().toISOString();

    const comparisons: [string, string][] = [['A', 'B'], ['A', 'C'], ['B', 'C']];
    for (const [winner, loser] of comparisons) {
      const { newWinnerElo, newLoserElo } = calculateEloUpdate(elos[winner], elos[loser]);
      elos[winner] = newWinnerElo;
      elos[loser] = newLoserElo;
    }

    const items = Object.entries(elos).map(([vendor_id, elo_score]) => ({
      vendor_id,
      elo_score,
      updated_at: now(),
    }));
    const ranked = assignRankPositions(items);
    const byId = Object.fromEntries(ranked.map(r => [r.vendor_id, r.rank_position]));

    expect(byId['A']).toBe(1);
    expect(byId['B']).toBe(2);
    expect(byId['C']).toBe(3);
  });
});
