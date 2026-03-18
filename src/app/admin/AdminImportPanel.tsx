'use client';

import { useCallback, useRef, useState } from 'react';

const QUICK_QUERIES = [
  'street food stalls Bangalore',
  'Udupi restaurants Bangalore',
  'chai shops Bangalore',
  'mess tiffin Bangalore',
  'biryani restaurants Bangalore',
];

// ── Bulk Import ──────────────────────────────────────────────────────────────

function BulkImportSection() {
  const [running, setRunning] = useState(false);
  const [totalBatches, setTotalBatches] = useState<number | null>(null);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalInserted, setTotalInserted] = useState(0);
  const [totalSkipped, setTotalSkipped] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef(false);

  const start = useCallback(async () => {
    setRunning(true);
    setDone(false);
    setError(null);
    setCurrentBatch(0);
    setTotalInserted(0);
    setTotalSkipped(0);
    stopRef.current = false;

    // Get total batch count first
    const meta = await fetch('/api/admin/bulk-import').then((r) => r.json()).catch(() => null);
    if (!meta) {
      setError('Failed to reach bulk-import API');
      setRunning(false);
      return;
    }
    setTotalBatches(meta.totalBatches);

    let batch = 0;
    let inserted = 0;
    let skipped = 0;

    while (batch < meta.totalBatches && !stopRef.current) {
      const res = await fetch('/api/admin/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchIndex: batch }),
      }).catch(() => null);

      if (!res || !res.ok) {
        setError(`Batch ${batch} failed`);
        break;
      }

      const data = await res.json();
      inserted += data.inserted ?? 0;
      skipped += data.skipped ?? 0;
      setCurrentBatch(batch + 1);
      setTotalInserted(inserted);
      setTotalSkipped(skipped);

      if (data.done) {
        setDone(true);
        break;
      }
      batch++;
    }

    setRunning(false);
  }, []);

  const stop = useCallback(() => {
    stopRef.current = true;
  }, []);

  const pct = totalBatches ? Math.round((currentBatch / totalBatches) * 100) : 0;

  return (
    <div
      style={{
        background: '#FAFDF7',
        border: '1px solid #BBF7D0',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '16px',
      }}
    >
      <p style={{ fontWeight: 700, fontSize: '14px', color: '#1A1205', margin: '0 0 4px' }}>
        Bulk Import — 1000+ Places
      </p>
      <p style={{ fontSize: '12px', color: '#9B8E84', margin: '0 0 12px' }}>
        Runs 136 queries across 34 Bangalore neighbourhoods × 4 food types.
        Skips duplicates automatically. Takes ~3–5 minutes.
      </p>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {!running && !done && (
          <button
            onClick={start}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              background: '#25D366',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Start Bulk Import
          </button>
        )}
        {running && (
          <button
            onClick={stop}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              background: '#EF4444',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Stop
          </button>
        )}
        {(done || (!running && currentBatch > 0)) && !running && (
          <button
            onClick={() => { setDone(false); setCurrentBatch(0); setTotalBatches(null); }}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              background: '#E8E2DC',
              color: '#1A1205',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
        )}
      </div>

      {(running || currentBatch > 0) && (
        <div style={{ marginTop: '14px' }}>
          {/* Progress bar */}
          <div
            style={{
              width: '100%',
              height: '8px',
              background: '#E8E2DC',
              borderRadius: '99px',
              overflow: 'hidden',
              marginBottom: '8px',
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: done ? '#25D366' : '#E8611A',
                borderRadius: '99px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9B8E84' }}>
            <span>
              Batch {currentBatch}/{totalBatches ?? '…'} ({pct}%)
            </span>
            <span>
              ✅ {totalInserted} added &nbsp;·&nbsp; ⏭ {totalSkipped} skipped
            </span>
          </div>

          {done && (
            <p style={{ marginTop: '10px', fontSize: '13px', color: '#25D366', fontWeight: 600 }}>
              Done! Added {totalInserted} new places to the database.
            </p>
          )}
          {error && (
            <p style={{ marginTop: '10px', fontSize: '13px', color: '#EF4444', fontWeight: 500 }}>
              {error}
            </p>
          )}
          {running && !done && (
            <p style={{ marginTop: '6px', fontSize: '11px', color: '#9B8E84' }}>
              Running… do not close this tab.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Single Import ────────────────────────────────────────────────────────────

export default function AdminImportPanel({
  importQuery,
  onQueryChange,
  onImport,
  importing,
  importResult,
}: {
  importQuery: string;
  onQueryChange: (q: string) => void;
  onImport: () => void;
  importing: boolean;
  importResult: string | null;
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <BulkImportSection />

      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E8E2DC',
          borderRadius: '12px',
          padding: '16px 20px',
        }}
      >
        <p style={{ fontWeight: 700, fontSize: '14px', color: '#1A1205', margin: '0 0 4px' }}>
          Single Query Import
        </p>
        <p style={{ fontSize: '12px', color: '#9B8E84', margin: '0 0 12px' }}>
          Import up to 20 vendors for a specific search query.
        </p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={importQuery}
            onChange={(e) => onQueryChange(e.target.value)}
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
            onClick={onImport}
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
          <p
            style={{
              marginTop: '10px',
              fontSize: '13px',
              color: importResult.startsWith('Error') ? '#EF4444' : '#25D366',
              fontWeight: 500,
            }}
          >
            {importResult}
          </p>
        )}
        <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {QUICK_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => onQueryChange(q)}
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
    </div>
  );
}
