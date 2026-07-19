import React, { useState, useCallback } from 'react';
import { Copy, RefreshCw, Edit2, LogOut, Check, Home, Users, Calendar, MapPin, DollarSign } from 'lucide-react';
import { useHouse } from '../contexts/HouseContext';
import { useAuth } from '../contexts/AuthContext';
import { houseAPI } from '../services/api';
import { formatCurrency, formatDate, getInitials } from '../utils/formatters';

function CreateHouseForm({ onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    address: '',
    monthly_rent: '',
    security_deposit: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('House name is required.'); return; }
    if (!form.monthly_rent || isNaN(form.monthly_rent) || Number(form.monthly_rent) <= 0) {
      setError('Please enter a valid monthly rent amount.'); return;
    }
    try {
      setLoading(true);
      await houseAPI.createHouse({
        name: form.name,
        address: form.address,
        monthly_rent: Number(form.monthly_rent),
        security_deposit: form.security_deposit ? Number(form.security_deposit) : 0,
      });
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create house.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}
      <div className="form-group">
        <label className="label">House Name *</label>
        <input className="input" placeholder="e.g. Sunshine Apartments 4B" value={form.name}
          onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required />
      </div>
      <div className="form-group">
        <label className="label">Address</label>
        <textarea className="input" placeholder="Full address..." rows={3} value={form.address}
          onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))} />
      </div>
      <div className="grid-2">
        <div className="form-group">
          <label className="label">Monthly Rent (₹) *</label>
          <input className="input" type="number" placeholder="15000" min="0" value={form.monthly_rent}
            onChange={(e) => setForm(p => ({ ...p, monthly_rent: e.target.value }))} required />
        </div>
        <div className="form-group">
          <label className="label">Security Deposit (₹)</label>
          <input className="input" type="number" placeholder="30000" min="0" value={form.security_deposit}
            onChange={(e) => setForm(p => ({ ...p, security_deposit: e.target.value }))} />
        </div>
      </div>
      <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
        {loading ? <><div className="loading-spinner loading-spinner-sm" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Creating...</> : '🏠 Create My House'}
      </button>
    </form>
  );
}

function JoinHouseForm({ onSuccess }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!code.trim()) { setError('Please enter an invite code.'); return; }
    try {
      setLoading(true);
      await houseAPI.joinHouse(code.trim().toUpperCase());
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid invite code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}
      <div className="form-group">
        <label className="label">Invite Code</label>
        <input className="input" placeholder="e.g. HOUSE-AB12" value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
          style={{ fontFamily: 'monospace', fontSize: 18, letterSpacing: 4, textAlign: 'center', textTransform: 'uppercase' }}
          required />
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
          Ask your house admin for the invite code.
        </p>
      </div>
      <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
        {loading ? <><div className="loading-spinner loading-spinner-sm" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} /> Joining...</> : '🔑 Join House'}
      </button>
    </form>
  );
}

