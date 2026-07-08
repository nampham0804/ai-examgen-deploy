import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { ReactNode } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle,
  Edit,
  Eye,
  Filter,
  Loader2,
  RefreshCcw,
  Save,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import { getApiErrorMessage } from '@/api/client';
import { getCourses } from '@/api/courses';
import { getLearningOutcomes } from '@/api/learningOutcomes';
import { approveQuestion, getQuestions, rejectQuestion, updateQuestion } from '@/api/questions';
import type { Course } from '@/types/course';
import type { LearningOutcome } from '@/types/learningOutcome';
import type {
  Question,
  QuestionDifficulty,
  QuestionFilters,
  QuestionOption,
  QuestionPayload,
  QuestionStatus,
  QuestionType,
} from '@/types/question';

type StatusFilter = QuestionStatus | 'all';
type TypeFilter = QuestionType | 'all';
type DifficultyFilter = QuestionDifficulty | 'all';

interface BankFilters {
  status: StatusFilter;
  course_id: number | 'all';
  learning_outcome_id: number | 'all';
  question_type: TypeFilter;
  difficulty: DifficultyFilter;
  page: number;
  page_size: number;
}

const defaultFilters: BankFilters = {
  status: 'approved',
  course_id: 'all',
  learning_outcome_id: 'all',
  question_type: 'all',
  difficulty: 'all',
  page: 1,
  page_size: 20,
};

const emptyOptions: QuestionOption[] = [
  { key: 'A', text: '' },
  { key: 'B', text: '' },
  { key: 'C', text: '' },
  { key: 'D', text: '' },
];

const statusLabels: Record<QuestionStatus, string> = {
  approved: 'Đã duyệt',
  pending_review: 'Chờ duyệt',
  rejected: 'Từ chối',
};

const typeLabels: Record<QuestionType, string> = {
  mcq: 'Trắc nghiệm',
  essay: 'Tự luận',
};

const difficultyLabels: Record<QuestionDifficulty, string> = {
  easy: 'Dễ',
  medium: 'Trung bình',
  hard: 'Khó',
};

function toPayload(question: Question): QuestionPayload {
  return {
    question_type: question.question_type,
    question_text: question.question_text,
    difficulty: question.difficulty,
    options: question.question_type === 'mcq' ? question.options || emptyOptions : null,
    correct_answer: question.question_type === 'mcq' ? question.correct_answer || 'A' : null,
    suggested_answer: question.suggested_answer || '',
    grading_rubric: question.grading_rubric || '',
    explanation: question.explanation || '',
  };
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Chưa có';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function statusTone(status: QuestionStatus) {
  if (status === 'approved') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800';
  }
  if (status === 'rejected') {
    return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-800';
  }
  return 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800';
}

function difficultyTone(difficulty: QuestionDifficulty) {
  if (difficulty === 'easy') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-800';
  }
  if (difficulty === 'hard') {
    return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-800';
  }
  return 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800';
}

