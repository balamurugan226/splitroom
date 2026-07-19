import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, X, Upload } from 'lucide-react';
import { expenseAPI } from '../services/api';
import { useHouse } from '../contexts/HouseContext';
import { useAuth } from '../contexts/AuthContext';
import {
  formatCurrency,
  formatDate,
  getCurrentMonth,
  getInitials,
  EXPENSE_CATEGORIES,
  getCategoryInfo,
  SPLIT_TYPES,
} from '../utils/formatters';
import { validateAmount } from '../utils/validators';

function ExpenseModal({ expense, members, currentUser, onClose, onSave }) {
  const isEdit = !!expense;
  const [form, setForm] = useState({
    description: expense?.description || '',
    amount: expense?.amount || '',
    category: expense?.category || 'other',
    date: expense?.date ? expense.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    paid_by: expense?.paid_by || currentUser?.id || '',
    split_type: expense?.split_type || 'equal',
    split_with: expense?.split_with || members.map((m) => m.user_id || m.id),
    notes: expense?.notes || '',
    receipt: null,
  });
  const [customSplits, setCustomSplits] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleSplitMember = (memberId) => {
    setForm((p) => ({
      ...p,
      split_with: p.split_with.includes(memberId)
        ? p.split_with.filter((id) => id !== memberId)
        : [...p.split_with, memberId],
    }));
  };

  const handleReceiptChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((p) => ({ ...p, receipt: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateAmount(form.amount)) { setError('Please enter a valid amount.'); return; }
    if (!form.description.trim()) { setError('Description is required.'); return; }
    if (form.split_with.length === 0) { setError('Select at least one member to split with.'); return; }

    const payload = {
      ...form,
      amount: Number(form.amount),
      custom_splits: form.split_type !== 'equal' ? customSplits : undefined,
    };

    try {
      setLoading(true);
      if (isEdit) {
        await expenseAPI.updateExpense(expense.id, payload);
      } else {
        await expenseAPI.addExpense(payload);
      }
      onSave();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save expense.');
    } finally {
      setLoading(false);
    }
  };

  const equalShare = form.split_with.length > 0
    ? Number(form.amount) / form.split_with.length
    : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Expense' : 'Add Expense'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Description */}
          <div className="form-group">
            <label className="label">Description *</label>
            <input className="input" placeholder="e.g. Electricity bill for June"
              value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} required />
          </div>

          {/* Amount + Category */}
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Amount (₹) *</label>
              <input className="input" type="number" placeholder="0.00" step="0.01" min="0"
                value={form.amount} onChange={(e) => setForm(p => ({ ...p, amount: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date + Paid By */}
          <div className="grid-2">
            <div className="form-group">
              <label className="label">Date</label>
              <input className="input" type="date" value={form.date}
                onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Paid By</label>
              <select className="input" value={form.paid_by} onChange={(e) => setForm(p => ({ ...p, paid_by: e.target.value }))}>
                {members.map((m) => (
                  <option key={m.user_id || m.id} value={m.user_id || m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Split Type */}
          <div className="form-group">
            <label className="label">Split Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {SPLIT_TYPES.map((st) => (
                <button
                  key={st.value}
                  type="button"
                  className={`chip ${form.split_type === st.value ? 'active' : ''}`}
                  onClick={() => setForm(p => ({ ...p, split_type: st.value }))}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Split With */}
          <div className="form-group">
            <label className="label">Split With</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto', padding: 4 }}>
              {members.map((m) => {
                const memberId = m.user_id || m.id;
                const isSelected = form.split_with.includes(memberId);
                return (
                  <div
                    key={memberId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      background: isSelected ? 'var(--accent-blue-light)' : 'var(--bg-secondary)',
                      border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onClick={() => toggleSplitMember(memberId)}
                  >
                    <div className="avatar avatar-sm">{getInitials(m.name)}</div>
                    <span style={{ fontWeight: 600, fontSize: 14, flex: 1, color: 'var(--text-primary)' }}>{m.name}</span>
                    {form.split_type === 'equal' && isSelected && form.amount && (
                      <span style={{ fontSize: 13, color: 'var(--accent-blue)', fontWeight: 700 }}>
                        {formatCurrency(equalShare)}
                      </span>
                    )}
                    {(form.split_type === 'percentage' || form.split_type === 'custom') && isSelected && (
                      <input
                        type="number"
                        className="input"
                        style={{ width: 80, padding: '4px 8px', fontSize: 13, textAlign: 'center' }}
                        placeholder={form.split_type === 'percentage' ? '%' : '₹'}
                        value={customSplits[memberId] || ''}
                        onChange={(e) => { e.stopPropagation(); setCustomSplits(p => ({ ...p, [memberId]: e.target.value })); }}
                        onClick={(e) => e.stopPropagation()}
                        min="0"
                      />
                    )}
                    {isSelected ? (
                      <div style={{ width: 20, height: 20, background: 'var(--accent-blue)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" /></svg>
                      </div>
                    ) : (
                      <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderRadius: '50%' }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="label">Notes (Optional)</label>
            <textarea className="input" rows={2} placeholder="Any additional notes..."
              value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>

          {/* Receipt Upload */}
          <div className="form-group">
            <label className="label">Receipt (Optional)</label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                border: '1.5px dashed var(--border)',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <Upload size={16} color="var(--text-muted)" />
              <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                {form.receipt ? '✅ Receipt attached' : 'Upload receipt image'}
              </span>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleReceiptChange} />
            </label>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Update Expense' : 'Add Expense'}
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
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMonth, setFilterMonth] = useState(getCurrentMonth());
  const [deleteLoading, setDeleteLoading] = useState(null);

  const fetchExpenses = useCallback(async () => {
    if (!house) return;
    try {
      setLoading(true);
      const res = await expenseAPI.getExpenses({ month: filterMonth, category: filterCategory !== 'all' ? filterCategory : undefined });
      setExpenses(res.data.expenses || []);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [house, filterMonth, filterCategory]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const filteredExpenses = useMemo(() =>
    expenses.filter((e) =>
      !search ||
      e.description?.toLowerCase().includes(search.toLowerCase()) ||
      e.paid_by_name?.toLowerCase().includes(search.toLowerCase())
    ), [expenses, search]);

  const deleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      setDeleteLoading(id);
      await expenseAPI.deleteExpense(id);
      setExpenses((p) => p.filter((e) => e.id !== id));
    } catch {
      alert('Failed to delete expense.');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleSave = () => {
    setShowModal(false);
    setEditingExpense(null);
    fetchExpenses();
  };

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const myTotal = filteredExpenses.reduce((sum, e) => sum + Number(e.my_share || 0), 0);

  if (!house) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🏠</div>
        <div className="empty-state-title">No House Found</div>
        <div className="empty-state-desc">Join or create a house to track expenses.</div>
        <a href="/house" className="btn btn-primary" style={{ marginTop: 20 }}>Go to House</a>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">
            {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} · Total: {formatCurrency(totalAmount)} · Your share: {formatCurrency(myTotal)}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingExpense(null); setShowModal(true); }}>
          <Plus size={16} /> Add Expense
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={16} color="var(--text-muted)" />
          <input placeholder="Search expenses..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input" style={{ width: 'auto', minWidth: 150 }} value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="all">All Categories</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
          ))}
        </select>
        <input className="input" type="month" style={{ width: 'auto' }} value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)} />
      </div>

      {/* Expense list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="loading-spinner" />
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="empty-state" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <div className="empty-state-icon">💸</div>
          <div className="empty-state-title">No expenses found</div>
          <div className="empty-state-desc">
            {search ? 'No expenses match your search.' : 'Add your first shared expense!'}
          </div>
          {!search && (
            <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setShowModal(true)}>
              <Plus size={15} /> Add First Expense
            </button>
          )}
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Paid By</th>
                <th>Date</th>
                <th>Amount</th>
                <th>My Share</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => {
                const cat = getCategoryInfo(expense.category);
                const isPaid = expense.my_status === 'paid';
                const canEdit = expense.paid_by === user?.id || house.user_role === 'owner' || house.user_role === 'admin';

                return (
                  <tr key={expense.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, background: cat.color + '22', borderRadius: 10,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                        }}>
                          {cat.icon}
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{cat.label}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{expense.description}</div>
                      {expense.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{expense.notes}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar avatar-sm">{getInitials(expense.paid_by_name)}</div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {expense.paid_by === user?.id ? 'You' : expense.paid_by_name}
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {formatDate(expense.date)}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                        {formatCurrency(expense.amount)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>
                        {formatCurrency(expense.my_share || 0)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${isPaid ? 'badge-green' : 'badge-orange'}`}>
                        {isPaid ? '✓ Paid' : '⏳ Pending'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {canEdit && (
                          <button
                            className="btn-icon"
                            style={{ width: 32, height: 32 }}
                            onClick={() => { setEditingExpense(expense); setShowModal(true); }}
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            className="btn-icon"
                            style={{ width: 32, height: 32, background: '#fee2e2', borderColor: '#fecaca', color: '#dc2626' }}
                            onClick={() => deleteExpense(expense.id)}
                            disabled={deleteLoading === expense.id}
                            title="Delete"
                          >
                            {deleteLoading === expense.id ? '...' : <Trash2 size={14} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(showModal || editingExpense) && (
        <ExpenseModal
          expense={editingExpense}
          members={members}
          currentUser={user}
          onClose={() => { setShowModal(false); setEditingExpense(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
