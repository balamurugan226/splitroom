import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHouse } from '../contexts/HouseContext';
import { houseAPI } from '../services/api';
import { formatCurrency } from '../utils/formatters';

export default function HousePage() {
  const { house, refreshHouse } = useHouse();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('join'); // 'join' or 'create'
  const [inviteCode, setInviteCode] = useState('');
  const [houseName, setHouseName] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [rentDueDay, setRentDueDay] = useState('5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editRent, setEditRent] = useState('');
  const [editDueDay, setEditDueDay] = useState('');

  const handleJoinHouse = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!inviteCode.trim()) {
      setError('Please enter a valid invite code.');
      return;
    }

    try {
      setLoading(true);
      await houseAPI.joinHouse(inviteCode.trim());
      setSuccess('Joined house successfully!');
      setInviteCode('');
      await refreshHouse();
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to join house. Check invite code.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHouse = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!houseName.trim()) {
      setError('Please enter a house name.');
      return;
    }
    const rentVal = Number(monthlyRent);
    if (isNaN(rentVal) || rentVal <= 0) {
      setError('Please enter a valid rent amount.');
      return;
    }

    try {
      setLoading(true);
      await houseAPI.createHouse({
        name: houseName.trim(),
        monthly_rent: rentVal,
        rent_due_day: Number(rentDueDay)
      });
      setSuccess('House created successfully!');
      setHouseName('');
      setMonthlyRent('');
      await refreshHouse();
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create house.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateInvite = async () => {
    if (!house) return;
    try {
      setError('');
      setSuccess('');
      await houseAPI.regenerateInvite(house._id);
      setSuccess('Invite code regenerated!');
      await refreshHouse();
    } catch (err) {
      setError('Failed to regenerate invite code.');
    }
  };

  const handleLeaveHouse = async () => {
    if (!house) return;
    const confirmMsg = 'Are you sure you want to leave this house?';
    if (!window.confirm(confirmMsg)) return;

    try {
      setError('');
      setSuccess('');
      await houseAPI.leaveHouse(house._id);
      setSuccess('Left house successfully.');
      await refreshHouse();
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to leave house.');
    }
  };

  const startEdit = () => {
    if (!house) return;
    setEditName(house.name);
    setEditRent(house.monthly_rent);
    setEditDueDay(house.rent_due_day || 5);
    setIsEditing(true);
  };

  const handleUpdateHouse = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const rentVal = Number(editRent);
    if (isNaN(rentVal) || rentVal <= 0) {
      setError('Please enter a valid rent amount.');
      return;
    }

    try {
      setLoading(true);
      await houseAPI.updateHouse(house._id, {
        name: editName.trim(),
        monthly_rent: rentVal,
        rent_due_day: Number(editDueDay)
      });
      setSuccess('House settings updated!');
      setIsEditing(false);
      await refreshHouse();
    } catch (err) {
      setError('Failed to update house settings.');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = () => {
    if (!house?.invite_code) return;
    navigator.clipboard.writeText(house.invite_code);
    setSuccess('Invite code copied to clipboard!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const shareInviteCode = () => {
    if (!house?.invite_code) return;
    const text = `Hey! Join our flat room "${house.name}" on SplitRoom using my invite code: ${house.invite_code}`;
    if (navigator.share) {
      navigator.share({
        title: 'Join my flat on SplitRoom',
        text: text,
      }).catch(err => console.error(err));
    } else {
      navigator.clipboard.writeText(text);
      setSuccess('Invite text copied! Paste it in WhatsApp to invite flatmates.');
      setTimeout(() => setSuccess(''), 4000);
    }
  };

  // Render when user does NOT have a house
  if (!house) {
    return (
      <div className="container" style={{ paddingTop: '20px' }}>
        <div className="tabs" style={{ marginBottom: '16px' }}>
          <button
            className={`tab ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => { setActiveTab('join'); setError(''); setSuccess(''); }}
          >
            Join Existing House
          </button>
          <button
            className={`tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => { setActiveTab('create'); setError(''); setSuccess(''); }}
          >
            Create New House
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {activeTab === 'join' ? (
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Join via Invite Code</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Enter the invite code shared by your flatmate or landlord to connect with the house budget.
            </p>
            <form onSubmit={handleJoinHouse}>
              <div className="form-group">
                <label className="label">Invite Code *</label>
                <input
                  className="input"
                  type="text"
                  placeholder="E.g. SR-XXXXXX"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Joining...' : 'Join House'}
              </button>
            </form>
          </div>
        ) : (
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>Set Up a New House</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Create a virtual room so you can invite roommates, record shared bills, and allocate rent.
            </p>
            <form onSubmit={handleCreateHouse}>
              <div className="form-group">
                <label className="label">House Name *</label>
                <input
                  className="input"
                  type="text"
                  placeholder="E.g. Flat 302, Green Avenue"
                  value={houseName}
                  onChange={(e) => setHouseName(e.target.value)}
                  required
                />
              </div>
              
              <div className="grid-2">
                <div className="form-group">
                  <label className="label">Total Monthly Rent (₹) *</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="E.g. 18000"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="label">Rent Due Day (1-28) *</label>
                  <select
                    className="select"
                    value={rentDueDay}
                    onChange={(e) => setRentDueDay(e.target.value)}
                    required
                  >
                    {[...Array(28)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create House'}
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  // All members are equal roommates
  const canModify = true;

  return (
    <div className="container">
      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {isEditing ? (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Edit House Settings</h3>
            <button 
              onClick={() => setIsEditing(false)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: 'var(--text-secondary)' }}
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleUpdateHouse}>
            <div className="form-group">
              <label className="label">House Name *</label>
              <input
                className="input"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="label">Monthly Rent (₹) *</label>
                <input
                  className="input"
                  type="number"
                  value={editRent}
                  onChange={(e) => setEditRent(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Rent Due Day *</label>
                <select
                  className="select"
                  value={editDueDay}
                  onChange={(e) => setEditDueDay(e.target.value)}
                  required
                >
                  {[...Array(28)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div>
          {/* House Info Card */}
          <div className="card">
            <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Active House
                </span>
                <h2 style={{ fontSize: '22px', fontWeight: 800 }}>{house.name}</h2>
              </div>
              {canModify && (
                <button className="btn btn-secondary btn-sm" onClick={startEdit}>
                  ✏️ Edit
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="flex justify-between" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Monthly Rent</span>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>{formatCurrency(house.monthly_rent)}</span>
              </div>
              <div className="flex justify-between" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Rent Due Day</span>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>Day {house.rent_due_day || 5}</span>
              </div>
              <div className="flex justify-between" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Your Role</span>
                <span className="badge badge-blue">{house.user_role}</span>
              </div>
            </div>
          </div>

          {/* Roommate Invite Code Card */}
          <div className="card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Invite Roommates</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Share this invite code with your flatmates so they can join this virtual room.
            </p>
            
            <div style={{ display: 'flex', gap: 8, marginBottom: '16px' }}>
              <input
                className="input"
                type="text"
                readOnly
                value={house.invite_code || ''}
                style={{ textAlign: 'center', fontWeight: 700, letterSpacing: '0.1em', fontSize: '16px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
              <button className="btn btn-secondary" style={{ width: 'auto' }} onClick={copyInviteCode}>
                Copy
              </button>
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={shareInviteCode}>
                🔗 Share
              </button>
            </div>

            {canModify && (
              <button className="btn btn-secondary btn-sm" style={{ width: '100%' }} onClick={handleRegenerateInvite}>
                🔄 Regenerate Code
              </button>
            )}
          </div>

          {/* Quick links & Leave House */}
          <div className="card">
            <button 
              className="btn btn-secondary" 
              style={{ marginBottom: '12px' }}
              onClick={() => navigate('/members')}
            >
              👥 View House Members
            </button>
            <button 
              className="btn btn-danger" 
              onClick={handleLeaveHouse}
            >
              🚪 Leave House
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
