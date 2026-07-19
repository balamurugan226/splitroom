import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  Receipt,
  CreditCard,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowRight,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { expenseAPI, paymentAPI } from '../services/api';
import {
  formatCurrency,
  formatTimeAgo,
  getCategoryInfo,
} from '../utils/formatters';

function StatCard({ icon: Icon, iconBg, iconColor, label, value, trend, trendUp, sub }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div
          className="stat-icon"
          style={{ background: iconBg }}
        >
          <Icon size={22} color={iconColor} />
        </div>
        {trend && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 700,
              color: trendUp ? 'var(--accent-green)' : 'var(--accent-red)',
              background: trendUp ? '#e3fcef' : '#ffebe6',
              padding: '3px 8px',
              borderRadius: 4,
            }}
          >
            {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend}
          </div>
        )}
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && (
        <div className="stat-trend" style={{ color: 'var(--text-muted)' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function SkeletonStatCard() {
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ width: 48, height: 48, background: 'var(--bg-tertiary)', borderRadius: 4, marginBottom: 16 }} />
      <div style={{ width: '50%', height: 16, background: 'var(--bg-tertiary)', marginBottom: 8 }} />
      <div style={{ width: '70%', height: 28, background: 'var(--bg-tertiary)' }} />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [balances, setBalances] = useState(null);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, balancesRes] = await Promise.allSettled([
        expenseAPI.getSummary(),
        paymentAPI.getBalances(),
      ]);
      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
      if (balancesRes.status === 'fulfilled') setBalances(balancesRes.value.data);
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const recentActivity = summary?.recent_expenses || [];
  const myBalance = balances?.my_balance || 0;
  const owed = balances?.owed_to_me || 0;
  const owes = balances?.i_owe || 0;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Dashboard
          </h1>
          <p className="page-subtitle">Welcome back, {user?.name?.split(' ')[0]}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/expenses')}>
            <Plus size={15} />
            Add Expense
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <div className="alert alert-error" style={{ marginBottom: 24 }}>{error}</div>}

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        {loading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard
              icon={Home}
              iconBg="var(--accent-blue-light)"
              iconColor="var(--accent-blue)"
              label="Monthly Rent"
              value={formatCurrency(summary?.monthly_rent || 0)}
              sub="Due on 5th of each month"
            />
            <StatCard
              icon={Receipt}
              iconBg="#f3e8ff"
              iconColor="#5243aa"
              label="Total Expenses"
              value={formatCurrency(summary?.total_this_month || 0)}
              trend="+12%"
              trendUp={true}
              sub="This month"
            />
            <StatCard
              icon={CreditCard}
              iconBg="#fffae6"
              iconColor="#ff8b00"
              label="Pending Amount"
              value={formatCurrency(owes)}
              trend={owes > 0 ? 'Owed' : undefined}
              trendUp={false}
              sub="You owe to others"
            />
            <StatCard
              icon={CheckCircle}
              iconBg="#e3fcef"
              iconColor="#00875a"
              label="Paid Amount"
              value={formatCurrency(owed)}
              trend={owed > 0 ? 'Owed to you' : undefined}
              trendUp={true}
              sub="Others owe you"
            />
          </>
        )}
      </div>

      {/* Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Recent Activity */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                Recent Activity
              </h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigate('/expenses')}
              >
                View All <ArrowRight size={14} />
              </button>
            </div>

            {loading ? (
              <div style={{ padding: 24 }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 4, background: 'var(--bg-tertiary)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ width: '80%', height: 16, background: 'var(--bg-tertiary)', marginBottom: 8 }} />
                      <div style={{ width: '40%', height: 12, background: 'var(--bg-tertiary)' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length > 0 ? (
              <div>
                {recentActivity.slice(0, 5).map((exp, idx) => {
                  const cat = getCategoryInfo(exp.category);
                  return (
                    <div
                      key={exp.id || idx}
                      style={{
                        padding: '16px 24px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        borderBottom: idx < recentActivity.length - 1 ? '1px solid var(--border-light)' : 'none',
                        transition: 'background 0.15s',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          background: 'var(--bg-tertiary)',
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                          flexShrink: 0,
                        }}
                      >
                        {cat.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>
                          {exp.description || cat.label}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Paid by {exp.paid_by_name || 'Unknown'} · {formatTimeAgo(exp.created_at)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                          {formatCurrency(exp.amount)}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          Your share: {formatCurrency(exp.my_share || 0)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-title">No expenses yet</div>
                <div className="empty-state-desc">
                  Start by adding your first shared expense.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Quick Actions */}
          <div className="card">
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: 'var(--text-primary)' }}>
              Quick Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '➕', label: 'Add Expense', to: '/expenses', color: 'var(--accent-blue)' },
                { icon: '💸', label: 'Pay Rent', to: '/payments', color: 'var(--accent-green)' },
                { icon: '👤', label: 'Add Member', to: '/members', color: 'var(--accent-purple)' },
              ].map(({ icon, label, to, color }) => (
                <button
                  key={label}
                  onClick={() => navigate(to)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      background: 'var(--bg-primary)',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                      border: '1px solid var(--border)'
                    }}
                  >
                    {icon}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                    {label}
                  </span>
                  <ArrowUpRight size={14} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />
                </button>
              ))}
            </div>
          </div>

          {/* My Balance */}
          <div
            className="card"
            style={{
              background: 'var(--bg-card)',
              border: '2px solid var(--accent-blue)',
            }}
          >
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 20, color: 'var(--text-primary)' }}>
              My Balance
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  padding: 16,
                  background: 'var(--bg-secondary)',
                  borderRadius: 4,
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>
                  Others owe you
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent-green)' }}>
                  {formatCurrency(owed)}
                </div>
              </div>
              <div
                style={{
                  padding: 16,
                  background: 'var(--bg-secondary)',
                  borderRadius: 4,
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>
                  You owe others
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent-red)' }}>
                  {formatCurrency(owes)}
                </div>
              </div>
              <div
                style={{
                  padding: 16,
                  background: 'var(--bg-tertiary)',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>
                  Net Balance
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: myBalance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                  }}
                >
                  {myBalance >= 0 ? '+' : ''}{formatCurrency(myBalance)}
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                marginTop: 16,
              }}
              onClick={() => navigate('/settlements')}
            >
              Settle Up
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
