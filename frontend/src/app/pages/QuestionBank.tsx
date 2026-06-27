import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
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
import { useApp } from '../context/AppContext';

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

function formatLabel(value: string) {
  return value.replaceAll('_', ' ');
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'Not set';
  }
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(value));
}

function getStatusClasses(status: QuestionStatus) {
  const classes = {
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    pending_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };
  return classes[status];
}

function getDifficultyClasses(difficulty: QuestionDifficulty) {
  const classes = {
    easy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };
  return classes[difficulty];
}

function validatePayload(payload: QuestionPayload) {
  if (!payload.question_text.trim()) {
    return 'Question text is required.';
  }
  if (payload.question_type === 'mcq') {
    if (!payload.options || payload.options.length !== 4 || payload.options.some((option) => !option.text.trim())) {
      return 'MCQ questions need 4 non-empty options.';
    }
    if (!payload.correct_answer) {
      return 'MCQ questions need a correct answer.';
    }
  }
  if (payload.question_type === 'essay' && !payload.suggested_answer?.trim() && !payload.grading_rubric?.trim()) {
    return 'Essay questions need a suggested answer or grading rubric.';
  }
  return null;
}

export default function QuestionBank() {
  const { t } = useApp();
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
        course?.code.toLowerCase().includes(term) ||
        learningOutcome?.code.toLowerCase().includes(term)
      );
    });
  }, [courseById, learningOutcomeById, questions, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(total / filters.page_size));
  const selectedCourse = filters.course_id === 'all' ? null : courseById.get(filters.course_id) || null;

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
          return data.items[0] || null;
        }
        return data.items.find((question) => question.id === current.id) || data.items[0] || null;
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
      page: update.page || 1,
    }));
    setSuccess(null);
  }

  function resetFilters() {
    setFilters(defaultFilters);
    setSearchTerm('');
    setLearningOutcomes([]);
    setSuccess(null);
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
      setSuccess('Question updated.');
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
      setSuccess(action === 'approve' ? 'Question approved.' : 'Question rejected.');
      await loadQuestions(filters);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('bank.title')}</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Browse approved questions, inspect details, and keep the bank ready for blueprint validation.
          </p>
        </div>
        <button
          onClick={() => void loadQuestions(filters)}
          disabled={loadingQuestions}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {loadingQuestions ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      {(error || success) && (
        <div
          className={`flex items-start gap-3 rounded-lg border p-4 ${
            error
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300'
              : 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300'
          }`}
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <span>{error || success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Matches</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{total}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">Visible Results</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{visibleQuestions.length}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">Selected Course</div>
          <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
            {selectedCourse ? selectedCourse.code : 'All'}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">Default Bank View</div>
          <div className="mt-2 text-xl font-bold capitalize text-green-600 dark:text-green-300">
            {formatLabel(filters.status)}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(140px,1fr))_auto]">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Search</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search current page..."
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Course</span>
            <select
              value={filters.course_id}
              onChange={(event) => handleCourseChange(event.target.value)}
              disabled={loadingCourses}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">{loadingCourses ? 'Loading...' : 'All courses'}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Learning Outcome</span>
            <select
              value={filters.learning_outcome_id}
              onChange={(event) =>
                updateFilters({ learning_outcome_id: event.target.value === 'all' ? 'all' : Number(event.target.value) })
              }
              disabled={filters.course_id === 'all' || loadingLearningOutcomes}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">
                {filters.course_id === 'all'
                  ? 'Select course'
                  : loadingLearningOutcomes
                    ? 'Loading...'
                    : 'All LOs'}
              </option>
              {learningOutcomes.map((learningOutcome) => (
                <option key={learningOutcome.id} value={learningOutcome.id}>
                  {learningOutcome.code}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Type</span>
            <select
              value={filters.question_type}
              onChange={(event) => updateFilters({ question_type: event.target.value as TypeFilter })}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All types</option>
              <option value="mcq">MCQ</option>
              <option value="essay">Essay</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty</span>
            <select
              value={filters.difficulty}
              onChange={(event) => updateFilters({ difficulty: event.target.value as DifficultyFilter })}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All levels</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
            <select
              value={filters.status}
              onChange={(event) => updateFilters({ status: event.target.value as StatusFilter })}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending_review">Pending review</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.65fr)]">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Question
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Course / LO
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Difficulty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loadingQuestions ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-600 dark:text-gray-300">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading questions...
                      </span>
                    </td>
                  </tr>
                ) : visibleQuestions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-600 dark:text-gray-300">
                      No questions found.
                    </td>
                  </tr>
                ) : (
                  visibleQuestions.map((question) => {
                    const course = courseById.get(question.course_id);
                    const learningOutcome = learningOutcomeById.get(question.learning_outcome_id);
                    return (
                      <tr key={question.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="max-w-xl px-6 py-4">
                          <div className="line-clamp-2 font-medium text-gray-900 dark:text-white">
                            {question.question_text}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                              {question.created_by_ai ? 'AI generated' : 'Manual'}
                            </span>
                            <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                              {formatDate(question.created_at)}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="font-mono font-semibold text-gray-900 dark:text-white">
                            {course ? course.code : `Course #${question.course_id}`}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {learningOutcome ? learningOutcome.code : `LO #${question.learning_outcome_id}`}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium uppercase text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {question.question_type}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${getDifficultyClasses(question.difficulty)}`}>
                            {question.difficulty}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${getStatusClasses(question.status)}`}>
                            {formatLabel(question.status)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <button
                            onClick={() => setSelectedQuestion(question)}
                            className="rounded p-1 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                            aria-label={`View question ${question.id}`}
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

          <div className="flex flex-col gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Page <span className="font-semibold">{filters.page}</span> of <span className="font-semibold">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filters.page_size}
                onChange={(event) => updateFilters({ page_size: Number(event.target.value) })}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <button
                onClick={() => updateFilters({ page: Math.max(1, filters.page - 1) })}
                disabled={filters.page <= 1 || loadingQuestions}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <button
                onClick={() => updateFilters({ page: Math.min(totalPages, filters.page + 1) })}
                disabled={filters.page >= totalPages || loadingQuestions}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <aside className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {!selectedQuestion || !formData ? (
            <div className="flex min-h-96 items-center justify-center p-8 text-center text-gray-600 dark:text-gray-300">
              Select a question to inspect its full content.
            </div>
          ) : (
            <div className="space-y-5 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${getStatusClasses(selectedQuestion.status)}`}>
                      {formatLabel(selectedQuestion.status)}
                    </span>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium uppercase text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {selectedQuestion.question_type}
                    </span>
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Question #{selectedQuestion.id}</h2>
                </div>
                <button
                  onClick={() => {
                    setSelectedQuestion(null);
                    setIsEditing(false);
                  }}
                  className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  aria-label="Close question detail"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
                  <div className="text-gray-500 dark:text-gray-400">Course</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {courseById.get(selectedQuestion.course_id)?.code || `#${selectedQuestion.course_id}`}
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
                  <div className="text-gray-500 dark:text-gray-400">Learning Outcome</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {learningOutcomeById.get(selectedQuestion.learning_outcome_id)?.code || `#${selectedQuestion.learning_outcome_id}`}
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Question Text</span>
                {isEditing ? (
                  <textarea
                    value={formData.question_text}
                    onChange={(event) => setFormData((current) => current && { ...current, question_text: event.target.value })}
                    rows={5}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-900 dark:border-gray-700 dark:bg-gray-900/40 dark:text-white">
                    {selectedQuestion.question_text}
                  </div>
                )}
              </label>

              {isEditing && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Type</span>
                    <select
                      value={formData.question_type}
                      onChange={(event) => setQuestionType(event.target.value as QuestionType)}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="mcq">MCQ</option>
                      <option value="essay">Essay</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty</span>
                    <select
                      value={formData.difficulty}
                      onChange={(event) =>
                        setFormData((current) => current && { ...current, difficulty: event.target.value as QuestionDifficulty })
                      }
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </label>
                </div>
              )}

              {formData.question_type === 'mcq' ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Options</h3>
                  {(formData.options || emptyOptions).map((option) => (
                    <div key={option.key} className="flex gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <span
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                          formData.correct_answer === option.key
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {option.key}
                      </span>
                      {isEditing ? (
                        <div className="grid flex-1 gap-2">
                          <input
                            value={option.text}
                            onChange={(event) => setOptionText(option.key, event.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                          />
                          <button
                            onClick={() => setFormData((current) => current && { ...current, correct_answer: option.key })}
                            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                              formData.correct_answer === option.key
                                ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                            }`}
                          >
                            Mark correct
                          </button>
                        </div>
                      ) : (
                        <span className="pt-1 text-gray-800 dark:text-gray-200">{option.text}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Suggested Answer</span>
                    {isEditing ? (
                      <textarea
                        value={formData.suggested_answer || ''}
                        onChange={(event) => setFormData((current) => current && { ...current, suggested_answer: event.target.value })}
                        rows={5}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    ) : (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-800 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                        {selectedQuestion.suggested_answer || 'No suggested answer.'}
                      </div>
                    )}
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Grading Rubric</span>
                    {isEditing ? (
                      <textarea
                        value={formData.grading_rubric || ''}
                        onChange={(event) => setFormData((current) => current && { ...current, grading_rubric: event.target.value })}
                        rows={5}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      />
                    ) : (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-800 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                        {selectedQuestion.grading_rubric || 'No rubric.'}
                      </div>
                    )}
                  </label>
                </div>
              )}

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Explanation</span>
                {isEditing ? (
                  <textarea
                    value={formData.explanation || ''}
                    onChange={(event) => setFormData((current) => current && { ...current, explanation: event.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-800 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                    {selectedQuestion.explanation || 'No explanation.'}
                  </div>
                )}
              </label>

              <div className="grid gap-3 border-t border-gray-200 pt-5 dark:border-gray-700">
                {isEditing ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setFormData(toPayload(selectedQuestion));
                        setIsEditing(false);
                      }}
                      disabled={isSubmitting}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSubmitting}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Edit question
                  </button>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    onClick={() => void handleStatusChange('reject')}
                    disabled={isSubmitting || isEditing}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Reject
                  </button>
                  <button
                    onClick={() => void handleStatusChange('approve')}
                    disabled={isSubmitting || isEditing}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Approve
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
