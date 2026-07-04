import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { AlertCircle, Lock, Mail, Sparkles } from 'lucide-react';
import { getApiErrorMessage } from '@/api/client';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/courses';

  if (isAuthenticated) {
    return <Navigate to="/courses" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">AI-ExamGen</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Đăng nhập để tiếp tục vào không gian làm việc của bạn.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {error && (
            <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="email">
            Email
          </label>
          <div className="relative mb-4">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="teacher@example.com"
              autoComplete="email"
              required
            />
          </div>

          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="password">
            Mật khẩu
          </label>
          <div className="relative mb-6">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

          <p className="mt-5 text-center text-sm text-slate-600 dark:text-slate-400">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
              Tạo tài khoản
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
