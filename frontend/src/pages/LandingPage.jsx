import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    icon: '🏠',
    title: 'House Management',
    desc: 'Create and manage your shared living space. Add members with invite codes and assign roles.',
  },
  {
    icon: '💰',
    title: 'Expense Splitting',
    desc: 'Split bills equally, by percentage, or custom amounts. Full control over who pays what.',
  },
  {
    icon: '📊',
    title: 'Smart Dashboard',
    desc: 'Real-time overview of all finances, monthly trends, and outstanding balances at a glance.',
  }
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* HEADER */}
      <header className="topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', height: '64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--accent-blue)' }}>SplitRoom</span>
        </div>
        <nav style={{ display: 'flex', gap: '24px' }}>
          <a href="#features" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Features</a>
          <a href="#pricing" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Pricing</a>
        </nav>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/login" className="btn btn-secondary">Log In</Link>
          <Link to="/register" className="btn btn-primary">Get Started</Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <section style={{ padding: '80px 20px', textAlign: 'center', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '24px', color: 'var(--text-primary)' }}>
            Enterprise-Grade Expense Management
          </h1>
          <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 40px' }}>
            The structured, secure, and professional way to track shared expenses, manage house budgets, and settle balances.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '16px' }} onClick={() => navigate('/register')}>
              Start Free Trial
            </button>
            <button className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '16px' }} onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" style={{ padding: '80px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', textAlign: 'center', marginBottom: '48px' }}>Core Features</h2>
          <div className="grid-3">
            {FEATURES.map(f => (
              <div key={f.title} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '32px' }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>{f.icon}</div>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>{f.title}</h3>
                <p style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" style={{ padding: '80px 20px', background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <h2 style={{ fontSize: '32px', fontWeight: 'bold', textAlign: 'center', marginBottom: '48px' }}>Pricing Plans</h2>
          <div className="grid-2" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Standard</h3>
              <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '24px' }}>Free</div>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '32px', color: 'var(--text-secondary)' }}>
                <li style={{ marginBottom: '12px' }}>Up to 5 Members</li>
                <li style={{ marginBottom: '12px' }}>Expense Tracking</li>
                <li style={{ marginBottom: '12px' }}>Basic Dashboard</li>
              </ul>
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => navigate('/register')}>Sign Up</button>
            </div>
            <div className="card" style={{ padding: '40px', textAlign: 'center', border: '2px solid var(--accent-blue)' }}>
              <h3 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--accent-blue)' }}>Enterprise</h3>
              <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '24px' }}>₹99<span style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>/mo</span></div>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '32px', color: 'var(--text-secondary)' }}>
                <li style={{ marginBottom: '12px' }}>Unlimited Members</li>
                <li style={{ marginBottom: '12px' }}>Advanced Settlement</li>
                <li style={{ marginBottom: '12px' }}>Priority Support</li>
              </ul>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate('/register')}>Get Enterprise</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '40px 20px', background: 'var(--bg-tertiary)', textAlign: 'center', marginTop: 'auto' }}>
        <div className="container" style={{ color: 'var(--text-secondary)' }}>
          <p>&copy; {new Date().getFullYear()} SplitRoom Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
