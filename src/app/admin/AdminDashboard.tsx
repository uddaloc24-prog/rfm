'use client';

import { useState } from 'react';
import { User, Vendor, VendorStatus, CATEGORY_EMOJI, CATEGORY_LABELS } from '@/lib/types';

interface Stats {
  userCount: number;
  vendorCount: number;
  ratingCount: number;
  comparisonCount: number;
}

interface RecentRating {
  personal_score: number;
  created_at: string;
  user_id: string;
  vendor_id: string;
}

interface Props {
  stats: Stats;
  users: User[];
  vendors: Vendor[];
  recentRatings: RecentRating[];
}

type Tab = 'vendors' | 'users' | 'activity';

const STATUS_COLORS: Record<VendorStatus, string> = {
  pending: '#F4A425',
  verified: '#25D366',
  flagged: '#EF4444',
  removed: '#9B8E84',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminDashboard({ stats, users, vendors, recentRatings }: Props) {
  const [tab, setTab] = useState<Tab>('vendors');
  const [vendorList, setVendorList] = useState<Vendor[]>(vendors);
  const [userList, setUserList] = useState<User[]>(users);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [importQuery, setImportQuery] = useState('street food stalls Bangalore');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [banningUser, setBanningUser] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banError, setBanError] = useState('');
  const [editingVendor, setEditingVendor] = useState<string | null>(null);
  const [vendorEdits, setVendorEdits] = useState<Record<string, string>>({});

  async function handleBanAction(userId: string, action: 'ban' | 'unban') {
    setUpdating(userId);
    setBanError('');
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action, reason: action === 'ban' ? banReason : undefined }),
      });
      if (res.ok) {
        setUserList((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, is_banned: action === 'ban', ban_reason: action === 'ban' ? banReason : null }
              : u
          )
        );
        setBanningUser(null);
        setBanReason('');
      } else {
        const d = await res.json();
        setBanError(d.error ?? 'Failed');
      }
    } finally {
      setUpdating(null);
    }
  }

  async function saveVendorEdit(vendorId: string) {
    setUpdating(vendorId);
    try {
      const edits = vendorEdits;
      const body: Record<string, unknown> = { vendor_id: vendorId };
      if (edits.name) body.name = edits.name;
      if (edits.neighbourhood !== undefined) body.neighbourhood = edits.neighbourhood;
      if (edits.hours !== undefined) body.hours = edits.hours;
      if (edits.price_range !== undefined) body.price_range = edits.price_range;
      if (edits.known_for !== undefined) body.known_for = edits.known_for;
      if (edits.lat) body.lat = parseFloat(edits.lat);
      if (edits.lng) body.lng = parseFloat(edits.lng);

      const res = await fetch('/api/admin/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const d = await res.json();
        setVendorList((prev) => prev.map((v) => (v.id === vendorId ? d.vendor : v)));
        setEditingVendor(null);
        setVendorEdits({});
      }
    } finally {
      setUpdating(null);
    }
  }

  async function runImport() {
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch('/api/admin/import-places', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: importQuery, maxResults: 20 }),
      });
      const data = await res.json();
      if (data.error) {
        setImportResult(`Error: ${data.error}`);
      } else {
        setImportResult(`Imported ${data.inserted} new vendors (${data.skipped ?? 0} already existed)`);
      }
    } catch {
      setImportResult('Network error');
    } finally {
      setImporting(false);
    }
  }

  async function updateVendorStatus(vendorId: string, status: VendorStatus) {
    setUpdating(vendorId);
    try {
      const res = await fetch('/api/admin/vendors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId, status }),
      });
      if (res.ok) {
        setVendorList((prev) => prev.map((v) => (v.id === vendorId ? { ...v, status } : v)));
      }
    } finally {
      setUpdating(null);
    }
  }

  const userMap = new Map(users.map((u) => [u.id, u]));
  const vendorMap = new Map(vendorList.map((v) => [v.id, v]));

  const filteredVendors = vendorList.filter(
    (v) =>
      !search ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      (v.neighbourhood ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const filteredUsers = userList.filter(
    (u) =>
      !search ||
      u.display_name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header
        style={{
          background: '#1A1205',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ color: '#E8611A', fontWeight: 900, fontSize: '20px', margin: 0, letterSpacing: '-0.5px' }}>
            rfm. Admin
          </h1>
          <p style={{ color: '#9B8E84', fontSize: '12px', margin: '2px 0 0' }}>Real Food Map of India</p>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          {[
            { label: 'Users', value: stats.userCount },
            { label: 'Vendors', value: stats.vendorCount },
            { label: 'Ratings', value: stats.ratingCount },
            { label: 'Comparisons', value: stats.comparisonCount },
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '20px', lineHeight: 1 }}>{value}</div>
              <div style={{ color: '#9B8E84', fontSize: '11px', marginTop: '2px' }}>{label}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Search + Tabs */}
      <div
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E8E2DC',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', gap: '0' }}>
          {(['vendors', 'users', 'activity'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '14px 18px',
                fontWeight: tab === t ? 600 : 400,
                color: tab === t ? '#E8611A' : '#9B8E84',
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t ? '2px solid #E8611A' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                textTransform: 'capitalize',
              }}
            >
              {t} {t === 'vendors' ? `(${stats.vendorCount})` : t === 'users' ? `(${stats.userCount})` : ''}
            </button>
          ))}
        </div>
        {tab !== 'activity' && (
          <input
            type="text"
            placeholder={tab === 'vendors' ? 'Search vendors…' : 'Search users…'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              marginLeft: 'auto',
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid #E8E2DC',
              fontSize: '13px',
              outline: 'none',
              width: '220px',
              color: '#1A1205',
            }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
        {tab === 'vendors' && (
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E8E2DC',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '20px',
            }}
          >
            <p style={{ fontWeight: 700, fontSize: '14px', color: '#1A1205', margin: '0 0 4px' }}>
              Import from Google Places
            </p>
            <p style={{ fontSize: '12px', color: '#9B8E84', margin: '0 0 12px' }}>
              Each import adds up to 20 vendors. Run different queries for variety.
            </p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={importQuery}
                onChange={(e) => setImportQuery(e.target.value)}
                placeholder="e.g. dosa restaurants Bangalore"
                style={{
                  flex: 1,
                  minWidth: '220px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #E8E2DC',
                  fontSize: '13px',
                  color: '#1A1205',
                  outline: 'none',
                }}
              />
              <button
                onClick={runImport}
                disabled={importing || !importQuery.trim()}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  background: importing ? '#E8E2DC' : '#E8611A',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: importing ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {importing ? 'Importing…' : 'Import'}
              </button>
            </div>
            {importResult && (
              <p style={{ marginTop: '10px', fontSize: '13px', color: importResult.startsWith('Error') ? '#EF4444' : '#25D366', fontWeight: 500 }}>
                {importResult}
              </p>
            )}
            <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {['street food stalls Bangalore', 'Udupi restaurants Bangalore', 'chai shops Bangalore', 'mess tiffin Bangalore', 'biryani restaurants Bangalore'].map((q) => (
                <button
                  key={q}
                  onClick={() => setImportQuery(q)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: '1px solid #E8E2DC',
                    background: importQuery === q ? 'rgba(232,97,26,0.08)' : '#FAFAF8',
                    color: importQuery === q ? '#E8611A' : '#9B8E84',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: importQuery === q ? 600 : 400,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === 'vendors' && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E8E2DC' }}>
                  {['Name', 'Category', 'Neighbourhood', 'Ratings', 'Score', 'Status', 'Actions'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '8px 12px',
                        color: '#9B8E84',
                        fontWeight: 600,
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((v) => (
                  <>
                    <tr
                      key={v.id}
                      style={{ borderBottom: editingVendor === v.id ? 'none' : '1px solid #F0EBE5', opacity: v.status === 'removed' ? 0.5 : 1 }}
                    >
                      <td style={{ padding: '10px 12px', color: '#1A1205', fontWeight: 500 }}>
                        {CATEGORY_EMOJI[v.category]} {v.name}
                        {!v.lat && <span style={{ fontSize: '10px', color: '#C4B9B0', marginLeft: 4 }}>📌 no coords</span>}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#9B8E84' }}>{CATEGORY_LABELS[v.category]}</td>
                      <td style={{ padding: '10px 12px', color: '#9B8E84' }}>{v.neighbourhood ?? '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#9B8E84' }}>{v.total_rating_count}</td>
                      <td style={{ padding: '10px 12px', color: '#E8611A', fontWeight: 600 }}>
                        {v.community_score > 0 ? v.community_score.toFixed(1) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            background: STATUS_COLORS[v.status] + '22',
                            color: STATUS_COLORS[v.status],
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <ActionButton
                            label="✎ Edit"
                            color="#6366F1"
                            disabled={updating === v.id}
                            onClick={() => {
                              setEditingVendor(v.id);
                              setVendorEdits({ name: v.name, neighbourhood: v.neighbourhood ?? '', hours: v.hours ?? '', price_range: v.price_range ?? '', known_for: v.known_for ?? '', lat: v.lat?.toString() ?? '', lng: v.lng?.toString() ?? '' });
                            }}
                          />
                          {v.status !== 'verified' && (
                            <ActionButton
                              label="✓ Verify"
                              color="#25D366"
                              disabled={updating === v.id}
                              onClick={() => updateVendorStatus(v.id, 'verified')}
                            />
                          )}
                          {v.status !== 'flagged' && (
                            <ActionButton
                              label="⚑ Flag"
                              color="#F4A425"
                              disabled={updating === v.id}
                              onClick={() => updateVendorStatus(v.id, 'flagged')}
                            />
                          )}
                          {v.status !== 'removed' && (
                            <ActionButton
                              label="✕ Remove"
                              color="#EF4444"
                              disabled={updating === v.id}
                              onClick={() => updateVendorStatus(v.id, 'removed')}
                            />
                          )}
                          {v.status === 'removed' && (
                            <ActionButton
                              label="↩ Restore"
                              color="#9B8E84"
                              disabled={updating === v.id}
                              onClick={() => updateVendorStatus(v.id, 'pending')}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                    {editingVendor === v.id && (
                      <tr key={`${v.id}-edit`} style={{ borderBottom: '1px solid #F0EBE5', background: '#F8F5FF' }}>
                        <td colSpan={7} style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                            {[
                              { key: 'name', placeholder: 'Name' },
                              { key: 'neighbourhood', placeholder: 'Neighbourhood' },
                              { key: 'hours', placeholder: 'Hours (e.g. 8am–10pm)' },
                              { key: 'price_range', placeholder: 'Price range (e.g. ₹50–150)' },
                              { key: 'known_for', placeholder: 'Known for' },
                              { key: 'lat', placeholder: 'Lat (e.g. 12.9716)' },
                              { key: 'lng', placeholder: 'Lng (e.g. 77.5946)' },
                            ].map(({ key, placeholder }) => (
                              <input
                                key={key}
                                type="text"
                                placeholder={placeholder}
                                value={vendorEdits[key] ?? ''}
                                onChange={(e) => setVendorEdits((prev) => ({ ...prev, [key]: e.target.value }))}
                                style={{ padding: '6px 10px', borderRadius: '7px', border: '1px solid #E8E2DC', fontSize: '12px', color: '#1A1205', outline: 'none' }}
                              />
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <ActionButton
                              label="Save"
                              color="#6366F1"
                              disabled={updating === v.id}
                              onClick={() => saveVendorEdit(v.id)}
                            />
                            <ActionButton
                              label="Cancel"
                              color="#9B8E84"
                              disabled={false}
                              onClick={() => setEditingVendor(null)}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {filteredVendors.length === 0 && (
              <p style={{ textAlign: 'center', color: '#9B8E84', padding: '40px', fontSize: '14px' }}>No vendors found</p>
            )}
          </div>
        )}

        {tab === 'users' && (
          <div style={{ overflowX: 'auto' }}>
            {banError && (
              <p style={{ color: '#EF4444', fontSize: '13px', marginBottom: '8px' }}>{banError}</p>
            )}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E8E2DC' }}>
                  {['User', 'Username', 'City', 'Ratings', 'Status', 'Joined', 'Actions'].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '8px 12px',
                        color: '#9B8E84',
                        fontWeight: 600,
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <>
                    <tr key={u.id} style={{ borderBottom: banningUser === u.id ? 'none' : '1px solid #F0EBE5', opacity: u.is_banned ? 0.7 : 1 }}>
                      <td style={{ padding: '10px 12px', color: '#1A1205', fontWeight: 500 }}>{u.display_name}</td>
                      <td style={{ padding: '10px 12px', color: '#9B8E84' }}>@{u.username}</td>
                      <td style={{ padding: '10px 12px', color: '#9B8E84' }}>{u.city}</td>
                      <td style={{ padding: '10px 12px', color: '#9B8E84' }}>{u.rating_count}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            background: u.is_banned ? '#EF444422' : u.is_private ? '#F4A42522' : '#25D36622',
                            color: u.is_banned ? '#EF4444' : u.is_private ? '#F4A425' : '#25D366',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          {u.is_banned ? 'Banned' : u.is_private ? 'Private' : 'Public'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#9B8E84' }}>{timeAgo(u.created_at)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        {u.is_banned ? (
                          <ActionButton
                            label="↩ Unban"
                            color="#25D366"
                            disabled={updating === u.id}
                            onClick={() => handleBanAction(u.id, 'unban')}
                          />
                        ) : (
                          <ActionButton
                            label="⊘ Ban"
                            color="#EF4444"
                            disabled={updating === u.id}
                            onClick={() => { setBanningUser(u.id); setBanReason(''); setBanError(''); }}
                          />
                        )}
                      </td>
                    </tr>
                    {banningUser === u.id && (
                      <tr key={`${u.id}-ban`} style={{ borderBottom: '1px solid #F0EBE5', background: '#FFF5F5' }}>
                        <td colSpan={7} style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              autoFocus
                              type="text"
                              placeholder="Reason for ban (optional)"
                              value={banReason}
                              onChange={(e) => setBanReason(e.target.value)}
                              style={{ flex: 1, padding: '6px 10px', borderRadius: '7px', border: '1px solid #E8E2DC', fontSize: '12px', color: '#1A1205', outline: 'none' }}
                            />
                            <ActionButton
                              label="Confirm Ban"
                              color="#EF4444"
                              disabled={updating === u.id}
                              onClick={() => handleBanAction(u.id, 'ban')}
                            />
                            <ActionButton
                              label="Cancel"
                              color="#9B8E84"
                              disabled={false}
                              onClick={() => setBanningUser(null)}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <p style={{ textAlign: 'center', color: '#9B8E84', padding: '40px', fontSize: '14px' }}>No users found</p>
            )}
          </div>
        )}

        {tab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ color: '#9B8E84', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
              Last 50 ratings
            </p>
            {recentRatings.map((r, i) => {
              const u = userMap.get(r.user_id);
              const v = vendorMap.get(r.vendor_id);
              return (
                <div
                  key={i}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E8E2DC',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '13px',
                  }}
                >
                  <span style={{ color: '#9B8E84', minWidth: '60px', fontSize: '11px' }}>{timeAgo(r.created_at)}</span>
                  <span style={{ fontWeight: 600, color: '#1A1205' }}>{u?.display_name ?? 'Unknown'}</span>
                  <span style={{ color: '#9B8E84' }}>rated</span>
                  <span style={{ fontWeight: 600, color: '#1A1205' }}>
                    {v ? `${CATEGORY_EMOJI[v.category]} ${v.name}` : 'Unknown vendor'}
                  </span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: 'rgba(232,97,26,0.08)',
                      color: '#E8611A',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  >
                    {r.personal_score}
                  </span>
                </div>
              );
            })}
            {recentRatings.length === 0 && (
              <p style={{ textAlign: 'center', color: '#9B8E84', padding: '40px', fontSize: '14px' }}>No activity yet</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  color,
  disabled,
  onClick,
}: {
  label: string;
  color: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '4px 10px',
        borderRadius: '7px',
        border: `1px solid ${color}`,
        color,
        background: 'transparent',
        fontSize: '11px',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}
