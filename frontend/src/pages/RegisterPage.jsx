import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight, CheckSquare, Square } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { validateEmail, validatePassword, validatePhone, getPasswordStrength, getPasswordStrengthLabel } from '../utils/validators';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pwStrength = getPasswordStrength(form.password);
  const pwStrengthInfo = getPasswordStrengthLabel(pwStrength);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!validateEmail(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (form.phone && !validatePhone(form.phone)) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (!validatePassword(form.password)) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreeTerms) {
      setError('Please agree to the Terms of Service to continue.');
      return;
    }

    try {
      setLoading(true);
      await register(form.name, form.email, form.password, form.phone || undefined);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const strengthSegments = [1, 2, 3, 4, 5];

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
          background: 'var(--accent-green)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
          position: 'relative',
          overflow: 'hidden',
        }}
        className="register-left-panel"
      >
        <div
          style={{
            position: 'absolute',
            top: -80,
            left: -80,
            width: 320,
            height: 320,
            background: 'rgba(255,255,255,0.07)',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -40,
            right: -40,
            width: 220,
            height: 220,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '50%',
          }}
        />

        <div style={{ position: 'relative', textAlign: 'center', maxWidth: 380 }}>
          <div style={{ fontSize: 72, marginBottom: 24 }}>🎉</div>
          <h2
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: 'white',
              marginBottom: 14,
              letterSpacing: '-0.02em',
            }}
          >
            Join SplitRoom
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 1.7, marginBottom: 36 }}>
            Create your account and start managing shared expenses with your roommates today.
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
            {[
              { v: '10K+', l: 'Users' },
              { v: '500+', l: 'Houses' },
              { v: '₹50M+', l: 'Tracked' },
            ].map(({ v, l }) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: 'white',
                  }}
                >
                  {v}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .register-left-panel { display: none !important; }
          }
        `}</style>
      </div>

      {/* Right: Register form */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          overflowY: 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: 440 }} className="animate-fade">
          <div style={{ marginBottom: 32 }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 24,
                color: 'var(--text-muted)',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              ← Back to home
            </Link>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                marginBottom: 8,
              }}
            >
              Create your account
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
              Free forever. No credit card required.
            </p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="form-group">
              <label className="label">Full Name</label>
              <div className="input-wrapper">
                <User size={16} className="input-icon" />
                <input
                  className="input"
                  type="text"
                  name="name"
                  placeholder="Rahul Kumar"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            {/* Email */}
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

            {/* Phone (optional) */}
            <div className="form-group">
              <label className="label">
                Phone Number{' '}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
              </label>
              <div className="input-wrapper">
                <Phone size={16} className="input-icon" />
                <input
                  className="input"
                  type="tel"
                  name="phone"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="label">Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  placeholder="At least 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
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
                    display: 'flex',
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength */}
              {form.password && (
                <div style={{ marginTop: 10 }}>
                  <div className="strength-bar">
                    {strengthSegments.map((s) => (
                      <div
                        key={s}
                        className="strength-segment"
                        style={{
                          background:
                            pwStrength >= s ? pwStrengthInfo.color : 'var(--bg-tertiary)',
                        }}
                      />
                    ))}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      marginTop: 6,
                      color: pwStrengthInfo.color,
                    }}
                  >
                    {pwStrengthInfo.label} password
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="label">Confirm Password</label>
              <div className="input-wrapper">
                <Lock size={16} className="input-icon" />
                <input
                  className="input"
                  type={showConfirmPw ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Re-enter your password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  required
                  style={{
                    paddingRight: 44,
                    borderColor:
                      form.confirmPassword && form.password !== form.confirmPassword
                        ? 'var(--accent-red)'
                        : undefined,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((p) => !p)}
                  style={{
                    position: 'absolute',
                    right: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                  }}
                >
                  {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p style={{ fontSize: 12, color: 'var(--accent-red)', marginTop: 6 }}>
                  Passwords don't match
                </p>
              )}
            </div>

            {/* Terms */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                marginBottom: 24,
                cursor: 'pointer',
              }}
              onClick={() => setAgreeTerms((p) => !p)}
            >
              {agreeTerms ? (
                <CheckSquare size={18} color="var(--accent-blue)" style={{ flexShrink: 0, marginTop: 1 }} />
              ) : (
                <Square size={18} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />
              )}
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, userSelect: 'none' }}>
                I agree to SplitRoom's{' '}
                <a href="#" style={{ color: 'var(--accent-blue)', fontWeight: 600 }} onClick={(e) => e.stopPropagation()}>
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" style={{ color: 'var(--accent-blue)', fontWeight: 600 }} onClick={(e) => e.stopPropagation()}>
                  Privacy Policy
                </a>
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
                  <div
                    className="loading-spinner loading-spinner-sm"
                    style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}
                  />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '24px 0',
            }}
          >
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
