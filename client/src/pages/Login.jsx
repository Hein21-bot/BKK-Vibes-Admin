import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { apiErrorMessage } from '../api/client.js';
import { Spinner } from '../components/ui/Spinner.jsx';
import { ControlToggles } from '../components/ControlToggles.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (user) return <Navigate to={location.state?.from?.pathname || '/'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(form.username.trim(), form.password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-4">
      <div className="w-full max-w-sm">
        <div className="mb-3 flex justify-end">
          <ControlToggles />
        </div>
        <div className="card p-7">
          <div className="mb-6 text-center">
            <div className="text-3xl">📦</div>
            <h1 className="mt-2 text-xl font-bold text-ink">{t('app.name')}</h1>
            <p className="text-sm text-ink2">{t('auth.signInTitle')}</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="label">{t('auth.username')}</span>
              <input
                className="input"
                autoFocus
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="label">{t('auth.password')}</span>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-16"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-ink2 hover:text-ink"
                  tabIndex={-1}
                >
                  {showPassword ? t('auth.hide') : t('auth.show')}
                </button>
              </div>
            </label>
            {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading && <Spinner className="h-4 w-4 text-white" />} {t('auth.signIn')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
