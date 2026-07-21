import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Home, Users, Receipt, CreditCard, ArrowLeftRight, Calendar, User, LogOut, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/house', icon: Home, label: 'House' },
  { to: '/members', icon: Users, label: 'Members' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
  { to: '/settlements', icon: ArrowLeftRight, label: 'Settlements' },
  { to: '/recurring', icon: Calendar, label: 'Recurring Bills' },
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
    <aside className={`sidebar ${isOpen ? 'open' : ''}`} style={{ display: isOpen ? 'flex' : 'none' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Menu</span>
        <button className="btn-icon" onClick={onClose} style={{ width: 32, height: 32 }}><X size={16} /></button>
      </div>

      <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', textDecoration: 'none', color: 'var(--text-primary)' }}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {user?.name || 'User'}
          </div>
        </div>
        <button onClick={handleLogout} className="btn-icon" title="Logout" style={{ width: 32, height: 32 }}>
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
