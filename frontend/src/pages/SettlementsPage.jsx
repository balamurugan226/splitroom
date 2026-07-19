import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Check, X, ArrowRight } from 'lucide-react';
import { paymentAPI } from '../services/api';
import { useHouse } from '../contexts/HouseContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, formatTimeAgo, getInitials } from '../utils/formatters';

function CreateSettlementModal({ members, currentUser, onClose, onSave }) {
  const [form, setForm] = useState({
    from_user: currentUser?.id || '',
    to_user: '',
    amount: '',
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.to_user) { setError('Please select who you are paying.'); return; }
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) { setError('Enter a valid amount.'); return; }
    if (form.from_user === form.to_user) { setError('Cannot settle with yourself.'); return; }
    try {
      setLoading(true);
      await paymentAPI.createSettlement({ ...form, amount: Number(form.amount) });
      onSave();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create settlement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Create Settlement</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">From (Payer)</label>
            <select className="input" value={form.from_user} onChange={(e) => setForm(p => ({ ...p, from_user: e.target.value }))}>
              {members.map((m) => (
                <option key={m.user_id || m.id} value={m.user_id || m.id}>
                  {m.name}{(m.user_id || m.id) === currentUser?.id ? ' (You)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px 0' }}>
            <ArrowRight size={20} color="var(--accent-blue)" />
          </div>
          <div className="form-group">
            <label className="label">To (Recipient)</label>
            <select className="input" value={form.to_user} onChange={(e) => setForm(p => ({ ...p, to_user: e.target.value }))} required>
              <option value="">Select recipient...</option>
              {members.filter(m => (m.user_id || m.id) !== form.from_user).map((m) => (
                <option key={m.user_id || m.id} value={m.user_id || m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">Amount (₹)</label>
            <input className="input" type="number" placeholder="0.00" min="0" step="0.01"
              value={form.amount} onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="label">Note (Optional)</label>
            <input className="input" placeholder="e.g. Paying back for last month's groceries"
              value={form.note} onChange={(e) => setForm(p => ({ ...p, note: e.target.value }))} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : '🤝 Create Settlement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SettlementsPage() {
  const { house, members } = useHouse();
  const { user } = useAuth();
  const [balances, setBalances] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [settlingId, setSettlingId] = useState(null);
  const [prefill, setPrefill] = useState(null);

  const fetchData = useCallback(async () => {
    if (!house) return;
    try {
      setLoading(true);
      const [balRes, setRes] = await Promise.allSettled([
        paymentAPI.getBalances(),
        paymentAPI.getSettlements(),
      ]);
      if (balRes.status === 'fulfilled') setBalances(balRes.value.data.member_balances || []);
      if (setRes.status === 'fulfilled') setSettlements(setRes.value.data.settlements || []);
    } catch {} finally { setLoading(false); }
  }, [house]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMarkSettled = async (id) => {
    try {
      setSettlingId(id);
      await paymentAPI.markPaid(id);
      setSettlements(prev => prev.map(s => s.id === id ? { ...s, status: 'settled' } : s));
    } catch { alert('Failed to mark as settled.'); } finally { setSettlingId(null); }
  };

  const handleSettleUp = (member) => {
    setPrefill({
      from_user: user?.id,
      to_user: member.user_id,
      amount: Math.abs(member.balance),
    });
    setShowModal(true);
  };

  const handleSaveSettlement = () => {
    setShowModal(false);
    setPrefill(null);
    fetchData();
  };

  if (!house) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🏠</div>
        <div className="empty-state-title">No House Found</div>
        <div className="empty-state-desc">Join or create a house first.</div>
        <a href="/house" className="btn btn-primary" style={{ marginTop: 20 }}>Go to House</a>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settlements</h1>
          <p className="page-subtitle">Balance summary and settlement history</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setPrefill(null); setShowModal(true); }}>
          <Plus size={16} /> Create Settlement
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><div className="loading-spinner" /></div>
      ) : (
        <>
          {/* Balance Summary */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
              💰 Balance Summary
            </h2>
            {balances.length === 0 ? (
              <div className="card">
                <div className="empty-state" style={{ padding: 40 }}>
                  <div className="empty-state-icon">⚖️</div>
                  <div className="empty-state-title">All balanced!</div>
                  <div className="empty-state-desc">No outstanding balances between members.</div>
                </div>
              </div>
            ) : (
              <div className="grid-3">
                {balances.filter(b => b.user_id !== user?.id).map((b) => {
                  const isPositive = b.balance > 0; // they owe you
                  const isNegative = b.balance < 0; // you owe them

                  return (
                    <div
                      key={b.user_id}
                      className="card"
                      style={{
                        borderTop: `3px solid ${isPositive ? 'var(--accent-green)' : isNegative ? 'var(--accent-red)' : 'var(--border)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div className="avatar">{getInitials(b.name)}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>{b.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {isPositive ? 'Owes you' : isNegative ? 'You owe' : 'All settled'}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 26,
                          fontWeight: 900,
                          color: isPositive ? 'var(--accent-green)' : isNegative ? 'var(--accent-red)' : 'var(--text-muted)',
                          marginBottom: 16,
                        }}
                      >
                        {isPositive ? '+' : ''}{formatCurrency(b.balance)}
                      </div>
                      {b.balance !== 0 && (
                        <button
                          className={`btn ${isNegative ? 'btn-primary' : 'btn-success'} btn-sm`}
                          style={{ width: '100%', justifyContent: 'center' }}
                          onClick={() => handleSettleUp(b)}
                        >
                          {isNegative ? '💸 Settle Up' : '📩 Request Payment'}
                        </button>
                      )}
                      {b.balance === 0 && (
                        <span className="badge badge-green" style={{ width: '100%', justifyContent: 'center' }}>
                          ✅ Settled
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Settlement History */}
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
              📋 Settlement History
            </h2>
            {settlements.length === 0 ? (
              <div className="card">
                <div className="empty-state" style={{ padding: 40 }}>
                  <div className="empty-state-icon">🤝</div>
                  <div className="empty-state-title">No settlements yet</div>
                  <div className="empty-state-desc">Create a settlement to track payments between members.</div>
                </div>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>To</th>
                      <th>Amount</th>
                      <th>Note</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="avatar avatar-sm">{getInitials(s.from_name)}</div>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>
                              {s.from_user === user?.id ? 'You' : s.from_name}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="avatar avatar-sm">{getInitials(s.to_name)}</div>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>
                              {s.to_user === user?.id ? 'You' : s.to_name}
                            </span>
                          </div>
                        </td>
                        <td><span style={{ fontWeight: 700, fontSize: 15 }}>{formatCurrency(s.amount)}</span></td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 200 }}>
                          {s.note || '-'}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 13, whiteSpace: 'nowrap' }}>
                          {formatDate(s.created_at)}
                        </td>
                        <td>
                          {s.status === 'settled' ? (
                            <span className="badge badge-green">✓ Settled</span>
                          ) : (
                            <span className="badge badge-orange">⏳ Pending</span>
                          )}
                        </td>
                        <td>
                          {s.status !== 'settled' && (s.to_user === user?.id || house?.user_role === 'owner') && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleMarkSettled(s.id)}
                              disabled={settlingId === s.id}
                            >
                              <Check size={13} />
                              {settlingId === s.id ? '...' : 'Settle'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {showModal && (
        <CreateSettlementModal
          members={members}
          currentUser={{ ...user, ...prefill }}
          onClose={() => { setShowModal(false); setPrefill(null); }}
          onSave={handleSaveSettlement}
        />
      )}
    </div>
  );
}
