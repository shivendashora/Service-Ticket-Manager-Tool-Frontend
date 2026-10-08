import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleExclamation,
  faEye,
  faEyeSlash,
  faHeadset,
  faListCheck,
  faPaperclip,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import { authApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { FullPageSpinner, Spinner } from '../components/ui';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

const FEATURES = [
  { icon: faListCheck, title: 'Track every request', text: 'Move tickets from open to closed with a clear status trail.' },
  { icon: faUserShield, title: 'Role-based access', text: 'Admins manage the queue, agents focus on what is assigned to them.' },
  { icon: faPaperclip, title: 'Rich context', text: 'Attach screenshots and links so nothing gets lost.' },
];

const LoginPage = () => {
  const { user, loading, login, register, sessionExpired, clearSessionExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (sessionExpired) setError('Your session has expired. Please sign in again.');
  }, [sessionExpired]);

  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to={location.state?.from?.pathname || '/'} replace />;

  const isSignup = mode === 'signup';

  const switchMode = (next) => {
    setMode(next);
    setError('');
  };

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isSignup && form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSignup) {
        await register(form.name.trim(), form.email.trim(), form.password);
      } else {
        await login(form.email.trim(), form.password);
      }
      clearSessionExpired();
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <div className="brand brand-light">
          <span className="brand-mark">
            <FontAwesomeIcon icon={faHeadset} />
          </span>
          <span className="brand-name">SupportDesk</span>
        </div>

        <div className="auth-hero-copy">
          <h1>Customer support, organised.</h1>
          <p>One place for your team to triage, assign and resolve every customer ticket.</p>
          <ul className="auth-features">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <span className="auth-feature-icon">
                  <FontAwesomeIcon icon={f.icon} />
                </span>
                <div>
                  <strong>{f.title}</strong>
                  <span>{f.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="auth-hero-foot">© {new Date().getFullYear()} SupportDesk</p>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <h2>{isSignup ? 'Create your account' : 'Welcome back'}</h2>
          <p className="muted">
            {isSignup ? 'Get started in less than a minute.' : 'Sign in to continue to your workspace.'}
          </p>

          <a className="btn btn-outline btn-block btn-lg" href={authApi.googleLoginUrl}>
            <GoogleIcon />
            Continue with Google
          </a>

          <div className="divider">
            <span>or with email</span>
          </div>

          {error && (
            <div className="alert alert-error">
              <FontAwesomeIcon icon={faCircleExclamation} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="form-stack">
            {isSignup && (
              <div className="field">
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  name="name"
                  className="input"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Jane Cooper"
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                className="input"
                value={form.email}
                onChange={handleChange}
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-affix">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  value={form.password}
                  onChange={handleChange}
                  placeholder={isSignup ? 'At least 6 characters' : '••••••••'}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  required
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
              {submitting && <Spinner size="sm" />}
              {isSignup ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="auth-switch">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button className="link-btn" onClick={() => switchMode(isSignup ? 'login' : 'signup')}>
              {isSignup ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
