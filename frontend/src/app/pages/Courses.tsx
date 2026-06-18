import { useApp } from '../context/AppContext';
import { Plus, Search, Filter, Edit, Trash2, Eye, MoreVertical } from 'lucide-react';
import { useState } from 'react';

import { MOCK_COURSES } from '../../mocks/courses';

export default function Courses() {
  const { t } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredCourses = MOCK_COURSES.filter(course => {
    const matchesSearch = course.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         course.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || course.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      draft: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
      archived: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400',
    };
    return styles[status as keyof typeof styles] || styles.draft;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('courses.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your course catalog and learning outcomes</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          <Plus className="w-5 h-5" />
          {t('courses.addCourse')}
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('courses.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">{t('courses.active')}</option>
              <option value="draft">{t('courses.draft')}</option>
              <option value="archived">{t('courses.archived')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('courses.code')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('courses.name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('courses.credits')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Learning Outcomes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Questions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('courses.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('courses.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCourses.map((course) => (
                <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono font-semibold text-gray-900 dark:text-white">{course.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900 dark:text-white">{course.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-700 dark:text-gray-300">{course.credits}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-700 dark:text-gray-300">{course.los}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-700 dark:text-gray-300">{course.questions}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(course.status)}`}>
                      {t(`courses.${course.status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredCourses.length}</span> of{' '}
            <span className="font-medium">{MOCK_COURSES.length}</span> results
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Previous
            </button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded-md">1</button>
            <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              2
            </button>
            <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">Active Courses</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {MOCK_COURSES.filter(c => c.status === 'active').length}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-2">+2 this month</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Learning Outcomes</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {MOCK_COURSES.reduce((sum, c) => sum + c.los, 0)}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">Across all courses</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Questions</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {MOCK_COURSES.reduce((sum, c) => sum + c.questions, 0)}
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400 mt-2">In question bank</div>
        </div>
      </div>
    </div>
  );
}
