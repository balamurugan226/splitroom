import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Eye, EyeOff, Save, Sun, Moon, LogOut, Bell, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useHouse } from '../contexts/HouseContext';
import { authAPI, paymentAPI, houseAPI } from '../services/api';
import {
  getInitials,
  formatCurrency,
  formatDate,
} from '../utils/formatters';
import { validateEmail, validatePhone, validatePassword, getPasswordStrength, getPasswordStrengthLabel } from '../utils/validators';

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h3 style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-primary)', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { house, refreshHouse } = useHouse();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwError, setPwError] = useState('');

  const [notifSettings, setNotifSettings] = useState({
    rent_due: true, expense_added: true, payment_done: true, member_joined: true, settlement: true,
  });
  const [recentPayments, setRecentPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    if (user) { setProfileForm({ name: user.name || '', email: user.email || '', phone: user.phone || '' }); }
  }, [user]);

  useEffect(() => {
    paymentAPI.getPayments({ limit: 5 })
      .then((res) => setRecentPayments(res.data.payments || []))
      .catch(() => setRecentPayments([]))
      .finally(() => setPaymentsLoading(false));
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError('');
    if (!validateEmail(profileForm.email)) { setProfileError('Invalid email address.'); return; }
    if (profileForm.phone && !validatePhone(profileForm.phone)) { setProfileError('Invalid phone number.'); return; }
    try {
      setProfileLoading(true);
      const res = await authAPI.updateProfile(profileForm);
      updateUser(res.data.user || profileForm);
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) { setProfileError(err?.response?.data?.message || 'Failed to update profile.'); }
    finally { setProfileLoading(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError('');
    if (!validatePassword(pwForm.new_password)) { setPwError('New password must be at least 6 characters.'); return; }
    if (pwForm.new_password !== pwForm.confirm_password) { setPwError('Passwords do not match.'); return; }
    try {
      setPwLoading(true);
      await authAPI.changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      setPwSuccess('Password changed successfully!');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setPwSuccess(''), 3000);
    } catch (err) { setPwError(err?.response?.data?.message || 'Failed to change password.'); }
    finally { setPwLoading(false); }
  };

  const handleLeaveHouse = async () => {
    try {
      setLeaveLoading(true);
      await houseAPI.leaveHouse(house.id);
      await refreshHouse();
      setShowLeaveConfirm(false);
    } catch (err) { alert(err?.response?.data?.message || 'Failed to leave house.'); }
    finally { setLeaveLoading(false); }
  };

  const pwStrength = getPasswordStrength(pwForm.new_password);
  const pwStrengthInfo = getPasswordStrengthLabel(pwStrength);

  const gradients = [
    'var(--accent-blue)',
    'var(--accent-blue)',
    'var(--accent-blue)',
  ];
  const avatarGradient = gradients[user?.name?.charCodeAt(0) % gradients.length] || gradients[0];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your account settings</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Left: profile card */}
        <div>
          <div className="card" style={{ textAlign: 'center', padding: '32px 24px', marginBottom: 16 }}>
            <div
              className="avatar avatar-xl"
              style={{ background: avatarGradient, margin: '0 auto 16px', fontSize: 32 }}
            >
              {getInitials(user?.name)}
            </div>
            <div style={{ fontWeight: 800, fontSize: 19, color: 'var(--text-primary)', marginBottom: 4 }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              {user?.email}
            </div>
            {house && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span className={`badge ${house.user_role === 'owner' ? 'badge-purple' : house.user_role === 'admin' ? 'badge-blue' : 'badge-gray'}`} style={{ justifyContent: 'center' }}>
                  {house.user_role === 'owner' ? '👑 Owner' : house.user_role === 'admin' ? '🛡️ Admin' : '👤 Member'}
                </span>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  🏠 {house.name}
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              Quick Info
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Member Since', value: formatDate(user?.created_at) },
                { label: 'House', value: house?.name || 'Not in a house' },
                { label: 'Role', value: house?.user_role || '-' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: sections */}
        <div>
          {/* 1. Personal Info */}
          <Section title="👤 Personal Information">
            {profileSuccess && <div className="alert alert-success" style={{ marginBottom: 16 }}>✅ {profileSuccess}</div>}
            {profileError && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {profileError}</div>}
            <form onSubmit={handleProfileSave}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="label">Full Name</label>
                  <div className="input-wrapper">
                    <User size={16} className="input-icon" />
                    <input className="input" value={profileForm.name}
                      onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Email Address</label>
                  <div className="input-wrapper">
                    <Mail size={16} className="input-icon" />
                    <input className="input" type="email" value={profileForm.email}
                      onChange={(e) => setProfileForm(p => ({ ...p, email: e.target.value }))} required />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label className="label">Phone Number</label>
                <div className="input-wrapper">
                  <Phone size={16} className="input-icon" />
                  <input className="input" type="tel" placeholder="9876543210" value={profileForm.phone}
                    onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={profileLoading}>
                <Save size={15} />
                {profileLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </Section>

          {/* 2. Change Password */}
          <Section title="🔒 Change Password">
            {pwSuccess && <div className="alert alert-success" style={{ marginBottom: 16 }}>✅ {pwSuccess}</div>}
            {pwError && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠️ {pwError}</div>}
            <form onSubmit={handlePasswordChange}>
              <div className="form-group">
                <label className="label">Current Password</label>
                <div className="input-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input className="input" type={showCurrentPw ? 'text' : 'password'} style={{ paddingRight: 44 }}
                    value={pwForm.current_password} onChange={(e) => setPwForm(p => ({ ...p, current_password: e.target.value }))} required placeholder="Enter current password" />
                  <button type="button" onClick={() => setShowCurrentPw(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                    {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="label">New Password</label>
                  <div className="input-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input className="input" type={showNewPw ? 'text' : 'password'} style={{ paddingRight: 44 }}
                      value={pwForm.new_password} onChange={(e) => setPwForm(p => ({ ...p, new_password: e.target.value }))} required placeholder="Min 6 characters" />
                    <button type="button" onClick={() => setShowNewPw(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                      {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {pwForm.new_password && (
                    <div style={{ marginTop: 8 }}>
                      <div className="strength-bar">{[1,2,3,4,5].map(s => <div key={s} className="strength-segment" style={{ background: pwStrength >= s ? pwStrengthInfo.color : 'var(--bg-tertiary)' }} />)}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4, color: pwStrengthInfo.color }}>{pwStrengthInfo.label}</div>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="label">Confirm New Password</label>
                  <div className="input-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input className="input" type="password"
                      value={pwForm.confirm_password} onChange={(e) => setPwForm(p => ({ ...p, confirm_password: e.target.value }))} required placeholder="Re-enter new password"
                      style={{ borderColor: pwForm.confirm_password && pwForm.new_password !== pwForm.confirm_password ? 'var(--accent-red)' : undefined }} />
                  </div>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={pwLoading}>
                <Lock size={15} />
                {pwLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </Section>

          {/* 3. Notification Settings */}
          <Section title="🔔 Notification Settings">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { key: 'rent_due', label: 'Rent Due Reminders', desc: 'Get notified when rent is due' },
                { key: 'expense_added', label: 'New Expenses', desc: 'When a roommate adds an expense' },
                { key: 'payment_done', label: 'Payment Confirmed', desc: 'When a payment is marked as paid' },
                { key: 'member_joined', label: 'Member Joined', desc: 'When someone joins your house' },
                { key: 'settlement', label: 'Settlement Requests', desc: 'When a settlement is created' },
              ].map(({ key, label, desc }) => (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
                  </div>
                  <button
                    onClick={() => setNotifSettings(p => ({ ...p, [key]: !p[key] }))}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 100,
                      background: notifSettings[key] ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                      border: `2px solid ${notifSettings[key] ? 'var(--accent-blue)' : 'var(--border)'}`,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 2,
                        left: notifSettings[key] ? 22 : 2,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: 'white',
                        transition: 'left 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </Section>

          {/* 4. Theme Preference */}
          <Section title="🎨 Theme Preference">
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { val: 'light', icon: Sun, label: 'Light Mode' },
                { val: 'dark', icon: Moon, label: 'Dark Mode' },
              ].map(({ val, icon: Icon, label }) => (
                <button
                  key={val}
                  onClick={() => theme !== val && toggleTheme()}
                  style={{
                    flex: 1,
                    padding: '16px',
                    borderRadius: 'var(--radius-lg)',
                    border: `2px solid ${theme === val ? 'var(--accent-blue)' : 'var(--border)'}`,
                    background: theme === val ? 'var(--accent-blue-light)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  <Icon size={24} color={theme === val ? 'var(--accent-blue)' : 'var(--text-muted)'} />
                  <span style={{ fontWeight: 600, fontSize: 14, color: theme === val ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </Section>

          {/* 5. Payment History */}
          <Section title="💳 Recent Payments">
            {paymentsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><div className="loading-spinner loading-spinner-sm" /></div>
            ) : recentPayments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                No payment history yet.
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>To</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.slice(0, 5).map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600, fontSize: 13 }}>{p.to_name || '-'}</td>
                        <td style={{ fontWeight: 700 }}>{formatCurrency(p.amount)}</td>
                        <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{formatDate(p.created_at)}</td>
                        <td>
                          <span className={`badge ${p.status === 'paid' ? 'badge-green' : 'badge-orange'}`}>
                            {p.status || 'pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* 6. Danger Zone */}
          <div className="card" style={{ border: '1px solid #fecaca', background: '#fff5f5' }}>
            <h3 style={{ fontWeight: 700, fontSize: 17, color: '#dc2626', marginBottom: 8 }}>
              ⚠️ Danger Zone
            </h3>
            <p style={{ fontSize: 14, color: '#7f1d1d', marginBottom: 20, lineHeight: 1.6 }}>
              Leaving your house will remove your access to all shared expenses and payment history.
              This action cannot be undone.
            </p>
            {house ? (
              <button className="btn btn-danger" onClick={() => setShowLeaveConfirm(true)}>
                <LogOut size={15} />
                Leave {house.name}
              </button>
            ) : (
              <div style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>
                You are not currently in a house.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leave House Confirm Modal */}
      {showLeaveConfirm && (
        <div className="modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <h2 style={{ fontWeight: 800, fontSize: 22, color: 'var(--text-primary)', marginBottom: 10 }}>
                Leave {house?.name}?
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                You will lose all access to house data. This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center', border: 'none', paddingTop: 0 }}>
              <button className="btn btn-secondary" onClick={() => setShowLeaveConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleLeaveHouse} disabled={leaveLoading}>
                {leaveLoading ? 'Leaving...' : 'Yes, Leave House'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 1024px) {
          .profile-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
