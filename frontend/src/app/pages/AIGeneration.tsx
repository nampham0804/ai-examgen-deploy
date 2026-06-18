import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Check, FileText, Loader2, Sparkles, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  extractDocument,
  generateQuestions,
  listCourses,
  listLearningOutcomes,
  listQuestions,
  uploadDocument,
} from '../api/tv2';
import type { Course, DocumentExtract, DocumentUpload, GeneratedQuestion, LearningOutcome } from '../api/tv2';

const workflowSteps = [
  { id: 1, label: 'Document Upload', icon: Upload },
  { id: 2, label: 'Knowledge Extraction', icon: FileText },
  { id: 3, label: 'LO Understanding', icon: Check },
  { id: 4, label: 'Question Generation', icon: Sparkles },
  { id: 5, label: 'Pending Review', icon: Check },
];

type QuestionType = 'mcq' | 'essay';
type Difficulty = 'easy' | 'medium' | 'hard';

export default function AIGeneration() {
  const { t } = useApp();
  const [courses, setCourses] = useState<Course[]>([]);
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedLearningOutcomeId, setSelectedLearningOutcomeId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentUpload, setDocumentUpload] = useState<DocumentUpload | null>(null);
  const [documentExtract, setDocumentExtract] = useState<DocumentExtract | null>(null);
  const [topic, setTopic] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('mcq');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [numQuestions, setNumQuestions] = useState(1);
  const [topK, setTopK] = useState(3);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<GeneratedQuestion[]>([]);
  const [lastSourceChunkIds, setLastSourceChunkIds] = useState<number[]>([]);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState({
    courses: false,
    learningOutcomes: false,
    upload: false,
    extract: false,
    generate: false,
    questions: false,
  });

  useEffect(() => {
    let isMounted = true;
    setLoading((prev) => ({ ...prev, courses: true }));
    listCourses()
      .then((data) => {
        if (!isMounted) return;
        setCourses(data);
        if (data.length > 0) setSelectedCourseId(String(data[0].id));
      })
      .catch((error) => setErrorMessage(error.message))
      .finally(() => {
        if (isMounted) setLoading((prev) => ({ ...prev, courses: false }));
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedCourseId) {
      setLearningOutcomes([]);
      setSelectedLearningOutcomeId('');
      return;
    }

    let isMounted = true;
    setLoading((prev) => ({ ...prev, learningOutcomes: true }));
    setLearningOutcomes([]);
    setSelectedLearningOutcomeId('');
    listLearningOutcomes(Number(selectedCourseId))
      .then((data) => {
        if (!isMounted) return;
        setLearningOutcomes(data);
        if (data.length > 0) setSelectedLearningOutcomeId(String(data[0].id));
      })
      .catch((error) => setErrorMessage(error.message))
      .finally(() => {
        if (isMounted) setLoading((prev) => ({ ...prev, learningOutcomes: false }));
      });
    return () => {
      isMounted = false;
    };
  }, [selectedCourseId]);

  const currentStep = useMemo(() => {
    if (pendingQuestions.length > 0) return 4;
    if (loading.generate) return 3;
    if (documentExtract?.status === 'processed') return 2;
    if (loading.extract) return 1;
    if (documentUpload) return 1;
    if (loading.upload) return 0;
    return 0;
  }, [documentExtract, documentUpload, loading.extract, loading.generate, loading.upload, pendingQuestions.length]);

  const canUpload = Boolean(selectedCourseId && selectedFile) && !loading.upload;
  const canExtract = Boolean(documentUpload?.id) && !loading.extract && documentExtract?.status !== 'processed';
  const canGenerate =
    Boolean(documentUpload?.id && selectedLearningOutcomeId && documentExtract?.status === 'processed' && documentExtract.chunk_count > 0) &&
    !loading.generate;

  const resetDocumentState = () => {
    setDocumentUpload(null);
    setDocumentExtract(null);
    setGeneratedQuestions([]);
    setPendingQuestions([]);
    setLastSourceChunkIds([]);
    setGeneratedCount(0);
    setSuccessMessage('');
    setWarningMessage('');
    setErrorMessage('');
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedCourseId) return;
    setErrorMessage('');
    setSuccessMessage('');
    setWarningMessage('');
    setLoading((prev) => ({ ...prev, upload: true }));
    try {
      const uploaded = await uploadDocument(selectedFile, Number(selectedCourseId));
      setDocumentUpload(uploaded);
      setDocumentExtract(null);
      setGeneratedQuestions([]);
      setPendingQuestions([]);
      setSuccessMessage(`Uploaded document_id=${uploaded.id}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setLoading((prev) => ({ ...prev, upload: false }));
    }
  };

  const handleExtract = async () => {
    if (!documentUpload) return;
    setErrorMessage('');
    setSuccessMessage('');
    setLoading((prev) => ({ ...prev, extract: true }));
    try {
      const extracted = await extractDocument(documentUpload.id);
      setDocumentExtract(extracted);
      setSuccessMessage(`Processed document_id=${extracted.id}; chunk_count=${extracted.chunk_count}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Extract/chunk failed');
    } finally {
      setLoading((prev) => ({ ...prev, extract: false }));
    }
  };

  const handleGenerate = async () => {
    if (!documentUpload || !selectedLearningOutcomeId) return;
    setErrorMessage('');
    setWarningMessage('');
    setSuccessMessage('');
    setLoading((prev) => ({ ...prev, generate: true }));
    try {
      const result = await generateQuestions({
        document_id: documentUpload.id,
        learning_outcome_id: Number(selectedLearningOutcomeId),
        question_type: questionType,
        difficulty,
        num_questions: numQuestions,
        topic: topic.trim() || null,
        top_k: topK,
        diversity_mode: true,
      });
      setGeneratedQuestions(result.questions);
      setLastSourceChunkIds(result.source_chunk_ids);
      setGeneratedCount(result.generated);
      setSuccessMessage(`Generated ${result.generated} question(s); source_chunk_ids=${formatIds(result.source_chunk_ids)}`);
      if (result.warnings.length > 0) setWarningMessage(result.warnings.join('; '));
      await refreshPendingQuestions(documentUpload.id, true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Question generation failed');
    } finally {
      setLoading((prev) => ({ ...prev, generate: false }));
    }
  };

  const refreshPendingQuestions = async (documentId: number, warnOnly = false) => {
    setLoading((prev) => ({ ...prev, questions: true }));
    try {
      const result = await listQuestions({ document_id: documentId, status: 'pending_review', limit: 100 });
      setPendingQuestions(result.items);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load saved pending_review questions';
      if (warnOnly) setWarningMessage(`Generated questions are shown, but saved-question loading failed: ${message}`);
      else setErrorMessage(message);
    } finally {
      setLoading((prev) => ({ ...prev, questions: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('ai.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Generate questions from uploaded materials and save them as pending_review for TV1 review.
        </p>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white mb-6">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          {t('ai.workflow')}
        </h2>

        <div className="flex items-center justify-between">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive =
              index === currentStep && (loading.upload || loading.extract || loading.generate || loading.questions);
            const isComplete = index < currentStep || (index === 4 && pendingQuestions.length > 0);

            return (
              <div key={step.id} className="flex items-center flex-1">
                <motion.div
                  className={`flex flex-col items-center flex-1 p-4 rounded-lg transition-all ${
                    isActive ? 'bg-white/20 backdrop-blur-sm' : ''
                  }`}
                  animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                  transition={{ repeat: isActive ? Infinity : 0, duration: 1.5 }}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                      isComplete ? 'bg-green-500' : isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50'
                    }`}
                  >
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
                  <div className={`h-1 flex-1 mx-2 ${isComplete ? 'bg-green-500' : 'bg-white/20'}`} />
                )}
              </div>
            );
          })}
        </div>

        {pendingQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-green-500/20 backdrop-blur-sm rounded-lg border border-green-300/30 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-2 font-semibold">
              <Check className="w-5 h-5" />
              Generation Complete
            </div>
            <p className="text-sm opacity-90">
              generated={generatedCount}; pending_review={pendingQuestions.length}; source_chunk_ids={formatIds(lastSourceChunkIds)}
            </p>
          </motion.div>
        )}
      </div>

      {(errorMessage || successMessage || warningMessage) && (
        <div className="space-y-2">
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
              {errorMessage}
            </div>
          )}
          {warningMessage && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
              {warningMessage}
            </div>
          )}
          {successMessage && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300">
              {successMessage}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('ai.selectCourse')}</label>
            <select
              value={selectedCourseId}
              onChange={(event) => {
                setSelectedCourseId(event.target.value);
                resetDocumentState();
              }}
              disabled={loading.courses}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            >
              <option value="">{loading.courses ? 'Loading courses...' : 'Select a course'}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
            {selectedCourseId && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">course_id={selectedCourseId}</p>}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('ai.selectLO')}</label>
            <select
              value={selectedLearningOutcomeId}
              onChange={(event) => setSelectedLearningOutcomeId(event.target.value)}
              disabled={!selectedCourseId || loading.learningOutcomes}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            >
              <option value="">{loading.learningOutcomes ? 'Loading learning outcomes...' : 'Select a learning outcome'}</option>
              {learningOutcomes.map((learningOutcome) => (
                <option key={learningOutcome.id} value={learningOutcome.id}>
                  {learningOutcome.code} - {learningOutcome.description}
                </option>
              ))}
            </select>
            {selectedLearningOutcomeId && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">learning_outcome_id={selectedLearningOutcomeId}</p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('ai.uploadDocuments')}</label>
            <label className="block border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">{selectedFile ? selectedFile.name : 'Click to choose a file'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">PDF or DOCX, max 15 MB</p>
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] ?? null);
                  resetDocumentState();
                }}
                className="sr-only"
              />
            </label>
            <button
              onClick={handleUpload}
              disabled={!canUpload}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading.upload ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload Document
            </button>
            {documentUpload && (
              <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p>document_id={documentUpload.id}</p>
                <p>status={documentUpload.status}</p>
                <p>page_count={documentUpload.page_count ?? 'n/a'}</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Extract & Chunk</h3>
                <p className="text-xs text-gray-500 dark:text-gray-500">Required before generation.</p>
              </div>
              <button
                onClick={handleExtract}
                disabled={!canExtract}
                className="flex items-center gap-2 px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading.extract ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Extract
              </button>
            </div>
            {documentExtract && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Metric label="status" value={documentExtract.status} />
                <Metric label="text_length" value={String(documentExtract.text_length)} />
                <Metric label="chunk_count" value={String(documentExtract.chunk_count)} />
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Topic (optional)</label>
            <textarea
              placeholder="Example: DBMS concepts"
              rows={3}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('ai.questionType')}</label>
              <select
                value={questionType}
                onChange={(event) => setQuestionType(event.target.value as QuestionType)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="mcq">{t('common.multipleChoice')}</option>
                <option value="essay">{t('common.essay')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('ai.difficulty')}</label>
              <select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value as Difficulty)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('ai.numQuestions')}</label>
                <input
                  type="number"
                  value={numQuestions}
                  min={1}
                  max={20}
                  onChange={(event) => setNumQuestions(Number(event.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">top_k</label>
                <input
                  type="number"
                  value={topK}
                  min={1}
                  max={10}
                  onChange={(event) => setTopK(Number(event.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading.generate ? (
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

        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Document Processing Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <Metric label="document_id" value={documentUpload ? String(documentUpload.id) : '-'} />
              <Metric label="chunk_count" value={documentExtract ? String(documentExtract.chunk_count) : '-'} />
              <Metric label="pending_review" value={String(pendingQuestions.length)} />
            </div>
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Generated questions are based only on uploaded materials and retrieved chunks.
            </p>
          </div>

          <QuestionPanel
            title="Generated Questions From Latest Request"
            questions={generatedQuestions}
            emptyText="Generate questions to see the latest API response."
            loading={loading.generate}
          />

          <QuestionPanel
            title="Saved pending_review Questions"
            questions={pendingQuestions}
            emptyText="Saved pending_review questions will appear after generation."
            loading={loading.questions}
          />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg min-w-0">
      <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-full">{label}</span>
      <span className="text-lg font-bold text-gray-900 dark:text-white mt-1 truncate max-w-full">{value}</span>
    </div>
  );
}

function QuestionPanel({
  title,
  questions,
  emptyText,
  loading,
}: {
  title: string;
  questions: GeneratedQuestion[];
  emptyText: string;
  loading: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h2>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading questions...
        </div>
      )}

      {!loading && questions.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{emptyText}</p>
        </div>
      )}

      {!loading && questions.length > 0 && (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyBadge(question.difficulty)}`}>
                      {question.difficulty}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                      {question.question_type}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {question.status}
                    </span>
                  </div>
                  <p className="text-gray-900 dark:text-white font-medium">{question.question_text}</p>
                  {question.options && question.options.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                      {question.options.map((option) => (
                        <li key={option.label} className="flex gap-2">
                          <span className="text-gray-400">{option.label}.</span>
                          <span>{option.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {question.correct_answer && (
                    <p className="mt-2 text-sm text-green-700 dark:text-green-400">correct_answer={question.correct_answer}</p>
                  )}
                  {question.suggested_answer && (
                    <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-semibold">Suggested answer: </span>
                      {question.suggested_answer}
                    </div>
                  )}
                  {question.grading_rubric && (
                    <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-semibold">Grading rubric: </span>
                      {question.grading_rubric}
                    </div>
                  )}
                </div>
                <div className="text-right text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                  <div>question_id={question.id}</div>
                  <div>LO={question.learning_outcome_id}</div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                <div className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">Source and explanation</div>
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  source_chunk_ids={formatIds(question.source_chunk_ids ?? [])}
                </p>
                {question.explanation && <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">{question.explanation}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function difficultyBadge(difficulty: string): string {
  if (difficulty === 'easy') return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
  if (difficulty === 'medium') return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
  return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
}

function formatIds(ids: number[]): string {
  if (ids.length === 0) return '[]';
  return `[${ids.join(', ')}]`;
}
