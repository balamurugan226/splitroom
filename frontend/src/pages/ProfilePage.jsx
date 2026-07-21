import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  // Profile Edit State
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [budgetLimit, setBudgetLimit] = useState(user?.budget_limit || '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    try {
      setUpdatingProfile(true);
      const limitVal = budgetLimit ? Number(budgetLimit) : 0;
      await authAPI.updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        budget_limit: limitVal
      });
      updateUser({
        name: name.trim(),
        phone: phone.trim(),
        budget_limit: limitVal
      });
      setSuccess('Profile details updated successfully!');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    try {
      setChangingPassword(true);
      await authAPI.changePassword({
        currentPassword,
        newPassword
      });
      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to change password. Verify your current password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="container">
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Profile Details card */}
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Edit Profile</h3>
        <form onSubmit={handleUpdateProfile}>
          <div className="form-group">
            <label className="label">Full Name</label>
            <input
              className="input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="label">Email Address (Read-only)</label>
            <input
              className="input"
              type="email"
              value={user?.email || ''}
              readOnly
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="label">Phone Number</label>
              <input
                className="input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
              />
            </div>
            <div className="form-group">
              <label className="label">Monthly Spend Target Limit (₹)</label>
              <input
                className="input"
                type="number"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                placeholder="E.g. 5000 (0 to clear)"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={updatingProfile}>
            {updatingProfile ? 'Saving...' : 'Save Profile Details'}
          </button>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="card">
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Change Password</h3>
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label className="label">Current Password</label>
            <input
              className="input"
              type="password"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label">New Password</label>
            <input
              className="input"
              type="password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label">Confirm New Password</label>
            <input
              className="input"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={changingPassword}>
            {changingPassword ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Logout Card */}
      <div className="card text-center" style={{ marginBottom: 0 }}>
        <button className="btn btn-danger" onClick={handleLogout}>
          🚪 Sign Out
        </button>
      </div>
    </div>
  );
}
