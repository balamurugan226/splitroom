import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  Users,
  Receipt,
  CreditCard,
  ArrowLeftRight,
  BarChart2,
  Bell,
  User,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getInitials } from '../utils/formatters';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/house', icon: Home, label: 'House' },
  { to: '/members', icon: Users, label: 'Members' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
  { to: '/settlements', icon: ArrowLeftRight, label: 'Settlements' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div
        style={{
          padding: '24px 20px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              background: 'var(--primary-color)',
              color: '#fff',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            🏠
          </div>
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 18,
                color: 'var(--text-primary)',
                lineHeight: 1.2,
              }}
            >
              SplitRoom
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
              Expense Manager
            </div>
          </div>
        </div>
        {/* Mobile close */}
        <button
          onClick={onClose}
          className="btn-icon"
          style={{
            display: 'none',
            width: 32,
            height: 32,
            '@media(maxWidth:1024px)': { display: 'flex' },
          }}
          aria-label="Close sidebar"
        >
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
        <div style={{ padding: '0 12px 8px', marginBottom: 4 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '0 4px',
            }}
          >
            Menu
          </span>
        </div>
        {navItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Icon size={18} strokeWidth={2} />
            <span style={{ flex: 1 }}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Profile at bottom */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          className="avatar avatar-sm"
          style={{ flexShrink: 0, cursor: 'pointer' }}
          onClick={() => { navigate('/profile'); onClose(); }}
        >
          {getInitials(user?.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {user?.name || 'User'}
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {user?.email || ''}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="btn-icon"
          title="Logout"
          style={{ width: 32, height: 32, flexShrink: 0 }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
}
