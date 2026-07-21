import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHouse } from '../contexts/HouseContext';
import { expenseAPI, paymentAPI } from '../services/api';
import { formatCurrency, formatTimeAgo, getCategoryInfo, formatMonth } from '../utils/formatters';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { house, loading: houseLoading } = useHouse();
  const [loadingData, setLoadingData] = useState(true);
  const [summary, setSummary] = useState(null);
  const [balances, setBalances] = useState(null);
  const [rentRecords, setRentRecords] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    if (!house) {
      setLoadingData(false);
      return;
    }
    try {
      setLoadingData(true);
      setError('');
      const [summaryRes, balancesRes, rentRes, expensesRes] = await Promise.all([
        expenseAPI.getSummary(),
        paymentAPI.getBalances(),
        paymentAPI.getRentRecords({ limit: 1 }),
        expenseAPI.getExpenses({ limit: 100 })
      ]);
      setSummary(summaryRes.data.summary || summaryRes.data);
      setBalances(balancesRes.data);
      setRentRecords(rentRes.data.rent_records || rentRes.data || []);
      setExpenses(expensesRes.data.expenses || expensesRes.data || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Could not load dashboard information. Please try refreshing.');
    } finally {
      setLoadingData(false);
    }
  }, [house]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Compute category breakdown totals for the SVG progress indicator
  const categoryBreakdown = useMemo(() => {
    if (expenses.length === 0) return [];
    
    const totals = {};
    let totalSpent = 0;
    
    expenses.forEach(exp => {
      const amt = Number(exp.amount || 0);
      totals[exp.category] = (totals[exp.category] || 0) + amt;
      totalSpent += amt;
    });

    if (totalSpent === 0) return [];

    return Object.keys(totals).map(catKey => {
      const catInfo = getCategoryInfo(catKey);
      const amount = totals[catKey];
      return {
        key: catKey,
        label: catInfo.label,
        icon: catInfo.icon,
        color: catInfo.color || '#3b82f6',
        amount,
        percentage: Math.round((amount / totalSpent) * 100),
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  if (houseLoading || (house && loadingData)) {
    return (
      <div className="container text-center" style={{ paddingTop: '100px' }}>
        <div className="loading-spinner" style={{ margin: '0 auto' }} />
        <p style={{ marginTop: '16px', fontWeight: 600 }}>Loading Dashboard...</p>
      </div>
    );
  }

  // If user is not associated with any house
  if (!house) {
    return (
      <div className="container" style={{ paddingTop: '40px' }}>
        <div className="card text-center" style={{ padding: '32px 16px' }}>
          <span style={{ fontSize: '48px' }}>🏠</span>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>
            No House Found
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
            To start splitting bills, recording expenses, and managing rent with roommates, you must either create a new house or join an existing one using an invite code.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/house')}>
            Create or Join House
          </button>
        </div>
      </div>
    );
  }

  const myBalance = balances?.my_balance || 0;
  const owedToMe = balances?.owed_to_me || 0;
  const iOwe = balances?.i_owe || 0;
  const recentExpenses = summary?.recent_expenses || [];
  const latestRent = rentRecords && rentRecords.length > 0 ? rentRecords[0] : null;

  // Find users I owe to suggest quick settle actions
  const settleSuggestions = balances?.balances?.filter(b => b.balance < 0) || [];

  return (
    <div className="container">
      {error && <div className="alert alert-error">{error}</div>}

      {/* Net Balance Card */}
      <div className="card" style={{ borderLeft: '5px solid var(--accent-blue)', padding: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
          My Net Balance
        </div>
        <div style={{ fontSize: '36px', fontWeight: 800, color: myBalance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', margin: '4px 0 16px 0' }}>
          {myBalance >= 0 ? '+' : ''}{formatCurrency(myBalance)}
        </div>
        
        <div className="grid-2">
          <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Owed to me</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-green)', marginTop: '2px' }}>
              {formatCurrency(owedToMe)}
            </div>
          </div>
          <div style={{ padding: '12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>I owe</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-red)', marginTop: '2px' }}>
              {formatCurrency(iOwe)}
            </div>
          </div>
        </div>
      </div>

      {/* Settle Suggestions Panel */}
      {settleSuggestions.length > 0 && (
        <div className="card" style={{ background: 'var(--accent-red-light)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-red)', marginBottom: '8px' }}>
            🔔 Outstanding Balances to Settle
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {settleSuggestions.map(s => (
              <div key={s.user_id} className="flex justify-between items-center" style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  You owe <strong>{s.name}</strong> {formatCurrency(Math.abs(s.balance))}
                </span>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                  onClick={() => navigate('/settlements')}
                >
                  Settle Up
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spend Category Breakdown Chart */}
      {categoryBreakdown.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Category Spending</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {categoryBreakdown.slice(0, 4).map(c => (
              <div key={c.key} style={{ width: '100%' }}>
                <div className="flex justify-between text-xs font-semibold" style={{ marginBottom: '4px' }}>
                  <span>{c.icon} {c.label} ({c.percentage}%)</span>
                  <span>{formatCurrency(c.amount)}</span>
                </div>
                {/* Custom Progress Bar */}
                <div style={{ height: '8px', background: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${c.percentage}%`, background: c.color, borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rent Status Card */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Monthly Rent Status</h3>
          {latestRent ? (
            <span className={`badge ${latestRent.status === 'paid' ? 'badge-green' : 'badge-orange'}`}>
              {latestRent.status}
            </span>
          ) : (
            <span className="badge badge-red">no records</span>
          )}
        </div>
        {latestRent ? (
          <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Rent for {formatMonth(latestRent.month)}
              </span>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>
                {formatCurrency(latestRent.amount)}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Due Date: {new Date(latestRent.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            {latestRent.status !== 'paid' && (
              <button 
                className="btn btn-secondary btn-sm" 
                style={{ marginTop: '12px', width: '100%' }}
                onClick={() => navigate('/payments')}
              >
                Go to Payments
              </button>
            )}
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', padding: '8px 0' }}>
            No rent billing setup found for this month.
          </p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="mb-2" style={{ fontSize: '15px', fontWeight: 700 }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn btn-primary" 
            style={{ flex: 1, fontSize: '13px' }}
            onClick={() => navigate('/expenses')}
          >
            ➕ Expense
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ flex: 1, fontSize: '13px' }}
            onClick={() => navigate('/settlements')}
          >
            🤝 Settle Up
          </button>
          <button 
            className="btn btn-secondary" 
            style={{ flex: 1, fontSize: '13px' }}
            onClick={() => navigate('/house')}
          >
            🏠 House Info
          </button>
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="card" style={{ padding: '16px 0', marginBottom: 0 }}>
        <div style={{ padding: '0 16px 12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Recent Expenses</h3>
          <button 
            style={{ border: 'none', background: 'transparent', color: 'var(--accent-blue)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
            onClick={() => navigate('/expenses')}
          >
            View All
          </button>
        </div>
        
        {recentExpenses.length > 0 ? (
          <div>
            {recentExpenses.slice(0, 5).map((item, idx) => {
              const cat = getCategoryInfo(item.category);
              return (
                <div 
                  key={item.id || idx}
                  className="flex justify-between items-center"
                  style={{
                    padding: '12px 16px',
                    borderBottom: idx < recentExpenses.slice(0, 5).length - 1 ? '1px solid var(--border-light)' : 'none'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: '24px' }}>{cat.icon}</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{item.description}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Paid by {item.paid_by_name || 'Roommate'} · {formatTimeAgo(item.created_at)}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{formatCurrency(item.amount)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Share: {formatCurrency(item.my_share)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
            No expenses recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
