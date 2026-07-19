import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Topbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
        <span style={{ fontSize: 20 }}>🏠</span>
        <span className="topbar-title">SplitRoom</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          onClick={() => navigate('/profile')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0
          }}
        >
          <div className="avatar avatar-sm">
            {user?.name ? user.name.substring(0, 2).toUpperCase() : 'SR'}
          </div>
        </button>
      </div>
    </header>
  );
}
