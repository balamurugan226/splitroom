import React, { useState, useMemo } from 'react';
import { Search, UserMinus, ChevronDown, Phone, Mail, Calendar, Shield } from 'lucide-react';
import { useHouse } from '../contexts/HouseContext';
import { useAuth } from '../contexts/AuthContext';
import { houseAPI } from '../services/api';
import { formatDate, getInitials } from '../utils/formatters';

const ROLE_OPTIONS = ['member', 'admin'];

function MemberCard({ member, isOwner, isAdmin, currentUserId, houseId, onRefresh }) {
  const [roleLoading, setRoleLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [error, setError] = useState('');

  const canManage = (isOwner || isAdmin) && member.user_id !== currentUserId && member.role !== 'owner';

  const changeRole = async (newRole) => {
    try {
      setRoleLoading(true);
      setShowRoleMenu(false);
      await houseAPI.updateMemberRole(houseId, member.user_id, newRole);
      onRefresh();
    } catch (err) {
      setError('Failed to update role.');
    } finally {
      setRoleLoading(false);
    }
  };

  const removeMember = async () => {
    if (!window.confirm(`Remove ${member.name} from the house?`)) return;
    try {
      setRemoveLoading(true);
      await houseAPI.removeMember(houseId, member.user_id);
      onRefresh();
    } catch (err) {
      setError('Failed to remove member.');
    } finally {
      setRemoveLoading(false);
    }
  };

  const roleBadgeClass = member.role === 'owner'
    ? 'badge-purple'
    : member.role === 'admin'
    ? 'badge-blue'
    : 'badge-gray';

  const roleEmoji = member.role === 'owner' ? '👑' : member.role === 'admin' ? '🛡️' : '👤';

  const gradients = [
    'var(--accent-blue)',
    'var(--accent-blue)',
    'var(--accent-blue)',
    'var(--accent-blue)',
  ];
  const gradient = gradients[member.name?.charCodeAt(0) % gradients.length];

  return (
    <div className="card" style={{ position: 'relative' }}>
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 12, fontSize: 12 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Avatar + badges */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
        <div
          className="avatar avatar-xl"
          style={{ background: gradient, marginBottom: 12 }}
        >
          {getInitials(member.name)}
        </div>
        <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)', marginBottom: 6, textAlign: 'center' }}>
          {member.name}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span className={`badge ${roleBadgeClass}`}>
            {roleEmoji} {member.role}
          </span>
          <span className={`badge ${member.status === 'active' ? 'badge-green' : 'badge-red'}`}>
            {member.status || 'active'}
          </span>
        </div>
      </div>

      {/* Info rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {member.email && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Mail size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {member.email}
            </span>
          </div>
        )}
        {member.phone && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Phone size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{member.phone}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Calendar size={14} color="var(--text-muted)" />
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Joined {formatDate(member.joined_at)}
          </span>
        </div>
        {member.rent_share && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>💰</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Rent share: ₹{member.rent_share?.toLocaleString('en-IN')}
            </span>
          </div>
        )}
      </div>

      {/* Admin actions */}
      {canManage && (
        <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          {/* Role change */}
          <div style={{ position: 'relative', flex: 1 }}>
            <button
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setShowRoleMenu((p) => !p)}
              disabled={roleLoading}
            >
              <Shield size={13} />
              {roleLoading ? 'Updating...' : 'Change Role'}
              <ChevronDown size={13} />
            </button>
            {showRoleMenu && (
              <div className="dropdown-menu" style={{ left: 0, right: 'auto', minWidth: 140 }}>
                {ROLE_OPTIONS.filter((r) => r !== member.role).map((r) => (
                  <button key={r} className="dropdown-item" onClick={() => changeRole(r)}>
                    {r === 'admin' ? '🛡️ Make Admin' : '👤 Make Member'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Remove */}
          <button
            className="btn btn-danger btn-sm"
            onClick={removeMember}
            disabled={removeLoading}
            title="Remove member"
          >
            <UserMinus size={14} />
            {removeLoading ? '...' : 'Remove'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function MembersPage() {
  const { house, members, loading, refreshHouse } = useHouse();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const isOwner = house?.user_role === 'owner';
  const isAdmin = house?.user_role === 'admin';

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        !search ||
        m.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' ? (m.status || 'active') === 'active' : (m.status || 'active') !== 'active');
      return matchSearch && matchStatus;
    });
  }, [members, search, filterStatus]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!house) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🏠</div>
        <div className="empty-state-title">No House Found</div>
        <div className="empty-state-desc">Create or join a house first to manage members.</div>
        <a href="/house" className="btn btn-primary" style={{ marginTop: 20 }}>Go to House</a>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Members</h1>
          <p className="page-subtitle">{members.length} member{members.length !== 1 ? 's' : ''} in {house.name}</p>
        </div>
        <a href="/house" className="btn btn-primary btn-sm">
          + Invite Member
        </a>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { v: 'all', label: 'All' },
            { v: 'active', label: 'Active' },
            { v: 'inactive', label: 'Inactive' },
          ].map(({ v, label }) => (
            <button
              key={v}
              className={`chip ${filterStatus === v ? 'active' : ''}`}
              onClick={() => setFilterStatus(v)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-title">No members found</div>
          <div className="empty-state-desc">
            {search ? 'No members match your search.' : 'No members in this house yet.'}
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map((member) => (
            <MemberCard
              key={member.id || member.user_id}
              member={member}
              isOwner={isOwner}
              isAdmin={isAdmin}
              currentUserId={user?.id}
              houseId={house.id}
              onRefresh={refreshHouse}
            />
          ))}
        </div>
      )}
    </div>
  );
}
