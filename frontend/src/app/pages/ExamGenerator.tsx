import { useApp } from '../context/AppContext';
import { FileText, Download, Eye, CheckCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

const difficultyData = [
  { name: 'Easy', value: 10, color: '#10b981' },
  { name: 'Medium', value: 15, color: '#f59e0b' },
  { name: 'Hard', value: 5, color: '#ef4444' },
];

const examPreview = {
  title: 'Midterm Exam - Machine Learning',
  course: 'CS401',
  duration: '120 minutes',
  totalQuestions: 30,
  totalPoints: 100,
  questions: [
    { id: 1, text: 'Explain the difference between supervised and unsupervised learning.', points: 10, type: 'Essay', difficulty: 'Medium' },
    { id: 2, text: 'What is the purpose of a validation set in machine learning?', points: 5, type: 'Multiple Choice', difficulty: 'Easy' },
    { id: 3, text: 'Analyze the impact of overfitting on model performance.', points: 15, type: 'Essay', difficulty: 'Hard' },
  ],
};

export default function ExamGenerator() {
  const { t } = useApp();
  const [step, setStep] = useState(1);
  const [examConfig, setExamConfig] = useState({
    title: 'Midterm Exam',
    course: 'CS401',
    duration: 120,
    totalQuestions: 30,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('exam.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Create comprehensive exams from your question bank</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
            <Eye className="w-5 h-5" />
            {t('exam.preview')}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <Download className="w-5 h-5" />
            {t('exam.export')}
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((s, index) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {step > s ? <CheckCircle className="w-6 h-6" /> : s}
                </div>
                <span className="text-xs mt-2 text-gray-600 dark:text-gray-400">
                  {s === 1 && 'Configure'}
                  {s === 2 && 'Select Blueprint'}
                  {s === 3 && 'Generate'}
                  {s === 4 && 'Review'}
                </span>
              </div>
              {index < 3 && (
                <div className={`h-1 flex-1 mx-2 ${
                  step > s ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('exam.configure')}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Exam Title
                </label>
                <input
                  type="text"
                  value={examConfig.title}
                  onChange={(e) => setExamConfig({ ...examConfig, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course
                </label>
                <select
                  value={examConfig.course}
                  onChange={(e) => setExamConfig({ ...examConfig, course: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CS401">CS401 - Machine Learning</option>
                  <option value="CS101">CS101 - Intro to CS</option>
                  <option value="CS201">CS201 - Data Structures</option>
                  <option value="MATH201">MATH201 - Linear Algebra</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={examConfig.duration}
                  onChange={(e) => setExamConfig({ ...examConfig, duration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Total Questions
                </label>
                <input
                  type="number"
                  value={examConfig.totalQuestions}
                  onChange={(e) => setExamConfig({ ...examConfig, totalQuestions: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('exam.selectBlueprint')}
                </label>
                <select className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Blueprint 1 - Standard Distribution</option>
                  <option>Blueprint 2 - Advanced Focus</option>
                  <option>Blueprint 3 - Practical Skills</option>
                </select>
              </div>

              <button
                onClick={() => setStep(Math.min(4, step + 1))}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                {t('exam.generate')}
              </button>
            </div>
          </div>

          {/* Difficulty Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Difficulty Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={difficultyData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={70}
                  dataKey="value"
                >
                  {difficultyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Quality Validation */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-6 h-6" />
              <h3 className="font-semibold">Quality Validation</h3>
            </div>
            <div className="space-y-2 text-sm opacity-90">
              <div className="flex items-center justify-between">
                <span>LO Coverage</span>
                <span className="font-semibold">96%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Blueprint Alignment</span>
                <span className="font-semibold">100%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Balance Score</span>
                <span className="font-semibold">A+</span>
              </div>
            </div>
          </div>
        </div>

        {/* Exam Preview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            {/* Exam Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{examPreview.title}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Course</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{examPreview.course}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Duration</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{examPreview.duration}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Questions</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{examPreview.totalQuestions}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Points</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{examPreview.totalPoints}</div>
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sample Questions</h3>
              {examPreview.questions.map((q, index) => (
                <div key={q.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">Question {index + 1}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          q.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                          q.difficulty === 'Medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {q.difficulty}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                          {q.type}
                        </span>
                      </div>
                      <p className="text-gray-900 dark:text-white">{q.text}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Points</div>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{q.points}</div>
                    </div>
                  </div>
                  {q.type === 'Multiple Choice' && (
                    <div className="mt-4 space-y-2 pl-4">
                      <div className="text-sm text-gray-700 dark:text-gray-300">A. Option 1</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">B. Option 2</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">C. Option 3</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">D. Option 4</div>
                    </div>
                  )}
                  {q.type === 'Essay' && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600">
                      <div className="text-sm text-gray-600 dark:text-gray-400 italic">
                        [Answer space for students]
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                ... and {examPreview.totalQuestions - examPreview.questions.length} more questions
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Export Options</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group">
                <FileText className="w-8 h-8 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">PDF</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Printable format</div>
                </div>
              </button>
              <button className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group">
                <FileText className="w-8 h-8 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">Word</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Editable document</div>
                </div>
              </button>
              <button className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group">
                <FileText className="w-8 h-8 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">JSON</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Data format</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
