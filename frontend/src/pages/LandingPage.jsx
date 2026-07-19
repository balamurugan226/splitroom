import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    icon: '🏠',
    title: 'House Coordination',
    desc: 'Create or join a shared house. Manage roommates, view active members, and sync house balances.',
  },
  {
    icon: '🧾',
    title: 'Bill Splitting',
    desc: 'Record shared expenses. Split costs equally, track who paid, and keep balances updated in real time.',
  },
  {
    icon: '💳',
    title: 'Rent & Payments',
    desc: 'Keep track of recurring rent obligations, record payments, and mark bills as paid.',
  }
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f4f5f7' }}>
      {/* Header */}
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🏠</span>
          <span className="topbar-title">SplitRoom</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/login" className="btn btn-sm btn-secondary">Log In</Link>
          <Link to="/register" className="btn btn-sm btn-primary">Sign Up</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="container">
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px', lineHeight: 1.2 }}>
            Manage House Rent &amp; Expenses Effortlessly
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.4 }}>
            The simple, flat, mobile-first PWA for roommates. Keep track of shared bills, divide monthly rent, and settle up balances easily.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button className="btn btn-primary" onClick={() => navigate('/register')}>
              Create a Free Account
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/login')}>
              Sign In to Your House
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '32px 16px' }}>
        <div className="container">
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', textAlign: 'center' }}>Features</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {FEATURES.map((f) => (
              <div key={f.title} className="card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start', margin: 0 }}>
                <div style={{ fontSize: 32, padding: 4 }}>{f.icon}</div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{f.title}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="landing-pricing">
        <div className="container">
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', textAlign: 'center' }}>Simple Pricing</h2>
          <div className="pricing-grid">
            <div className="card" style={{ textAlign: 'center', margin: 0 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Standard Plan</h3>
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Free</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Perfect for standard apartments and shared houses.
              </p>
              <button className="btn btn-secondary" onClick={() => navigate('/register')}>
                Get Started
              </button>
            </div>
            <div className="card" style={{ textAlign: 'center', border: '2px solid var(--accent-blue)', margin: 0 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--accent-blue)' }}>Pro Plan</h3>
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>₹99<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>/mo</span></div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Advanced features, unlimited house history, priority support.
              </p>
              <button className="btn btn-primary" onClick={() => navigate('/register')}>
                Try Pro Free
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px 16px', backgroundColor: 'var(--bg-tertiary)', textAlign: 'center', marginTop: 'auto' }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          &copy; {new Date().getFullYear()} SplitRoom. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
