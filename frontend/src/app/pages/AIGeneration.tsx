import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Check, FileText, Loader2, Sparkles, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  extractDocument,
  generateQuestions,
  listDocumentChunks,
  listDocuments,
  listCourses,
  listLearningOutcomes,
  listQuestions,
  uploadDocument,
} from '../api/tv2';
import type {
  Course,
  DocumentChunk,
  DocumentExtract,
  DocumentUpload,
  ExistingDocument,
  GeneratedQuestion,
  LearningOutcome,
} from '../api/tv2';

const workflowStepsKeys = [
  { id: 1, labelKey: 'ai.step1', icon: Upload },
  { id: 2, labelKey: 'ai.step2', icon: FileText },
  { id: 3, labelKey: 'ai.step3', icon: Check },
  { id: 4, labelKey: 'ai.step4', icon: Sparkles },
  { id: 5, labelKey: 'ai.step5', icon: Check },
];

type QuestionType = 'mcq' | 'essay';
type Difficulty = 'easy' | 'medium' | 'hard';
type DocumentStatus = 'not_uploaded' | 'uploaded' | 'processing' | 'processed' | 'failed';
type ActiveDocument = {
  id: number;
  course_id: number;
  file_name: string;
  document_type: string;
  status: DocumentStatus;
  page_count?: number | null;
  text_length?: number | null;
  chunk_count: number;
  created_at?: string;
  source: 'session' | 'history';
};

