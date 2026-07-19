import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Check, X, Home, CreditCard, AlertCircle } from 'lucide-react';
import { paymentAPI } from '../services/api';
import { useHouse } from '../contexts/HouseContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, formatMonth, getCurrentMonth, getInitials } from '../utils/formatters';

function RecordPaymentModal({ members, currentUser, onClose, onSave }) {
  const [form, setForm] = useState({
    from_user: currentUser?.id || '',
    to_user: '',
    amount: '',
    type: 'settlement',
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.to_user) { setError('Select the recipient.'); return; }
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0) { setError('Enter a valid amount.'); return; }
    if (form.from_user === form.to_user) { setError('Cannot pay yourself.'); return; }
    try {
      setLoading(true);
      await paymentAPI.createPayment({ ...form, amount: Number(form.amount) });
      onSave();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Record Payment</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">From</label>
            <select className="input" value={form.from_user} onChange={(e) => setForm(p => ({ ...p, from_user: e.target.value }))}>
              {members.map((m) => (
                <option key={m.user_id || m.id} value={m.user_id || m.id}>
                  {m.name}{(m.user_id || m.id) === currentUser?.id ? ' (You)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="label">To</label>
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
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm(p => ({ ...p, type: e.target.value }))}>
              <option value="settlement">Settlement</option>
              <option value="rent">Rent Payment</option>
              <option value="expense_share">Expense Share</option>
            </select>
          </div>
          <div className="form-group">
            <label className="label">Note (Optional)</label>
            <input className="input" placeholder="Add a note..." value={form.note}
              onChange={(e) => setForm(p => ({ ...p, note: e.target.value }))} />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentsTab({ members, currentUser, house }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(null);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await paymentAPI.getPayments({ status: filterStatus !== 'all' ? filterStatus : undefined });
      setPayments(res.data.payments || []);
    } catch { setPayments([]); } finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleMarkPaid = async (id) => {
    try {
      setMarkingPaid(id);
      await paymentAPI.markPaid(id);
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'paid' } : p));
    } catch { alert('Failed to mark as paid.'); } finally { setMarkingPaid(null); }
  };

  const statusBadge = (status) => {
    if (status === 'paid') return <span className="badge badge-green">✓ Paid</span>;
    if (status === 'overdue') return <span className="badge badge-red">⚠ Overdue</span>;
    return <span className="badge badge-orange">⏳ Pending</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'pending', 'paid', 'overdue'].map((s) => (
            <button key={s} className={`chip ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Record Payment
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner" /></div>
      ) : payments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💳</div>
          <div className="empty-state-title">No payments found</div>
          <div className="empty-state-desc">Payments between members will appear here.</div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar avatar-sm">{getInitials(p.from_name)}</div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>
                        {p.from_user === currentUser?.id ? 'You' : p.from_name}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar avatar-sm">{getInitials(p.to_name)}</div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>
                        {p.to_user === currentUser?.id ? 'You' : p.to_name}
                      </span>
                    </div>
                  </td>
                  <td><span style={{ fontWeight: 700, fontSize: 15 }}>{formatCurrency(p.amount)}</span></td>
                  <td><span className="badge badge-blue" style={{ fontSize: 11 }}>{p.type || 'Payment'}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{formatDate(p.created_at)}</td>
                  <td>{statusBadge(p.status)}</td>
                  <td>
                    {p.status !== 'paid' && (p.to_user === currentUser?.id || house?.user_role === 'owner') && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => handleMarkPaid(p.id)}
                        disabled={markingPaid === p.id}
                      >
                        <Check size={13} />
                        {markingPaid === p.id ? '...' : 'Mark Paid'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <RecordPaymentModal
          members={members}
          currentUser={currentUser}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchPayments(); }}
        />
      )}
    </div>
  );
}

function RentTab({ house, currentUser, members }) {
  const [rentRecords, setRentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genLoading, setGenLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [filterMonth, setFilterMonth] = useState(getCurrentMonth());

  const fetchRent = useCallback(async () => {
    try {
      setLoading(true);
      const res = await paymentAPI.getRentRecords({ month: filterMonth });
      setRentRecords(res.data.records || []);
    } catch { setRentRecords([]); } finally { setLoading(false); }
  }, [filterMonth]);

  useEffect(() => { fetchRent(); }, [fetchRent]);

  const generateRentRecords = async () => {
    if (!window.confirm(`Generate rent records for ${formatMonth(getCurrentMonth())}?`)) return;
    try {
      setGenLoading(true);
      await paymentAPI.createRentRecord({ month: getCurrentMonth(), amount: house?.monthly_rent });
      fetchRent();
    } catch (err) { alert(err?.response?.data?.message || 'Failed to generate rent records.'); }
    finally { setGenLoading(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      setUpdatingStatus(id);
      await paymentAPI.updateRentStatus(id, status);
      setRentRecords(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch { alert('Failed to update status.'); } finally { setUpdatingStatus(null); }
  };

  const thisMonthRecord = rentRecords.find(r => r.month === getCurrentMonth() && r.user_id === currentUser?.id);

  return (
    <div>
      {/* Current month card */}
      {house && (
        <div
          style={{
            background: 'var(--accent-blue)',
            borderRadius: 'var(--radius-lg)',
            padding: 28,
            marginBottom: 24,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginBottom: 6 }}>
              {formatMonth(getCurrentMonth())} Rent
            </div>
            <div style={{ fontSize: 36, fontWeight: 900 }}>
              {formatCurrency(house.monthly_rent || 0)}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>
              Due on 5th · {members.length > 0 ? formatCurrency((house.monthly_rent || 0) / members.length) : '-'} per person
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
            {thisMonthRecord ? (
              <span className={`badge ${thisMonthRecord.status === 'paid' ? 'badge-green' : 'badge-orange'}`}>
                {thisMonthRecord.status === 'paid' ? '✓ Paid' : '⏳ Pending'}
              </span>
            ) : (
              <span className="badge badge-orange">⏳ Pending</span>
            )}
            {(house.user_role === 'owner' || house.user_role === 'admin') && (
              <button
                className="btn"
                style={{ background: 'rgba(255,255,255,0.9)', color: '#1e40af', fontWeight: 700 }}
                onClick={generateRentRecords}
                disabled={genLoading}
              >
                {genLoading ? 'Generating...' : '📋 Generate Records'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>Rent History</h3>
        <input className="input" type="month" style={{ width: 'auto' }} value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner" /></div>
      ) : rentRecords.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏠</div>
          <div className="empty-state-title">No rent records</div>
          <div className="empty-state-desc">Generate rent records for the current month to get started.</div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Month</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Paid Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rentRecords.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar avatar-sm">{getInitials(r.user_name)}</div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>
                        {r.user_id === currentUser?.id ? 'You' : r.user_name}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatMonth(r.month)}</td>
                  <td><span style={{ fontWeight: 700 }}>{formatCurrency(r.amount)}</span></td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatDate(r.due_date)}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {r.paid_date ? formatDate(r.paid_date) : '-'}
                  </td>
                  <td>
                    {r.status === 'paid' ? (
                      <span className="badge badge-green">✓ Paid</span>
                    ) : r.status === 'overdue' ? (
                      <span className="badge badge-red"><AlertCircle size={10} /> Overdue</span>
                    ) : (
                      <span className="badge badge-orange">⏳ Pending</span>
                    )}
                  </td>
                  <td>
                    {r.status !== 'paid' && (r.user_id === currentUser?.id || house?.user_role === 'owner') && (
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => updateStatus(r.id, 'paid')}
                        disabled={updatingStatus === r.id}
                      >
                        <Check size={13} />
                        {updatingStatus === r.id ? '...' : 'Mark Paid'}
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
  );
}

export default function PaymentsPage() {
  const { house, members } = useHouse();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('payments');

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
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Track rent and expense payments</p>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 28 }}>
        <button className={`tab ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>
          <CreditCard size={15} /> Payments
        </button>
        <button className={`tab ${activeTab === 'rent' ? 'active' : ''}`} onClick={() => setActiveTab('rent')}>
          <Home size={15} /> Rent
        </button>
      </div>

      {activeTab === 'payments' ? (
        <PaymentsTab members={members} currentUser={user} house={house} />
      ) : (
        <RentTab house={house} currentUser={user} members={members} />
      )}
    </div>
  );
}
