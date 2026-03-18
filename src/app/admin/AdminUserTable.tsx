'use client';

import { User } from '@/lib/types';
import ActionButton from './ActionButton';
import { timeAgo, type UserStatusFilter, type UserSort } from './admin-types';

const USER_STATUS_OPTIONS: { value: UserStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'banned', label: 'Banned' },
  { value: 'private', label: 'Private' },
];

const USER_SORT_OPTIONS: { value: UserSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'most_ratings', label: 'Most Ratings' },
  { value: 'username_asc', label: 'Username A–Z' },
];

interface Props {
  users: User[];
  allUsers: User[];
  statusFilter: UserStatusFilter;
  onStatusFilter: (f: UserStatusFilter) => void;
  userSort: UserSort;
  onUserSort: (s: UserSort) => void;
  emailMap: Record<string, string>;
  updating: string | null;
  banningUser: string | null;
  banReason: string;
  banError: string;
  deletingUser: string | null;
  onBanAction: (id: string, action: 'ban' | 'unban') => void;
  onDeleteUser: (id: string) => void;
  onSetBanning: (id: string | null) => void;
  onSetDeleting: (id: string | null) => void;
  onBanReasonChange: (r: string) => void;
}

export default function AdminUserTable({
  users,
  allUsers,
  statusFilter,
  onStatusFilter,
  userSort,
  onUserSort,
  emailMap,
  updating,
  banningUser,
  banReason,
  banError,
  deletingUser,
  onBanAction,
  onDeleteUser,
  onSetBanning,
  onSetDeleting,
  onBanReasonChange,
}: Props) {
  // Count badges
  const counts = {
    all: allUsers.length,
    active: allUsers.filter((u) => !u.is_banned).length,
    banned: allUsers.filter((u) => u.is_banned).length,
    private: allUsers.filter((u) => u.is_private && !u.is_banned).length,
  };

  return (
    <>
      {/* Filter pills + sort */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {USER_STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onStatusFilter(value)}
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                border: `1px solid ${statusFilter === value ? '#E8611A' : '#E8E2DC'}`,
                background: statusFilter === value ? '#E8611A' : 'transparent',
                color: statusFilter === value ? '#FFFFFF' : '#9B8E84',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {label} ({counts[value]})
            </button>
          ))}
        </div>
        <select
          value={userSort}
          onChange={(e) => onUserSort(e.target.value as UserSort)}
          style={{
            marginLeft: 'auto',
            padding: '5px 10px',
            borderRadius: '8px',
            border: '1px solid #E8E2DC',
            fontSize: '12px',
            color: '#1A1205',
            background: '#FFFFFF',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {USER_SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {banError && (
        <p style={{ color: '#EF4444', fontSize: '13px', marginBottom: '8px' }}>{banError}</p>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
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
            {users.map((u) => (
              <>
                <tr
                  key={u.id}
                  style={{
                    borderBottom: banningUser === u.id || deletingUser === u.id ? 'none' : '1px solid #F0EBE5',
                    opacity: u.is_banned ? 0.7 : 1,
                  }}
                >
                  <td style={{ padding: '10px 12px', color: '#9B8E84', fontSize: '12px' }}>
                    {emailMap[u.id] ?? '—'}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#1A1205', fontWeight: 500 }}>
                    {u.display_name}
                  </td>
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
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {u.is_banned ? (
                        <ActionButton
                          label="↩ Unban"
                          color="#25D366"
                          disabled={updating === u.id}
                          onClick={() => onBanAction(u.id, 'unban')}
                        />
                      ) : (
                        <ActionButton
                          label="⊘ Ban"
                          color="#EF4444"
                          disabled={updating === u.id}
                          onClick={() => { onSetBanning(u.id); onSetDeleting(null); onBanReasonChange(''); }}
                        />
                      )}
                      <ActionButton
                        label="✕ Delete"
                        color="#7F1D1D"
                        disabled={updating === u.id}
                        onClick={() => { onSetDeleting(u.id); onSetBanning(null); }}
                      />
                    </div>
                  </td>
                </tr>
                {banningUser === u.id && (
                  <tr
                    key={`${u.id}-ban`}
                    style={{ borderBottom: '1px solid #F0EBE5', background: '#FFF5F5' }}
                  >
                    <td colSpan={7} style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          autoFocus
                          type="text"
                          placeholder="Reason for ban (optional)"
                          value={banReason}
                          onChange={(e) => onBanReasonChange(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: '7px',
                            border: '1px solid #E8E2DC',
                            fontSize: '12px',
                            color: '#1A1205',
                            outline: 'none',
                          }}
                        />
                        <ActionButton
                          label="Confirm Ban"
                          color="#EF4444"
                          disabled={updating === u.id}
                          onClick={() => onBanAction(u.id, 'ban')}
                        />
                        <ActionButton
                          label="Cancel"
                          color="#9B8E84"
                          disabled={false}
                          onClick={() => onSetBanning(null)}
                        />
                      </div>
                    </td>
                  </tr>
                )}
                {deletingUser === u.id && (
                  <tr
                    key={`${u.id}-delete`}
                    style={{ borderBottom: '1px solid #F0EBE5', background: '#FFF0F0' }}
                  >
                    <td colSpan={7} style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ flex: 1, fontSize: '12px', color: '#7F1D1D', fontWeight: 600 }}>
                          Permanently delete {u.display_name}? This removes all their data and cannot be undone.
                        </span>
                        <ActionButton
                          label="Confirm Delete"
                          color="#7F1D1D"
                          disabled={updating === u.id}
                          onClick={() => onDeleteUser(u.id)}
                        />
                        <ActionButton
                          label="Cancel"
                          color="#9B8E84"
                          disabled={false}
                          onClick={() => onSetDeleting(null)}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p style={{ textAlign: 'center', color: '#9B8E84', padding: '40px', fontSize: '14px' }}>
            No users found
          </p>
        )}
      </div>
    </>
  );
}
