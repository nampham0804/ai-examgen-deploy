import { useApp } from '../context/AppContext';
import { Upload, FileText, Sparkles, Check, Edit, RotateCcw, Save, Loader2, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'motion/react';

const workflowSteps = [
  { id: 1, label: 'Document Upload', icon: Upload },
  { id: 2, label: 'Knowledge Extraction', icon: FileText },
  { id: 3, label: 'LO Understanding', icon: Check },
  { id: 4, label: 'Question Generation', icon: Sparkles },
  { id: 5, label: 'Quality Validation', icon: Check },
];

const generatedQuestions = [
  {
    id: 1,
    question: 'Explain the difference between supervised and unsupervised learning, providing at least two examples of each.',
    type: 'Essay',
    difficulty: 'Medium',
    lo: 'LO4.1',
    confidence: 94,
    explanation: 'This question assesses understanding of fundamental ML concepts as outlined in LO4.1. The difficulty is medium as it requires both explanation and examples.',
  },
  {
    id: 2,
    question: 'Which of the following is NOT a characteristic of a decision tree algorithm?',
    type: 'Multiple Choice',
    difficulty: 'Easy',
    lo: 'LO4.1',
    confidence: 89,
    options: ['Can handle both categorical and numerical data', 'Always produces linear decision boundaries', 'Prone to overfitting', 'Easy to interpret'],
    explanation: 'Tests basic knowledge of decision tree properties. Difficulty rated as easy as it tests recognition rather than application.',
  },
];

export default function AIGeneration() {
  const { t } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setCurrentStep(0);
    setShowResults(false);

    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= workflowSteps.length - 1) {
          clearInterval(interval);
          setIsGenerating(false);
          setShowResults(true);
          return prev;
        }
        return prev + 1;
      });
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('ai.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Leverage AI to generate high-quality questions aligned with learning outcomes</p>
      </div>

      {/* Horizontal AI Workflow */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white mb-6">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          {t('ai.workflow')}
        </h2>

        <div className="flex items-center justify-between">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep && isGenerating;
            const isComplete = index < currentStep || showResults;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <motion.div
                  className={`flex flex-col items-center flex-1 p-4 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-white/20 backdrop-blur-sm' 
                      : ''
                  }`}
                  animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ repeat: isActive ? Infinity : 0, duration: 1.5 }}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                    isComplete ? 'bg-green-500' : isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'
                  }`}>
                    {isComplete ? (
                      <Check className="w-6 h-6" />
                    ) : isActive ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </div>
                  <div className={`text-sm font-medium text-center ${isComplete || isActive ? 'opacity-100' : 'opacity-50'}`}>
                    {step.label}
                  </div>
                </motion.div>
                {index < workflowSteps.length - 1 && (
                  <div className={`h-1 flex-1 mx-2 ${
                    isComplete ? 'bg-green-500' : 'bg-white/20'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-green-500/20 backdrop-blur-sm rounded-lg border border-green-300/30 flex items-center justify-between"
          >
            <div className="flex items-center gap-2 font-semibold">
              <Check className="w-5 h-5" />
              Generation Complete!
            </div>
            <p className="text-sm opacity-90">
              Successfully generated {generatedQuestions.length} questions with an average confidence of 91.5%
            </p>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Panel - Configuration */}
        <div className="lg:col-span-4 space-y-6">
          {/* Course Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('ai.selectCourse')}
            </label>
            <select className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>CS401 - Machine Learning</option>
              <option>CS101 - Intro to CS</option>
              <option>CS201 - Data Structures</option>
            </select>
          </div>

          {/* LO Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('ai.selectLO')}
            </label>
            <select className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>LO4.1 - Supervised Learning</option>
              <option>LO4.2 - Model Evaluation</option>
              <option>LO4.3 - Neural Networks</option>
            </select>
          </div>

          {/* Document Upload */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('ai.uploadDocuments')}
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Drop files or click to upload</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">PDF, DOCX, PPTX, XLSX</p>
            </div>
          </div>

          {/* Text Input */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('ai.textInput')}
            </label>
            <textarea
              placeholder="Paste lecture notes or content here..."
              rows={4}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('ai.questionType')}
              </label>
              <select className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>{t('common.multipleChoice')}</option>
                <option>{t('common.essay')}</option>
                <option>{t('common.trueFalse')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('ai.difficulty')}
              </label>
              <select className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('ai.numQuestions')}
              </label>
              <input
                type="number"
                defaultValue={5}
                min={1}
                max={20}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('ai.processing')}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                {t('ai.generate')}
              </>
            )}
          </button>
        </div>

        {/* Center Panel - AI Workflow has been moved to top */}

        {/* Right Panel - Generated Questions */}
        <div className="lg:col-span-8 space-y-6">
          {/* Knowledge Extraction Summary moved here */}
          {showResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Knowledge Extraction Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Key Concepts Identified</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white mt-1">12</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Coverage of LO4.1</span>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400 mt-1">94%</span>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Document Pages Processed</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white mt-1">45</span>
                </div>
              </div>
            </motion.div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {t('ai.generatedQuestions')}
            </h2>

            {!showResults && (
              <div className="text-center py-12">
                <Sparkles className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Configure settings and click Generate to create questions</p>
              </div>
            )}

            {showResults && (
              <div className="space-y-4">
                {generatedQuestions.map((q, index) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.2 }}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
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
                          <span className="text-xs text-gray-500 dark:text-gray-400">{q.lo}</span>
                        </div>
                        <p className="text-gray-900 dark:text-white font-medium">{q.question}</p>
                        {q.options && (
                          <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                            {q.options.map((opt, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <span className="text-gray-400">{String.fromCharCode(65 + i)}.</span>
                                {opt}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
                        <Sparkles className="w-4 h-4" />
                        {q.confidence}%
                      </div>
                    </div>

                    {/* Explainability Panel */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                      <div className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">AI Explanation</div>
                      <p className="text-xs text-blue-800 dark:text-blue-200">{q.explanation}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors">
                        <Check className="w-4 h-4" />
                        {t('ai.accept')}
                      </button>
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                        {t('ai.edit')}
                      </button>
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg transition-colors">
                        <RotateCcw className="w-4 h-4" />
                        {t('ai.regenerate')}
                      </button>
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors ml-auto">
                        <Save className="w-4 h-4" />
                        {t('ai.saveToBank')}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
