import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, CreditCard, ArrowLeftRight, Home, Sun, Moon, Bell, BellOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { requestNotificationPermission } from '../utils/notifications';

export default function Layout() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [notifPermission, setNotifPermission] = useState('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    } else {
      setNotifPermission('unsupported');
    }
  }, []);

  const handleRequestPermission = async () => {
    const status = await requestNotificationPermission();
    setNotifPermission(status);
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Native OS Notification Enable Toggle */}
          {notifPermission !== 'unsupported' && (
            <button
              onClick={handleRequestPermission}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: notifPermission === 'granted' ? 'var(--accent-green)' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={notifPermission === 'granted' ? 'Notifications Enabled' : 'Enable System Notifications'}
            >
              {notifPermission === 'granted' ? <Bell size={18} /> : <BellOff size={18} />}
            </button>
          )}

          {/* Theme Switcher Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Toggle Light/Dark Theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Profile link */}
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
