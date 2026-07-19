import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckSquare, Square } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { validateEmail, validatePassword } from '../utils/validators';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateEmail(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!validatePassword(form.password)) {
      setError('Password must be at least 6 characters.');
      return;
    }
    try {
      setLoading(true);
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'var(--bg-secondary)',
      }}
    >
      {/* Left decorative panel */}
      <div
        style={{
          flex: 1,
          background: 'var(--accent-blue-dark)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
          position: 'relative',
          overflow: 'hidden',
        }}
        className="login-left-panel"
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 300,
            height: 300,
            background: 'rgba(255,255,255,0.07)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            left: -60,
            width: 250,
            height: 250,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '50%',
          }}
        />

        {/* Content */}
        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 400 }}>
          <div
            style={{
              fontSize: 72,
              marginBottom: 24,
              filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.3))',
            }}
          >
            🏠
          </div>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 900,
              color: 'white',
              marginBottom: 16,
              letterSpacing: '-0.02em',
            }}
          >
            SplitRoom
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: 17,
              lineHeight: 1.7,
              marginBottom: 40,
            }}
          >
            The smartest way to manage shared living expenses with your roommates.
          </p>

          {/* Feature pills */}
          {[
            '✅ Track expenses effortlessly',
            '✅ Split bills with any formula',
            '✅ Settle up in seconds',
          ].map((f) => (
            <div
              key={f}
              style={{
                padding: '12px 20px',
                background: 'rgba(255,255,255,0.12)',
                borderRadius: 100,
                fontSize: 14,
                color: 'white',
                fontWeight: 600,
                marginBottom: 10,
                
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              {f}
            </div>
          ))}
        </div>

        <style>{`
          @media (max-width: 768px) {
            .login-left-panel { display: none !important; }
          }
        `}</style>
      </div>

      {/* Right: Login form */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          maxWidth: 520,
        }}
      >
        <div style={{ width: '100%', maxWidth: 420 }} className="animate-fade">
          {/* Header */}
          <div style={{ marginBottom: 36 }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 28,
                color: 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              ← Back to home
            </Link>
            <h1
              style={{
                fontSize: 30,
                fontWeight: 900,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                marginBottom: 8,
              }}
            >
              Welcome back 👋
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
              Sign in to your SplitRoom account
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Email Address</label>
              <div className="input-wrapper">
                <Mail size={16} className="input-icon" />
                <input
                  className="input"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="label" style={{ marginBottom: 0 }}>Password</label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-blue)' }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: 2,
                    display: 'flex',
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 24,
                cursor: 'pointer',
              }}
              onClick={() => setRemember((p) => !p)}
            >
              {remember ? (
                <CheckSquare size={18} color="var(--accent-blue)" />
              ) : (
                <Square size={18} color="var(--text-muted)" />
              )}
              <span style={{ fontSize: 14, color: 'var(--text-secondary)', userSelect: 'none' }}>
                Remember me for 30 days
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? (
                <>
                  <div className="loading-spinner loading-spinner-sm" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '28px 0',
            }}
          >
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Register link */}
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link
              to="/register"
              style={{ fontWeight: 700, color: 'var(--accent-blue)' }}
            >
              Create one free →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
