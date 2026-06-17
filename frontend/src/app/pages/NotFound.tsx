import { Link } from 'react-router';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-blue-600 dark:text-blue-400">404</h1>
        <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-4">Page Not Found</p>
        <p className="text-gray-600 dark:text-gray-400 mt-2">The page you're looking for doesn't exist.</p>
        <div className="flex items-center justify-center gap-4 mt-8">
          <Link
            to="/"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            <Home className="w-5 h-5" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
