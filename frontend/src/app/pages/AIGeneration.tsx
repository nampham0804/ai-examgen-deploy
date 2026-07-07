import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  AlertCircle,
  Check,
  ChevronDown,
  FileText,
  Info,
  Loader2,
  SearchCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
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

const workflowSteps = [
  { label: 'Ngữ cảnh', icon: SearchCheck },
  { label: 'Tài liệu', icon: Upload },
  { label: 'Chuẩn bị', icon: FileText },
  { label: 'Cấu hình', icon: Sparkles },
  { label: 'Kết quả', icon: Check },
];

type QuestionType = 'mcq' | 'essay';
type Difficulty = 'easy' | 'medium' | 'hard';
type DocumentStatus = 'not_uploaded' | 'uploaded' | 'processing' | 'processed' | 'failed';
type DocumentSourceMode = 'upload' | 'existing';
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
  const [courses, setCourses] = useState<Course[]>([]);
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedLearningOutcomeId, setSelectedLearningOutcomeId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentSourceMode, setDocumentSourceMode] = useState<DocumentSourceMode>('upload');
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
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
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

    void loadExistingDocuments(Number(selectedCourseId));
  }, [selectedCourseId]);

  const loadExistingDocuments = async (courseId: number) => {
    setLoading((prev) => ({ ...prev, documents: true }));
    try {
      const result = await listDocuments({ course_id: courseId, limit: 100 });
      setExistingDocuments(result.items);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không tải được danh sách tài liệu đã có.');
    } finally {
      setLoading((prev) => ({ ...prev, documents: false }));
    }
  };

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

  const selectedCourse = courses.find((course) => String(course.id) === selectedCourseId) || null;
  const selectedLearningOutcome =
    learningOutcomes.find((learningOutcome) => String(learningOutcome.id) === selectedLearningOutcomeId) || null;
  const documentStatus = getDocumentStatus(activeDocument, documentExtract, loading.extract, errorMessage);
  const canUpload = Boolean(selectedCourseId && selectedFile) && !loading.upload;
  const canPrepareDocument =
    Boolean(activeDocument?.id) && !loading.extract && activeDocument?.status !== 'processed' && activeDocument?.status !== 'processing';
  const canGenerate =
    Boolean(selectedProcessedDocuments.length > 0 && selectedLearningOutcomeId && numQuestions >= 1 && numQuestions <= 5) &&
    !loading.generate;
  const uploadDisabledReason = getUploadDisabledReason(selectedCourseId, selectedFile, loading.upload);
  const prepareDisabledReason = getPrepareDisabledReason(activeDocument, loading.extract);
  const generateDisabledReason = getGenerateDisabledReason(
    selectedCourseId,
    selectedLearningOutcomeId,
    selectedProcessedDocuments,
    loading.generate,
  );
  const readinessItems = getReadinessItems({
    selectedCourseId,
    selectedLearningOutcomeId,
    selectedProcessedDocuments,
    numQuestions,
    isGenerating: loading.generate,
  });
  const nextAction = getNextActionMessage({
    selectedCourseId,
    selectedLearningOutcomeId,
    selectedDocuments,
    activeDocument,
    documentStatus,
    selectedProcessedDocuments,
  });
  const currentStep = getCurrentStep({
    selectedCourseId,
    selectedLearningOutcomeId,
    selectedDocuments,
    selectedProcessedDocuments,
    generatedQuestions,
    pendingQuestions,
    isPreparing: loading.extract,
    isGenerating: loading.generate,
  });

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
      setSuccessMessage('Đã tải tài liệu lên. Hãy chuẩn bị tài liệu trước khi tạo câu hỏi.');
      await loadDocumentChunksForDocuments(nextSelection, true);
      await refreshPendingQuestions(nextSelection.map((document) => document.id), true);
      await loadExistingDocuments(Number(selectedCourseId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Tải tài liệu thất bại.');
    } finally {
      setLoading((prev) => ({ ...prev, upload: false }));
    }
  };

  const handlePrepareDocument = async () => {
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
      setSuccessMessage('Tài liệu đã sẵn sàng để tạo câu hỏi.');
      await loadDocumentChunksForDocuments(upsertDocument(selectedDocuments, updatedDocument), true);
      if (selectedCourseId) await loadExistingDocuments(Number(selectedCourseId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không chuẩn bị được tài liệu.');
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
      setSuccessMessage(`Đã tạo ${result.generated} câu hỏi và đưa vào danh sách chờ duyệt.`);
      if (result.warnings.length > 0) setWarningMessage(result.warnings.join('; '));
      await refreshPendingQuestions(documentIds, true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không tạo được câu hỏi. Hãy kiểm tra tài liệu hoặc cấu hình AI.');
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
      const message = error instanceof Error ? error.message : 'Không tải được câu hỏi đang chờ duyệt.';
      if (warnOnly) setWarningMessage(`Câu hỏi đã được tạo, nhưng chưa tải lại được danh sách chờ duyệt: ${message}`);
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
      const message = error instanceof Error ? error.message : 'Không tải được nguồn tham chiếu.';
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
      ? activeDocument?.id === document.id
        ? nextSelection[0] ?? null
        : activeDocument
      : selectedDocument;
    setDocumentExtract(nextActiveDocument?.status === 'processed' ? existingDocumentToExtract(nextActiveDocument) : null);
    setGeneratedQuestions([]);
    setLastSourceChunkIds([]);
    setGeneratedCount(0);
    setSelectedDocuments(nextSelection);
    setActiveDocument(nextActiveDocument);
    setSuccessMessage(isAlreadySelected ? 'Đã bỏ chọn tài liệu.' : 'Đã chọn tài liệu nguồn.');
    await loadDocumentChunksForDocuments(nextSelection, true);
    await refreshPendingQuestions(nextSelection.map((item) => item.id), true);
  };

  const handleRemoveSelectedDocument = async (documentId: number) => {
    const nextSelection = selectedDocuments.filter((document) => document.id !== documentId);
    const nextActiveDocument = activeDocument?.id === documentId ? nextSelection[0] ?? null : activeDocument;
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
    setSuccessMessage(`Đã chọn ${eligibleExistingDocuments.length} tài liệu sẵn sàng.`);
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
    setSuccessMessage('Đã bỏ chọn tất cả tài liệu.');
  };

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="mb-1.5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            <Sparkles className="h-4 w-4" />
            Quy trình câu hỏi
          </div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Tạo câu hỏi AI</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Tạo câu hỏi từ tài liệu đã chuẩn bị, gắn với khóa học và chuẩn đầu ra để đưa vào danh sách chờ duyệt.
          </p>
        </div>
        {pendingQuestions.length > 0 && (
          <Link
            to="/review"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Đi tới Duyệt câu hỏi
          </Link>
        )}
      </section>

      <WorkflowStepper currentStep={currentStep} />

      {(errorMessage || successMessage || warningMessage) && (
        <div className="space-y-2">
          {errorMessage && <StateMessage tone="red">{errorMessage}</StateMessage>}
          {warningMessage && <StateMessage tone="amber">{warningMessage}</StateMessage>}
          {successMessage && <StateMessage tone="green">{successMessage}</StateMessage>}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.02fr)_minmax(360px,0.98fr)]">
        <div className="space-y-4">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <SectionHeading
              index="1"
              title="Chọn ngữ cảnh"
              description="Khóa học và chuẩn đầu ra giúp AI tạo câu hỏi đúng phạm vi."
            />
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Khóa học</span>
                <select
                  value={selectedCourseId}
                  onChange={(event) => {
                    setSelectedCourseId(event.target.value);
                    setExistingDocuments([]);
                    resetDocumentState();
                  }}
                  disabled={loading.courses}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">{loading.courses ? 'Đang tải khóa học...' : 'Chọn khóa học'}</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
                {!loading.courses && courses.length === 0 && (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    Hãy tạo khóa học trước khi tạo câu hỏi AI.
                  </p>
                )}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Chuẩn đầu ra</span>
                <select
                  value={selectedLearningOutcomeId}
                  onChange={(event) => setSelectedLearningOutcomeId(event.target.value)}
                  disabled={!selectedCourseId || loading.learningOutcomes}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="">
                    {loading.learningOutcomes ? 'Đang tải chuẩn đầu ra...' : 'Chọn chuẩn đầu ra'}
                  </option>
                  {learningOutcomes.map((learningOutcome) => (
                    <option key={learningOutcome.id} value={learningOutcome.id}>
                      {learningOutcome.code} - {learningOutcome.description}
                    </option>
                  ))}
                </select>
                {selectedCourseId && !loading.learningOutcomes && learningOutcomes.length === 0 && (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                    Khóa học này chưa có chuẩn đầu ra. Hãy khai báo CDR trước.
                  </p>
                )}
              </label>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <SectionHeading
              index="2"
              title="Nguồn tài liệu"
              description="Tải tài liệu mới hoặc dùng lại tài liệu đã sẵn sàng trong khóa học này."
            />
            <div className="mt-4 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setDocumentSourceMode('upload')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  documentSourceMode === 'upload'
                    ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Tải lên mới
              </button>
              <button
                type="button"
                onClick={() => setDocumentSourceMode('existing')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  documentSourceMode === 'existing'
                    ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                Tài liệu đã có
              </button>
            </div>

            {documentSourceMode === 'upload' ? (
              <div className="mt-4">
                <label className="block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-blue-500 dark:border-slate-700 dark:hover:border-blue-400">
                  <Upload className="mx-auto mb-2 h-8 w-8 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {selectedFile ? selectedFile.name : 'Chọn tệp PDF hoặc DOCX'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Sau khi tải lên, hệ thống cần chuẩn bị tài liệu một lần trước khi tạo câu hỏi.
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!canUpload}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading.upload ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Tải tài liệu lên
                </button>
                {!canUpload && uploadDisabledReason && <DisabledReason>{uploadDisabledReason}</DisabledReason>}
              </div>
            ) : (
              <ExistingDocuments
                documents={existingDocuments}
                selectedDocuments={selectedDocuments}
                loading={loading.documents}
                selectedCourseId={selectedCourseId}
                eligibleCount={eligibleExistingDocuments.length}
                allEligibleSelected={allEligibleExistingSelected}
                onSelect={handleSelectExistingDocument}
                onSelectAll={handleSelectAllEligibleDocuments}
                onClearAll={handleClearSelectedDocuments}
              />
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <SectionHeading
              index="3"
              title="Chuẩn bị tài liệu"
              description="Hệ thống cần đọc tài liệu một lần trước khi dùng để tạo câu hỏi."
            />
            <div className="mt-4 flex flex-col gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={documentStatus} />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {activeDocument ? activeDocument.file_name : 'Chưa chọn tài liệu'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {selectedDocuments.length > 0
                    ? `Đã chọn ${selectedDocuments.length} tài liệu, ${selectedProcessedDocuments.length} tài liệu sẵn sàng.`
                    : 'Hãy tải tài liệu mới hoặc chọn tài liệu đã có.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handlePrepareDocument}
                disabled={!canPrepareDocument}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                {loading.extract ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Chuẩn bị tài liệu
              </button>
            </div>
            {!canPrepareDocument && prepareDisabledReason && <DisabledReason>{prepareDisabledReason}</DisabledReason>}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <SectionHeading
              index="4"
              title="Cấu hình câu hỏi"
              description="Chọn loại câu hỏi, độ khó và số lượng phù hợp với mục tiêu kiểm tra."
            />
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Chủ đề</span>
                <textarea
                  placeholder="Ví dụ: chuẩn hóa dữ liệu, truy vấn SQL, mô hình ERD..."
                  rows={3}
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Loại câu hỏi</span>
                  <select
                    value={questionType}
                    onChange={(event) => setQuestionType(event.target.value as QuestionType)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="mcq">Trắc nghiệm</option>
                    <option value="essay">Tự luận</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Độ khó</span>
                  <select
                    value={difficulty}
                    onChange={(event) => setDifficulty(event.target.value as Difficulty)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="easy">Dễ</option>
                    <option value="medium">Trung bình</option>
                    <option value="hard">Khó</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Số lượng</span>
                  <input
                    type="number"
                    value={numQuestions}
                    min={1}
                    max={5}
                    onChange={(event) => setNumQuestions(clampQuestionCount(Number(event.target.value)))}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Từ 1 đến 5 câu mỗi lần.</p>
                </label>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdvancedOptions((current) => !current)}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Tùy chọn nâng cao
                  <ChevronDown className={`h-4 w-4 transition ${showAdvancedOptions ? 'rotate-180' : ''}`} />
                </button>
                {showAdvancedOptions && (
                  <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-800">
                    <label className="block max-w-xs">
                      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Số đoạn tham chiếu
                      </span>
                      <input
                        type="number"
                        value={topK}
                        min={1}
                        max={10}
                        onChange={(event) => setTopK(Number(event.target.value))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Mặc định 3 đoạn. Chỉ thay đổi khi cần mở rộng nguồn tham chiếu.
                      </p>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <ReadinessPanel items={readinessItems} nextAction={nextAction} />

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <SectionHeading
              index="5"
              title="Tạo và kiểm tra kết quả"
              description="Câu hỏi tạo ra sẽ được đưa vào danh sách chờ duyệt."
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading.generate ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {loading.generate ? 'Đang tạo câu hỏi...' : 'Tạo câu hỏi AI'}
            </button>
            {!canGenerate && generateDisabledReason && <DisabledReason>{generateDisabledReason}</DisabledReason>}
            {generatedCount > 0 && (
              <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300">
                Đã tạo {generatedCount} câu hỏi. Có {pendingQuestions.length} câu đang chờ duyệt từ tài liệu đã chọn.
              </div>
            )}
          </section>

          {selectedDocuments.length > 0 && (
            <SelectedDocuments
              documents={selectedDocuments}
              processedCount={selectedProcessedDocuments.length}
              onRemove={handleRemoveSelectedDocument}
              onClearAll={handleClearSelectedDocuments}
            />
          )}

          <QuestionPanel
            title="Câu hỏi vừa tạo"
            questions={generatedQuestions}
            emptyText="Sau khi tạo câu hỏi, kết quả mới nhất sẽ hiển thị tại đây."
            loading={loading.generate}
            activeDocumentsById={activeDocumentsById}
            documentChunksById={documentChunksById}
          />

          <QuestionPanel
            title="Câu hỏi đang chờ duyệt"
            questions={pendingQuestions}
            emptyText="Câu hỏi đã lưu ở trạng thái chờ duyệt sẽ xuất hiện tại đây."
            loading={loading.questions}
            activeDocumentsById={activeDocumentsById}
            documentChunksById={documentChunksById}
          />
        </aside>
      </div>
    </div>
  );
}

function WorkflowStepper({ currentStep }: { currentStep: number }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid gap-2 sm:grid-cols-5">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;
          const isComplete = index < currentStep;
          const isActive = index === currentStep;
          return (
            <div
              key={step.label}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                  : isComplete
                    ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                    : 'bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400'
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full ${
                  isComplete
                    ? 'bg-green-600 text-white'
                    : isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-400 dark:bg-slate-900'
                }`}
              >
                {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </span>
              <span className="font-medium">{step.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SectionHeading({ index, title, description }: { index: string; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
        {index}
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function StateMessage({ tone, children }: { tone: 'red' | 'amber' | 'green'; children: string }) {
  const classes = {
    red: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300',
    amber: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
    green: 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300',
  };
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${classes[tone]}`}>
      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function ExistingDocuments({
  documents,
  selectedDocuments,
  loading,
  selectedCourseId,
  eligibleCount,
  allEligibleSelected,
  onSelect,
  onSelectAll,
  onClearAll,
}: {
  documents: ExistingDocument[];
  selectedDocuments: ActiveDocument[];
  loading: boolean;
  selectedCourseId: string;
  eligibleCount: number;
  allEligibleSelected: boolean;
  onSelect: (document: ExistingDocument) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  return (
    <div className="mt-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {selectedDocuments.length > 0
            ? `Đã chọn ${selectedDocuments.length} tài liệu.`
            : 'Chọn một hoặc nhiều tài liệu sẵn sàng để tạo câu hỏi.'}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={eligibleCount === 0 || allEligibleSelected}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Chọn tất cả sẵn sàng
          </button>
          <button
            type="button"
            onClick={onClearAll}
            disabled={selectedDocuments.length === 0}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Bỏ chọn
          </button>
        </div>
      </div>

      {!selectedCourseId && <EmptyState text="Hãy chọn khóa học để xem tài liệu đã có." compact />}
      {selectedCourseId && loading && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 py-8 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải tài liệu...
        </div>
      )}
      {selectedCourseId && !loading && documents.length === 0 && (
        <EmptyState text="Khóa học này chưa có tài liệu. Hãy tải tài liệu mới lên." compact />
      )}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((document) => {
            const isSelected = selectedDocuments.some((item) => item.id === document.id);
            return (
              <label
                key={document.id}
                className={`block cursor-pointer rounded-lg border p-3 transition ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30'
                    : 'border-slate-200 bg-white hover:border-blue-300 dark:border-slate-800 dark:bg-slate-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onSelect(document)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{document.file_name}</p>
                      <StatusBadge status={document.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{document.page_count ? `${document.page_count} trang` : 'Chưa có số trang'}</span>
                      <span>{formatDate(document.created_at)}</span>
                    </div>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SelectedDocuments({
  documents,
  processedCount,
  onRemove,
  onClearAll,
}: {
  documents: ActiveDocument[];
  processedCount: number;
  onRemove: (documentId: number) => void;
  onClearAll: () => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">Tài liệu đã chọn</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {documents.length} tài liệu, {processedCount} tài liệu sẵn sàng.
          </p>
        </div>
        <button
          type="button"
          onClick={onClearAll}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Bỏ chọn
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {documents.map((document) => (
          <div key={document.id} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-slate-950 dark:text-white">{document.file_name}</p>
                <StatusBadge status={document.status} />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {document.page_count ? `${document.page_count} trang` : 'Chưa có số trang'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(document.id)}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-red-600 dark:hover:bg-slate-700"
              aria-label={`Bỏ chọn ${document.file_name}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReadinessPanel({ items, nextAction }: { items: { label: string; ready: boolean }[]; nextAction: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
          <Info className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-white">Điều kiện tạo câu hỏi</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{nextAction}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full ${
                item.ready
                  ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
              }`}
            >
              {item.ready && <Check className="h-3.5 w-3.5" />}
            </span>
            <span className={item.ready ? 'text-slate-700 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </section>
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
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">{title}</h2>
        {!loading && <Badge tone="gray">{questions.length} câu</Badge>}
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Đang tải câu hỏi...
        </div>
      )}

      {!loading && questions.length === 0 && <EmptyState text={emptyText} compact />}

      {!loading && questions.length > 0 && (
        <div className="space-y-3">
          {questions.map((question) => (
            <article key={question.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="blue">{questionTypeLabel(question.question_type)}</Badge>
                <Badge tone={difficultyTone(question.difficulty)}>{difficultyLabel(question.difficulty)}</Badge>
                <Badge tone={question.status === 'pending_review' ? 'amber' : 'gray'}>{questionStatusLabel(question.status)}</Badge>
              </div>
              <p className="mt-3 text-sm font-medium leading-relaxed text-slate-950 dark:text-white">{question.question_text}</p>
              {question.question_type === 'mcq' ? <McqDetails question={question} /> : <EssayDetails question={question} />}
              <details className="mt-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
                <summary className="cursor-pointer text-sm font-semibold text-blue-900 dark:text-blue-200">
                  Nguồn tham chiếu
                </summary>
                <div className="mt-3">
                  <SourceEvidence
                    ids={question.source_chunk_ids ?? []}
                    activeDocumentsById={activeDocumentsById}
                    documentChunksById={documentChunksById}
                  />
                </div>
                {question.explanation && (
                  <div className="mt-3 border-t border-blue-200 pt-3 text-sm leading-relaxed text-blue-900 dark:border-blue-800 dark:text-blue-200">
                    <span className="font-semibold">Giải thích: </span>
                    {question.explanation}
                  </div>
                )}
              </details>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function McqDetails({ question }: { question: GeneratedQuestion }) {
  const hasOptions = question.options && question.options.length > 0;

  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Đáp án</div>
      {hasOptions ? (
        <ul className="space-y-2 text-sm text-slate-800 dark:text-slate-200">
          {question.options?.map((option, index) => {
            const optionKey = option.label || option.key || String.fromCharCode(65 + index);
            const isCorrect = question.correct_answer === optionKey;
            return (
              <li
                key={`${optionKey}-${index}`}
                className={`flex gap-3 rounded-md px-3 py-2 ${
                  isCorrect
                    ? 'bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-200'
                    : 'bg-white dark:bg-slate-900'
                }`}
              >
                <span className="font-semibold">{optionKey}.</span>
                <span>{option.text}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-amber-700 dark:text-amber-300">Câu trắc nghiệm chưa có đủ lựa chọn.</p>
      )}
    </div>
  );
}

function EssayDetails({ question }: { question: GeneratedQuestion }) {
  return (
    <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
      <TextBlock label="Đáp án gợi ý" value={question.suggested_answer} />
      <TextBlock label="Rubric chấm điểm" value={question.grading_rubric} />
    </div>
  );
}

function TextBlock({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      {value ? (
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">{value}</p>
      ) : (
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">Chưa có nội dung.</p>
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
  if (ids.length === 0) return <Badge tone="amber">Chưa có nguồn tham chiếu</Badge>;
  const groups = groupSourceEvidence(ids, documentChunksById);

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const sourceDocument = group.documentId === null ? null : activeDocumentsById.get(group.documentId);
        return (
          <div key={group.documentId ?? 'unknown'} className="rounded-md bg-white p-3 dark:bg-slate-900">
            <p className="truncate text-sm font-semibold text-blue-950 dark:text-blue-100">
              {sourceDocument?.file_name ?? 'Tài liệu nguồn'}
            </p>
            <div className="mt-2 space-y-2">
              {group.items.map(({ id, chunk }) => (
                <div key={id} className="rounded border border-blue-100 bg-blue-50/70 p-2 dark:border-blue-900/60 dark:bg-blue-950/30">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="blue">{formatPageRange(chunk)}</Badge>
                    {chunk?.section_path && <Badge tone="gray">{chunk.section_path}</Badge>}
                  </div>
                  {chunk?.title && <p className="mt-2 text-xs font-medium text-blue-900 dark:text-blue-100">{chunk.title}</p>}
                  <p className="mt-2 text-sm leading-relaxed text-blue-900 dark:text-blue-100">
                    {chunk?.text ? previewText(chunk.text) : 'Chưa có đoạn trích xem trước.'}
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

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={`rounded-lg border border-dashed border-slate-300 text-center dark:border-slate-700 ${compact ? 'py-8' : 'py-12'}`}>
      <Sparkles className={`mx-auto mb-3 text-slate-300 dark:text-slate-600 ${compact ? 'h-8 w-8' : 'h-12 w-12'}`} />
      <p className="text-sm text-slate-500 dark:text-slate-400">{text}</p>
    </div>
  );
}

function DisabledReason({ children }: { children: string }) {
  return <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{children}</p>;
}

function StatusBadge({ status }: { status: DocumentStatus | ExistingDocument['status'] }) {
  const labels: Record<DocumentStatus, string> = {
    not_uploaded: 'Chưa chọn',
    uploaded: 'Cần chuẩn bị',
    processing: 'Đang xử lý',
    processed: 'Sẵn sàng',
    failed: 'Lỗi',
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
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
}

function difficultyTone(difficulty: string): 'green' | 'amber' | 'red' {
  if (difficulty === 'easy') return 'green';
  if (difficulty === 'medium') return 'amber';
  return 'red';
}

function statusTone(status: DocumentStatus | ExistingDocument['status']): 'green' | 'amber' | 'red' | 'gray' | 'blue' {
  if (status === 'processed') return 'green';
  if (status === 'uploaded') return 'blue';
  if (status === 'processing') return 'amber';
  if (status === 'failed') return 'red';
  return 'gray';
}

function questionTypeLabel(type: string): string {
  if (type === 'mcq') return 'Trắc nghiệm';
  if (type === 'essay') return 'Tự luận';
  return type;
}

function difficultyLabel(value: string): string {
  if (value === 'easy') return 'Dễ';
  if (value === 'medium') return 'Trung bình';
  if (value === 'hard') return 'Khó';
  return value;
}

function questionStatusLabel(value: string): string {
  if (value === 'pending_review') return 'Chờ duyệt';
  if (value === 'approved') return 'Đã duyệt';
  if (value === 'rejected') return 'Từ chối';
  return value;
}

function getDocumentStatus(
  activeDocument: ActiveDocument | null,
  documentExtract: DocumentExtract | null,
  isPreparing: boolean,
  errorMessage: string,
): DocumentStatus {
  if (isPreparing) return 'processing';
  if (documentExtract?.status === 'processed') return 'processed';
  if (documentExtract?.status === 'failed') return 'failed';
  if (activeDocument?.status === 'failed' || errorMessage.toLowerCase().includes('extract')) return 'failed';
  if (activeDocument?.status) return activeDocument.status;
  return 'not_uploaded';
}

function getCurrentStep({
  selectedCourseId,
  selectedLearningOutcomeId,
  selectedDocuments,
  selectedProcessedDocuments,
  generatedQuestions,
  pendingQuestions,
  isPreparing,
  isGenerating,
}: {
  selectedCourseId: string;
  selectedLearningOutcomeId: string;
  selectedDocuments: ActiveDocument[];
  selectedProcessedDocuments: ActiveDocument[];
  generatedQuestions: GeneratedQuestion[];
  pendingQuestions: GeneratedQuestion[];
  isPreparing: boolean;
  isGenerating: boolean;
}): number {
  if (generatedQuestions.length > 0 || pendingQuestions.length > 0) return 4;
  if (isGenerating) return 4;
  if (selectedProcessedDocuments.length > 0) return 3;
  if (isPreparing) return 2;
  if (selectedDocuments.length > 0) return 2;
  if (selectedCourseId && selectedLearningOutcomeId) return 1;
  return 0;
}

function getNextActionMessage({
  selectedCourseId,
  selectedLearningOutcomeId,
  selectedDocuments,
  activeDocument,
  documentStatus,
  selectedProcessedDocuments,
}: {
  selectedCourseId: string;
  selectedLearningOutcomeId: string;
  selectedDocuments: ActiveDocument[];
  activeDocument: ActiveDocument | null;
  documentStatus: DocumentStatus;
  selectedProcessedDocuments: ActiveDocument[];
}): string {
  if (!selectedCourseId) return 'Cần chọn khóa học trước.';
  if (!selectedLearningOutcomeId) return 'Cần chọn chuẩn đầu ra cho khóa học.';
  if (selectedDocuments.length === 0) return 'Cần tải tài liệu mới hoặc chọn tài liệu đã có.';
  if (documentStatus === 'failed') return 'Tài liệu đang lỗi. Hãy chọn tài liệu khác hoặc tải lại.';
  if (activeDocument && activeDocument.status !== 'processed') return 'Cần chuẩn bị tài liệu trước khi tạo câu hỏi.';
  if (selectedProcessedDocuments.length === 0) return 'Cần ít nhất một tài liệu sẵn sàng.';
  return 'Đã đủ điều kiện. Bạn có thể tạo câu hỏi AI.';
}

function getReadinessItems({
  selectedCourseId,
  selectedLearningOutcomeId,
  selectedProcessedDocuments,
  numQuestions,
  isGenerating,
}: {
  selectedCourseId: string;
  selectedLearningOutcomeId: string;
  selectedProcessedDocuments: ActiveDocument[];
  numQuestions: number;
  isGenerating: boolean;
}) {
  return [
    { label: 'Đã chọn khóa học', ready: Boolean(selectedCourseId) },
    { label: 'Đã chọn chuẩn đầu ra', ready: Boolean(selectedLearningOutcomeId) },
    { label: 'Có ít nhất một tài liệu sẵn sàng', ready: selectedProcessedDocuments.length > 0 },
    { label: 'Đã chọn loại câu hỏi và số lượng hợp lệ', ready: numQuestions >= 1 && numQuestions <= 5 && !isGenerating },
  ];
}

function getUploadDisabledReason(selectedCourseId: string, selectedFile: File | null, isUploading: boolean): string {
  if (isUploading) return 'Đang tải tài liệu lên.';
  if (!selectedCourseId) return 'Hãy chọn khóa học trước khi tải tài liệu.';
  if (!selectedFile) return 'Hãy chọn tệp PDF hoặc DOCX.';
  return '';
}

function getPrepareDisabledReason(activeDocument: ActiveDocument | null, isPreparing: boolean): string {
  if (isPreparing) return 'Đang chuẩn bị tài liệu.';
  if (!activeDocument) return 'Hãy tải tài liệu hoặc chọn tài liệu đã có.';
  if (activeDocument.status === 'processed') return 'Tài liệu này đã sẵn sàng.';
  if (activeDocument.status === 'processing') return 'Tài liệu đang được xử lý.';
  return '';
}

function getGenerateDisabledReason(
  selectedCourseId: string,
  selectedLearningOutcomeId: string,
  selectedProcessedDocuments: ActiveDocument[],
  isGenerating: boolean,
): string {
  if (isGenerating) return 'Hệ thống đang tạo câu hỏi.';
  if (!selectedCourseId) return 'Cần chọn khóa học trước.';
  if (!selectedLearningOutcomeId) return 'Cần chọn chuẩn đầu ra trước.';
  if (selectedProcessedDocuments.length === 0) return 'Cần chọn ít nhất một tài liệu sẵn sàng.';
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
  if (!compact) return 'Chưa có đoạn trích xem trước.';
  if (compact.length <= 260) return compact;
  return `${compact.slice(0, 260).trim()}...`;
}

function formatPageRange(chunk?: DocumentChunk): string {
  if (!chunk?.page_start && !chunk?.page_end) return 'Đoạn tham chiếu';
  if (chunk.page_start && chunk.page_end && chunk.page_start !== chunk.page_end) {
    return `Trang ${chunk.page_start}-${chunk.page_end}`;
  }
  return `Trang ${chunk.page_start || chunk.page_end}`;
}

function formatDate(value?: string | null): string {
  if (!value) return 'Chưa có ngày tải';
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}
