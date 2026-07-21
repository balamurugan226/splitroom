import React, { useState, useEffect, useCallback } from 'react';
import { useHouse } from '../contexts/HouseContext';
import { useAuth } from '../contexts/AuthContext';
import { paymentAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function SettlementsPage() {
  const { house, members } = useHouse();
  const { user } = useAuth();

  const [balances, setBalances] = useState(null);
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Settlement Form State
  const [showForm, setShowForm] = useState(false);
  const [payeeId, setPayeeId] = useState('');
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentUserId = user?.id || user?._id;

  const fetchData = useCallback(async () => {
    if (!house) return;
    try {
      setLoading(true);
      setError('');
      const [balRes, setRes] = await Promise.all([
        paymentAPI.getBalances(),
        paymentAPI.getSettlements()
      ]);
      setBalances(balRes.data);
      setSettlements(setRes.data.settlements || setRes.data || []);
    } catch (err) {
      console.error(err);
      setError('Could not load settlement data.');
    } finally {
      setLoading(false);
    }
  }, [house]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitSettlement = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid positive settlement amount.');
      return;
    }
    if (!payeeId) {
      setError('Please select which roommate you paid.');
      return;
    }

    try {
      setSubmitting(true);
      await paymentAPI.createSettlement({
        to_user: payeeId, // backend expects to_user
        amount: amt
      });
      setSuccess('Settlement transfer recorded successfully!');
      setAmount('');
      setPayeeId('');
      setShowForm(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to record settlement.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!house) {
    return (
      <div className="container" style={{ paddingTop: '40px' }}>
        <div className="card text-center" style={{ padding: '32px 16px' }}>
          <span style={{ fontSize: '48px' }}>🏠</span>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>
            No House Associated
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Join or create a house first to settle balances with roommates.
          </p>
          <a href="/house" className="btn btn-primary">Go to House Setup</a>
        </div>
      </div>
    );
  }

  // Calculate detailed debts / suggestions
  const roommateBalances = balances?.balances || [];
  
  return (
    <div className="container">
      {/* Settle Up Action Header */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Settle Up Debts</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Record a direct payment/transfer to zero out outstanding balances.
        </p>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            🤝 Record a Settlement
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Settle Up Form */}
      {showForm && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Record Cash Transfer</h3>
            <button 
              onClick={() => setShowForm(false)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: 'var(--text-secondary)' }}
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleSubmitSettlement}>
            <div className="form-group">
              <label className="label">Amount Paid (₹) *</label>
              <input
                className="input"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Paid To (Roommate) *</label>
              <select
                className="select"
                value={payeeId}
                onChange={(e) => setPayeeId(e.target.value)}
                required
              >
                <option value="">Select Roommate</option>
                {members
                  .filter((m) => m._id && currentUserId && m._id.toString() !== currentUserId.toString())
                  .map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: '16px' }}>
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
                {submitting ? 'Recording...' : 'Complete Settlement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Roommate Balances Section */}
      <div className="card" style={{ padding: '16px 0' }}>
        <div style={{ padding: '0 16px 12px 16px', borderBottom: '1px solid var(--border-light)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Roommate Balances</h3>
        </div>

        {loading ? (
          <div className="text-center" style={{ padding: '24px 0' }}>
            <div className="loading-spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : roommateBalances.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', padding: '20px 0' }}>
            All balances are currently settled!
          </p>
        ) : (
          <div>
            {roommateBalances.map((item, idx) => {
              const outstanding = item.balance || 0;
              const isOwed = outstanding > 0;
              return (
                <div
                  key={item.user_id || idx}
                  className="flex justify-between items-center"
                  style={{
                    padding: '12px 16px',
                    borderBottom: idx < roommateBalances.length - 1 ? '1px solid var(--border-light)' : 'none'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.name}</span>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {isOwed ? 'owes you' : 'you owe'}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: isOwed ? 'var(--accent-green)' : 'var(--accent-red)'
                    }}
                  >
                    {isOwed ? '+' : ''}{formatCurrency(outstanding)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settlement History */}
      <div className="card" style={{ padding: '16px 0', marginBottom: 0 }}>
        <div style={{ padding: '0 16px 12px 16px', borderBottom: '1px solid var(--border-light)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Settlement Log</h3>
        </div>

        {loading ? (
          <div className="text-center" style={{ padding: '24px 0' }}>
            <div className="loading-spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : settlements.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', padding: '20px 0' }}>
            No settlements recorded in this house.
          </p>
        ) : (
          <div>
            {settlements.map((s, idx) => (
              <div
                key={s._id || s.id || idx}
                className="flex justify-between items-center"
                style={{
                  padding: '12px 16px',
                  borderBottom: idx < settlements.length - 1 ? '1px solid var(--border-light)' : 'none'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>
                    {s.paidBy?.name || 'Roommate'} paid {s.paidTo?.name || 'Roommate'}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {formatDate(s.createdAt || s.date)}
                  </span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-green)' }}>
                  {formatCurrency(s.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