function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${className}`}>
      {children}
    </span>
  );
}

function validatePayload(payload: QuestionPayload) {
  if (!payload.question_text.trim()) {
    return 'Nội dung câu hỏi là bắt buộc.';
  }
  if (payload.question_type === 'mcq') {
    if (!payload.options || payload.options.length !== 4 || payload.options.some((option) => !option.text.trim())) {
      return 'Câu trắc nghiệm cần đủ 4 lựa chọn.';
    }
    if (!payload.correct_answer) {
      return 'Câu trắc nghiệm cần có đáp án đúng.';
    }
  }
  if (payload.question_type === 'essay' && !payload.suggested_answer?.trim() && !payload.grading_rubric?.trim()) {
    return 'Câu tự luận cần có đáp án gợi ý hoặc rubric chấm điểm.';
  }
  return null;
}

export default function QuestionBank() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<BankFilters>(defaultFilters);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingLearningOutcomes, setLoadingLearningOutcomes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState<QuestionPayload | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const learningOutcomeById = useMemo(
    () => new Map(learningOutcomes.map((learningOutcome) => [learningOutcome.id, learningOutcome])),
    [learningOutcomes],
  );

  const visibleQuestions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return questions;
    }

    return questions.filter((question) => {
      const course = courseById.get(question.course_id);
      const learningOutcome = learningOutcomeById.get(question.learning_outcome_id);
      return (
        question.question_text.toLowerCase().includes(term) ||
        question.explanation?.toLowerCase().includes(term) ||
        question.course_code?.toLowerCase().includes(term) ||
        question.course_name?.toLowerCase().includes(term) ||
        question.learning_outcome_code?.toLowerCase().includes(term) ||
        question.learning_outcome_description?.toLowerCase().includes(term) ||
        course?.code.toLowerCase().includes(term) ||
        course?.name.toLowerCase().includes(term) ||
        learningOutcome?.code.toLowerCase().includes(term) ||
        learningOutcome?.description.toLowerCase().includes(term)
      );
    });
  }, [courseById, learningOutcomeById, questions, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(total / filters.page_size));
  const hasActiveFilters =
    searchTerm.trim() ||
    filters.status !== defaultFilters.status ||
    filters.course_id !== defaultFilters.course_id ||
    filters.learning_outcome_id !== defaultFilters.learning_outcome_id ||
    filters.question_type !== defaultFilters.question_type ||
    filters.difficulty !== defaultFilters.difficulty;

  async function loadCourses() {
    setLoadingCourses(true);
    setError(null);
    try {
      const data = await getCourses();
      setCourses(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingCourses(false);
    }
  }

  async function loadLearningOutcomes(courseId: number) {
    setLoadingLearningOutcomes(true);
    setError(null);
    try {
      const data = await getLearningOutcomes(courseId);
      setLearningOutcomes(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingLearningOutcomes(false);
    }
  }

  async function loadQuestions(currentFilters = filters) {
    const requestFilters: QuestionFilters = {
      page: currentFilters.page,
      page_size: currentFilters.page_size,
    };
    if (currentFilters.status !== 'all') {
      requestFilters.status = currentFilters.status;
    }
    if (currentFilters.course_id !== 'all') {
      requestFilters.course_id = currentFilters.course_id;
    }
    if (currentFilters.learning_outcome_id !== 'all') {
      requestFilters.learning_outcome_id = currentFilters.learning_outcome_id;
    }
    if (currentFilters.question_type !== 'all') {
      requestFilters.question_type = currentFilters.question_type;
    }
    if (currentFilters.difficulty !== 'all') {
      requestFilters.difficulty = currentFilters.difficulty;
    }

    setLoadingQuestions(true);
    setError(null);
    try {
      const data = await getQuestions(requestFilters);
      setQuestions(data.items);
      setTotal(data.total);
      setSelectedQuestion((current) => {
        if (!current) {
          return null;
        }
        return data.items.find((question) => question.id === current.id) || null;
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
      setQuestions([]);
      setTotal(0);
      setSelectedQuestion(null);
    } finally {
      setLoadingQuestions(false);
    }
  }

  useEffect(() => {
    void loadCourses();
  }, []);

  useEffect(() => {
    if (filters.course_id === 'all') {
      setLearningOutcomes([]);
      return;
    }
    void loadLearningOutcomes(filters.course_id);
  }, [filters.course_id]);

  useEffect(() => {
    void loadQuestions(filters);
  }, [filters]);

  useEffect(() => {
    if (selectedQuestion) {
      setFormData(toPayload(selectedQuestion));
      setIsEditing(false);
    } else {
      setFormData(null);
      setIsEditing(false);
    }
  }, [selectedQuestion]);

  function updateFilters(update: Partial<BankFilters>) {
    setFilters((current) => ({
      ...current,
      ...update,
      page: update.page ?? 1,
    }));
    setSuccess(null);
  }

  function resetFilters() {
    setFilters(defaultFilters);
    setSearchTerm('');
    setLearningOutcomes([]);
    setSuccess(null);
  }

  function closeDetail() {
    setSelectedQuestion(null);
    setFormData(null);
    setIsEditing(false);
  }

  function handleCourseChange(value: string) {
    updateFilters({
      course_id: value === 'all' ? 'all' : Number(value),
      learning_outcome_id: 'all',
    });
  }

  function setQuestionType(questionType: QuestionType) {
    setFormData((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        question_type: questionType,
        options: questionType === 'mcq' ? current.options || emptyOptions : null,
        correct_answer: questionType === 'mcq' ? current.correct_answer || 'A' : null,
      };
    });
  }

  function setOptionText(key: QuestionOption['key'], text: string) {
    setFormData((current) => {
      if (!current) {
        return current;
      }
      const options = current.options || emptyOptions;
      return {
        ...current,
        options: options.map((option) => (option.key === key ? { ...option, text } : option)),
      };
    });
  }

  async function handleSave() {
    if (!selectedQuestion || !formData) {
      return;
    }

    const validationError = validatePayload(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload: QuestionPayload = {
      ...formData,
      question_text: formData.question_text.trim(),
      options:
        formData.question_type === 'mcq'
          ? (formData.options || emptyOptions).map((option) => ({ ...option, text: option.text.trim() }))
          : null,
      correct_answer: formData.question_type === 'mcq' ? formData.correct_answer : null,
      suggested_answer: formData.suggested_answer?.trim() || null,
      grading_rubric: formData.grading_rubric?.trim() || null,
      explanation: formData.explanation?.trim() || null,
    };

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateQuestion(selectedQuestion.id, payload);
      setQuestions((current) => current.map((question) => (question.id === updated.id ? updated : question)));
      setSelectedQuestion(updated);
      setSuccess('Đã lưu chỉnh sửa câu hỏi.');
      setIsEditing(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(action: 'approve' | 'reject') {
    if (!selectedQuestion) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = action === 'approve' ? await approveQuestion(selectedQuestion.id) : await rejectQuestion(selectedQuestion.id);
      setSelectedQuestion(updated);
      setSuccess(action === 'approve' ? 'Đã phê duyệt câu hỏi.' : 'Đã từ chối câu hỏi.');
      await loadQuestions(filters);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-800">
            <BookOpen className="h-4 w-4" />
            Quản lý câu hỏi
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-950 dark:text-white">Ngân hàng câu hỏi</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
            Tìm kiếm và quản lý câu hỏi đã tạo để sử dụng trong ma trận và đề thi.
          </p>
        </div>

        <button
          onClick={() => void loadQuestions(filters)}
          disabled={loadingQuestions}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          {loadingQuestions ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Làm mới
        </button>
      </div>

      {(error || success) && (
        <div
          className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
            error
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300'
              : 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300'
          }`}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error || success}</span>
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-200">
            <Filter className="h-4 w-4" />
            Bộ lọc câu hỏi
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {visibleQuestions.length} kết quả trong trang hiện tại / {total} tổng
          </div>
        </div>

        <div className="grid items-start gap-3 xl:grid-cols-[minmax(280px,1.35fr)_minmax(0,2fr)]">
          <label className="relative block self-start">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm trong trang hiện tại..."
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-9 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 rounded-md p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                aria-label="Xóa tìm kiếm"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>

          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-[156px] flex-1">
              <span className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">Trạng thái</span>
              <select
                value={filters.status}
                onChange={(event) => updateFilters({ status: event.target.value as StatusFilter })}
                className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="approved">Đã duyệt</option>
                <option value="pending_review">Chờ duyệt</option>
                <option value="rejected">Từ chối</option>
              </select>
            </label>

            <label className="min-w-[156px] flex-1">
              <span className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">Khóa học</span>
              <select
                value={filters.course_id}
                onChange={(event) => handleCourseChange(event.target.value)}
                disabled={loadingCourses}
                className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-70 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
              >
                <option value="all">{loadingCourses ? 'Đang tải...' : 'Tất cả khóa học'}</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-[132px] flex-1">
              <span className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">CDR</span>
              <select
                value={filters.learning_outcome_id}
                onChange={(event) =>
                  updateFilters({ learning_outcome_id: event.target.value === 'all' ? 'all' : Number(event.target.value) })
                }
                disabled={filters.course_id === 'all' || loadingLearningOutcomes}
                className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
              >
                <option value="all">{loadingLearningOutcomes ? 'Đang tải...' : 'Tất cả CDR'}</option>
                {learningOutcomes.map((learningOutcome) => (
                  <option key={learningOutcome.id} value={learningOutcome.id}>
                    {learningOutcome.code}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-[132px] flex-1">
              <span className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">Loại</span>
              <select
                value={filters.question_type}
                onChange={(event) => updateFilters({ question_type: event.target.value as TypeFilter })}
                className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
              >
                <option value="all">Tất cả loại</option>
                <option value="mcq">Trắc nghiệm</option>
                <option value="essay">Tự luận</option>
              </select>
            </label>

            <label className="min-w-[132px] flex-1">
              <span className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">Độ khó</span>
              <select
                value={filters.difficulty}
                onChange={(event) => updateFilters({ difficulty: event.target.value as DifficultyFilter })}
                className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
              >
                <option value="all">Tất cả độ khó</option>
                <option value="easy">Dễ</option>
                <option value="medium">Trung bình</option>
                <option value="hard">Khó</option>
              </select>
            </label>

            <button
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="inline-flex h-10 min-w-[118px] items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
              Đặt lại
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Câu hỏi
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Khóa học / CDR
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Loại
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Độ khó
                </th>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Trạng thái
                </th>
                <th className="px-5 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loadingQuestions ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-600 dark:text-gray-300">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Đang tải ngân hàng câu hỏi...
                    </span>
                  </td>
                </tr>
              ) : visibleQuestions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14">
                    <div className="mx-auto max-w-md text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
                        <BookOpen className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 text-base font-bold text-gray-950 dark:text-white">
                        {hasActiveFilters ? 'Không có câu hỏi phù hợp với bộ lọc' : 'Chưa có câu hỏi trong ngân hàng'}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {hasActiveFilters
                          ? 'Thử đặt lại bộ lọc hoặc đổi từ khóa tìm kiếm.'
                          : 'Hãy tạo câu hỏi AI và duyệt câu hỏi trước.'}
                      </p>
                      {hasActiveFilters ? (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="mt-4 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          Đặt lại bộ lọc
                        </button>
                      ) : (
                        <Link
                          to="/ai-generation"
                          className="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                          Tạo câu hỏi AI
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                visibleQuestions.map((question) => {
                  const course = courseById.get(question.course_id);
                  const learningOutcome = learningOutcomeById.get(question.learning_outcome_id);
                  const courseLabel = question.course_code || course?.code || `Course #${question.course_id}`;
                  const learningOutcomeLabel =
                    question.learning_outcome_code || learningOutcome?.code || `CDR #${question.learning_outcome_id}`;
                  return (
                    <tr key={question.id} className="transition hover:bg-gray-50 dark:hover:bg-gray-700/40">
                      <td className="max-w-xl px-5 py-4">
                        <div className="line-clamp-2 text-sm font-semibold leading-6 text-gray-950 dark:text-white">
                          {question.question_text}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge className="bg-gray-50 text-gray-600 ring-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:ring-gray-700">
                            {question.created_by_ai ? 'AI tạo' : 'Thủ công'}
                          </Badge>
                          <Badge className="bg-gray-50 text-gray-600 ring-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:ring-gray-700">
                            {formatDate(question.created_at)}
                          </Badge>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="font-mono text-sm font-bold text-gray-950 dark:text-white">
                          {courseLabel}
                        </div>
                        <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {learningOutcomeLabel}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:ring-indigo-800">
                          {typeLabels[question.question_type]}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <Badge className={difficultyTone(question.difficulty)}>{difficultyLabels[question.difficulty]}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <Badge className={statusTone(question.status)}>{statusLabels[question.status]}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedQuestion(question)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/30"
                          aria-label={`Xem câu hỏi ${question.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Trang <span className="font-semibold">{filters.page}</span> / <span className="font-semibold">{totalPages}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filters.page_size}
              onChange={(event) => updateFilters({ page_size: Number(event.target.value) })}
              className="h-9 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
            </select>
            <button
              onClick={() => updateFilters({ page: Math.max(1, filters.page - 1) })}
              disabled={filters.page <= 1 || loadingQuestions}
              className="h-9 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Trước
            </button>
            <button
              onClick={() => updateFilters({ page: Math.min(totalPages, filters.page + 1) })}
              disabled={filters.page >= totalPages || loadingQuestions}
              className="h-9 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Sau
            </button>
          </div>
        </div>
      </section>

      {selectedQuestion && formData && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-950/45">
          <button className="hidden flex-1 cursor-default lg:block" aria-label="Đóng chi tiết" onClick={closeDetail} />
          <aside className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl dark:bg-gray-800">
            <div className="border-b border-gray-200 p-5 dark:border-gray-700">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className={statusTone(selectedQuestion.status)}>{statusLabels[selectedQuestion.status]}</Badge>
                    <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:ring-indigo-800">
                      {typeLabels[selectedQuestion.question_type]}
                    </Badge>
                    <Badge className={difficultyTone(selectedQuestion.difficulty)}>
                      {difficultyLabels[selectedQuestion.difficulty]}
                    </Badge>
                  </div>
                  <h2 className="mt-3 text-xl font-bold text-gray-950 dark:text-white">Chi tiết câu hỏi #{selectedQuestion.id}</h2>
                </div>
                <button
                  onClick={closeDetail}
                  className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  aria-label="Đóng chi tiết câu hỏi"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {selectedQuestion.status === 'pending_review' && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
                  Câu hỏi này đang chờ duyệt. Nên xử lý hàng đợi chính trong màn Duyệt câu hỏi.
                </div>
              )}
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
                  <div className="text-gray-500 dark:text-gray-400">Khóa học</div>
                  <div className="mt-1 font-semibold text-gray-950 dark:text-white">
                    {selectedQuestion.course_code ||
                      courseById.get(selectedQuestion.course_id)?.code ||
                      `Course #${selectedQuestion.course_id}`}
                  </div>
                  {(selectedQuestion.course_name || courseById.get(selectedQuestion.course_id)?.name) && (
                    <div className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                      {selectedQuestion.course_name || courseById.get(selectedQuestion.course_id)?.name}
                    </div>
                  )}
                </div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
                  <div className="text-gray-500 dark:text-gray-400">Chuẩn đầu ra</div>
                  <div className="mt-1 font-semibold text-gray-950 dark:text-white">
                    {selectedQuestion.learning_outcome_code ||
                      learningOutcomeById.get(selectedQuestion.learning_outcome_id)?.code ||
                      `CDR #${selectedQuestion.learning_outcome_id}`}
                  </div>
                  {(selectedQuestion.learning_outcome_description ||
                    learningOutcomeById.get(selectedQuestion.learning_outcome_id)?.description) && (
                    <div className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                      {selectedQuestion.learning_outcome_description ||
                        learningOutcomeById.get(selectedQuestion.learning_outcome_id)?.description}
                    </div>
                  )}
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-gray-800 dark:text-gray-200">Nội dung câu hỏi</span>
                {isEditing ? (
                  <textarea
                    value={formData.question_text}
                    onChange={(event) => setFormData((current) => current && { ...current, question_text: event.target.value })}
                    rows={5}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-6 text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
                  />
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-950 dark:border-gray-700 dark:bg-gray-900/40 dark:text-white">
                    {selectedQuestion.question_text}
                  </div>
                )}
              </label>

              {isEditing && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-gray-800 dark:text-gray-200">Loại câu hỏi</span>
                    <select
                      value={formData.question_type}
                      onChange={(event) => setQuestionType(event.target.value as QuestionType)}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
                    >
                      <option value="mcq">Trắc nghiệm</option>
                      <option value="essay">Tự luận</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-gray-800 dark:text-gray-200">Độ khó</span>
                    <select
                      value={formData.difficulty}
                      onChange={(event) =>
                        setFormData((current) => current && { ...current, difficulty: event.target.value as QuestionDifficulty })
                      }
                      className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
                    >
                      <option value="easy">Dễ</option>
                      <option value="medium">Trung bình</option>
                      <option value="hard">Khó</option>
                    </select>
                  </label>
                </div>
              )}

              {formData.question_type === 'mcq' ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Lựa chọn trả lời</h3>
                  {(formData.options || emptyOptions).map((option) => {
                    const isCorrect = formData.correct_answer === option.key;
                    return (
                      <div
                        key={option.key}
                        className={`flex gap-3 rounded-lg border p-3 ${
                          isCorrect
                            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-900/20'
                            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/30'
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            isCorrect
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'
                          }`}
                        >
                          {option.key}
                        </span>
                        {isEditing ? (
                          <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_132px]">
                            <input
                              value={option.text}
                              onChange={(event) => setOptionText(option.key, event.target.value)}
                              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
                            />
                            <button
                              type="button"
                              onClick={() => setFormData((current) => current && { ...current, correct_answer: option.key })}
                              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                                isCorrect
                                  ? 'border-emerald-500 bg-emerald-600 text-white'
                                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700'
                              }`}
                            >
                              Đáp án đúng
                            </button>
                          </div>
                        ) : (
                          <div className="pt-1 text-sm leading-6 text-gray-800 dark:text-gray-200">
                            {option.text}
                            {isCorrect && (
                              <span className="ml-2 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                                Đáp án đúng
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid gap-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-gray-800 dark:text-gray-200">Đáp án gợi ý</span>
                    {isEditing ? (
                      <textarea
                        value={formData.suggested_answer || ''}
                        onChange={(event) => setFormData((current) => current && { ...current, suggested_answer: event.target.value })}
                        rows={5}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-6 text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
                      />
                    ) : (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-800 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                        {selectedQuestion.suggested_answer || 'Chưa có đáp án gợi ý.'}
                      </div>
                    )}
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-sm font-bold text-gray-800 dark:text-gray-200">Rubric chấm điểm</span>
                    {isEditing ? (
                      <textarea
                        value={formData.grading_rubric || ''}
                        onChange={(event) => setFormData((current) => current && { ...current, grading_rubric: event.target.value })}
                        rows={5}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-6 text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
                      />
                    ) : (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-800 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                        {selectedQuestion.grading_rubric || 'Chưa có rubric chấm điểm.'}
                      </div>
                    )}
                  </label>
                </div>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-gray-800 dark:text-gray-200">Giải thích</span>
                {isEditing ? (
                  <textarea
                    value={formData.explanation || ''}
                    onChange={(event) => setFormData((current) => current && { ...current, explanation: event.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-6 text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
                  />
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-800 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                    {selectedQuestion.explanation || 'Chưa có giải thích.'}
                  </div>
                )}
              </label>
            </div>

            <div className="border-t border-gray-200 p-5 dark:border-gray-700">
              {isEditing ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => {
                      setFormData(toPayload(selectedQuestion));
                      setIsEditing(false);
                    }}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <X className="h-4 w-4" />
                    Hủy
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Lưu chỉnh sửa
                  </button>
                </div>
              ) : (
                <div className="grid gap-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <Edit className="h-4 w-4" />
                    Sửa câu hỏi
                  </button>

                  {selectedQuestion.status === 'pending_review' && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        onClick={() => void handleStatusChange('reject')}
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-900/20"
                      >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        Từ chối
                      </button>
                      <button
                        onClick={() => void handleStatusChange('approve')}
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Phê duyệt
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
