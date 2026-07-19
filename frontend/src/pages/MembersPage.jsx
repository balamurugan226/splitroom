import React, { useState } from 'react';
import { useHouse } from '../contexts/HouseContext';
import { useAuth } from '../contexts/AuthContext';
import { houseAPI } from '../services/api';
import { getInitials } from '../utils/formatters';

export default function MembersPage() {
  const { house, members, refreshHouse } = useHouse();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isOwnerOrAdmin = house?.user_role === 'owner' || house?.user_role === 'admin';

  const handleRoleChange = async (memberId, newRole) => {
    if (!house) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await houseAPI.updateMemberRole(house.id, memberId, newRole);
      setSuccess('Roommate role updated successfully!');
      await refreshHouse();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update member role.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!house) return;
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this house?`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await houseAPI.removeMember(house.id, memberId);
      setSuccess(`${memberName} removed from house.`);
      await refreshHouse();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to remove member.');
    } finally {
      setLoading(false);
    }
  };

  if (!house) {
    return (
      <div className="container" style={{ paddingTop: '40px' }}>
        <div className="card text-center" style={{ padding: '32px 16px' }}>
          <span style={{ fontSize: '48px' }}>🏠</span>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginTop: '16px', marginBottom: '8px' }}>
            No House Associated
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Join or create a house first to view roommates.
          </p>
          <a href="/house" className="btn btn-primary">Go to House Setup</a>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700 }}>House Members</h2>
        <span className="badge badge-blue">{members.length} Total</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {members.map((member) => {
          const memberId = member.user_id || member.id;
          const isSelf = memberId === user?.id;
          const isOwner = member.role === 'owner';
          const canManage = isOwnerOrAdmin && !isSelf && !isOwner;

          return (
            <div key={memberId} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
              {/* Member details row */}
              <div className="flex items-center gap-3">
                <div className="avatar">
                  {getInitials(member.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>
                      {member.name} {isSelf && '(You)'}
                    </span>
                    <span className={`badge ${isOwner ? 'badge-red' : member.role === 'admin' ? 'badge-orange' : 'badge-blue'}`}>
                      {member.role}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {member.email}
                  </div>
                  {member.phone && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      📞 {member.phone}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions row */}
              {canManage && (
                <div 
                  className="flex justify-between items-center" 
                  style={{ borderTop: '1px solid var(--border-light)', paddingTop: '10px', marginTop: '4px' }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      Change Role:
                    </span>
                    <select
                      className="select"
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '12px' }}
                      value={member.role}
                      onChange={(e) => handleRoleChange(memberId, e.target.value)}
                      disabled={loading}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                    onClick={() => handleRemoveMember(memberId, member.name)}
                    disabled={loading}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
