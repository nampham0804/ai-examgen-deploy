import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import {
  BarChart3,
  BookOpen,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Database,
  FileText,
  Globe,
  Grid3x3,
  LayoutDashboard,
  LogOut,
  Moon,
  Sparkles,
  Sun,
  Target,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

const navGroups = [
  {
    label: 'Thiết lập',
    items: [
      { path: '/courses', icon: BookOpen, labelKey: 'nav.courses' },
      { path: '/learning-outcomes', icon: Target, labelKey: 'nav.learningOutcomes' },
    ],
  },
  {
    label: 'Quy trình câu hỏi',
    items: [
      { path: '/ai-generation', icon: Sparkles, labelKey: 'nav.aiGeneration' },
      { path: '/review', icon: CheckSquare, labelKey: 'nav.review' },
      { path: '/question-bank', icon: Database, labelKey: 'nav.questionBank' },
    ],
  },
  {
    label: 'Quy trình đề thi',
    items: [
      { path: '/exam-blueprint', icon: Grid3x3, labelKey: 'nav.examBlueprint' },
      { path: '/exam-generator', icon: FileText, labelKey: 'nav.examGenerator' },
      { path: '/exam-list', icon: ClipboardList, label: 'Danh sách đề thi' },
    ],
  },
  {
    label: 'Báo cáo',
    items: [
      { path: '/analytics', icon: BarChart3, labelKey: 'nav.analytics' },
      { path: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
    ],
  },
];

function getPageTitle(pathname: string) {
  const allItems = navGroups.flatMap((group) => group.items);
  const activeItem = allItems.find((item) => pathname === item.path);
  return activeItem?.label || activeItem?.labelKey || 'AI-ExamGen';
}

export function Layout() {
  const { theme, toggleTheme, language, setLanguage, t } = useApp();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const pageTitle = getPageTitle(location.pathname);

  function getLabel(item: { label?: string; labelKey?: string }) {
    return item.label || (item.labelKey ? t(item.labelKey) : '');
  }

  function handleLogout() {
    logout();
    setShowUserDropdown(false);
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside
        className={`fixed left-0 top-0 z-40 h-screen border-r border-slate-200 bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-3.5 dark:border-slate-800">
          <Link to="/courses" className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="truncate text-base font-bold text-slate-950 dark:text-white">AI-ExamGen</div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">Workspace giảng viên</div>
              </div>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label={sidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        <nav className="h-[calc(100vh-3.5rem)] overflow-y-auto px-3 py-4">
          <div className="space-y-5">
            {navGroups.map((group) => (
              <div key={group.label}>
                {!sidebarCollapsed && (
                  <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {group.label}
                  </div>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const label = getLabel(item);
                    const isActive = location.pathname === item.path;

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        title={sidebarCollapsed ? label : undefined}
                        className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                        } ${sidebarCollapsed ? 'justify-center' : ''}`}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        {!sidebarCollapsed && <span className="truncate">{label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </aside>

      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'}`}>
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="flex h-14 items-center justify-between gap-4 px-5">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {pageTitle.includes('.') ? t(pageTitle) : pageTitle}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label="Đổi giao diện sáng/tối"
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLangDropdown(!showLangDropdown)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <Globe className="h-4 w-4" />
                  <span className="text-xs font-semibold">{language.toUpperCase()}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {showLangDropdown && (
                  <div className="absolute right-0 mt-2 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => {
                        setLanguage('vi');
                        setShowLangDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${
                        language === 'vi' ? 'font-semibold text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Tiếng Việt
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLanguage('en');
                        setShowLangDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 ${
                        language === 'en' ? 'font-semibold text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      English
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div className="hidden max-w-40 text-left sm:block">
                    <div className="truncate text-xs font-semibold text-slate-900 dark:text-white">{user?.full_name || 'User'}</div>
                  </div>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.full_name || 'User'}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('common.logout')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
