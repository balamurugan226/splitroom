import React, { useState, useEffect, useCallback } from 'react';
import { useHouse } from '../contexts/HouseContext';
import { useAuth } from '../contexts/AuthContext';
import { expenseAPI } from '../services/api';
import { formatCurrency, getCategoryInfo, EXPENSE_CATEGORIES } from '../utils/formatters';

export default function RecurringBillsPage() {
  const { house, members } = useHouse();
  const { user } = useAuth();

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add Recurring Form Inputs
  const [showForm, setShowForm] = useState(false);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [dueDay, setDueDay] = useState('1');
  const [paidBy, setPaidBy] = useState(user?.id || user?._id || '');
  const [splitWith, setSplitWith] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const currentUserId = user?.id || user?._id;

  const fetchBills = useCallback(async () => {
    if (!house) return;
    try {
      setLoading(true);
      setError('');
      const res = await expenseAPI.getRecurring();
      setBills(res.data.recurring || res.data || []);
    } catch (err) {
      console.error(err);
      setError('Could not load recurring bills.');
    } finally {
      setLoading(false);
    }
  }, [house]);

  useEffect(() => {
    fetchBills();
    if (members.length > 0) {
      setSplitWith(members.map(m => m._id));
    }
  }, [fetchBills, members]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amt = Number(amount);
    const day = Number(dueDay);

    if (!desc.trim()) return setError('Description is required.');
    if (!amt || amt <= 0) return setError('Amount must be positive.');
    if (!day || day < 1 || day > 31) return setError('Due Day must be between 1 and 31.');
    if (splitWith.length === 0) return setError('Select at least one roommate to split with.');

    try {
      setSubmitting(true);
      await expenseAPI.addRecurring({
        description: desc.trim(),
        amount: amt,
        category,
        paidBy,
        dueDay: day,
        splitWith
      });
      setSuccess('Recurring bill scheduled successfully!');
      setDesc('');
      setAmount('');
      setCategory('other');
      setDueDay('1');
      setShowForm(false);
      fetchBills();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not schedule bill.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this scheduled bill? It will stop posting automatically.')) return;
    try {
      await expenseAPI.deleteRecurring(id);
      setSuccess('Scheduled bill deleted.');
      fetchBills();
    } catch (err) {
      setError('Failed to delete scheduled bill.');
    }
  };

  const toggleMemberSelection = (mid) => {
    setSplitWith(prev =>
      prev.includes(mid) ? prev.filter(id => id !== mid) : [...prev, mid]
    );
  };

  if (!house) {
    return (
      <div className="container" style={{ paddingTop: '40px' }}>
        <div className="card text-center">
          <p>Setup a House first to schedule recurring bills.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card flex justify-between items-center">
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>📅 Recurring Bills</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Schedule automatic monthly split-bills (e.g. Maid salary, Rent, WiFi).
          </p>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            ➕ Schedule Bill
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Schedule Monthly Bill</h3>
            <button
              onClick={() => setShowForm(false)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: 'var(--text-secondary)' }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Description *</label>
              <input
                className="input"
                type="text"
                placeholder="E.g. High-speed Wifi"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                required
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="label">Monthly Amount (₹) *</label>
                <input
                  className="input"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Due Day of Month (1-31) *</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="label">Category</label>
                <select
                  className="select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Paid By</label>
                <select
                  className="select"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                >
                  {members.map(m => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Split With Roommates</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: '4px' }}>
                {members.map(m => {
                  const isSelected = splitWith.includes(m._id);
                  return (
                    <div
                      key={m._id}
                      onClick={() => toggleMemberSelection(m._id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: isSelected ? 'var(--accent-blue-light)' : 'var(--bg-secondary)',
                        border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>{m.name}</span>
                      <span style={{ fontSize: '12px', color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>
                        {isSelected ? 'Included' : 'Excluded'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: '24px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={submitting}
              >
                {submitting ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Scheduled Bills Listing */}
      <div className="card" style={{ padding: '16px 0', marginBottom: 0 }}>
        <div style={{ padding: '0 16px 12px 16px', borderBottom: '1px solid var(--border-light)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Active Schedules</h3>
        </div>

        {loading ? (
          <div className="text-center" style={{ padding: '24px 0' }}>
            <div className="loading-spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : bills.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', padding: '24px 0' }}>
            No recurring bills scheduled.
          </p>
        ) : (
          <div>
            {bills.map((b, idx) => {
              const catInfo = getCategoryInfo(b.category);
              return (
                <div
                  key={b._id}
                  className="flex justify-between items-center"
                  style={{
                    padding: '12px 16px',
                    borderBottom: idx < bills.length - 1 ? '1px solid var(--border-light)' : 'none'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: '24px' }}>{catInfo.icon}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{b.description}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Paid by {b.paidBy?.name || 'Roommate'} · Auto-posts on day {b.dueDay}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>{formatCurrency(b.amount)}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Splits: {b.splitWith?.length || 0} users
                      </div>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px', color: 'var(--accent-red)' }}
                      onClick={() => handleDelete(b._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
