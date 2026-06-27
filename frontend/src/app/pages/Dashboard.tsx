import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router';
import {
  BookOpen,
  Target,
  HelpCircle,
  FileText,
  Clock,
  CheckCircle,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { useEffect, useState } from 'react';
import { analyticsApi, DashboardStats } from '../../api/analytics';

export default function Dashboard() {
  const { t } = useApp();
  const navigate = useNavigate();
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    analyticsApi.getDashboardStats().then(res => {
      setDashboardStats(res.data);
    }).catch(err => console.error(err));
  }, []);

  const stats = [
    { label: t('dashboard.totalCourses'), value: dashboardStats?.courses ?? '...', icon: BookOpen, color: 'bg-blue-500' },
    { label: t('dashboard.totalQuestions'), value: dashboardStats?.questions_total ?? '...', icon: HelpCircle, color: 'bg-indigo-500' },
    { label: t('dashboard.pendingQuestions'), value: dashboardStats?.questions_pending ?? '...', icon: Clock, color: 'bg-amber-500' },
    { label: t('dashboard.approvedQuestions'), value: dashboardStats?.questions_approved ?? '...', icon: CheckCircle, color: 'bg-teal-500' },
    { label: t('dashboard.blueprints'), value: dashboardStats?.blueprints ?? '...', icon: Target, color: 'bg-purple-500' },
    { label: t('dashboard.totalExams'), value: dashboardStats?.exams ?? '...', icon: FileText, color: 'bg-pink-500' },
  ];

  const recentActivity = [
    ...(dashboardStats?.recent_questions?.map(q => ({
      id: `q-${q.id}`,
      type: 'question',
      text: `Tạo câu hỏi mới cho môn ${q.course} (${q.lo})`,
      time: new Date(q.created_at),
      icon: Sparkles,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    })) || []),
    ...(dashboardStats?.recent_exams?.map(e => ({
      id: `e-${e.id}`,
      type: 'exam',
      text: `Tạo đề thi: ${e.title} (${e.course})`,
      time: new Date(e.created_at),
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30'
    })) || [])
  ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 7);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Welcome back! Here's what's happening with your courses.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions - Horizontal Row */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-4">{t('dashboard.quickActions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={() => navigate('/courses')} className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg p-4 text-left transition-all group flex flex-col justify-between h-full min-h-[100px]">
            <div className="flex items-start justify-between w-full">
              <BookOpen className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
              <ArrowUpRight className="w-5 h-5 opacity-70" />
            </div>
            <div className="font-medium text-lg">{t('dashboard.createCourse')}</div>
          </button>
          <button onClick={() => navigate('/ai-generation')} className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg p-4 text-left transition-all group flex flex-col justify-between h-full min-h-[100px]">
            <div className="flex items-start justify-between w-full">
              <Sparkles className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
              <ArrowUpRight className="w-5 h-5 opacity-70" />
            </div>
            <div className="font-medium text-lg">{t('dashboard.generateQuestions')}</div>
          </button>
          <button onClick={() => navigate('/exam-generator')} className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-lg p-4 text-left transition-all group flex flex-col justify-between h-full min-h-[100px]">
            <div className="flex items-start justify-between w-full">
              <FileText className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
              <ArrowUpRight className="w-5 h-5 opacity-70" />
            </div>
            <div className="font-medium text-lg">{t('dashboard.createExam')}</div>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column for Charts */}
        <div className="space-y-6">
          {/* Difficulty Distribution Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.difficultyDistribution')}</h2>
            <div className="flex-1 flex items-center justify-center min-h-[250px]">
              {dashboardStats?.difficulty_distribution ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Dễ', value: dashboardStats.difficulty_distribution.easy },
                        { name: 'Trung bình', value: dashboardStats.difficulty_distribution.medium },
                        { name: 'Khó', value: dashboardStats.difficulty_distribution.hard },
                      ].filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'Dễ', value: dashboardStats.difficulty_distribution.easy },
                        { name: 'Trung bình', value: dashboardStats.difficulty_distribution.medium },
                        { name: 'Khó', value: dashboardStats.difficulty_distribution.hard },
                      ].filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#10b981', '#f59e0b', '#ef4444'][index % 3]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-500 flex items-center justify-center h-full w-full">Chưa có dữ liệu câu hỏi</div>
              )}
            </div>
          </div>

          {/* Question Type Distribution Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Phân bố loại câu hỏi</h2>
            <div className="flex-1 flex items-center justify-center min-h-[250px]">
              {dashboardStats?.type_distribution && dashboardStats.type_distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={dashboardStats.type_distribution} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                    />
                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Số lượng">
                      {dashboardStats.type_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6'][index % 4]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-500 flex items-center justify-center h-full w-full">Chưa có dữ liệu câu hỏi</div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        {recentActivity.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col max-h-[650px] h-fit self-start">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex-shrink-0">{t('dashboard.recentActivities')}</h2>
            <div className="space-y-4 overflow-y-auto pr-2 flex-1">
              {recentActivity.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg ${activity.bgColor} flex items-center justify-center flex-shrink-0 ${activity.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">{activity.text}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {activity.time.toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
