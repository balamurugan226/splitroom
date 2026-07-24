import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const FEATURES = [
  {
    icon: '🏠',
    title: 'House & Flatmate Coordination',
    desc: 'Create or join a shared house. Manage roommates, view active members, and sync house balances.',
  },
  {
    icon: '🧾',
    title: 'Smart Expense Splitting',
    desc: 'Record shared expenses. Split costs equally or by custom shares, track who paid, and keep balances updated.',
  },
  {
    icon: '📲',
    title: 'Instant UPI Settle-Up',
    desc: 'Generate dynamic UPI QR codes and open GPay, PhonePe, or Paytm with exact pre-filled amounts.',
  }
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-secondary)' }}>
      {/* Header */}
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🏠</span>
          <span className="topbar-title" style={{ fontSize: 18, fontWeight: 800 }}>SplitMate</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/login" className="btn btn-sm btn-secondary">Log In</Link>
          <Link to="/register" className="btn btn-sm btn-primary">Sign Up</Link>
        </div>
      </header>

      {/* Hero with Wallpaper Artwork */}
      <section
        className="landing-hero"
        style={{
          position: 'relative',
          padding: '60px 20px',
          background: `linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.85)), url(/splitmate_wallpaper.png) center/cover no-repeat`,
          color: '#ffffff',
          textAlign: 'center'
        }}
      >
        <div className="container" style={{ maxWidth: '700px', margin: '0 auto' }}>
          <span className="badge badge-blue" style={{ marginBottom: '16px', padding: '6px 14px', fontSize: '12px' }}>
            ✨ Smart Roommate Expense Management
          </span>
          <h1 style={{ fontSize: '36px', fontWeight: 900, marginBottom: '16px', lineHeight: 1.2, color: '#ffffff' }}>
            Split Rent. Share Expenses. Live Stress-Free with SplitMate.
          </h1>
          <p style={{ fontSize: '16px', color: '#94a3b8', marginBottom: '32px', lineHeight: 1.5 }}>
            The ultimate app for roommates. Track shared bills, divide monthly rent, settle balances via UPI QR, and manage your apartment together.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
              Get Started Free 🚀
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/login')}>
              Sign In to Flat
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '48px 20px' }}>
        <div className="container">
          <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '24px', textAlign: 'center' }}>Features Built for Roommates</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {FEATURES.map((f) => (
              <div key={f.title} className="card" style={{ display: 'flex', gap: 16, alignItems: 'flex-start', margin: 0 }}>
                <div style={{ fontSize: 36, padding: 4 }}>{f.icon}</div>
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
      <section className="landing-pricing" style={{ padding: '0 20px 48px 20px' }}>
        <div className="container">
          <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '24px', textAlign: 'center' }}>Simple Pricing</h2>
          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <div className="card" style={{ textAlign: 'center', margin: 0 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Standard Plan</h3>
              <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Free</div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Perfect for standard apartments and shared houses.
              </p>
              <button className="btn btn-secondary" onClick={() => navigate('/register')}>
                Get Started
              </button>
            </div>
            <div className="card" style={{ textAlign: 'center', border: '2px solid var(--accent-blue)', margin: 0 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: 'var(--accent-blue)' }}>Pro Plan</h3>
              <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>₹99<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>/mo</span></div>
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
          &copy; {new Date().getFullYear()} SplitMate. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
