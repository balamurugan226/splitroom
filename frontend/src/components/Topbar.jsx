import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useHouse } from '../contexts/HouseContext';

export default function Topbar() {
  const { user } = useAuth();
  const { house, allHouses, switchHouse } = useHouse();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
          <span style={{ fontSize: 20 }}>🏠</span>
          <span className="topbar-title">SplitRoom</span>
        </div>

        {allHouses && allHouses.length > 1 && (
          <select
            className="select select-sm"
            value={house?._id || ''}
            onChange={(e) => switchHouse(e.target.value)}
            style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }}
          >
            {allHouses.map((h) => (
              <option key={h._id} value={h._id}>
                📍 {h.name}
              </option>
            ))}
          </select>
        )}
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
