'use client';

import { useState, useMemo } from 'react';
import { User, Vendor, VendorStatus } from '@/lib/types';
import AdminImportPanel from './AdminImportPanel';
import AdminVendorTable from './AdminVendorTable';
import AdminUserTable from './AdminUserTable';
import AdminActivityFeed from './AdminActivityFeed';
import AdminStatsTab from './AdminStatsTab';
import type {
  ActivityEntry,
  AdminStats,
  VendorSort,
  VendorStatusFilter,
  UserStatusFilter,
  UserSort,
  ActivityTagFilter,
} from './admin-types';

interface Stats {
  userCount: number;
  vendorCount: number;
}

interface Props {
  stats: Stats;
  users: User[];
  vendors: Vendor[];
  initialActivity: ActivityEntry[];
  emailMap: Record<string, string>;
}

type Tab = 'vendors' | 'users' | 'activity' | 'stats';

export default function AdminDashboard({ stats, users, vendors, initialActivity, emailMap }: Props) {
  const [tab, setTab] = useState<Tab>('vendors');
  const [vendorList, setVendorList] = useState<Vendor[]>(vendors);
  const [userList, setUserList] = useState<User[]>(users);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Import panel state
  const [importQuery, setImportQuery] = useState('street food stalls Bangalore');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // User action state
  const [banningUser, setBanningUser] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banError, setBanError] = useState('');
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  // Vendor edit state
  const [editingVendor, setEditingVendor] = useState<string | null>(null);
  const [vendorEdits, setVendorEdits] = useState<Record<string, string>>({});

  // Vendor filter/sort state
  const [vendorStatusFilter, setVendorStatusFilter] = useState<VendorStatusFilter>('all');
  const [vendorSort, setVendorSort] = useState<VendorSort>('date_desc');

  // User filter/sort state
  const [userStatusFilter, setUserStatusFilter] = useState<UserStatusFilter>('all');
  const [userSort, setUserSort] = useState<UserSort>('newest');

  // Activity state
  const [activityList, setActivityList] = useState<ActivityEntry[]>(initialActivity);
  const [activityTagFilter, setActivityTagFilter] = useState<ActivityTagFilter>('all');
  const [activityHasMore, setActivityHasMore] = useState(initialActivity.length === 50);
  const [activityLoading, setActivityLoading] = useState(false);

  // Stats tab state (lazy-loaded)
  const [statsData, setStatsData] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsFetched, setStatsFetched] = useState(false);

  // Derived maps (memoized)
  const userMap = useMemo(() => new Map(userList.map((u) => [u.id, u])), [userList]);
  const vendorMap = useMemo(() => new Map(vendorList.map((v) => [v.id, v])), [vendorList]);

  // Filtered + sorted vendors
  const filteredVendors = useMemo(() => {
    let list = vendorList;
    if (vendorStatusFilter !== 'all') list = list.filter((v) => v.status === vendorStatusFilter);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((v) => v.name.toLowerCase().includes(s) || (v.neighbourhood ?? '').toLowerCase().includes(s));
    }
    switch (vendorSort) {
      case 'name_asc': return [...list].sort((a, b) => a.name.localeCompare(b.name));
      case 'most_rated': return [...list].sort((a, b) => b.total_rating_count - a.total_rating_count);
      case 'highest_score': return [...list].sort((a, b) => b.community_score - a.community_score);
      default: return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [vendorList, vendorStatusFilter, vendorSort, search]);

  // Filtered + sorted users
  const filteredUsers = useMemo(() => {
    let list = userList;
    if (userStatusFilter === 'active') list = list.filter((u) => !u.is_banned);
    else if (userStatusFilter === 'banned') list = list.filter((u) => u.is_banned);
    else if (userStatusFilter === 'private') list = list.filter((u) => u.is_private && !u.is_banned);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((u) => u.display_name.toLowerCase().includes(s) || u.username.toLowerCase().includes(s));
    }
    switch (userSort) {
      case 'most_ratings': return [...list].sort((a, b) => b.rating_count - a.rating_count);
      case 'username_asc': return [...list].sort((a, b) => a.username.localeCompare(b.username));
      default: return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [userList, userStatusFilter, userSort, search]);

  // ── Handlers ──────────────────────────────────────────────────────────────

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

  async function handleDeleteUser(userId: string) {
    setUpdating(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      if (res.ok) {
        setUserList((prev) => prev.filter((u) => u.id !== userId));
        setDeletingUser(null);
      } else {
        const d = await res.json();
        setBanError(d.error ?? 'Delete failed');
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
      if (edits.category) body.category = edits.category;
      if (edits.open_since) body.open_since = edits.open_since;

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
      setImportResult(
        data.error
          ? `Error: ${data.error}`
          : `Imported ${data.inserted} new vendors (${data.skipped ?? 0} already existed)`
      );
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

  async function loadMoreActivity() {
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/admin/activity?offset=${activityList.length}`);
      const data = await res.json();
      const newItems: ActivityEntry[] = data.activities ?? [];
      setActivityList((prev) => [...prev, ...newItems]);
      setActivityHasMore(newItems.length === 50);
    } finally {
      setActivityLoading(false);
    }
  }

  function loadStats() {
    setStatsData(null);
    setStatsLoading(true);
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data) => setStatsData(data))
      .catch(() => setStatsData(null))
      .finally(() => setStatsLoading(false));
  }

  function handleTabChange(t: Tab) {
    setTab(t);
    setSearch('');
    if (t === 'stats' && !statsFetched) {
      setStatsFetched(true);
      loadStats();
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

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
        }}
      >
        <div>
          <h1 style={{ color: '#E8611A', fontWeight: 900, fontSize: '20px', margin: 0, letterSpacing: '-0.5px' }}>
            rfm. Admin
          </h1>
          <p style={{ color: '#9B8E84', fontSize: '12px', margin: '2px 0 0' }}>Real Food Map of India</p>
        </div>
        <button
          onClick={async () => {
            await fetch('/api/admin/auth', { method: 'DELETE' });
            window.location.href = '/auth';
          }}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            border: '1px solid #3A3030',
            background: 'transparent',
            color: '#9B8E84',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Log out
        </button>
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
          {(['vendors', 'users', 'activity', 'stats'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              style={{
                padding: '14px 18px',
                fontWeight: tab === t ? 600 : 400,
                color: tab === t ? '#E8611A' : '#9B8E84',
                background: 'transparent',
                border: 'none',
                borderBottom: tab === t ? '2px solid #E8611A' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {t === 'vendors'
                ? `Vendors (${stats.vendorCount})`
                : t === 'users'
                ? `Users (${stats.userCount})`
                : t === 'activity'
                ? 'Activity'
                : 'Stats'}
            </button>
          ))}
        </div>
        {tab !== 'activity' && tab !== 'stats' && (
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
          <>
            <AdminImportPanel
              importQuery={importQuery}
              onQueryChange={setImportQuery}
              onImport={runImport}
              importing={importing}
              importResult={importResult}
            />
            <AdminVendorTable
              vendors={filteredVendors}
              allVendors={vendorList}
              statusFilter={vendorStatusFilter}
              onStatusFilter={setVendorStatusFilter}
              vendorSort={vendorSort}
              onVendorSort={setVendorSort}
              updating={updating}
              editingVendor={editingVendor}
              vendorEdits={vendorEdits}
              onEditStart={(id, edits) => { setEditingVendor(id); setVendorEdits(edits); }}
              onEditChange={(key, val) => setVendorEdits((prev) => ({ ...prev, [key]: val }))}
              onSave={saveVendorEdit}
              onCancelEdit={() => setEditingVendor(null)}
              onStatusChange={updateVendorStatus}
            />
          </>
        )}

        {tab === 'users' && (
          <AdminUserTable
            users={filteredUsers}
            allUsers={userList}
            statusFilter={userStatusFilter}
            onStatusFilter={setUserStatusFilter}
            userSort={userSort}
            onUserSort={setUserSort}
            emailMap={emailMap}
            updating={updating}
            banningUser={banningUser}
            banReason={banReason}
            banError={banError}
            deletingUser={deletingUser}
            onBanAction={handleBanAction}
            onDeleteUser={handleDeleteUser}
            onSetBanning={setBanningUser}
            onSetDeleting={setDeletingUser}
            onBanReasonChange={setBanReason}
          />
        )}

        {tab === 'activity' && (
          <AdminActivityFeed
            activities={activityList}
            userMap={userMap}
            vendorMap={vendorMap}
            tagFilter={activityTagFilter}
            onTagFilter={setActivityTagFilter}
            hasMore={activityHasMore}
            onLoadMore={loadMoreActivity}
            loading={activityLoading}
          />
        )}

        {tab === 'stats' && (
          <AdminStatsTab
            stats={statsData}
            loading={statsLoading}
            onRefresh={loadStats}
          />
        )}
      </div>
    </div>
  );
}
