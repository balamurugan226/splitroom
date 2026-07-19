import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Bell, Sun, Moon, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

import { getInitials } from '../utils/formatters';

const routeLabels = {
  '/dashboard': 'Dashboard',
  '/house': 'House',
  '/members': 'Members',
  '/expenses': 'Expenses',
  '/payments': 'Payments',
  '/settlements': 'Settlements',

  '/profile': 'Profile',
};

export default function Topbar({ onMenuClick }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const location = useLocation();
  const navigate = useNavigate();

  const pageTitle = routeLabels[location.pathname] || 'SplitRoom';

  return (
    <header className="topbar">
      {/* Left: hamburger + page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          className="btn-icon"
          onClick={onMenuClick}
          aria-label="Toggle menu"
          style={{
            display: 'none',
            width: 38,
            height: 38,
          }}
          id="hamburger-btn"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right: theme toggle, notifications, avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Theme Toggle */}
        <button
          className="btn-icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>


        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 28,
            background: 'var(--border)',
            margin: '0 4px',
          }}
        />

        {/* User Avatar */}
        <button
          onClick={() => navigate('/profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 12px',
            borderRadius: 'var(--radius)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'var(--transition)',
          }}
          title="View Profile"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-blue-light)';
            e.currentTarget.style.borderColor = 'var(--accent-blue)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <div className="avatar avatar-sm">{getInitials(user?.name)}</div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              maxWidth: 120,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user?.name?.split(' ')[0] || 'User'}
          </span>
        </button>
      </div>

      {/* Inline style for responsive hamburger */}
      <style>{`
        @media (max-width: 1024px) {
          #hamburger-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
