'use client';

import { CATEGORY_EMOJI } from '@/lib/types';
import type { AdminStats } from './admin-types';

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: number | string;
  color?: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8E2DC',
        borderRadius: '12px',
        padding: '16px 20px',
        flex: 1,
        minWidth: '120px',
      }}
    >
      <div
        style={{
          fontSize: '28px',
          fontWeight: 900,
          color: color ?? '#1A1205',
          lineHeight: 1,
          marginBottom: '4px',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '12px', color: '#9B8E84', fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: '#B8ADA6', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

interface Props {
  stats: AdminStats | null;
  loading: boolean;
  onRefresh: () => void;
}

export default function AdminStatsTab({ stats, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: '#9B8E84', fontSize: '14px' }}>
        Loading stats…
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: '#9B8E84', fontSize: '14px', marginBottom: '12px' }}>
          Could not load stats.
        </p>
        <button
          onClick={onRefresh}
          style={{
            padding: '8px 20px',
            borderRadius: '8px',
            border: '1px solid #E8E2DC',
            background: '#FFFFFF',
            color: '#1A1205',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Refresh */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onRefresh}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid #E8E2DC',
            background: '#FFFFFF',
            color: '#9B8E84',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Totals */}
      <div>
        <p style={{ fontSize: '11px', color: '#9B8E84', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
          All Time
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <StatCard label="Users" value={stats.totals.users} color="#6366F1" />
          <StatCard label="Vendors" value={stats.totals.vendors} color="#E8611A" />
          <StatCard label="Ratings" value={stats.totals.ratings} color="#25D366" />
          <StatCard label="Comparisons" value={stats.totals.comparisons} color="#F4A425" />
        </div>
      </div>

      {/* This Week */}
      <div>
        <p style={{ fontSize: '11px', color: '#9B8E84', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
          This Week
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <StatCard label="New Users" value={stats.thisWeek.newUsers} color="#6366F1" sub="last 7 days" />
          <StatCard label="New Ratings" value={stats.thisWeek.newRatings} color="#25D366" sub="last 7 days" />
        </div>
      </div>

      {/* Alerts */}
      <div>
        <p style={{ fontSize: '11px', color: '#9B8E84', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
          Needs Attention
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <StatCard
            label="Pending Vendors"
            value={stats.alerts.pendingVendors}
            color="#F4A425"
            sub="Need review"
          />
          <StatCard
            label="Flagged Vendors"
            value={stats.alerts.flaggedVendors}
            color="#EF4444"
            sub="Reported by users"
          />
          <StatCard
            label="Missing Coordinates"
            value={stats.alerts.vendorsWithNoCoords}
            color="#9B8E84"
            sub="No map location"
          />
        </div>
      </div>

      {/* Top Lists */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* Top vendors */}
        <div
          style={{
            flex: 1,
            minWidth: '260px',
            background: '#FFFFFF',
            border: '1px solid #E8E2DC',
            borderRadius: '12px',
            padding: '16px 20px',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#1A1205', margin: '0 0 12px' }}>
            Top 5 Most Rated
          </p>
          {stats.topVendors.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#9B8E84' }}>No data yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats.topVendors.map((v, i) => (
                <div
                  key={v.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
                >
                  <span style={{ color: '#E8611A', fontWeight: 900, minWidth: '18px' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontWeight: 600, color: '#1A1205', minWidth: 0 }}>
                    {CATEGORY_EMOJI[v.category]} {v.name}
                    {v.neighbourhood && (
                      <span style={{ fontSize: '11px', color: '#9B8E84', fontWeight: 400, marginLeft: 4 }}>
                        · {v.neighbourhood}
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#E8611A',
                      background: 'rgba(232,97,26,0.08)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {v.total_rating_count} ratings
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top users */}
        <div
          style={{
            flex: 1,
            minWidth: '260px',
            background: '#FFFFFF',
            border: '1px solid #E8E2DC',
            borderRadius: '12px',
            padding: '16px 20px',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#1A1205', margin: '0 0 12px' }}>
            Top 5 Most Active Users
          </p>
          {stats.topUsers.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#9B8E84' }}>No data yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats.topUsers.map((u, i) => (
                <div
                  key={u.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
                >
                  <span style={{ color: '#E8611A', fontWeight: 900, minWidth: '18px' }}>{i + 1}</span>
                  <span style={{ flex: 1, fontWeight: 600, color: '#1A1205', minWidth: 0 }}>
                    {u.display_name}
                    <span style={{ fontSize: '11px', color: '#9B8E84', fontWeight: 400, marginLeft: 4 }}>
                      @{u.username}
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#6366F1',
                      background: 'rgba(99,102,241,0.08)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {u.rating_count} ratings
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
