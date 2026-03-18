'use client';

const QUICK_QUERIES = [
  'street food stalls Bangalore',
  'Udupi restaurants Bangalore',
  'chai shops Bangalore',
  'mess tiffin Bangalore',
  'biryani restaurants Bangalore',
];

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
  );
}
