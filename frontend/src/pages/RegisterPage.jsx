import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { validateEmail } from '../utils/validators';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!agree) {
      setError('You must agree to the Terms & Conditions.');
      return;
    }

    try {
      setLoading(true);
      await register(name, email, password, phone || undefined);
      navigate('/dashboard');
    } catch (err) {
      setError(
        err?.response?.data?.message || 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-secondary)', padding: '16px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '24px', margin: 0 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '40px' }}>🏠</span>
          <h1 style={{ fontSize: '24px', fontWeight: 800, marginTop: '8px', color: 'var(--text-primary)' }}>
            Create Account
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Set up your roommate expense sharing
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="name-input">Full Name</label>
            <input
              id="name-input"
              className="input"
              type="text"
              placeholder="E.g. Rahul Kumar"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              required
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="email-input">Email Address</label>
            <input
              id="email-input"
              className="input"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              required
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="phone-input">Phone Number (Optional)</label>
            <input
              id="phone-input"
              className="input"
              type="tel"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(''); }}
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="password-input">Password</label>
            <input
              id="password-input"
              className="input"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              required
            />
          </div>

          <div className="form-group">
            <label className="label" htmlFor="confirm-password-input">Confirm Password</label>
            <input
              id="confirm-password-input"
              className="input"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
              required
            />
          </div>

          <div className="checkbox-group">
            <input
              id="agree-checkbox"
              type="checkbox"
              checked={agree}
              onChange={(e) => { setAgree(e.target.checked); setError(''); }}
            />
            <label htmlFor="agree-checkbox" style={{ fontSize: '13px', cursor: 'pointer', userSelect: 'none' }}>
              I agree to the Terms &amp; Conditions
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: '8px' }}
          >
            {loading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="divider" />

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