function EditHouseModal({ house, onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: house.name || '',
    address: house.address || '',
    monthly_rent: house.monthly_rent || '',
    security_deposit: house.security_deposit || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await houseAPI.updateHouse(house.id, form);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update house.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit House Details</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">House Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="label">Address</label>
            <textarea className="input" rows={3} value={form.address} onChange={(e) => setForm(p => ({ ...p, address: e.target.value }))} />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Monthly Rent (₹)</label>
              <input className="input" type="number" value={form.monthly_rent} onChange={(e) => setForm(p => ({ ...p, monthly_rent: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="label">Security Deposit (₹)</label>
              <input className="input" type="number" value={form.security_deposit} onChange={(e) => setForm(p => ({ ...p, security_deposit: e.target.value }))} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HousePage() {
  const { house, members, loading, refreshHouse } = useHouse();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('create');
  const [copied, setCopied] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [error, setError] = useState('');

  const isOwnerOrAdmin = house && (house.user_role === 'owner' || house.user_role === 'admin');

  const copyInviteCode = () => {
    navigator.clipboard.writeText(house?.invite_code || '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const regenerateInvite = async () => {
    try {
      setRegenLoading(true);
      await houseAPI.regenerateInvite(house.id);
      await refreshHouse();
    } catch (err) {
      setError('Failed to regenerate invite code.');
    } finally {
      setRegenLoading(false);
    }
  };

  const leaveHouse = async () => {
    try {
      setLeaveLoading(true);
      await houseAPI.leaveHouse(house.id);
      await refreshHouse();
      setShowLeaveConfirm(false);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to leave house.');
    } finally {
      setLeaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  // NO HOUSE STATE
  if (!house) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">House</h1>
            <p className="page-subtitle">Create or join a shared house to get started</p>
          </div>
        </div>

        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          {/* Tab switcher */}
          <div className="tabs" style={{ marginBottom: 32, width: '100%' }}>
            <button className={`tab ${activeTab === 'create' ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => setActiveTab('create')}>
              🏠 Create a House
            </button>
            <button className={`tab ${activeTab === 'join' ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => setActiveTab('join')}>
              🔑 Join with Code
            </button>
          </div>

          <div className="card">
            {activeTab === 'create' ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
                  <h2 style={{ fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Create Your House
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    Set up a shared space for you and your roommates.
                  </p>
                </div>
                <CreateHouseForm onSuccess={refreshHouse} />
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🔑</div>
                  <h2 style={{ fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Join a House
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    Enter the invite code shared by your house admin.
                  </p>
                </div>
                <JoinHouseForm onSuccess={refreshHouse} />
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // HAS HOUSE STATE
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{house.name}</h1>
          <p className="page-subtitle">House details and settings</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {isOwnerOrAdmin && (
            <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>
              <Edit2 size={15} /> Edit House
            </button>
          )}
          <button
            className="btn btn-danger"
            onClick={() => setShowLeaveConfirm(true)}
          >
            <LogOut size={15} /> Leave House
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>⚠️ {error}</div>}

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* House Info */}
        <div className="card">
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20, color: 'var(--text-primary)' }}>
            🏠 House Information
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { icon: Home, label: 'House Name', value: house.name },
              { icon: MapPin, label: 'Address', value: house.address || 'Not specified' },
              { icon: DollarSign, label: 'Monthly Rent', value: formatCurrency(house.monthly_rent || 0) },
              { icon: DollarSign, label: 'Security Deposit', value: formatCurrency(house.security_deposit || 0) },
              { icon: Users, label: 'Total Members', value: `${members.length} member${members.length !== 1 ? 's' : ''}` },
              { icon: Calendar, label: 'Created On', value: formatDate(house.created_at) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, background: 'var(--accent-blue-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color="var(--accent-blue)" />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invite Code */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ background: 'var(--accent-blue)', border: 'none' }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: 'white' }}>
              🔑 Invite Code
            </h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 16 }}>
              Share this code with your roommates so they can join your house.
            </p>
            <div
              style={{
                background: 'rgba(255,255,255,0.12)',
                borderRadius: 12,
                padding: '16px 20px',
                textAlign: 'center',
                fontFamily: 'monospace',
                fontSize: 26,
                fontWeight: 900,
                color: 'white',
                letterSpacing: 6,
                marginBottom: 16,
                border: '1px dashed rgba(255,255,255,0.3)',
              }}
            >
              {house.invite_code || '------'}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn"
                style={{ flex: 1, justifyContent: 'center', background: 'rgba(255,255,255,0.9)', color: '#1e40af', fontWeight: 700 }}
                onClick={copyInviteCode}
              >
                {copied ? <><Check size={15} /> Copied!</> : <><Copy size={15} /> Copy Code</>}
              </button>
              {isOwnerOrAdmin && (
                <button
                  className="btn"
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.25)' }}
                  onClick={regenerateInvite}
                  disabled={regenLoading}
                  title="Regenerate invite code"
                >
                  <RefreshCw size={15} className={regenLoading ? 'loading-spinner' : ''} />
                </button>
              )}
            </div>
          </div>

          {/* Your role */}
          <div className="card">
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: 'var(--text-primary)' }}>
              👤 Your Role
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="avatar avatar-lg">{getInitials(user?.name)}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {user?.name}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`badge ${house.user_role === 'owner' ? 'badge-purple' : house.user_role === 'admin' ? 'badge-blue' : 'badge-gray'}`}>
                    {house.user_role === 'owner' ? '👑 Owner' : house.user_role === 'admin' ? '🛡️ Admin' : '👤 Member'}
                  </span>
                  <span className="badge badge-green">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Members preview */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            👥 House Members ({members.length})
          </h3>
          <a href="/members" style={{ color: 'var(--accent-blue)', fontSize: 14, fontWeight: 600 }}>
            View All →
          </a>
        </div>
        <div style={{ padding: 24, display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {members.slice(0, 6).map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'var(--bg-secondary)', borderRadius: 100, border: '1px solid var(--border)' }}>
              <div className="avatar avatar-sm">{getInitials(m.name)}</div>
              <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{m.name}</span>
              <span className={`badge ${m.role === 'owner' ? 'badge-purple' : m.role === 'admin' ? 'badge-blue' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                {m.role}
              </span>
            </div>
          ))}
          {members.length > 6 && (
            <div style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>
              +{members.length - 6} more
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <EditHouseModal
          house={house}
          onClose={() => setShowEdit(false)}
          onSuccess={refreshHouse}
        />
      )}

      {/* Leave Confirm Modal */}
      {showLeaveConfirm && (
        <div className="modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <h2 style={{ fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', marginBottom: 10 }}>
                Leave {house.name}?
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                You will lose access to all house expenses and payment history. This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer" style={{ paddingTop: 0, border: 'none', justifyContent: 'center', gap: 16 }}>
              <button className="btn btn-secondary" onClick={() => setShowLeaveConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={leaveHouse} disabled={leaveLoading}>
                {leaveLoading ? 'Leaving...' : 'Yes, Leave House'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
