import { useApp } from '../context/AppContext';
import { CheckCircle, XCircle, Sparkles, Target, TrendingUp, Edit } from 'lucide-react';
import { useState } from 'react';

const questionForReview = {
  id: 1,
  question: 'Explain how gradient descent optimization works in training neural networks. Discuss the role of learning rate and provide an example of potential issues.',
  originalContent: 'Explain gradient descent in neural networks.',
  type: 'Essay',
  difficulty: 'Hard',
  course: 'CS401',
  lo: 'LO4.3',
  suggestedAnswer: 'Gradient descent is an iterative optimization algorithm used to minimize the loss function by updating model parameters in the direction opposite to the gradient. The learning rate controls the step size of each update. Common issues include: 1) Getting stuck in local minima, 2) Vanishing gradients in deep networks, 3) Oscillation with high learning rates.',
  rubric: [
    { criterion: 'Explains gradient descent concept', points: 3 },
    { criterion: 'Discusses learning rate role', points: 2 },
    { criterion: 'Identifies potential issues', points: 3 },
    { criterion: 'Provides clear examples', points: 2 },
  ],
  qualityScore: 87,
  confidence: 91,
  loAlignment: 'This question directly assesses LO4.3: "Understand neural network training mechanisms". It requires students to explain optimization algorithms, which is a core competency for this learning outcome.',
  aiEnhancements: [
    'Enhanced question clarity',
    'Added requirement for examples',
    'Structured to assess multiple cognitive levels',
  ],
  metadata: {
    createdDate: '2026-06-12',
    generatedBy: 'AI',
    sourceDocument: 'Lecture_07_Neural_Networks.pdf',
    reviewedBy: null,
  },
};

export default function Review() {
  const { t } = useApp();
  const [editMode, setEditMode] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState(questionForReview.question);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('review.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Review and approve AI-generated questions for quality assurance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Pending Review</div>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">12</div>
            </div>
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Approved Today</div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">8</div>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Quality Score</div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">89%</div>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Approval Rate</div>
              <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">94%</div>
            </div>
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-indigo-600 dark:indigo-blue-400" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side - Original and Edited */}
        <div className="space-y-6">
          {/* Original AI Content */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Original AI-Generated Question</h2>
              <button
                onClick={() => setEditMode(!editMode)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
              >
                <Edit className="w-4 h-4" />
                {editMode ? 'Cancel Edit' : 'Edit'}
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Before Enhancement:</div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-gray-700 dark:text-gray-300 italic">{questionForReview.originalContent}</p>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">After AI Enhancement:</div>
                {editMode ? (
                  <textarea
                    value={editedQuestion}
                    onChange={(e) => setEditedQuestion(e.target.value)}
                    rows={6}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-blue-300 dark:border-blue-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-gray-900 dark:text-white">{questionForReview.question}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {questionForReview.aiEnhancements.map((enhancement, i) => (
                  <span key={i} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {enhancement}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Question Metadata */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Question Details</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Course</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-white">{questionForReview.course}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Learning Outcome</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-white">{questionForReview.lo}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Question Type</span>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                  {questionForReview.type}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Difficulty</span>
                <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full">
                  {questionForReview.difficulty}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Source Document</span>
                <span className="text-sm text-gray-900 dark:text-white">{questionForReview.metadata.sourceDocument}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Created Date</span>
                <span className="text-sm text-gray-900 dark:text-white">{questionForReview.metadata.createdDate}</span>
              </div>
            </div>
          </div>

          {/* Suggested Answer */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Suggested Answer</h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{questionForReview.suggestedAnswer}</p>
          </div>
        </div>

        {/* Right Side - Quality Assessment */}
        <div className="space-y-6">
          {/* Quality Score */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t('review.quality')}</h3>
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="text-5xl font-bold mb-2">{questionForReview.qualityScore}%</div>
            <div className="text-sm opacity-90">AI Confidence: {questionForReview.confidence}%</div>
            <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span>Overall Assessment</span>
                <span className="font-semibold">Excellent</span>
              </div>
            </div>
          </div>

          {/* LO Alignment */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {t('review.alignment')}
            </h3>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {questionForReview.loAlignment}
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Alignment Score</span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">96%</span>
            </div>
          </div>

          {/* Rubric */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Suggested Rubric</h3>
            <div className="space-y-3">
              {questionForReview.rubric.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.criterion}</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{item.points} pts</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="font-semibold text-gray-900 dark:text-white">Total Points</span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {questionForReview.rubric.reduce((sum, item) => sum + item.points, 0)} pts
                </span>
              </div>
            </div>
          </div>

          {/* Revision History */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revision History</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Generated by AI</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">2026-06-12 10:30 AM</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">Quality check passed</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">2026-06-12 10:31 AM</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Review Actions</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors">
                <CheckCircle className="w-5 h-5" />
                {t('review.approve')} Question
              </button>
              <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors">
                <Edit className="w-5 h-5" />
                Request Revision
              </button>
              <button className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors">
                <XCircle className="w-5 h-5" />
                {t('review.reject')} Question
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
