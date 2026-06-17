import { useApp } from '../context/AppContext';
import { Plus, Search, Target, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { useState } from 'react';

const loData = [
  { 
    id: 1, 
    code: 'LO1.1', 
    course: 'CS101', 
    description: 'Demonstrate understanding of fundamental programming concepts', 
    coverage: 92,
    questions: 45,
    status: 'excellent'
  },
  { 
    id: 2, 
    code: 'LO1.2', 
    course: 'CS101', 
    description: 'Apply problem-solving techniques to algorithmic challenges', 
    coverage: 78,
    questions: 32,
    status: 'good'
  },
  { 
    id: 3, 
    code: 'LO2.1', 
    course: 'CS201', 
    description: 'Analyze time and space complexity of algorithms', 
    coverage: 45,
    questions: 18,
    status: 'warning'
  },
  { 
    id: 4, 
    code: 'LO2.2', 
    course: 'CS201', 
    description: 'Implement advanced data structures efficiently', 
    coverage: 85,
    questions: 38,
    status: 'good'
  },
  { 
    id: 5, 
    code: 'LO3.1', 
    course: 'MATH201', 
    description: 'Solve systems of linear equations using matrix methods', 
    coverage: 94,
    questions: 51,
    status: 'excellent'
  },
  { 
    id: 6, 
    code: 'LO3.2', 
    course: 'MATH201', 
    description: 'Apply eigenvalue and eigenvector concepts', 
    coverage: 62,
    questions: 25,
    status: 'good'
  },
  { 
    id: 7, 
    code: 'LO4.1', 
    course: 'CS401', 
    description: 'Understand supervised learning algorithms', 
    coverage: 35,
    questions: 14,
    status: 'critical'
  },
  { 
    id: 8, 
    code: 'LO4.2', 
    course: 'CS401', 
    description: 'Evaluate model performance using appropriate metrics', 
    coverage: 88,
    questions: 42,
    status: 'good'
  },
];

export default function LearningOutcomes() {
  const { t } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLOs = loData.filter(lo =>
    lo.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lo.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lo.course.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors = {
      excellent: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700',
      good: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700',
      warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700',
      critical: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700',
    };
    return colors[status as keyof typeof colors];
  };

  const getCoverageIcon = (status: string) => {
    if (status === 'excellent' || status === 'good') {
      return <CheckCircle className="w-5 h-5" />;
    }
    return <AlertTriangle className="w-5 h-5" />;
  };

  const stats = {
    totalLOs: loData.length,
    avgCoverage: Math.round(loData.reduce((sum, lo) => sum + lo.coverage, 0) / loData.length),
    criticalLOs: loData.filter(lo => lo.status === 'critical').length,
    excellentLOs: loData.filter(lo => lo.status === 'excellent').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('lo.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Define and track learning outcomes across your courses</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          <Plus className="w-5 h-5" />
          {t('lo.create')}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total LOs</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalLOs}</p>
            </div>
            <Target className="w-10 h-10 text-blue-600 opacity-20" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Coverage</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.avgCoverage}%</p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-600 opacity-20" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Excellent</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.excellentLOs}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-600 opacity-20" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Critical</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{stats.criticalLOs}</p>
            </div>
            <AlertTriangle className="w-10 h-10 text-red-600 opacity-20" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search learning outcomes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* LO Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredLOs.map((lo) => (
          <div
            key={lo.id}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 ${getStatusColor(lo.status)} p-6`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getStatusColor(lo.status)}`}>
                  {getCoverageIcon(lo.status)}
                </div>
                <div>
                  <div className="font-mono font-bold text-lg text-gray-900 dark:text-white">{lo.code}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{lo.course}</div>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-4">{lo.description}</p>

            <div className="space-y-3">
              {/* Coverage Bar */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Question Coverage</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{lo.coverage}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      lo.coverage >= 80 ? 'bg-green-500' :
                      lo.coverage >= 60 ? 'bg-blue-500' :
                      lo.coverage >= 40 ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${lo.coverage}%` }}
                  />
                </div>
              </div>

              {/* Questions Count */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-sm text-gray-600 dark:text-gray-400">Questions in Bank</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{lo.questions} questions</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Course-LO Relationship Visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Course-LO Relationship</h2>
        <div className="space-y-4">
          {['CS101', 'CS201', 'MATH201', 'CS401'].map((course) => {
            const courseLOs = loData.filter(lo => lo.course === course);
            const avgCoverage = Math.round(courseLOs.reduce((sum, lo) => sum + lo.coverage, 0) / courseLOs.length);
            return (
              <div key={course} className="flex items-center gap-4">
                <div className="w-32 font-mono font-semibold text-gray-900 dark:text-white">{course}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{courseLOs.length} LOs</span>
                    <span className="text-sm text-gray-400">•</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{avgCoverage}% avg coverage</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        avgCoverage >= 80 ? 'bg-green-500' :
                        avgCoverage >= 60 ? 'bg-blue-500' :
                        'bg-amber-500'
                      }`}
                      style={{ width: `${avgCoverage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
