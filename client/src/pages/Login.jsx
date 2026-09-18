import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { usePageTitle } from '../lib/format.js';

export default function Login() {
  usePageTitle('Log in');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(form.email, form.password);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm text-zinc-600">Log in to see your inventory and orders.</p>
      <form onSubmit={handleSubmit} className="card mt-6 space-y-4 p-6">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="input" required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="text-center text-sm text-zinc-600">
          New here? <Link to="/signup" className="font-medium text-indigo-600 hover:underline">Create an account</Link>
        </p>
      </form>
      <div className="mt-4 rounded-lg bg-indigo-50 px-4 py-3 text-xs text-indigo-900">
        Demo account: <code className="font-semibold">demo@inklabs.com</code> / <code className="font-semibold">password123</code>
      </div>
    </div>
  );
}
