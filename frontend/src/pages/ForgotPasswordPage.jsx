import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { authAPI } from '../services/api';
import { validateEmail } from '../utils/validators';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [responseData, setResponseData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      setLoading(true);
      const res = await authAPI.forgotPassword(email);
      setResponseData(res.data);
      setSubmitted(true);
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Failed to send reset email. Please try again.'
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
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-secondary)',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '48px 40px',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border)',
        }}
        className="animate-fade"
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: 'var(--bg-secondary)',
              borderRadius: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(59,130,246,0.35)',
            }}
          >
            🏠
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: 8,
            }}
          >
            {submitted ? 'Check your inbox' : 'Reset your password'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            {submitted
              ? `We've sent password reset instructions to ${email}`
              : "Enter your email address and we'll send you a reset link."}
          </p>
        </div>

        {submitted ? (
          <div>
            {/* Success state */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                padding: '24px',
                background: '#d1fae5',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 24,
              }}
            >
              <CheckCircle size={40} color="#059669" />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 700, color: '#059669', marginBottom: 4 }}>
                  Reset email sent!
                </p>
                <p style={{ fontSize: 13, color: '#047857', lineHeight: 1.6 }}>
                  Check your spam folder if you don't see it within a few minutes.
                </p>
              </div>
            </div>

            {/* Show reset token for demo */}
            {responseData?.reset_token && (
              <div
                style={{
                  padding: 16,
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius)',
                  marginBottom: 24,
                  border: '1px dashed var(--border)',
                }}
              >
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Development — Reset Token
                </p>
                <code
                  style={{
                    fontSize: 12,
                    color: 'var(--accent-blue)',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                  }}
                >
                  {responseData.reset_token}
                </code>
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => { setSubmitted(false); setEmail(''); setResponseData(null); }}
            >
              Send to different email
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: 20 }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="label">Email Address</label>
                <div className="input-wrapper">
                  <Mail size={16} className="input-icon" />
                  <input
                    className="input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
              >
                {loading ? (
                  <>
                    <div
                      className="loading-spinner loading-spinner-sm"
                      style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}
                    />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          </>
        )}

        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--text-muted)',
              fontSize: 14,
              fontWeight: 600,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-blue)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
