import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHouse } from '../contexts/HouseContext';
import { houseAPI } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

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

  // Guest Stay Tracker state
  const [guests, setGuests] = useState([]);
  const [guestName, setGuestName] = useState('');
  const [guestStart, setGuestStart] = useState('');
  const [guestEnd, setGuestEnd] = useState('');
  const [guestNote, setGuestNote] = useState('');
  const [showGuestForm, setShowGuestForm] = useState(false);

  const fetchGuests = useCallback(async () => {
    if (!house) return;
    try {
      const res = await houseAPI.getGuests();
      setGuests(res.data.guests || []);
    } catch {
      // silent
    }
  }, [house]);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  const handleAddGuest = async (e) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    try {
      setError('');
      setSuccess('');
      const res = await houseAPI.addGuest({
        name: guestName.trim(),
        startDate: guestStart,
        endDate: guestEnd,
        note: guestNote.trim()
      });
      setGuests(res.data.guests || []);
      setSuccess('Guest stay logged successfully!');
      setGuestName('');
      setGuestStart('');
      setGuestEnd('');
      setGuestNote('');
      setShowGuestForm(false);
    } catch (err) {
      setError('Failed to log guest stay.');
    }
  };

  const handleDeleteGuest = async (id) => {
    if (!window.confirm('Remove this guest stay entry?')) return;
    try {
      setError('');
      await houseAPI.deleteGuest(id);
      setSuccess('Guest stay removed.');
      fetchGuests();
    } catch {
      setError('Failed to remove guest.');
    }
  };

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
    const text = `Hey! Join our flat room "${house.name}" on SplitMate using my invite code: ${house.invite_code}`;
    if (navigator.share) {
      navigator.share({
        title: 'Join my flat on SplitMate',
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

          {/* Guest / Visitor Stay Tracker Card */}
          <div className="card">
            <div className="flex justify-between items-center" style={{ marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>🔑 Guest & Visitor Stay Log</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Track visiting friends or overnight guests</p>
              </div>
              {!showGuestForm && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowGuestForm(true)}>
                  ➕ Log Guest
                </button>
              )}
            </div>

            {showGuestForm && (
              <form onSubmit={handleAddGuest} style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius)', marginBottom: '16px' }}>
                <div className="form-group">
                  <label className="label">Guest Name *</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="E.g. Rahul (Hariprakash's friend)"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="label">Check-in Date</label>
                    <input
                      className="input"
                      type="date"
                      value={guestStart}
                      onChange={(e) => setGuestStart(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="label">Check-out Date</label>
                    <input
                      className="input"
                      type="date"
                      value={guestEnd}
                      onChange={(e) => setGuestEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Notes</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="E.g. Staying 3 days for weekend"
                    value={guestNote}
                    onChange={(e) => setGuestNote(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: '8px' }}>
                  <button type="button" className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setShowGuestForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                    Save Guest Log
                  </button>
                </div>
              </form>
            )}

            {guests.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', padding: '12px 0' }}>
                No active guest stays logged.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {guests.map((g) => (
                  <div key={g._id} className="flex justify-between items-center" style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700 }}>👤 {g.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {formatDate(g.startDate)} {g.endDate ? `to ${formatDate(g.endDate)}` : ''} {g.note ? `• ${g.note}` : ''}
                      </div>
                    </div>
                    <button className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', color: 'var(--accent-red)' }} onClick={() => handleDeleteGuest(g._id)}>
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
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
