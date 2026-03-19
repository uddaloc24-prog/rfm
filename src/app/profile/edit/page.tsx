'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function ProfileEditPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [isListPrivate, setIsListPrivate] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth'); return; }
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (data) {
        setDisplayName(data.display_name ?? '');
        setUsername(data.username ?? '');
        setBio(data.bio ?? '');
        setNeighborhood(data.neighborhood ?? '');
        setIsListPrivate(!!data.is_list_private);
      }
      setLoading(false);
    };
    load();
  }, [router]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setErrors({});
    setSuccessMsg('');
    const res = await fetch('/api/social/profile/edit', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName, username, bio, neighborhood, is_list_private: isListPrivate }),
    });
    const data = await res.json();
    if (data.errors) { setErrors(data.errors); }
    else { setSuccessMsg('Profile updated!'); }
    setSaving(false);
  }, [displayName, username, bio, neighborhood, isListPrivate]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    await fetch('/api/social/profile/delete', { method: 'POST' });
    router.replace('/auth');
  }, [router]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#FDF8F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid #E8611A', borderTopColor: 'transparent', borderRadius: '50%' }} />
    </div>
  );

  const inputStyle = (hasError: boolean) => ({
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: `1.5px solid ${hasError ? '#EF4444' : '#E8E2DC'}`,
    fontSize: 14, color: '#13132A', outline: 'none', boxSizing: 'border-box' as const, background: '#fff',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#FDF8F2', maxWidth: 430, margin: '0 auto', paddingBottom: 80 }}>
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #E8E2DC', background: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ fontSize: 22, background: 'none', border: 'none', color: '#8A7E74', cursor: 'pointer', padding: 0 }}>←</button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: '#13132A' }}>Edit Profile</span>
      </div>

      <div style={{ padding: '24px 20px' }}>
        {[
          { label: 'Display Name', value: displayName, set: setDisplayName, key: 'display_name', max: 40 },
          { label: 'Username', value: username, set: setUsername, key: 'username', max: 20 },
          { label: 'Neighbourhood', value: neighborhood, set: setNeighborhood, key: 'neighborhood', max: 60 },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#8A7E74', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>{f.label}</label>
            <input type="text" value={f.value} onChange={e => f.set(e.target.value)} maxLength={f.max} style={inputStyle(!!errors[f.key])} />
            {errors[f.key] && <p style={{ fontSize: 12, color: '#EF4444', margin: '4px 0 0' }}>{errors[f.key]}</p>}
          </div>
        ))}

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#8A7E74', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={120} rows={3}
            style={{ ...inputStyle(false), resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }} />
          <p style={{ fontSize: 11, color: '#8A7E74', margin: '2px 0 0', textAlign: 'right' }}>{bio.length}/120</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, padding: '14px 16px', background: '#fff', borderRadius: 12, border: '1px solid #E8E2DC' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#13132A', margin: 0 }}>Private Rated List</p>
            <p style={{ fontSize: 12, color: '#8A7E74', margin: '2px 0 0' }}>Only you can see your rated list</p>
          </div>
          <button onClick={() => setIsListPrivate(v => !v)} style={{ width: 48, height: 28, borderRadius: 99, background: isListPrivate ? '#E8611A' : '#E8E2DC', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: isListPrivate ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </button>
        </div>

        {successMsg && <p style={{ fontSize: 13, color: '#25D366', fontWeight: 600, marginBottom: 12 }}>{successMsg}</p>}

        <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: 14, borderRadius: 12, background: saving ? '#E8E2DC' : '#E8611A', color: '#fff', border: 'none', fontWeight: 700, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', marginBottom: 32 }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

        <div style={{ borderTop: '1px solid #E8E2DC', paddingTop: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#EF4444', marginBottom: 12 }}>Danger Zone</p>
          {!showDelete
            ? <button onClick={() => setShowDelete(true)} style={{ fontSize: 13, color: '#EF4444', background: 'none', border: '1px solid #EF4444', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>Delete Account</button>
            : <div style={{ background: '#FEF2F2', borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 13, color: '#EF4444', fontWeight: 600, margin: '0 0 12px' }}>This is permanent. Your posts will be wiped and your profile anonymized.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowDelete(false)} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #E8E2DC', background: '#fff', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: 10, borderRadius: 8, background: '#EF4444', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer' }}>
                  {deleting ? 'Deleting…' : 'Delete Forever'}
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  );
}
