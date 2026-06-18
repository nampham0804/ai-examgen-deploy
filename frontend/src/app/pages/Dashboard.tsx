import { useApp } from '../context/AppContext';
import {
  BookOpen,
  Target,
  HelpCircle,
  FileText,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowUpRight,
  CheckCircle,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useEffect, useState } from 'react';
import { analyticsApi, DashboardStats } from '../../api/analytics';

const difficultyData = [
  { name: 'Easy', value: 245 },
  { name: 'Medium', value: 389 },
  { name: 'Hard', value: 156 },
];

const coverageData = [
  { name: 'LO1', coverage: 92 },
  { name: 'LO2', coverage: 78 },
  { name: 'LO3', coverage: 85 },
  { name: 'LO4', coverage: 65 },
  { name: 'LO5', coverage: 94 },
];

const aiActivityData = [
  { week: 'Week 1', questions: 45 },
  { week: 'Week 2', questions: 67 },
  { week: 'Week 3', questions: 52 },
  { week: 'Week 4', questions: 89 },
];

const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

const recentActivities = [
  { id: 1, type: 'generate', text: 'Generated 15 questions for CS101', time: '2 hours ago', icon: Sparkles, color: 'text-blue-600' },
  { id: 2, type: 'approve', text: 'Approved 8 questions for review', time: '4 hours ago', icon: CheckCircle, color: 'text-green-600' },
  { id: 3, type: 'exam', text: 'Created final exam for MATH201', time: '1 day ago', icon: FileText, color: 'text-purple-600' },
  { id: 4, type: 'course', text: 'Added new course: Data Structures', time: '2 days ago', icon: BookOpen, color: 'text-indigo-600' },
];

const recentQuestions = [
  { 
    id: 1, 
    question: 'Explain the difference between supervised and unsupervised learning in machine learning.', 
    course: 'CS401', 
    lo: 'LO2.1',
    difficulty: 'Medium',
    confidence: 94,
  },
  { 
    id: 2, 
    question: 'What are the key principles of object-oriented programming?', 
    course: 'CS101', 
    lo: 'LO1.3',
    difficulty: 'Easy',
    confidence: 89,
  },
  { 
    id: 3, 
    question: 'Analyze the time complexity of QuickSort in the worst-case scenario.', 
    course: 'CS201', 
    lo: 'LO3.2',
    difficulty: 'Hard',
    confidence: 91,
  },
];

export default function Dashboard() {
  const { t } = useApp();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    analyticsApi.getDashboardStats().then(res => {
      setDashboardStats(res.data);
    }).catch(err => console.error(err));
  }, []);

  const stats = [
    { label: t('dashboard.totalCourses'), value: dashboardStats?.courses || '...', icon: BookOpen, color: 'bg-blue-500' },
    { label: t('dashboard.totalLOs'), value: '156', icon: Target, color: 'bg-indigo-500' }, // LOs count usually derived differently or hardcoded for now
    { label: t('dashboard.totalQuestions'), value: dashboardStats?.questions_total || '...', icon: HelpCircle, color: 'bg-teal-500' },
    { label: t('dashboard.totalExams'), value: dashboardStats?.exams || '...', icon: FileText, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back! Here's what's happening with your courses.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-2 text-green-600 dark:text-green-400">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">+12%</span>
                  </div>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Difficulty Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.difficultyDistribution')}</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={difficultyData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {difficultyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* LO Coverage */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.loCoverage')}</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={coverageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Bar dataKey="coverage" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent AI Questions */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('dashboard.recentAIQuestions')}</h2>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {recentQuestions.map((q) => (
              <div key={q.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white font-medium mb-2">{q.question}</p>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{q.course}</span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      <span className="text-gray-600 dark:text-gray-400">{q.lo}</span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        q.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                        q.difficulty === 'Medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {q.difficulty}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>{q.confidence}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.recentActivities')}</h2>
          <div className="space-y-4">
            {recentActivities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 ${activity.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">{activity.text}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {activity.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Activity Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.aiActivity')}</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={aiActivityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="week" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
              labelStyle={{ color: '#f3f4f6' }}
            />
            <Line type="monotone" dataKey="questions" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">{t('dashboard.quickActions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg p-4 text-left transition-all group">
            <BookOpen className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-medium">{t('dashboard.createCourse')}</div>
            <ArrowUpRight className="w-4 h-4 mt-2 opacity-70" />
          </button>
          <button className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg p-4 text-left transition-all group">
            <Sparkles className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-medium">{t('dashboard.generateQuestions')}</div>
            <ArrowUpRight className="w-4 h-4 mt-2 opacity-70" />
          </button>
          <button className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg p-4 text-left transition-all group">
            <FileText className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-medium">{t('dashboard.createExam')}</div>
            <ArrowUpRight className="w-4 h-4 mt-2 opacity-70" />
          </button>
        </div>
      </div>
    </div>
  );
}
