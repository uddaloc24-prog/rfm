'use client';

import { Vendor, VendorStatus, CATEGORY_EMOJI, CATEGORY_LABELS, VendorCategory } from '@/lib/types';
import ActionButton from './ActionButton';
import type { VendorSort, VendorStatusFilter } from './admin-types';

const STATUS_COLORS: Record<VendorStatus, string> = {
  pending: '#F4A425',
  verified: '#25D366',
  flagged: '#EF4444',
  removed: '#9B8E84',
};

const STATUS_OPTIONS: { value: VendorStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'removed', label: 'Removed' },
];

const SORT_OPTIONS: { value: VendorSort; label: string }[] = [
  { value: 'date_desc', label: 'Date Added ↓' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'most_rated', label: 'Most Rated' },
  { value: 'highest_score', label: 'Highest Score' },
];

interface Props {
  vendors: Vendor[];
  allVendors: Vendor[];
  statusFilter: VendorStatusFilter;
  onStatusFilter: (f: VendorStatusFilter) => void;
  vendorSort: VendorSort;
  onVendorSort: (s: VendorSort) => void;
  updating: string | null;
  editingVendor: string | null;
  vendorEdits: Record<string, string>;
  onEditStart: (id: string, edits: Record<string, string>) => void;
  onEditChange: (key: string, val: string) => void;
  onSave: (id: string) => void;
  onCancelEdit: () => void;
  onStatusChange: (id: string, status: VendorStatus) => void;
}

export default function AdminVendorTable({
  vendors,
  allVendors,
  statusFilter,
  onStatusFilter,
  vendorSort,
  onVendorSort,
  updating,
  editingVendor,
  vendorEdits,
  onEditStart,
  onEditChange,
  onSave,
  onCancelEdit,
  onStatusChange,
}: Props) {
  // Count badges per status from the full unfiltered list
  const counts: Record<string, number> = { all: allVendors.length };
  for (const v of allVendors) counts[v.status] = (counts[v.status] ?? 0) + 1;

  return (
    <>
      {/* Filter pills + sort */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {STATUS_OPTIONS.map(({ value, label }) => (
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
              {label}
              {counts[value] !== undefined ? ` (${counts[value]})` : ''}
            </button>
          ))}
        </div>
        <select
          value={vendorSort}
          onChange={(e) => onVendorSort(e.target.value as VendorSort)}
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
          {SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
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
            {vendors.map((v) => (
              <>
                <tr
                  key={v.id}
                  style={{
                    borderBottom: editingVendor === v.id ? 'none' : '1px solid #F0EBE5',
                    opacity: v.status === 'removed' ? 0.5 : 1,
                  }}
                >
                  <td style={{ padding: '10px 12px', color: '#1A1205', fontWeight: 500 }}>
                    {CATEGORY_EMOJI[v.category]} {v.name}
                    {!v.lat && (
                      <span style={{ fontSize: '10px', color: '#F4A425', marginLeft: 4 }}>
                        📌 no coords
                      </span>
                    )}
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
                        onClick={() =>
                          onEditStart(v.id, {
                            name: v.name,
                            neighbourhood: v.neighbourhood ?? '',
                            hours: v.hours ?? '',
                            price_range: v.price_range ?? '',
                            known_for: v.known_for ?? '',
                            lat: v.lat?.toString() ?? '',
                            lng: v.lng?.toString() ?? '',
                            category: v.category,
                            open_since: v.open_since?.toString() ?? '',
                          })
                        }
                      />
                      {v.status !== 'verified' && (
                        <ActionButton
                          label="✓ Verify"
                          color="#25D366"
                          disabled={updating === v.id}
                          onClick={() => onStatusChange(v.id, 'verified')}
                        />
                      )}
                      {v.status !== 'flagged' && (
                        <ActionButton
                          label="⚑ Flag"
                          color="#F4A425"
                          disabled={updating === v.id}
                          onClick={() => onStatusChange(v.id, 'flagged')}
                        />
                      )}
                      {v.status !== 'removed' && (
                        <ActionButton
                          label="✕ Remove"
                          color="#EF4444"
                          disabled={updating === v.id}
                          onClick={() => onStatusChange(v.id, 'removed')}
                        />
                      )}
                      {v.status === 'removed' && (
                        <ActionButton
                          label="↩ Restore"
                          color="#9B8E84"
                          disabled={updating === v.id}
                          onClick={() => onStatusChange(v.id, 'pending')}
                        />
                      )}
                    </div>
                  </td>
                </tr>
                {editingVendor === v.id && (
                  <tr
                    key={`${v.id}-edit`}
                    style={{ borderBottom: '1px solid #F0EBE5', background: '#F8F5FF' }}
                  >
                    <td colSpan={7} style={{ padding: '12px 16px' }}>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                          gap: '8px',
                          marginBottom: '10px',
                        }}
                      >
                        {[
                          { key: 'name', placeholder: 'Name' },
                          { key: 'neighbourhood', placeholder: 'Neighbourhood' },
                          { key: 'hours', placeholder: 'Hours (e.g. 8am–10pm)' },
                          { key: 'price_range', placeholder: 'Price range (e.g. ₹50–150)' },
                          { key: 'known_for', placeholder: 'Known for' },
                          { key: 'lat', placeholder: 'Lat (e.g. 12.9716)' },
                          { key: 'lng', placeholder: 'Lng (e.g. 77.5946)' },
                          { key: 'open_since', placeholder: 'Est. year (e.g. 2008)' },
                        ].map(({ key, placeholder }) => (
                          <input
                            key={key}
                            type="text"
                            placeholder={placeholder}
                            value={vendorEdits[key] ?? ''}
                            onChange={(e) => onEditChange(key, e.target.value)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '7px',
                              border: '1px solid #E8E2DC',
                              fontSize: '12px',
                              color: '#1A1205',
                              outline: 'none',
                            }}
                          />
                        ))}
                        {/* Category select */}
                        <select
                          value={vendorEdits.category ?? ''}
                          onChange={(e) => onEditChange('category', e.target.value)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '7px',
                            border: '1px solid #E8E2DC',
                            fontSize: '12px',
                            color: '#1A1205',
                            background: '#FFFFFF',
                            outline: 'none',
                          }}
                        >
                          <option value="" disabled>Category</option>
                          {(Object.entries(CATEGORY_LABELS) as [VendorCategory, string][]).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <ActionButton
                          label="Save"
                          color="#6366F1"
                          disabled={updating === v.id}
                          onClick={() => onSave(v.id)}
                        />
                        <ActionButton
                          label="Cancel"
                          color="#9B8E84"
                          disabled={false}
                          onClick={onCancelEdit}
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {vendors.length === 0 && (
          <p style={{ textAlign: 'center', color: '#9B8E84', padding: '40px', fontSize: '14px' }}>
            No vendors found
          </p>
        )}
      </div>
    </>
  );
}
