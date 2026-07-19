import React, { useState, useEffect, useCallback } from 'react';
import { useHouse } from '../contexts/HouseContext';
import { useAuth } from '../contexts/AuthContext';
import { paymentAPI } from '../services/api';
import { formatCurrency, formatMonth, formatDate } from '../utils/formatters';

export default function PaymentsPage() {
  const { house, members } = useHouse();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('rent'); // 'rent' or 'payments'
  const [rentRecords, setRentRecords] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states for creating rent record
  const [showRentForm, setShowRentForm] = useState(false);
  const [rentAmount, setRentAmount] = useState('');
  const [rentMonth, setRentMonth] = useState('');
  const [rentDueDate, setRentDueDate] = useState('');
  const [creatingRent, setCreatingRent] = useState(false);

  // Form states for recording payment
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentRecipient, setPaymentRecipient] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [creatingPayment, setCreatingPayment] = useState(false);

  const isOwnerOrAdmin = house?.user_role === 'owner' || house?.user_role === 'admin';

  const fetchData = useCallback(async () => {
    if (!house) return;
    try {
      setLoading(true);
      setError('');
      if (activeTab === 'rent') {
        const rentRes = await paymentAPI.getRentRecords();
        setRentRecords(rentRes.data.rent_records || rentRes.data || []);
      } else {
        const payRes = await paymentAPI.getPayments();
        setPayments(payRes.data.payments || payRes.data || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  }, [house, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateRent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amt = Number(rentAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid rent amount.');
      return;
    }
    if (!rentMonth) {
      setError('Please select the billing month.');
      return;
    }
    if (!rentDueDate) {
      setError('Please select a due date.');
      return;
    }

    try {
      setCreatingRent(true);
      await paymentAPI.createRentRecord({
        amount: amt,
        month: rentMonth,
        due_date: rentDueDate
      });
      setSuccess('Rent billing record created successfully!');
      setRentAmount('');
      setRentMonth('');
      setRentDueDate('');
      setShowRentForm(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create rent record.');
    } finally {
      setCreatingRent(false);
    }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }
    if (!paymentRecipient) {
      setError('Please select a recipient roommate.');
      return;
    }

    try {
      setCreatingPayment(true);
      await paymentAPI.createPayment({
        amount: amt,
        to_user_id: paymentRecipient,
        notes: paymentNotes
      });
      setSuccess('Payment recorded successfully!');
      setPaymentAmount('');
      setPaymentRecipient('');
      setPaymentNotes('');
      setShowPaymentForm(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to record payment.');
    } finally {
      setCreatingPayment(false);
    }
  };

  const handleMarkRentPaid = async (id) => {
    if (!window.confirm('Mark this rent record as paid?')) return;
    try {
      setError('');
      await paymentAPI.updateRentStatus(id, 'paid');
      setSuccess('Rent marked as paid!');
      fetchData();
    } catch (err) {
      setError('Failed to update rent status.');
    }
  };

  const handleMarkPaymentReceived = async (id) => {
    if (!window.confirm('Confirm that you have received this payment?')) return;
    try {
      setError('');
      await paymentAPI.markPaid(id);
      setSuccess('Payment confirmed!');
      fetchData();
    } catch (err) {
      setError('Failed to confirm payment.');
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
            Join or create a house first to manage rent and recorded payments.
          </p>
          <a href="/house" className="btn btn-primary">Go to House Setup</a>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '16px' }}>
        <button
          className={`tab ${activeTab === 'rent' ? 'active' : ''}`}
          onClick={() => { setActiveTab('rent'); setError(''); setSuccess(''); }}
        >
          Rent Billing
        </button>
        <button
          className={`tab ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => { setActiveTab('payments'); setError(''); setSuccess(''); }}
        >
          Roommate Transfers
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {activeTab === 'rent' ? (
        <div>
          {/* Rent Section */}
          <div className="card" style={{ padding: '16px' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Monthly Rent Records</h3>
              {isOwnerOrAdmin && !showRentForm && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowRentForm(true)}
                >
                  ➕ Set Rent Invoice
                </button>
              )}
            </div>

            {showRentForm && (
              <form onSubmit={handleCreateRent} style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius)', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>New Rent Invoice</h4>
                
                <div className="form-group">
                  <label className="label">Monthly Amount *</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="E.g. 15000"
                    value={rentAmount}
                    onChange={(e) => setRentAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="label">Rent Month *</label>
                    <input
                      className="input"
                      type="month"
                      value={rentMonth}
                      onChange={(e) => setRentMonth(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Due Date *</label>
                    <input
                      className="input"
                      type="date"
                      value={rentDueDate}
                      onChange={(e) => setRentDueDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setShowRentForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    disabled={creatingRent}
                  >
                    {creatingRent ? 'Posting...' : 'Create Invoice'}
                  </button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="text-center" style={{ padding: '24px 0' }}>
                <div className="loading-spinner" style={{ margin: '0 auto' }} />
              </div>
            ) : rentRecords.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', padding: '20px 0' }}>
                No rent records have been posted yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rentRecords.map((record) => (
                  <div key={record.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>
                          Rent - {formatMonth(record.month)}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Due by {formatDate(record.due_date)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '15px', fontWeight: 800 }}>
                          {formatCurrency(record.amount)}
                        </div>
                        <span className={`badge ${record.status === 'paid' ? 'badge-green' : 'badge-orange'}`} style={{ marginTop: '4px' }}>
                          {record.status}
                        </span>
                      </div>
                    </div>

                    {record.status !== 'paid' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: '8px', width: '100%' }}
                        onClick={() => handleMarkRentPaid(record.id)}
                      >
                        Mark Rent as Paid
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          {/* Roommate Transfers Section */}
          <div className="card" style={{ padding: '16px' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Recorded Transfers</h3>
              {!showPaymentForm && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowPaymentForm(true)}
                >
                  💸 Record Transfer
                </button>
              )}
            </div>

            {showPaymentForm && (
              <form onSubmit={handleCreatePayment} style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius)', marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>Record New Payment</h4>
                
                <div className="form-group">
                  <label className="label">Amount Paid *</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="E.g. 2500"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label">Paid To (Roommate) *</label>
                  <select
                    className="select"
                    value={paymentRecipient}
                    onChange={(e) => setPaymentRecipient(e.target.value)}
                    required
                  >
                    <option value="">Select Roommate</option>
                    {members
                      .filter((m) => (m.user_id || m.id) !== user?.id)
                      .map((m) => (
                        <option key={m.user_id || m.id} value={m.user_id || m.id}>
                          {m.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Notes</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="E.g. Paid via GPay, settled electricity"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setShowPaymentForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    disabled={creatingPayment}
                  >
                    {creatingPayment ? 'Recording...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="text-center" style={{ padding: '24px 0' }}>
                <div className="loading-spinner" style={{ margin: '0 auto' }} />
              </div>
            ) : payments.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', padding: '20px 0' }}>
                No transfers recorded yet.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {payments.map((p) => {
                  const isRecipient = p.to_user_id === user?.id;
                  const isSender = p.from_user_id === user?.id;

                  return (
                    <div key={p.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700 }}>
                            {isSender ? `Paid to ${p.to_name || 'Roommate'}` : `Received from ${p.from_name || 'Roommate'}`}
                          </div>
                          {p.notes && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.notes}</div>}
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {formatDate(p.created_at)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '15px', fontWeight: 800 }}>
                            {formatCurrency(p.amount)}
                          </div>
                          <span className={`badge ${p.status === 'paid' ? 'badge-green' : 'badge-orange'}`} style={{ marginTop: '4px' }}>
                            {p.status === 'paid' ? 'confirmed' : 'pending'}
                          </span>
                        </div>
                      </div>

                      {isRecipient && p.status !== 'paid' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ marginTop: '8px', width: '100%' }}
                          onClick={() => handleMarkPaymentReceived(p.id)}
                        >
                          Confirm Receipt of Funds
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
