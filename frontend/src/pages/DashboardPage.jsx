import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useHouse } from '../contexts/HouseContext';
import { useAuth } from '../contexts/AuthContext';
import { expenseAPI, paymentAPI, houseAPI } from '../services/api';
import { formatCurrency, formatTimeAgo, getCategoryInfo, EXPENSE_CATEGORIES } from '../utils/formatters';
import { sendPushNotification } from '../utils/notifications';
import { jsPDF } from 'jspdf';

export default function DashboardPage() {
  const { house, members, refreshHouse } = useHouse();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dashboard state
  const [feed, setFeed] = useState([]); // Unified Activity Feed (all transactions)
  const [balances, setBalances] = useState(null);
  const [notices, setNotices] = useState([]);

  // Notice board inputs
  const [newNoticeText, setNewNoticeText] = useState('');
  const [newNoticeColor, setNewNoticeColor] = useState('#fffbeb'); // default HSL yellow
  const [postingNotice, setPostingNotice] = useState(false);

  // Unified Action Modal state
  const [showActionModal, setShowActionModal] = useState(false);
  const [activeActionTab, setActiveActionTab] = useState('expense'); // 'expense' | 'transfer' | 'settlement'

  // Action Form Inputs
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [recipientId, setRecipientId] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const currentUserId = user?.id || user?._id;

  // Offline queue checker
  const syncOfflineTransactions = useCallback(async () => {
    if (!navigator.onLine) return;
    const queue = JSON.parse(localStorage.getItem('splitroom_offline_queue') || '[]');
    if (queue.length === 0) return;

    setError('');
    setSuccess('Syncing offline updates...');
    let successCount = 0;

    for (const item of queue) {
      try {
        if (item.type === 'expense') {
          await expenseAPI.addExpense(item.payload);
        } else if (item.type === 'transfer') {
          await paymentAPI.createPayment(item.payload);
        } else if (item.type === 'settlement') {
          await paymentAPI.createSettlement(item.payload);
        }
        successCount++;
      } catch (err) {
        console.error('Failed to sync offline item:', err);
      }
    }

    localStorage.removeItem('splitroom_offline_queue');
    if (successCount > 0) {
      setSuccess(`Successfully synced ${successCount} offline logs!`);
      sendPushNotification('Synced Offline Logs 🔄', `Restored ${successCount} updates to the house cloud.`);
      fetchDashboardData();
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!house) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');

      // Check and sync any offline queue items
      await syncOfflineTransactions();

      const [expensesRes, balancesRes, noticesRes] = await Promise.all([
        expenseAPI.getExpenses({ limit: 100 }),
        paymentAPI.getBalances(),
        houseAPI.getNotices()
      ]);

      const expensesData = expensesRes.data.expenses || expensesRes.data || [];
      const balancesData = balancesRes.data || {};
      const noticesData = noticesRes.data.notices || noticesRes.data || [];

      // Unified Activity Feed: Fetch payments too to merge them
      const payRes = await paymentAPI.getPayments();
      const paymentsData = payRes.data.payments || payRes.data || [];

      const setRes = await paymentAPI.getSettlements();
      const settlementsData = setRes.data.settlements || setRes.data || [];

      // Combine and sort all transactions into one master list
      const combined = [
        ...expensesData.map(e => ({ ...e, feedType: 'expense' })),
        ...paymentsData.map(p => ({ ...p, feedType: 'transfer' })),
        ...settlementsData.map(s => ({ ...s, feedType: 'settlement' }))
      ];

      combined.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt || 0);
        const dateB = new Date(b.date || b.createdAt || 0);
        return dateB - dateA;
      });

      setFeed(combined);
      setBalances(balancesData);
      setNotices(noticesData);
    } catch (err) {
      console.error(err);
      setError('Could not load portal details.');
    } finally {
      setLoading(false);
    }
  }, [house, syncOfflineTransactions]);

  useEffect(() => {
    fetchDashboardData();
    
    // Add online status change event listeners
    window.addEventListener('online', syncOfflineTransactions);
    return () => {
      window.removeEventListener('online', syncOfflineTransactions);
    };
  }, [fetchDashboardData, syncOfflineTransactions]);

  // Total household spending calculated from category segments
  const categorySummary = useMemo(() => {
    const totals = {};
    let grandTotal = 0;
    
    feed.forEach(item => {
      if (item.feedType === 'expense') {
        const amt = Number(item.amount || 0);
        totals[item.category] = (totals[item.category] || 0) + amt;
        grandTotal += amt;
      }
    });

    return { totals, grandTotal };
  }, [feed]);

  // Handle logging transaction (offline-ready)
  const handleLogAction = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError('Please input a valid amount.');
      return;
    }

    let payload = {};
    if (activeActionTab === 'expense') {
      if (!desc.trim()) {
        setError('Description is required.');
        return;
      }
      payload = {
        description: desc.trim(),
        amount: amt,
        category,
        paid_by: currentUserId,
        member_ids: members.map(m => m._id) // default splits equally with everyone
      };
    } else {
      if (!recipientId) {
        setError('Please select a recipient roommate.');
        return;
      }
      payload = {
        to_user: recipientId,
        amount: amt,
        note: desc.trim() || undefined
      };
    }

    // Offline caching trigger
    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem('splitroom_offline_queue') || '[]');
      queue.push({ type: activeActionTab, payload });
      localStorage.setItem('splitroom_offline_queue', JSON.stringify(queue));

      setSuccess('Device is offline. Saved transaction locally!');
      sendPushNotification('Logged Offline 📴', 'Will sync when internet is back.');
      setShowActionModal(false);
      
      // Reset forms
      setDesc('');
      setAmount('');
      setRecipientId('');
      return;
    }

    try {
      setSubmittingAction(true);
      if (activeActionTab === 'expense') {
        await expenseAPI.addExpense(payload);
        setSuccess('Expense added successfully!');
        sendPushNotification('Bill Logged 💸', `Shared expense for ${desc} of ${formatCurrency(amt)}.`);
      } else if (activeActionTab === 'transfer') {
        await paymentAPI.createPayment(payload);
        setSuccess('Transfer logged successfully!');
        sendPushNotification('Transfer Sent 🔄', `Logged transfer of ${formatCurrency(amt)}.`);
      } else if (activeActionTab === 'settlement') {
        await paymentAPI.createSettlement(payload);
        setSuccess('Settle up recorded successfully!');
        sendPushNotification('Debt Settled 🤝', `Zeroed out balances of ${formatCurrency(amt)}.`);
      }

      setDesc('');
      setAmount('');
      setRecipientId('');
      setShowActionModal(false);
      fetchDashboardData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to submit action.');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Sticky Notes logic
  const handlePostNotice = async (e) => {
    e.preventDefault();
    if (!newNoticeText.trim()) return;

    try {
      setPostingNotice(true);
      await houseAPI.createNotice({
        content: newNoticeText.trim(),
        color: newNoticeColor
      });
      setNewNoticeText('');
      fetchDashboardData();
    } catch (err) {
      setError('Could not post sticky note.');
    } finally {
      setPostingNotice(false);
    }
  };

  const handleClearNotice = async (id) => {
    try {
      await houseAPI.deleteNotice(id);
      fetchDashboardData();
    } catch (err) {
      setError('Could not remove notice.');
    }
  };

  // One-Click PDF statement download
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(`${house.name} - Room Account Statement`, 14, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);
    doc.line(14, 32, 196, 32);

    // Balances summary
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Roommate Balance Sheet", 14, 42);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    let y = 50;
    (balances?.balances || []).forEach(b => {
      const isOwed = b.balance > 0;
      doc.text(`${b.name}: ${isOwed ? 'Owed +' : 'Owes -'} Rs. ${Math.abs(b.balance).toFixed(2)}`, 20, y);
      y += 8;
    });

    y += 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Unified Transaction Feed", 14, y);
    doc.line(14, y + 3, 196, y + 3);

    y += 12;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    feed.slice(0, 20).forEach(item => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const typeLabel = item.feedType.toUpperCase();
      const name = item.paidBy?.name || 'Roommate';
      const descText = item.description || (item.feedType === 'transfer' ? 'Transfer' : 'Settlement');
      doc.text(`[${typeLabel}] ${descText} - Rs. ${item.amount.toFixed(2)} (${name})`, 14, y);
      y += 8;
    });

    doc.save(`SplitRoom_${house.name.replace(/\s+/g, '_')}_Statement.pdf`);
  };

  if (!house) {
    return (
      <div className="container" style={{ paddingTop: '40px' }}>
        <div className="card text-center" style={{ padding: '32px 16px' }}>
          <span style={{ fontSize: '48px' }}>🏠</span>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>
            No House Registered
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
            To begin logging expenses and settling balances, you must either setup a new flat or join your flatmate's room using their invite code.
          </p>
          <a href="/house" className="btn btn-primary">Go to House Setup</a>
        </div>
      </div>
    );
  }

  const myNet = balances?.my_balance || 0;
  const owedToMe = balances?.owed_to_me || 0;
  const iOwe = balances?.i_owe || 0;
  
  // Settle suggestion matching
  const settleSuggestions = balances?.balances?.filter(b => b.balance < 0) || [];

  // Check personal budget warnings
  const userBudgetLimit = user?.budget_limit || 0;
  // Calculate current user's expense shares total this month
  let myExpenseShareTotal = 0;
  const now = new Date();
  feed.forEach(item => {
    if (item.feedType === 'expense') {
      const expDate = new Date(item.date || item.createdAt);
      if (expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()) {
        const share = item.splitAmong?.find(s => s.user?._id?.toString() === currentUserId?.toString() || s.user?.toString() === currentUserId?.toString());
        if (share) {
          myExpenseShareTotal += share.amount;
        }
      }
    }
  });

  const isBudgetWarning = userBudgetLimit > 0 && myExpenseShareTotal >= userBudgetLimit * 0.8;
  const isBudgetExceeded = userBudgetLimit > 0 && myExpenseShareTotal >= userBudgetLimit;

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Budget Alerter */}
      {userBudgetLimit > 0 && (
        <div className="card" style={{ borderLeft: `5px solid ${isBudgetExceeded ? 'var(--accent-red)' : isBudgetWarning ? 'var(--accent-orange)' : 'var(--accent-green)'}`, padding: '16px' }}>
          <div className="flex justify-between items-center">
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>Personal Budget Cap</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Spent {formatCurrency(myExpenseShareTotal)} of {formatCurrency(userBudgetLimit)} target.
              </div>
            </div>
            {isBudgetExceeded ? (
              <span className="badge badge-red">limit exceeded ⚠️</span>
            ) : isBudgetWarning ? (
              <span className="badge badge-orange">80% limit warning ⚠️</span>
            ) : (
              <span className="badge badge-green">on budget ✅</span>
            )}
          </div>
          <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden', marginTop: '10px' }}>
            <div style={{
              height: '100%',
              width: `${Math.min((myExpenseShareTotal / userBudgetLimit) * 100, 100)}%`,
              background: isBudgetExceeded ? 'var(--accent-red)' : isBudgetWarning ? 'var(--accent-orange)' : 'var(--accent-green)'
            }} />
          </div>
        </div>
      )}

      {/* Room Net Balance Indicator */}
      <div className="card" style={{ borderLeft: '5px solid var(--accent-blue)', padding: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
          My Net Room Balance
        </div>
        <div style={{ fontSize: '36px', fontWeight: 800, color: myNet >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', margin: '4px 0 16px 0' }}>
          {myNet >= 0 ? '+' : ''}{formatCurrency(myNet)}
        </div>
        
        <div className="grid-2">
          <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Owed to me</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-green)', marginTop: '2px' }}>
              {formatCurrency(owedToMe)}
            </div>
          </div>
          <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>I owe</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-red)', marginTop: '2px' }}>
              {formatCurrency(iOwe)}
            </div>
          </div>
        </div>
      </div>

      {/* Settle Suggestions Quick-links */}
      {settleSuggestions.length > 0 && (
        <div className="card" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-red)', marginBottom: '8px' }}>
            💡 Quick Settle Outstanding Debts
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {settleSuggestions.map(s => (
              <div key={s.user_id} className="flex justify-between items-center" style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>
                  You owe <strong>{s.name}</strong> {formatCurrency(Math.abs(s.balance))}
                </span>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ padding: '6px 12px', fontSize: '11px' }}
                  onClick={() => {
                    setRecipientId(s.user_id);
                    setAmount(Math.abs(s.balance).toString());
                    setDesc(`Settled up debt to ${s.name}`);
                    setActiveActionTab('settlement');
                    setShowActionModal(true);
                  }}
                >
                  🤝 Pay Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Progress Segment Ring */}
      {categorySummary.grandTotal > 0 && (
        <div className="card">
          <div className="flex justify-between items-center" style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Flat Spend Categories</h3>
            <button className="btn btn-secondary btn-sm" onClick={handleDownloadPDF}>
              📄 Download Report
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.keys(categorySummary.totals).map(catKey => {
              const catInfo = getCategoryInfo(catKey);
              const amount = categorySummary.totals[catKey];
              const pct = Math.round((amount / categorySummary.grandTotal) * 100);

              return (
                <div key={catKey}>
                  <div className="flex justify-between text-xs font-semibold" style={{ marginBottom: '4px' }}>
                    <span>{catInfo.icon} {catInfo.label} ({pct}%)</span>
                    <span>{formatCurrency(amount)}</span>
                  </div>
                  <div style={{ height: '6px', background: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: catInfo.color || '#3b82f6', borderRadius: '3px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Digital Notice Board Widget */}
      <div className="card">
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>📌 Sticky Notice Board</h3>
        
        {/* Sticky Notes Grid */}
        {notices.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', padding: '16px 0' }}>
            No sticky notes posted. Leave a message for your flatmates below!
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: '16px' }}>
            {notices.map(n => (
              <div
                key={n._id}
                style={{
                  background: n.color || '#fffbeb',
                  color: '#0f172a',
                  padding: '12px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  boxShadow: 'var(--shadow-sm)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '90px'
                }}
              >
                <button
                  onClick={() => handleClearNotice(n._id)}
                  style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    background: 'rgba(0,0,0,0.05)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    fontSize: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
                <div style={{ fontSize: '12px', fontWeight: 500, lineHeight: 1.4, wordBreak: 'break-word', paddingRight: '12px' }}>
                  {n.content}
                </div>
                <div style={{ fontSize: '9px', opacity: 0.6, marginTop: '8px', textAlign: 'right' }}>
                  — {n.createdBy?.name || 'Flatmate'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Notice Input */}
        <form onSubmit={handlePostNotice} className="flex gap-2">
          <input
            className="input"
            type="text"
            placeholder="E.g. Maid won't come today..."
            value={newNoticeText}
            onChange={(e) => setNewNoticeText(e.target.value)}
            style={{ flex: 1, fontSize: '13px' }}
            required
          />
          <select
            className="select"
            value={newNoticeColor}
            onChange={(e) => setNewNoticeColor(e.target.value)}
            style={{ width: '80px', padding: '6px', fontSize: '12px' }}
          >
            <option value="#fffbeb">🟨 Yellow</option>
            <option value="#eff6ff">🟦 Blue</option>
            <option value="#ecfdf5">🟩 Green</option>
            <option value="#fdf2f8">🟥 Pink</option>
          </select>
          <button type="submit" className="btn btn-primary btn-sm" disabled={postingNotice}>
            📌 Post
          </button>
        </form>
      </div>

      {/* Unified Activity Feed */}
      <div className="card" style={{ padding: '16px 0' }}>
        <div style={{ padding: '0 16px 12px 16px', borderBottom: '1px solid var(--border-light)' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Unified Activity Feed</h3>
        </div>

        {feed.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', padding: '24px 0' }}>
            No room activity logged. Use the floating action button below!
          </p>
        ) : (
          <div>
            {feed.map((item, idx) => {
              const payerName = item.paidBy?.name || 'Roommate';
              const formattedAmt = formatCurrency(item.amount);
              const isPayer = item.paidBy?._id?.toString() === currentUserId || item.paidBy?.toString() === currentUserId;

              let typeBadgeColor = 'badge-blue';
              let actionSummary = '';
              let badgeIcon = '💸';

              if (item.feedType === 'expense') {
                typeBadgeColor = 'badge-blue';
                actionSummary = `${payerName} logged "${item.description}"`;
                badgeIcon = '💸';
              } else if (item.feedType === 'transfer') {
                typeBadgeColor = 'badge-purple';
                const recipientName = item.paidTo?.name || 'Roommate';
                actionSummary = `${payerName} sent money to ${recipientName}`;
                badgeIcon = '🔄';
              } else if (item.feedType === 'settlement') {
                typeBadgeColor = 'badge-green';
                const recipientName = item.paidTo?.name || 'Roommate';
                actionSummary = `${payerName} settled up with ${recipientName}`;
                badgeIcon = '🤝';
              }

              return (
                <div
                  key={item._id || idx}
                  className="flex justify-between items-center"
                  style={{
                    padding: '12px 16px',
                    borderBottom: idx < feed.length - 1 ? '1px solid var(--border-light)' : 'none'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`badge ${typeBadgeColor}`} style={{ padding: '2px 6px', fontSize: '10px' }}>
                        {badgeIcon} {item.feedType}
                      </span>
                      {item.receipt_image && <span style={{ fontSize: '12px' }}>📎</span>}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '4px' }}>
                      {actionSummary}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {formatTimeAgo(item.date || item.createdAt)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{formattedAmt}</div>
                    {item.feedType === 'expense' && (
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Share: {formatCurrency(item.splitAmong?.find(s => s.user?._id?.toString() === currentUserId || s.user?.toString() === currentUserId)?.amount || 0)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setShowActionModal(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'var(--accent-blue)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '50%',
          width: '56px',
          height: '56px',
          fontSize: '24px',
          boxShadow: 'var(--shadow-lg)',
          cursor: 'pointer',
          zIndex: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'var(--transition)'
        }}
      >
        ➕
      </button>

      {/* Unified Action Modal Drawer */}
      {showActionModal && (
        <div className="modal-overlay" onClick={() => setShowActionModal(false)}>
          <div className="modal animate-fade" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: '24px' }}>
            
            {/* Action Tab Headers */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px' }}>
              <button
                className={`tab ${activeActionTab === 'expense' ? 'active' : ''}`}
                style={{ flex: 1, paddingBottom: '10px', fontSize: '13px', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => { setActiveActionTab('expense'); setError(''); }}
              >
                💸 Expense
              </button>
              <button
                className={`tab ${activeActionTab === 'transfer' ? 'active' : ''}`}
                style={{ flex: 1, paddingBottom: '10px', fontSize: '13px', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => { setActiveActionTab('transfer'); setError(''); }}
              >
                🔄 Transfer
              </button>
              <button
                className={`tab ${activeActionTab === 'settlement' ? 'active' : ''}`}
                style={{ flex: 1, paddingBottom: '10px', fontSize: '13px', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => { setActiveActionTab('settlement'); setError(''); }}
              >
                🤝 Settle Up
              </button>
            </div>

            <form onSubmit={handleLogAction}>
              {/* Common Amount Input */}
              <div className="form-group">
                <label className="label">Amount (₹) *</label>
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

              {activeActionTab === 'expense' ? (
                <>
                  <div className="form-group">
                    <label className="label">Description *</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="E.g. Grocery store buy"
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Category *</label>
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
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label className="label">Recipient Roommate *</label>
                    <select
                      className="select"
                      value={recipientId}
                      onChange={(e) => setRecipientId(e.target.value)}
                      required
                    >
                      <option value="">Select Roommate</option>
                      {members
                        .filter(m => (m._id?._id || m._id || m).toString() !== (currentUserId || '').toString())
                        .map(m => (
                          <option key={m._id} value={m._id}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="label">Notes / Remarks</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="E.g. Sent via UPI"
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                    />
                  </div>
                </>
              )}

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowActionModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={submittingAction}
                >
                  {submittingAction ? 'Logging...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
