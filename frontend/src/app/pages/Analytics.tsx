import { useApp } from '../context/AppContext';
import { TrendingUp, Target, Sparkles, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';

const loCoverageData = [
  { lo: 'LO1.1', coverage: 92, target: 80 },
  { lo: 'LO1.2', coverage: 78, target: 80 },
  { lo: 'LO2.1', coverage: 45, target: 80 },
  { lo: 'LO2.2', coverage: 85, target: 80 },
  { lo: 'LO3.1', coverage: 94, target: 80 },
  { lo: 'LO3.2', coverage: 62, target: 80 },
  { lo: 'LO4.1', coverage: 35, target: 80 },
  { lo: 'LO4.2', coverage: 88, target: 80 },
];

const questionGrowthData = [
  { month: 'Jan', manual: 45, ai: 12, total: 57 },
  { month: 'Feb', manual: 38, ai: 28, total: 66 },
  { month: 'Mar', manual: 42, ai: 45, total: 87 },
  { month: 'Apr', manual: 35, ai: 67, total: 102 },
  { month: 'May', manual: 40, ai: 89, total: 129 },
  { month: 'Jun', manual: 38, ai: 112, total: 150 },
];

const examStatsData = [
  { course: 'CS101', exams: 8, avgScore: 85, questions: 145 },
  { course: 'CS201', exams: 12, avgScore: 78, questions: 203 },
  { course: 'MATH201', exams: 6, avgScore: 82, questions: 89 },
  { course: 'CS401', exams: 10, avgScore: 76, questions: 178 },
];

const aiPerformanceData = [
  { week: 'Week 1', accuracy: 82, confidence: 78, approved: 75 },
  { week: 'Week 2', accuracy: 85, confidence: 81, approved: 80 },
  { week: 'Week 3', accuracy: 88, confidence: 85, approved: 85 },
  { week: 'Week 4', accuracy: 91, confidence: 88, approved: 89 },
  { week: 'Week 5', accuracy: 93, confidence: 91, approved: 92 },
  { week: 'Week 6', accuracy: 94, confidence: 93, approved: 94 },
];

export default function Analytics() {
  const { t } = useApp();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('analytics.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Comprehensive insights into your question bank and AI performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-8 h-8 opacity-80" />
            <div className="text-xs bg-white/20 px-2 py-1 rounded-full">+24%</div>
          </div>
          <div className="text-3xl font-bold mb-1">790</div>
          <div className="text-sm opacity-90">Total Questions</div>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <Target className="w-8 h-8 opacity-80" />
            <div className="text-xs bg-white/20 px-2 py-1 rounded-full">94%</div>
          </div>
          <div className="text-3xl font-bold mb-1">156</div>
          <div className="text-sm opacity-90">Learning Outcomes</div>
        </div>
        <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <Sparkles className="w-8 h-8 opacity-80" />
            <div className="text-xs bg-white/20 px-2 py-1 rounded-full">+156%</div>
          </div>
          <div className="text-3xl font-bold mb-1">453</div>
          <div className="text-sm opacity-90">AI Generated</div>
        </div>
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <BarChart3 className="w-8 h-8 opacity-80" />
            <div className="text-xs bg-white/20 px-2 py-1 rounded-full">89%</div>
          </div>
          <div className="text-3xl font-bold mb-1">43</div>
          <div className="text-sm opacity-90">Exams Created</div>
        </div>
      </div>

      {/* LO Coverage Heatmap */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('analytics.loCoverage')}</h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Current Coverage</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Target (80%)</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={loCoverageData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="lo" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
              labelStyle={{ color: '#f3f4f6' }}
            />
            <Bar dataKey="target" fill="#6b7280" radius={[8, 8, 0, 0]} />
            <Bar dataKey="coverage" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        
        {/* Coverage Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {loCoverageData.map((lo) => (
            <div key={lo.lo} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="font-mono font-semibold text-gray-900 dark:text-white text-sm">{lo.lo}</div>
              <div className={`text-2xl font-bold mt-1 ${
                lo.coverage >= lo.target ? 'text-green-600 dark:text-green-400' :
                lo.coverage >= 60 ? 'text-amber-600 dark:text-amber-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {lo.coverage}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Question Bank Growth */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('analytics.questionGrowth')}</h2>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-600 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">Manual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">AI Generated</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={questionGrowthData}>
            <defs>
              <linearGradient id="colorManual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6b7280" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
              labelStyle={{ color: '#f3f4f6' }}
            />
            <Area type="monotone" dataKey="manual" stroke="#6b7280" fillOpacity={1} fill="url(#colorManual)" />
            <Area type="monotone" dataKey="ai" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAI)" />
          </AreaChart>
        </ResponsiveContainer>
        
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400">Manual Questions</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">238</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">30% of total</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg">
            <div className="text-sm text-blue-700 dark:text-blue-400">AI Generated</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-200 mt-1">453</div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">57% of total</div>
          </div>
          <div className="p-4 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-lg">
            <div className="text-sm text-green-700 dark:text-green-400">Hybrid</div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-200 mt-1">99</div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">13% of total</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exam Statistics */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{t('analytics.examStats')}</h2>
          <div className="space-y-4">
            {examStatsData.map((course) => (
              <div key={course.course} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-semibold text-gray-900 dark:text-white">{course.course}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{course.exams} exams</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Avg Score</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{course.avgScore}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Questions</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">{course.questions}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Performance Insights */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">{t('analytics.aiPerformance')}</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={aiPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="week" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
              <Line type="monotone" dataKey="confidence" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
              <Line type="monotone" dataKey="approved" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} />
            </LineChart>
          </ResponsiveContainer>
          
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-xs text-green-700 dark:text-green-400 mb-1">Accuracy</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">94%</div>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-xs text-blue-700 dark:text-blue-400 mb-1">Confidence</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">93%</div>
            </div>
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-xs text-purple-700 dark:text-purple-400 mb-1">Approved</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">94%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Course Comparison Analytics</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Course</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">LOs</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Questions</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">AI %</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg Coverage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-4 py-3 font-mono font-semibold text-gray-900 dark:text-white">CS101</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">12</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">145</td>
                <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-semibold">62%</td>
                <td className="px-4 py-3 text-green-600 dark:text-green-400 font-semibold">85%</td>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">Excellent</span></td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono font-semibold text-gray-900 dark:text-white">CS201</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">15</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">203</td>
                <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-semibold">58%</td>
                <td className="px-4 py-3 text-green-600 dark:text-green-400 font-semibold">82%</td>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">Good</span></td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono font-semibold text-gray-900 dark:text-white">MATH201</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">10</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">89</td>
                <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-semibold">45%</td>
                <td className="px-4 py-3 text-green-600 dark:text-green-400 font-semibold">88%</td>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">Excellent</span></td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-mono font-semibold text-gray-900 dark:text-white">CS401</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">18</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">178</td>
                <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-semibold">71%</td>
                <td className="px-4 py-3 text-amber-600 dark:text-amber-400 font-semibold">61%</td>
                <td className="px-4 py-3"><span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full">Needs Attention</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
