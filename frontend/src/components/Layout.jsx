import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, CreditCard, ArrowLeftRight, Home } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top Header */}
      <header className="topbar">
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} 
          onClick={() => navigate('/dashboard')}
        >
          <span style={{ fontSize: 20 }}>🏠</span>
          <span className="topbar-title">SplitRoom</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <NavLink to="/profile" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <div className="avatar avatar-sm">
              {user?.name ? user.name.substring(0, 2).toUpperCase() : 'SR'}
            </div>
          </NavLink>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, paddingBottom: '20px' }}>
        <Outlet />
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="bottom-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/expenses" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <Receipt size={20} />
          <span>Expenses</span>
        </NavLink>
        <NavLink to="/payments" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <CreditCard size={20} />
          <span>Payments</span>
        </NavLink>
        <NavLink to="/settlements" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <ArrowLeftRight size={20} />
          <span>Settle Up</span>
        </NavLink>
        <NavLink to="/house" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
          <Home size={20} />
          <span>House</span>
        </NavLink>
      </nav>
    </div>
  );
}
