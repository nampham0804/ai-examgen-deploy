import { useApp } from '../context/AppContext';
import { Search, Filter, Tag, Eye, Edit, Trash2, Download, CheckSquare } from 'lucide-react';
import { useState } from 'react';

const questions = [
  {
    id: 1,
    question: 'Explain the concept of polymorphism in object-oriented programming.',
    course: 'CS101',
    lo: 'LO1.3',
    type: 'Essay',
    difficulty: 'Medium',
    status: 'approved',
    tags: ['OOP', 'Polymorphism'],
    createdBy: 'AI',
    date: '2026-06-10',
  },
  {
    id: 2,
    question: 'Which sorting algorithm has the best average-case time complexity?',
    course: 'CS201',
    lo: 'LO2.1',
    type: 'Multiple Choice',
    difficulty: 'Easy',
    status: 'approved',
    tags: ['Sorting', 'Complexity'],
    createdBy: 'Manual',
    date: '2026-06-08',
  },
  {
    id: 3,
    question: 'Analyze the impact of learning rate on neural network training.',
    course: 'CS401',
    lo: 'LO4.2',
    type: 'Essay',
    difficulty: 'Hard',
    status: 'pending',
    tags: ['Neural Networks', 'Hyperparameters'],
    createdBy: 'AI',
    date: '2026-06-11',
  },
  {
    id: 4,
    question: 'What is the determinant of a 2x2 matrix [[a, b], [c, d]]?',
    course: 'MATH201',
    lo: 'LO3.1',
    type: 'Multiple Choice',
    difficulty: 'Easy',
    status: 'approved',
    tags: ['Linear Algebra', 'Matrices'],
    createdBy: 'Manual',
    date: '2026-06-05',
  },
  {
    id: 5,
    question: 'Implement a binary search tree and explain its time complexity.',
    course: 'CS201',
    lo: 'LO2.2',
    type: 'Essay',
    difficulty: 'Hard',
    status: 'approved',
    tags: ['Data Structures', 'Trees'],
    createdBy: 'AI',
    date: '2026-06-09',
  },
  {
    id: 6,
    question: 'True or False: Overfitting occurs when a model performs well on training data but poorly on test data.',
    course: 'CS401',
    lo: 'LO4.2',
    type: 'True/False',
    difficulty: 'Easy',
    status: 'rejected',
    tags: ['Machine Learning', 'Evaluation'],
    createdBy: 'AI',
    date: '2026-06-07',
  },
];

export default function QuestionBank() {
  const { t } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCourse = filterCourse === 'all' || q.course === filterCourse;
    const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
    const matchesDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
    return matchesSearch && matchesCourse && matchesStatus && matchesDifficulty;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
      rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    };
    return styles[status as keyof typeof styles];
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      Easy: 'text-green-600 dark:text-green-400',
      Medium: 'text-amber-600 dark:text-amber-400',
      Hard: 'text-red-600 dark:text-red-400',
    };
    return colors[difficulty as keyof typeof colors];
  };

  const toggleSelectQuestion = (id: number) => {
    setSelectedQuestions(prev =>
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedQuestions.length === filteredQuestions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(filteredQuestions.map(q => q.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('bank.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Browse and manage your comprehensive question repository</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedQuestions.length > 0 && (
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <Download className="w-5 h-5" />
              Export Selected ({selectedQuestions.length})
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Questions</div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{questions.length}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">Approved</div>
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
            {questions.filter(q => q.status === 'approved').length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">Pending Review</div>
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            {questions.filter(q => q.status === 'pending').length}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">AI Generated</div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {questions.filter(q => q.createdBy === 'AI').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('bank.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Courses</option>
            <option value="CS101">CS101</option>
            <option value="CS201">CS201</option>
            <option value="CS401">CS401</option>
            <option value="MATH201">MATH201</option>
          </select>

          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedQuestions.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
              {selectedQuestions.length} question{selectedQuestions.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                Approve All
              </button>
              <button className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-lg transition-colors">
                Export
              </button>
              <button className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.length === filteredQuestions.length && filteredQuestions.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Question
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Course / LO
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Difficulty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredQuestions.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedQuestions.includes(q.id)}
                      onChange={() => toggleSelectQuestion(q.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-md">
                      <p className="text-gray-900 dark:text-white font-medium line-clamp-2">{q.question}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {q.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-mono font-semibold text-gray-900 dark:text-white">{q.course}</div>
                      <div className="text-gray-600 dark:text-gray-400">{q.lo}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{q.type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getDifficultyColor(q.difficulty)}`}>
                      {q.difficulty}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(q.status)}`}>
                      {q.status}
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
            Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredQuestions.length}</span> of{' '}
            <span className="font-medium">{questions.length}</span> results
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Previous
            </button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded-md">1</button>
            <button className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
