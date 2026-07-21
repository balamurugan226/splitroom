import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useHouse } from '../contexts/HouseContext';
import { useAuth } from '../contexts/AuthContext';
import { expenseAPI } from '../services/api';
import {
  formatCurrency,
  formatDate,
  getCurrentMonth,
  getInitials,
  EXPENSE_CATEGORIES,
  getCategoryInfo,
} from '../utils/formatters';

function ExpenseBottomSheet({ expense, members, currentUser, onClose, onSave }) {
  const isEdit = !!expense;
  const currentUserId = currentUser?.id || currentUser?._id;
  
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense?.amount || '');
  const [category, setCategory] = useState(expense?.category || 'other');
  const [date, setDate] = useState(
    expense?.date ? expense.date.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  
  const expensePayerId = expense?.paidBy?._id || expense?.paidBy;
  const [paidBy, setPaidBy] = useState(expensePayerId || currentUserId || '');
  const [splitType, setSplitType] = useState(expense?.split_type || 'equal');
  
  const initialSplitWith = useMemo(() => {
    if (expense?.splitAmong) {
      return expense.splitAmong.map(s => s.user?._id || s.user);
    }
    return members.map((m) => m._id);
  }, [expense, members]);
  
  const [splitWith, setSplitWith] = useState(initialSplitWith);
  const [notes, setNotes] = useState(expense?.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleSplitMember = (memberId) => {
    setSplitWith((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!description.trim()) {
      setError('Description is required.');
      return;
    }
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    if (splitWith.length === 0) {
      setError('Please select at least one roommate to split with.');
      return;
    }

    const payload = {
      description,
      amount: numAmount,
      category,
      expense_date: date,
      paid_by: paidBy,
      split_type: splitType,
      member_ids: splitWith,
      notes,
    };

    try {
      setLoading(true);
      if (isEdit) {
        await expenseAPI.updateExpense(expense._id, payload);
      } else {
        await expenseAPI.addExpense(payload);
      }
      onSave();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save expense. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bottom-sheet-overlay" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-header">
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
            {isEdit ? 'Edit Expense' : 'Add Expense'}
          </h2>
          <button 
            onClick={onClose} 
            style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            ✕
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="expense-desc">Description *</label>
            <input
              id="expense-desc"
              className="input"
              type="text"
              placeholder="E.g. Groceries, Wi-Fi bill, Gas refill"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="label" htmlFor="expense-amt">Amount (₹) *</label>
              <input
                id="expense-amt"
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
              <label className="label" htmlFor="expense-cat">Category</label>
              <select
                id="expense-cat"
                className="select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.icon} {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="label" htmlFor="expense-date">Date</label>
              <input
                id="expense-date"
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="expense-payer">Paid By</label>
              <select
                id="expense-payer"
                className="select"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
              >
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Roommates Splitting With</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: '4px' }}>
              {members.map((m) => {
                const memberId = m._id;
                const isSelected = splitWith.includes(memberId);
                return (
                  <div
                    key={memberId}
                    onClick={() => toggleSplitMember(memberId)}
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
                    {isSelected ? (
                      <span style={{ color: 'var(--accent-blue)', fontWeight: 700, fontSize: '12px' }}>
                        Active
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        Excluded
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="label" htmlFor="expense-notes">Notes (Optional)</label>
            <input
              id="expense-notes"
              className="input"
              type="text"
              placeholder="Additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const { house, members } = useHouse();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMonth, setFilterMonth] = useState(getCurrentMonth());
  const [deleteLoading, setDeleteLoading] = useState(null);

  const currentUserId = user?.id || user?._id;

  const fetchExpenses = useCallback(async () => {
    if (!house) return;
    try {
      setLoading(true);
      const res = await expenseAPI.getExpenses({
        month: filterMonth,
        category: filterCategory !== 'all' ? filterCategory : undefined,
      });
      setExpenses(res.data.expenses || res.data || []);
    } catch (err) {
      console.error(err);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [house, filterMonth, filterCategory]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch =
        !search ||
        e.description?.toLowerCase().includes(search.toLowerCase()) ||
        e.paidBy?.name?.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [expenses, search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      setDeleteLoading(id);
      await expenseAPI.deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e._id !== id));
    } catch (err) {
      alert('Failed to delete expense.');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleSave = () => {
    setShowSheet(false);
    setEditingExpense(null);
    fetchExpenses();
  };

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  
  const myShareTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => {
      const myShareObj = e.splitAmong?.find(s => {
        const sUserId = s.user?._id || s.user;
        return sUserId && currentUserId && sUserId.toString() === currentUserId.toString();
      });
      return sum + Number(myShareObj?.amount || 0);
    }, 0);
  }, [filteredExpenses, currentUserId]);

  if (!house) {
    return (
      <div className="container" style={{ paddingTop: '40px' }}>
        <div className="card text-center" style={{ padding: '32px 16px' }}>
          <span style={{ fontSize: '48px' }}>🏠</span>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>
            No House Associated
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Join or create a house first to view and log expenses.
          </p>
          <a href="/house" className="btn btn-primary">Go to House Setup</a>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Top Header Summary */}
      <div className="card" style={{ background: 'var(--accent-blue)', color: '#ffffff', border: 'none' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, opacity: 0.9 }}>Total House Expenses</h2>
        <div style={{ fontSize: '28px', fontWeight: 800, margin: '4px 0 12px 0' }}>
          {formatCurrency(totalAmount)}
        </div>
        <div style={{ fontSize: '13px', opacity: 0.8 }}>
          Your active share: <strong>{formatCurrency(myShareTotal)}</strong>
        </div>
        <button 
          className="btn btn-secondary" 
          style={{ marginTop: '16px', background: '#ffffff', color: 'var(--accent-blue)', border: 'none' }}
          onClick={() => { setEditingExpense(null); setShowSheet(true); }}
        >
          ➕ Add New Expense
        </button>
      </div>

      {/* Filter and Search Section */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          className="input"
          type="text"
          placeholder="🔍 Search descriptions or names..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="grid-2">
          <select
            className="select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.icon} {c.label}
              </option>
            ))}
          </select>
          <input
            className="input"
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
          />
        </div>
      </div>

      {/* List of expenses */}
      {loading ? (
        <div className="text-center" style={{ padding: '40px 0' }}>
          <div className="loading-spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon">💸</span>
          <div className="empty-state-title">No expenses found</div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Try updating your filters or add a new expense.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredExpenses.map((exp, idx) => {
            const cat = getCategoryInfo(exp.category);
            const payerId = exp.paidBy?._id || exp.paidBy;
            const isPayerCurrentUser = payerId && currentUserId && payerId.toString() === currentUserId.toString();
            const canEdit = isPayerCurrentUser || house.user_role === 'owner' || house.user_role === 'admin';
            
            const myShareObj = exp.splitAmong?.find(s => {
              const sUserId = s.user?._id || s.user;
              return sUserId && currentUserId && sUserId.toString() === currentUserId.toString();
            });

            return (
              <div
                key={exp._id || idx}
                className="list-item"
                style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}
              >
                {/* Header row */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: '24px' }}>{cat.icon}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{exp.description}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Paid by {isPayerCurrentUser ? 'You' : (exp.paidBy?.name || 'Roommate')} · {formatDate(exp.date)}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{formatCurrency(exp.amount)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Share: {formatCurrency(myShareObj?.amount || 0)}
                    </div>
                  </div>
                </div>

                {/* Meta details & Actions */}
                <div 
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid var(--border-light)',
                    paddingTop: '8px',
                    marginTop: '4px'
                  }}
                >
                  <span className={`badge ${isPayerCurrentUser ? 'badge-green' : 'badge-orange'}`}>
                    {isPayerCurrentUser ? 'Paid' : 'Owed'}
                  </span>
                  
                  {canEdit && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px' }}
                        onClick={() => { setEditingExpense(exp); setShowSheet(true); }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        style={{ padding: '4px 8px' }}
                        onClick={() => handleDelete(exp._id)}
                        disabled={deleteLoading === exp._id}
                      >
                        {deleteLoading === exp._id ? '...' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Sheet form container */}
      {showSheet && (
        <ExpenseBottomSheet
          expense={editingExpense}
          members={members}
          currentUser={user}
          onClose={() => { setShowSheet(false); setEditingExpense(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