export default function AIGeneration() {
  const { t } = useApp();

  const workflowSteps = useMemo(() => workflowStepsKeys.map(step => ({
    ...step,
    label: t(step.labelKey)
  })), [t]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedLearningOutcomeId, setSelectedLearningOutcomeId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [existingDocuments, setExistingDocuments] = useState<ExistingDocument[]>([]);
  const [activeDocument, setActiveDocument] = useState<ActiveDocument | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<ActiveDocument[]>([]);
  const [documentExtract, setDocumentExtract] = useState<DocumentExtract | null>(null);
  const [documentChunks, setDocumentChunks] = useState<DocumentChunk[]>([]);
  const [topic, setTopic] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>('mcq');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [numQuestions, setNumQuestions] = useState(3);
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
    documents: false,
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

  useEffect(() => {
    if (!selectedCourseId) {
      setExistingDocuments([]);
      return;
    }

    loadExistingDocuments(Number(selectedCourseId));
  }, [selectedCourseId]);

  const loadExistingDocuments = async (courseId: number) => {
    setLoading((prev) => ({ ...prev, documents: true }));
    try {
      const result = await listDocuments({ course_id: courseId, limit: 100 });
      setExistingDocuments(result.items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load existing documents');
    } finally {
      setLoading((prev) => ({ ...prev, documents: false }));
    }
  };

  const currentStep = useMemo(() => {
    if (pendingQuestions.length > 0) return 4;
    if (loading.generate) return 3;
    if (documentExtract?.status === 'processed') return 2;
    if (loading.extract) return 1;
    if (activeDocument) return 1;
    if (loading.upload) return 0;
    return 0;
  }, [activeDocument, documentExtract, loading.extract, loading.generate, loading.upload, pendingQuestions.length]);

  const documentChunksById = useMemo(() => new Map(documentChunks.map((chunk) => [chunk.id, chunk])), [documentChunks]);
  const selectedProcessedDocuments = useMemo(
    () => selectedDocuments.filter((document) => document.status === 'processed' && document.chunk_count > 0),
    [selectedDocuments],
  );
  const eligibleExistingDocuments = useMemo(
    () => existingDocuments.filter((document) => document.status === 'processed' && document.chunk_count > 0),
    [existingDocuments],
  );
  const allEligibleExistingSelected = useMemo(
    () =>
      eligibleExistingDocuments.length > 0 &&
      eligibleExistingDocuments.every((document) => selectedDocuments.some((selected) => selected.id === document.id)),
    [eligibleExistingDocuments, selectedDocuments],
  );
  const activeDocumentsById = useMemo(
    () => new Map(selectedDocuments.map((document) => [document.id, document])),
    [selectedDocuments],
  );
  const canUpload = Boolean(selectedCourseId && selectedFile) && !loading.upload;
  const canExtract =
    Boolean(activeDocument?.id) && !loading.extract && activeDocument?.status !== 'processed' && activeDocument?.status !== 'processing';
  const canGenerate =
    Boolean(
      selectedProcessedDocuments.length > 0 &&
        selectedLearningOutcomeId &&
        numQuestions >= 1 &&
        numQuestions <= 5,
    ) &&
    !loading.generate;
  const documentStatus = getDocumentStatus(activeDocument, documentExtract, loading.extract, errorMessage);
  const uploadDisabledReason = getUploadDisabledReason(selectedCourseId, selectedFile, loading.upload);
  const extractDisabledReason = getExtractDisabledReason(activeDocument, loading.extract);
  const generateDisabledReason = getGenerateDisabledReason(
    selectedCourseId,
    selectedLearningOutcomeId,
    selectedProcessedDocuments,
    loading.generate,
  );

  const resetDocumentState = () => {
    setActiveDocument(null);
    setSelectedDocuments([]);
    setDocumentExtract(null);
    setDocumentChunks([]);
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
      const uploadedDocument = documentUploadToActive(uploaded);
      const nextSelection = upsertDocument(selectedDocuments, uploadedDocument);
      setActiveDocument(uploadedDocument);
      setSelectedDocuments(nextSelection);
      setDocumentExtract(null);
      setGeneratedQuestions([]);
      setSuccessMessage(`Upload successful: document_id=${uploaded.id}, status=${uploaded.status}`);
      await loadDocumentChunksForDocuments(nextSelection, true);
      await refreshPendingQuestions(nextSelection.map((document) => document.id), true);
      await loadExistingDocuments(Number(selectedCourseId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setLoading((prev) => ({ ...prev, upload: false }));
    }
  };

  const handleExtract = async () => {
    if (!activeDocument) return;
    setErrorMessage('');
    setSuccessMessage('');
    setLoading((prev) => ({ ...prev, extract: true }));
    try {
      const extracted = await extractDocument(activeDocument.id);
      const updatedDocument = {
        ...activeDocument,
        status: 'processed' as DocumentStatus,
        text_length: extracted.text_length,
        chunk_count: extracted.chunk_count,
      };
      setDocumentExtract(extracted);
      setActiveDocument(updatedDocument);
      setSelectedDocuments((current) => upsertDocument(current, updatedDocument));
      setSuccessMessage(
        `Extract successful: document_id=${extracted.id}, text_length=${extracted.text_length}, chunk_count=${extracted.chunk_count}`,
      );
      await loadDocumentChunksForDocuments(upsertDocument(selectedDocuments, updatedDocument), true);
      if (selectedCourseId) await loadExistingDocuments(Number(selectedCourseId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Extract/chunk failed');
    } finally {
      setLoading((prev) => ({ ...prev, extract: false }));
    }
  };

  const handleGenerate = async () => {
    if (selectedProcessedDocuments.length === 0 || !selectedLearningOutcomeId) return;
    setErrorMessage('');
    setWarningMessage('');
    setSuccessMessage('');
    setLoading((prev) => ({ ...prev, generate: true }));
    try {
      const documentIds = selectedProcessedDocuments.map((document) => document.id);
      const documentPayload = documentIds.length === 1 ? { document_id: documentIds[0] } : { document_ids: documentIds };
      const result = await generateQuestions({
        ...documentPayload,
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
      setSuccessMessage(`Generation successful: generated=${result.generated}, source chunks=${result.source_chunk_ids.length}`);
      if (result.warnings.length > 0) setWarningMessage(result.warnings.join('; '));
      await refreshPendingQuestions(documentIds, true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Question generation failed');
    } finally {
      setLoading((prev) => ({ ...prev, generate: false }));
    }
  };

  const refreshPendingQuestions = async (documentIds: number[], warnOnly = false) => {
    if (documentIds.length === 0) {
      setPendingQuestions([]);
      return;
    }
    setLoading((prev) => ({ ...prev, questions: true }));
    try {
      const results = await Promise.all(
        documentIds.map((documentId) => listQuestions({ document_id: documentId, status: 'pending_review', limit: 100 })),
      );
      const questions = results.flatMap((result) => result.items);
      setPendingQuestions(uniqueQuestions(questions));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load saved pending_review questions';
      if (warnOnly) setWarningMessage(`Generated questions are shown, but saved-question loading failed: ${message}`);
      else setErrorMessage(message);
    } finally {
      setLoading((prev) => ({ ...prev, questions: false }));
    }
  };

  const loadDocumentChunksForDocuments = async (documents: ActiveDocument[], warnOnly = false) => {
    const processedDocuments = documents.filter((document) => document.status === 'processed' && document.chunk_count > 0);
    if (processedDocuments.length === 0) {
      setDocumentChunks([]);
      return;
    }
    try {
      const chunkGroups = await Promise.all(processedDocuments.map((document) => listDocumentChunks(document.id)));
      setDocumentChunks(chunkGroups.flat());
    } catch (error) {
      setDocumentChunks([]);
      const message = error instanceof Error ? error.message : 'Could not load source chunk previews';
      if (warnOnly) setWarningMessage(message);
      else setErrorMessage(message);
    }
  };

  const handleSelectExistingDocument = async (document: ExistingDocument) => {
    setErrorMessage('');
    setSuccessMessage('');
    setWarningMessage('');
    const selectedDocument = existingDocumentToActive(document);
    const isAlreadySelected = selectedDocuments.some((item) => item.id === document.id);
    const nextSelection = isAlreadySelected
      ? selectedDocuments.filter((item) => item.id !== document.id)
      : upsertDocument(selectedDocuments, selectedDocument);
    const nextActiveDocument = isAlreadySelected
      ? (activeDocument?.id === document.id ? (nextSelection[0] ?? null) : activeDocument)
      : selectedDocument;
    setDocumentExtract(nextActiveDocument?.status === 'processed' ? existingDocumentToExtract(nextActiveDocument) : null);
    setGeneratedQuestions([]);
    setLastSourceChunkIds([]);
    setGeneratedCount(0);
    setSelectedDocuments(nextSelection);
    setActiveDocument(nextActiveDocument);
    setSuccessMessage(
      isAlreadySelected
        ? `Deselected document_id=${document.id}`
        : `Selected existing document_id=${document.id}, status=${document.status}`,
    );
    await loadDocumentChunksForDocuments(nextSelection, true);
    await refreshPendingQuestions(nextSelection.map((item) => item.id), true);
  };

  const handleRemoveSelectedDocument = async (documentId: number) => {
    const nextSelection = selectedDocuments.filter((document) => document.id !== documentId);
    const nextActiveDocument = activeDocument?.id === documentId ? (nextSelection[0] ?? null) : activeDocument;
    setSelectedDocuments(nextSelection);
    setActiveDocument(nextActiveDocument);
    setDocumentExtract(nextActiveDocument?.status === 'processed' ? existingDocumentToExtract(nextActiveDocument) : null);
    setGeneratedQuestions([]);
    setLastSourceChunkIds([]);
    setGeneratedCount(0);
    await loadDocumentChunksForDocuments(nextSelection, true);
    await refreshPendingQuestions(nextSelection.map((document) => document.id), true);
  };

  const handleSelectAllEligibleDocuments = async () => {
    if (eligibleExistingDocuments.length === 0 || allEligibleExistingSelected) return;
    const nextSelection = eligibleExistingDocuments.reduce(
      (current, document) => upsertDocument(current, existingDocumentToActive(document)),
      selectedDocuments,
    );
    setErrorMessage('');
    setWarningMessage('');
    setSuccessMessage(`Selected ${eligibleExistingDocuments.length} processed document(s)`);
    setSelectedDocuments(nextSelection);
    setGeneratedQuestions([]);
    setLastSourceChunkIds([]);
    setGeneratedCount(0);
    await loadDocumentChunksForDocuments(nextSelection, true);
    await refreshPendingQuestions(nextSelection.map((document) => document.id), true);
  };

  const handleClearSelectedDocuments = async () => {
    setSelectedDocuments([]);
    setDocumentChunks([]);
    setGeneratedQuestions([]);
    setPendingQuestions([]);
    setLastSourceChunkIds([]);
    setGeneratedCount(0);
    setSuccessMessage('Cleared selected documents');
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
              generated={generatedCount}; pending_review={pendingQuestions.length}; source chunks={lastSourceChunkIds.length}
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
                setExistingDocuments([]);
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
            {!loading.courses && courses.length === 0 && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{t('ai.noCourses')}</p>
            )}
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
            {selectedCourseId && !loading.learningOutcomes && learningOutcomes.length === 0 && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{t('ai.noLOs')}</p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('ai.uploadDocuments')}</label>
            <label className="block border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">{selectedFile ? selectedFile.name : t('ai.clickToChoose')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{t('ai.fileHint')}</p>
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] ?? null);
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
            {!canUpload && uploadDisabledReason && <DisabledReason>{uploadDisabledReason}</DisabledReason>}
            {activeDocument && (
              <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p>active_document_id={activeDocument.id}</p>
                <p>source={activeDocument.source === 'session' ? t('ai.sourceSession') : t('ai.sourceHistory')}</p>
                <p>status={activeDocument.status}</p>
                <p>page_count={activeDocument.page_count ?? 'n/a'}</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Existing Documents</h3>
                <p className="text-xs text-gray-500 dark:text-gray-500">{t('ai.reuseMaterials')}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllEligibleDocuments}
                  disabled={eligibleExistingDocuments.length === 0 || allEligibleExistingSelected}
                  className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={handleClearSelectedDocuments}
                  disabled={selectedDocuments.length === 0}
                  className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Clear all
                </button>
                {loading.documents && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
              </div>
            </div>

            {!selectedCourseId && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('ai.selectCourseLoad')}</p>
            )}

            {selectedCourseId && !loading.documents && existingDocuments.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('ai.noDocuments')}</p>
            )}

            {existingDocuments.length > 0 && (
              <div className="space-y-2">
                {existingDocuments.map((document) => {
                  const isSelected = selectedDocuments.some((item) => item.id === document.id);
                  return (
                    <label
                      key={document.id}
                      className={`block w-full cursor-pointer rounded-lg border p-3 text-left transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                          : 'border-gray-200 bg-gray-50 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-700/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectExistingDocument(document)}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{document.file_name}</p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              document_id={document.id}; type={document.document_type}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge tone={statusTone(document.status)}>{document.status}</Badge>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span>pages={document.page_count ?? 'n/a'}</span>
                        <span>text={document.text_length ? formatNumber(document.text_length) : '-'}</span>
                        <span>chunks={document.chunk_count}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {selectedDocuments.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Selected Documents</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    selected={selectedDocuments.length}; processed={selectedProcessedDocuments.length}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelectedDocuments}
                  className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Clear all
                </button>
              </div>
              <div className="space-y-2">
                {selectedDocuments.map((document) => (
                  <div key={document.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/40">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{document.file_name}</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          document_id={document.id}; chunks={document.chunk_count}; status={document.status}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSelectedDocument(document.id)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/20"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Extract & Chunk</h3>
                <p className="text-xs text-gray-500 dark:text-gray-500">{t('ai.requiredBeforeGen')}</p>
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
            {!canExtract && extractDisabledReason && <DisabledReason>{extractDisabledReason}</DisabledReason>}
            {documentExtract && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Metric label="status" value={documentExtract.status} />
                <Metric label="text_length" value={String(documentExtract.text_length)} />
                <Metric label="chunk_count" value={String(documentExtract.chunk_count)} />
              </div>
            )}
            {!activeDocument && (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{t('ai.uploadBeforeExtract')}</p>
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
                  max={5}
                  onChange={(event) => setNumQuestions(clampQuestionCount(Number(event.target.value)))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('ai.allowedRange')}</p>
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
          {!canGenerate && generateDisabledReason && <DisabledReason>{generateDisabledReason}</DisabledReason>}
        </div>

        <div className="lg:col-span-8 space-y-6">
          <DocumentSummary
            activeDocument={activeDocument}
            documentExtract={documentExtract}
            documentStatus={documentStatus}
            pendingCount={pendingQuestions.length}
            nextAction={getNextActionMessage({
              selectedCourseId,
              selectedLearningOutcomeId,
              activeDocument,
              documentExtract,
              documentStatus,
            })}
          />

          <QuestionPanel
            title="Generated Questions From Latest Request"
            questions={generatedQuestions}
            emptyText="Generate questions to see the latest API response."
            loading={loading.generate}
            activeDocumentsById={activeDocumentsById}
            documentChunksById={documentChunksById}
          />

          <QuestionPanel
            title="Saved pending_review Questions"
            questions={pendingQuestions}
            emptyText="Saved pending_review questions will appear after generation."
            loading={loading.questions}
            activeDocumentsById={activeDocumentsById}
            documentChunksById={documentChunksById}
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

function DocumentSummary({
  activeDocument,
  documentExtract,
  documentStatus,
  pendingCount,
  nextAction,
}: {
  activeDocument: ActiveDocument | null;
  documentExtract: DocumentExtract | null;
  documentStatus: DocumentStatus;
  pendingCount: number;
  nextAction: string;
}) {
  const { t } = useApp();
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Document Processing Summary</h3>
        <StatusBadge status={documentStatus} />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        <Metric label="document_id" value={activeDocument ? String(activeDocument.id) : '-'} />
        <Metric label="status" value={documentStatus.replace('_', ' ')} />
        <Metric label="page_count" value={activeDocument?.page_count != null ? String(activeDocument.page_count) : 'n/a'} />
        <Metric
          label="text_length"
          value={activeDocument?.text_length != null ? formatNumber(activeDocument.text_length) : documentExtract ? formatNumber(documentExtract.text_length) : '-'}
        />
        <Metric label="chunk_count" value={activeDocument ? String(activeDocument.chunk_count) : documentExtract ? String(documentExtract.chunk_count) : '-'} />
        <Metric label="pending_review" value={String(pendingCount)} />
      </div>

      {activeDocument && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <Badge tone={activeDocument.source === 'session' ? 'green' : 'blue'}>
            {activeDocument.source === 'session' ? t('ai.sourceSession') : t('ai.sourceHistory')}
          </Badge>
          <span className="truncate">file_name={activeDocument.file_name}</span>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200">
        <p className="font-medium">{t('ai.nextStep')}</p>
        <p className="mt-1">{nextAction}</p>
      </div>

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Generated questions are based only on uploaded materials and retrieved chunks.
      </p>
    </div>
  );
}

function QuestionPanel({
  title,
  questions,
  emptyText,
  loading,
  activeDocumentsById,
  documentChunksById,
}: {
  title: string;
  questions: GeneratedQuestion[];
  emptyText: string;
  loading: boolean;
  activeDocumentsById: Map<number, ActiveDocument>;
  documentChunksById: Map<number, DocumentChunk>;
}) {
  const { t } = useApp();
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
        {!loading && <Badge tone="gray">count={questions.length}</Badge>}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading questions...
        </div>
      )}

      {!loading && questions.length === 0 && (
        <EmptyState text={emptyText} />
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
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue">{question.question_type}</Badge>
                <Badge tone={difficultyTone(question.difficulty)}>{question.difficulty}</Badge>
                <Badge tone={question.status === 'pending_review' ? 'amber' : 'gray'}>{question.status}</Badge>
                <Badge tone="gray">question_id={question.id}</Badge>
                <Badge tone="gray">learning_outcome_id={question.learning_outcome_id}</Badge>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Question</div>
                <p className="mt-1 text-base font-medium leading-relaxed text-gray-900 dark:text-white">{question.question_text}</p>
              </div>

              {question.question_type === 'mcq' ? <McqDetails question={question} /> : <EssayDetails question={question} />}

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
                  Source chunks
                </div>
                <SourceEvidence
                  ids={question.source_chunk_ids ?? []}
                  activeDocumentsById={activeDocumentsById}
                  documentChunksById={documentChunksById}
                />
                {question.explanation && (
                  <div className="mt-3 border-t border-blue-200 pt-3 text-sm leading-relaxed text-blue-900 dark:border-blue-800 dark:text-blue-200">
                    <span className="font-semibold">Explanation: </span>
                    {question.explanation}
                  </div>
                )}
                {!question.explanation && (
                  <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{t('ai.noExplanation')}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function McqDetails({ question }: { question: GeneratedQuestion }) {
  const { t } = useApp();
  const hasOptions = question.options && question.options.length > 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/40">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Options</div>
      {hasOptions ? (
        <ul className="space-y-2 text-sm text-gray-800 dark:text-gray-200">
          {question.options?.map((option, index) => (
            <li key={`${option.label || option.key}-${index}`} className="flex gap-3 rounded-md bg-white px-3 py-2 dark:bg-gray-800">
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {option.label || option.key || String.fromCharCode(65 + index)}.
              </span>
              <span>{option.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-amber-700 dark:text-amber-300">{t('ai.mcqMissing')}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Correct answer</span>
        {question.correct_answer ? <Badge tone="green">{question.correct_answer}</Badge> : <Badge tone="amber">missing</Badge>}
      </div>
    </div>
  );
}

function EssayDetails({ question }: { question: GeneratedQuestion }) {
  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/40">
      <TextBlock label="Suggested answer" value={question.suggested_answer} />
      <TextBlock label="Grading rubric" value={question.grading_rubric} />
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value?: string | null }) {
  const { t } = useApp();
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
      {value ? (
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200">{value}</p>
      ) : (
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">{t('ai.notProvided')}</p>
      )}
    </div>
  );
}

function SourceEvidence({
  ids,
  activeDocumentsById,
  documentChunksById,
}: {
  ids: number[];
  activeDocumentsById: Map<number, ActiveDocument>;
  documentChunksById: Map<number, DocumentChunk>;
}) {
  const { t } = useApp();
  if (ids.length === 0) return <Badge tone="amber">No source evidence returned</Badge>;
  const groups = groupSourceEvidence(ids, documentChunksById);

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const sourceDocument = group.documentId === null ? null : activeDocumentsById.get(group.documentId);
        return (
          <div key={group.documentId ?? 'unknown'} className="rounded-md border border-blue-200 bg-white p-3 dark:border-blue-800 dark:bg-gray-800">
            <div className="mb-2">
              <p className="truncate text-sm font-semibold text-blue-950 dark:text-blue-100">
                {sourceDocument?.file_name ?? 'Unknown source document'}
              </p>
            </div>
            <div className="space-y-2">
              {group.items.map(({ id, chunk }) => (
                <div key={id} className="rounded border border-blue-100 bg-blue-50/70 p-2 dark:border-blue-900/60 dark:bg-blue-950/30">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">Chunk #{chunk ? chunk.chunk_index : id}</Badge>
                  </div>
                  {chunk?.title && (
                    <p className="mt-2 text-xs font-medium text-blue-900 dark:text-blue-100">{chunk.title}</p>
                  )}
                  {chunk?.section_path && (
                    <p className="mt-2 text-xs text-blue-800 dark:text-blue-200">{t('ai.section')}: {chunk.section_path}</p>
                  )}
                  <p className="mt-2 text-sm leading-relaxed text-blue-900 dark:text-blue-100">
                    {chunk?.text ? previewText(chunk.text) : 'Source preview is unavailable for this chunk.'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center dark:border-gray-700">
      <Sparkles className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
      <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>
    </div>
  );
}

function DisabledReason({ children }: { children: string }) {
  return <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{children}</p>;
}

function StatusBadge({ status }: { status: DocumentStatus }) {
  const labels: Record<DocumentStatus, string> = {
    not_uploaded: 'No document',
    uploaded: 'Uploaded',
    processing: 'Processing',
    processed: 'Processed',
    failed: 'Failed',
  };
  return <Badge tone={statusTone(status)}>{labels[status]}</Badge>;
}

function Badge({ children, tone }: { children: string | number; tone: 'blue' | 'green' | 'amber' | 'red' | 'gray' }) {
  return <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${badgeTone(tone)}`}>{children}</span>;
}

function badgeTone(tone: 'blue' | 'green' | 'amber' | 'red' | 'gray'): string {
  if (tone === 'blue') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  if (tone === 'green') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  if (tone === 'amber') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  if (tone === 'red') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
}

function difficultyTone(difficulty: string): 'green' | 'amber' | 'red' {
  if (difficulty === 'easy') return 'green';
  if (difficulty === 'medium') return 'amber';
  return 'red';
}

function statusTone(status: DocumentStatus): 'green' | 'amber' | 'red' | 'gray' | 'blue' {
  if (status === 'processed') return 'green';
  if (status === 'uploaded') return 'blue';
  if (status === 'processing') return 'amber';
  if (status === 'failed') return 'red';
  return 'gray';
}

function getDocumentStatus(
  activeDocument: ActiveDocument | null,
  documentExtract: DocumentExtract | null,
  isExtracting: boolean,
  errorMessage: string,
): DocumentStatus {
  if (isExtracting) return 'processing';
  if (documentExtract?.status === 'processed') return 'processed';
  if (documentExtract?.status === 'failed') return 'failed';
  if (activeDocument?.status === 'failed' || errorMessage.toLowerCase().includes('extract')) return 'failed';
  if (activeDocument?.status) return activeDocument.status;
  return 'not_uploaded';
}

function getNextActionMessage({
  selectedCourseId,
  selectedLearningOutcomeId,
  activeDocument,
  documentExtract,
  documentStatus,
}: {
  selectedCourseId: string;
  selectedLearningOutcomeId: string;
  activeDocument: ActiveDocument | null;
  documentExtract: DocumentExtract | null;
  documentStatus: DocumentStatus;
}): string {
  if (!selectedCourseId) return 'Select a course first.';
  if (!selectedLearningOutcomeId) return 'Select a learning outcome for the selected course.';
  if (!activeDocument) return 'Upload a PDF/DOCX document or select one from history.';
  if (documentStatus === 'failed') return 'Review the backend error, then upload again or retry extraction.';
  if (documentStatus === 'uploaded') return 'Run Extract to create text and document chunks.';
  if (documentStatus === 'processing') return 'Extraction and chunking are running.';
  if (!documentExtract || documentExtract.chunk_count === 0) return 'Processed text has no chunks, so generation is blocked.';
  return 'Optionally enter a topic, then generate questions from the processed chunks.';
}

function getUploadDisabledReason(selectedCourseId: string, selectedFile: File | null, isUploading: boolean): string {
  if (isUploading) return 'Upload is in progress.';
  if (!selectedCourseId) return 'Select a course before uploading.';
  if (!selectedFile) return 'Choose a PDF or DOCX file to upload.';
  return '';
}

function getExtractDisabledReason(
  activeDocument: ActiveDocument | null,
  isExtracting: boolean,
): string {
  if (isExtracting) return 'Extraction is in progress.';
  if (!activeDocument) return 'Upload a document or select one from history before extraction.';
  if (activeDocument.status === 'processed') return 'Document is already processed.';
  if (activeDocument.status === 'processing') return 'Document is already processing.';
  return '';
}

function getGenerateDisabledReason(
  selectedCourseId: string,
  selectedLearningOutcomeId: string,
  selectedProcessedDocuments: ActiveDocument[],
  isGenerating: boolean,
): string {
  if (isGenerating) return 'Generation is in progress. The frontend will not auto-retry this request.';
  if (!selectedCourseId) return 'Select a course first.';
  if (!selectedLearningOutcomeId) return 'Select a learning outcome first.';
  if (selectedProcessedDocuments.length === 0) return 'Select at least one processed document with chunks before generation.';
  return '';
}

function documentUploadToActive(document: DocumentUpload): ActiveDocument {
  return {
    id: document.id,
    course_id: document.course_id,
    file_name: document.file_name,
    document_type: document.document_type,
    status: document.status as DocumentStatus,
    page_count: document.page_count,
    text_length: null,
    chunk_count: 0,
    source: 'session',
  };
}

function existingDocumentToActive(document: ExistingDocument): ActiveDocument {
  return {
    id: document.id,
    course_id: document.course_id,
    file_name: document.file_name,
    document_type: document.document_type,
    status: document.status,
    page_count: document.page_count,
    text_length: document.text_length,
    chunk_count: document.chunk_count,
    created_at: document.created_at,
    source: 'history',
  };
}

function existingDocumentToExtract(document: ExistingDocument | ActiveDocument): DocumentExtract {
  return {
    id: document.id,
    status: document.status,
    text_length: document.text_length ?? 0,
    chunk_count: document.chunk_count,
    extraction_method: 'markitdown',
  };
}

function upsertDocument(documents: ActiveDocument[], document: ActiveDocument): ActiveDocument[] {
  const exists = documents.some((item) => item.id === document.id);
  if (!exists) return [...documents, document];
  return documents.map((item) => (item.id === document.id ? document : item));
}

function uniqueQuestions(questions: GeneratedQuestion[]): GeneratedQuestion[] {
  const seen = new Set<number>();
  const unique = [];
  for (const question of questions) {
    if (seen.has(question.id)) continue;
    seen.add(question.id);
    unique.push(question);
  }
  return unique.sort((left, right) => right.id - left.id);
}

function groupSourceEvidence(ids: number[], documentChunksById: Map<number, DocumentChunk>) {
  const groups = new Map<number | null, { documentId: number | null; items: { id: number; chunk?: DocumentChunk }[] }>();
  for (const id of ids) {
    const chunk = documentChunksById.get(id);
    const documentId = chunk?.document_id ?? null;
    const group = groups.get(documentId) ?? { documentId, items: [] };
    group.items.push({ id, chunk });
    groups.set(documentId, group);
  }
  return Array.from(groups.values());
}

function clampQuestionCount(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.trunc(value), 1), 5);
}

function previewText(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return 'Source preview is unavailable for this chunk.';
  if (compact.length <= 260) return compact;
  return `${compact.slice(0, 260).trim()}...`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
