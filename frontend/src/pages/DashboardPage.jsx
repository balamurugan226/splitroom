import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useHouse } from '../contexts/HouseContext';
import { useAuth } from '../contexts/AuthContext';
import { expenseAPI, paymentAPI, houseAPI } from '../services/api';
import { formatCurrency, formatTimeAgo, getCategoryInfo, EXPENSE_CATEGORIES } from '../utils/formatters';
import { sendPushNotification } from '../utils/notifications';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export default function DashboardPage() {
  const { house, members, refreshHouse } = useHouse();
  const { user } = useAuth();
  const currentUserId = user?.id || user?._id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dashboard state
  const [feed, setFeed] = useState([]); // Unified Activity Feed (all transactions)
  const [balances, setBalances] = useState(null);
  const [notices, setNotices] = useState([]);

  // Filter state for Activity Feed (Log)
  const [logFilter, setLogFilter] = useState('all'); // 'all' | 'expense' | 'transfer' | 'settlement'

  // Notice board inputs
  const [newNoticeText, setNewNoticeText] = useState('');
  const [newNoticeColor, setNewNoticeColor] = useState('#fffbeb');
  const [postingNotice, setPostingNotice] = useState(false);

  // Unified Action Modal state
  const [showActionModal, setShowActionModal] = useState(false);
  const [activeActionTab, setActiveActionTab] = useState('expense'); // 'expense' | 'transfer' | 'settlement'

  // Action Form Inputs
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  const [paidBy, setPaidBy] = useState('');
  const [recipientId, setRecipientId] = useState('');

  // Receipt Image Preview Modal
  const [previewImage, setPreviewImage] = useState(null);

  // Dynamic UPI QR Modal state
  const [upiModalData, setUpiModalData] = useState(null);

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
    setSuccess(`Synced ${successCount} offline updates!`);
    setTimeout(() => setSuccess(''), 4000);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!house) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      await syncOfflineTransactions();

      const [expensesRes, balancesRes, noticesRes] = await Promise.all([
        expenseAPI.getExpenses({ limit: 100 }),
        paymentAPI.getBalances(),
        houseAPI.getNotices()
      ]);

      const expensesData = expensesRes.data.expenses || expensesRes.data || [];
      const balancesData = balancesRes.data || {};
      const noticesData = noticesRes.data.notices || noticesRes.data || [];

      const payRes = await paymentAPI.getPayments();
      const paymentsData = payRes.data.payments || payRes.data || [];

      const setRes = await paymentAPI.getSettlements();
      const settlementsData = setRes.data.settlements || setRes.data || [];

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
    window.addEventListener('online', syncOfflineTransactions);
    return () => {
      window.removeEventListener('online', syncOfflineTransactions);
    };
  }, [fetchDashboardData, syncOfflineTransactions]);

  const handleDeleteFeedItem = async (item) => {
    if (!window.confirm(`Delete this ${item.feedType} transaction? This will update room balances.`)) return;
    try {
      setError('');
      if (item.feedType === 'expense') {
        await expenseAPI.deleteExpense(item._id);
      } else {
        await paymentAPI.deletePayment(item._id);
      }
      setSuccess(`${item.feedType} transaction deleted.`);
      sendPushNotification('Transaction Removed 🗑️', `${item.feedType} record deleted.`);
      fetchDashboardData();
    } catch (err) {
      setError('Failed to delete transaction.');
    }
  };

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
        paid_by: paidBy || currentUserId,
        member_ids: members.map(m => m._id)
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

    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem('splitroom_offline_queue') || '[]');
      queue.push({ type: activeActionTab, payload });
      localStorage.setItem('splitroom_offline_queue', JSON.stringify(queue));

      setSuccess('Device is offline. Saved transaction locally!');
      sendPushNotification('Logged Offline 📴', 'Will sync when internet is back.');
      setShowActionModal(false);
      setDesc('');
      setAmount('');
      return;
    }

    try {
      if (activeActionTab === 'expense') {
        await expenseAPI.addExpense(payload);
        setSuccess('Expense logged successfully!');
        sendPushNotification('New Bill Added 💸', `${user?.name || 'Roommate'} logged ${desc.trim()} (₹${amt})`);
      } else if (activeActionTab === 'transfer') {
        await paymentAPI.createPayment(payload);
        setSuccess('Payment recorded successfully!');
        sendPushNotification('Payment Recorded 🔄', `Transfer of ₹${amt} logged.`);
      } else if (activeActionTab === 'settlement') {
        await paymentAPI.createSettlement(payload);
        setSuccess('Settlement created successfully!');
        sendPushNotification('Balances Settled 🤝', `Settlement of ₹${amt} recorded.`);
      }

      setShowActionModal(false);
      setDesc('');
      setAmount('');
      fetchDashboardData();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to complete transaction.');
    }
  };

  const handlePostNotice = async (e) => {
    e.preventDefault();
    if (!newNoticeText.trim()) return;
    try {
      setPostingNotice(true);
      setError('');
      await houseAPI.createNotice({ text: newNoticeText.trim(), color: newNoticeColor });
      setNewNoticeText('');
      const res = await houseAPI.getNotices();
      setNotices(res.data.notices || res.data || []);
      setSuccess('Sticky note pinned!');
    } catch (err) {
      setError('Could not pin note.');
    } finally {
      setPostingNotice(false);
    }
  };

  const handleDeleteNotice = async (id) => {
    try {
      await houseAPI.deleteNotice(id);
      setNotices(prev => prev.filter(n => n._id !== id));
    } catch {
      setError('Failed to delete note.');
    }
  };

  // Export PDF Statement
  const exportPDFStatement = () => {
    const doc = new jsPDF();
    const houseTitle = house?.name || 'SplitMate Flat Statement';
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    doc.setFontSize(18);
    doc.text(houseTitle, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on ${dateStr}`, 14, 26);

    let startY = 36;
    doc.setFontSize(14);
    doc.text('Unified Activity Log', 14, startY);
    startY += 6;

    const tableData = feed.map(item => [
      new Date(item.date || item.createdAt).toLocaleDateString('en-IN'),
      item.feedType.toUpperCase(),
      item.description || item.note || item.feedType,
      item.paidBy?.name || 'Roommate',
      `INR ${item.amount}`
    ]);

    doc.setFontSize(9);
    tableData.forEach((row, i) => {
      if (startY > 280) {
        doc.addPage();
        startY = 20;
      }
      doc.text(row.join('  |  '), 14, startY);
      startY += 7;
    });

    doc.save(`${houseTitle.replace(/\s+/g, '_')}_Statement.pdf`);
  };

  // Export Excel (.xlsx / .csv) Statement
  const exportExcelStatement = () => {
    const houseTitle = house?.name || 'SplitMate';
    const sheetData = feed.map((item, idx) => ({
      '#': idx + 1,
      'Date': new Date(item.date || item.createdAt).toLocaleDateString('en-IN'),
      'Type': item.feedType.toUpperCase(),
      'Description / Note': item.description || item.note || '-',
      'Paid By': item.paidBy?.name || 'Roommate',
      'Paid To': item.paidTo?.name || '-',
      'Total Amount (₹)': item.amount,
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'House Statement');
    XLSX.writeFile(workbook, `${houseTitle.replace(/\s+/g, '_')}_Statement.xlsx`);
  };

  // Open Dynamic UPI QR Modal
  const openUpiQRModal = (name, amount) => {
    const cleanAmt = Number(amount || 0).toFixed(2);
    const upiUri = `upi://pay?pa=roommate@upi&pn=${encodeURIComponent(name)}&am=${cleanAmt}&cu=INR`;
    setUpiModalData({ name, amount: cleanAmt, upiUri });
  };

  const filteredFeed = useMemo(() => {
    if (logFilter === 'all') return feed;
    return feed.filter(item => item.feedType === logFilter);
  }, [feed, logFilter]);

  if (!house && !loading) {
    return (
      <div className="container" style={{ paddingTop: '40px' }}>
        <div className="card text-center" style={{ padding: '40px 20px' }}>
          <span style={{ fontSize: '48px' }}>🏠</span>
          <h2 style={{ fontSize: '22px', fontWeight: 800, marginTop: '16px', marginBottom: '8px' }}>
            Welcome to SplitMate!
          </h2>

          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>
            You are not connected to a virtual flat room yet. Create a new room or join your roommates with an invite code.
          </p>
          <a href="/house" className="btn btn-primary btn-lg">Set Up / Join House</a>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* House Top Banner & Summary Cards */}
      <div className="card" style={{ padding: '20px' }}>
        <div className="flex justify-between items-center">
          <div>
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-blue)', letterSpacing: '0.05em' }}>
              Virtual Flat Room
            </span>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '2px 0 0 0' }}>
              {house?.name || 'Loading...'}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={exportExcelStatement} title="Export to Excel">
              📊 Excel
            </button>
            <button className="btn btn-secondary btn-sm" onClick={exportPDFStatement} title="Export PDF Statement">
              📄 PDF
            </button>
          </div>
        </div>

        {/* Roommate Balance Widget */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Your Flatmate Net Balances
          </div>

          {!balances || !balances.balances || balances.balances.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              No room balance history available yet.
            </p>
          ) : (
            <div className="grid-2">
              {balances.balances.map((b) => {
                const isOwedToMe = b.balance > 0;
                const isIOwe = b.balance < 0;
                const absVal = Math.abs(b.balance);

                return (
                  <div
                    key={b.user_id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-light)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700 }}>{b.name}</div>
                      <div style={{ fontSize: '12px', marginTop: '2px' }}>
                        {b.balance === 0 ? (
                          <span style={{ color: 'var(--text-muted)' }}>Settled up (₹0)</span>
                        ) : isOwedToMe ? (
                          <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>owes you {formatCurrency(absVal)}</span>
                        ) : (
                          <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>you owe {formatCurrency(absVal)}</span>
                        )}
                      </div>
                    </div>

                    {isIOwe && (
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                        onClick={() => openUpiQRModal(b.name, absVal)}
                      >
                        📲 Pay via UPI QR
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Category Spend Analytics Segment Bar */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>📊 Household Expense Category Analytics</h3>
        {categorySummary.grandTotal === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No expense logs for chart breakdown.</p>
        ) : (
          <div>
            <div style={{ display: 'flex', height: '14px', borderRadius: '7px', overflow: 'hidden', marginBottom: '14px' }}>
              {EXPENSE_CATEGORIES.map(cat => {
                const amt = categorySummary.totals[cat.value] || 0;
                if (!amt) return null;
                const pct = (amt / categorySummary.grandTotal) * 100;
                return (
                  <div
                    key={cat.value}
                    title={`${cat.label}: ${formatCurrency(amt)} (${pct.toFixed(1)}%)`}
                    style={{ width: `${pct}%`, background: cat.color }}
                  />
                );
              })}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {EXPENSE_CATEGORIES.map(cat => {
                const amt = categorySummary.totals[cat.value] || 0;
                if (!amt) return null;
                return (
                  <div key={cat.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
                    <span style={{ fontWeight: 600 }}>{cat.icon} {cat.label}:</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{formatCurrency(amt)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Room Sticky Notice Board */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>📌 Room Sticky Notice Board</h3>
        
        <form onSubmit={handlePostNotice} style={{ display: 'flex', gap: 8, marginBottom: '16px' }}>
          <input
            className="input"
            type="text"
            placeholder="Pin a sticky note for roommates (e.g. WiFi password, Maid coming at 10 AM)"
            value={newNoticeText}
            onChange={(e) => setNewNoticeText(e.target.value)}
          />
          <button className="btn btn-primary" type="submit" disabled={postingNotice}>
            Pin Note
          </button>
        </form>

        {notices.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No active sticky notes pinned.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {notices.map(n => (
              <div
                key={n._id}
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius)',
                  background: n.color || '#fffbeb',
                  color: '#1e293b',
                  fontSize: '13px',
                  fontWeight: 600,
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  maxWidth: '300px'
                }}
              >
                <div style={{ flex: 1 }}>{n.text}</div>
                <button
                  onClick={() => handleDeleteNotice(n._id)}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: '12px' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unified Activity Feed / Log Card */}
      <div className="card" style={{ padding: '20px 0', marginBottom: '80px' }}>
        <div style={{ padding: '0 20px 14px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Unified Activity Log</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Clear breakdown of all room expenses, transfers & settlements
            </p>
          </div>

          {/* Log Filter Tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary)', padding: '3px', borderRadius: 'var(--radius-sm)' }}>
            {['all', 'expense', 'transfer', 'settlement'].map(f => (
              <button
                key={f}
                onClick={() => setLogFilter(f)}
                style={{
                  border: 'none',
                  background: logFilter === f ? 'var(--bg-card)' : 'transparent',
                  color: logFilter === f ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '11px',
                  fontWeight: logFilter === f ? 700 : 500,
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center" style={{ padding: '32px 0' }}>
            <div className="loading-spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : filteredFeed.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', padding: '32px 0' }}>
            No activity logs match filter "{logFilter}".
          </p>
        ) : (
          <div>
            {filteredFeed.map((item, idx) => {
              const payerName = item.paidBy?.name || 'Roommate';
              const formattedAmt = formatCurrency(item.amount);

              const payerIdStr = (item.paidBy?._id || item.paidBy)?.toString();
              const recipientIdStr = (item.paidTo?._id || item.paidTo)?.toString();
              const myIdStr = (currentUserId || '').toString();
              const isSplitMember = Array.isArray(item.splitAmong) && item.splitAmong.some(s => (s.user?._id || s.user)?.toString() === myIdStr);
              const canDelete = payerIdStr === myIdStr || recipientIdStr === myIdStr || isSplitMember;

              let typeBadgeColor = 'badge-blue';
              let actionSummary = '';
              let badgeIcon = '💸';

              if (item.feedType === 'expense') {
                typeBadgeColor = 'badge-blue';
                actionSummary = `${payerName} logged "${item.description}"`;
                badgeIcon = '💸';
              } else if (item.feedType === 'transfer' || item.feedType === 'settlement') {
                typeBadgeColor = item.feedType === 'settlement' ? 'badge-green' : 'badge-purple';
                badgeIcon = item.feedType === 'settlement' ? '🤝' : '🔄';

                const recipientName = item.paidTo?.name || 'Roommate';

                if (payerIdStr && myIdStr && payerIdStr === myIdStr) {
                  actionSummary = `You paid ${recipientName}`;
                } else if (recipientIdStr && myIdStr && recipientIdStr === myIdStr) {
                  actionSummary = `Received from ${payerName}`;
                } else {
                  actionSummary = `${payerName} paid ${recipientName}`;
                }
              }

              return (
                <div
                  key={item._id || idx}
                  className="flex justify-between items-center"
                  style={{
                    padding: '14px 20px',
                    borderBottom: idx < filteredFeed.length - 1 ? '1px solid var(--border-light)' : 'none'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={`badge ${typeBadgeColor}`} style={{ padding: '2px 8px', fontSize: '10px', textTransform: 'uppercase' }}>
                        {badgeIcon} {item.feedType}
                      </span>
                      {item.receipt_image && (
                        <button
                          onClick={() => setPreviewImage(item.receipt_image)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px' }}
                          title="View Receipt Image"
                        >
                          📎 Receipt
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '4px' }}>
                      {actionSummary}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {formatTimeAgo(item.date || item.createdAt)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <div style={{ fontSize: '15px', fontWeight: 800 }}>{formattedAmt}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {item.feedType === 'expense' && (
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          Your Share: {formatCurrency(item.splitAmong?.find(s => s.user?._id?.toString() === currentUserId || s.user?.toString() === currentUserId)?.amount || 0)}
                        </span>
                      )}
                      {canDelete && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 6px', fontSize: '10px', color: 'var(--accent-red)' }}
                          onClick={() => handleDeleteFeedItem(item)}
                          title="Delete record"
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
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
          boxShadow: 'var(--shadow-xl)',
          cursor: 'pointer',
          zIndex: 90,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Quick Log Transaction"
      >
        ➕
      </button>

      {/* Unified Action Drawer Modal */}
      {showActionModal && (
        <div className="modal-overlay" onClick={() => setShowActionModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Log Transaction</h3>
              <button
                onClick={() => setShowActionModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px' }}
              >
                ✕
              </button>
            </div>

            <div className="tabs" style={{ marginBottom: '16px' }}>
              <button
                className={`tab ${activeActionTab === 'expense' ? 'active' : ''}`}
                onClick={() => setActiveActionTab('expense')}
              >
                💸 Expense
              </button>
              <button
                className={`tab ${activeActionTab === 'transfer' ? 'active' : ''}`}
                onClick={() => setActiveActionTab('transfer')}
              >
                🔄 Transfer
              </button>
              <button
                className={`tab ${activeActionTab === 'settlement' ? 'active' : ''}`}
                onClick={() => setActiveActionTab('settlement')}
              >
                🤝 Settle Up
              </button>
            </div>

            <form onSubmit={handleLogAction}>
              <div className="form-group">
                <label className="label">Amount (₹) *</label>
                <input
                  className="input"
                  type="number"
                  placeholder="E.g. 500"
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

                  <div className="form-group">
                    <label className="label">Paid By (Who paid this bill?) *</label>
                    <select
                      className="select"
                      value={paidBy || currentUserId}
                      onChange={(e) => setPaidBy(e.target.value)}
                      required
                    >
                      {members.map(m => (
                        <option key={m._id} value={m._id}>
                          {m.name} {m._id?.toString() === currentUserId?.toString() ? '(You)' : ''}
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
                    <label className="label">Notes / Reference</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="E.g. Settled electricity bill via GPay"
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowActionModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Log {activeActionTab}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic UPI QR Code Modal */}
      {upiModalData && (
        <div className="modal-overlay" onClick={() => setUpiModalData(null)}>
          <div className="modal text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Pay {upiModalData.name}</h3>
              <button onClick={() => setUpiModalData(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px' }}>
                ✕
              </button>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Scan with GPay, PhonePe, Paytm, or BHIM to pay <strong>{formatCurrency(upiModalData.amount)}</strong>
            </p>

            <div style={{ background: '#ffffff', padding: '16px', borderRadius: 'var(--radius)', display: 'inline-block', marginBottom: '16px' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiModalData.upiUri)}`}
                alt="UPI Payment QR Code"
                style={{ width: '180px', height: '180px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <a href={upiModalData.upiUri} className="btn btn-primary" style={{ flex: 1 }}>
                📲 Open GPay / PhonePe App
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Receipt Image Modal */}
      {previewImage && (
        <div className="modal-overlay" onClick={() => setPreviewImage(null)}>
          <div className="modal text-center" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Receipt Preview</h3>
              <button onClick={() => setPreviewImage(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px' }}>
                ✕
              </button>
            </div>
            <img src={previewImage} alt="Receipt Preview" style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 'var(--radius)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
