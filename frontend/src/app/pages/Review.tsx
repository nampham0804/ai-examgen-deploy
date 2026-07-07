import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import {
  AlertCircle,
  CheckCircle,
  Edit,
  Filter,
  Loader2,
  RefreshCcw,
  Save,
  Search,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { approveQuestion, getQuestions, rejectQuestion, updateQuestion } from '@/api/questions';
import { getApiErrorMessage } from '@/api/client';
import type {
  Question,
  QuestionDifficulty,
  QuestionOption,
  QuestionPayload,
  QuestionType,
} from '@/types/question';

const emptyOptionSet: QuestionOption[] = [
  { key: 'A', text: '' },
  { key: 'B', text: '' },
  { key: 'C', text: '' },
  { key: 'D', text: '' },
];

const questionTypeLabels: Record<QuestionType, string> = {
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
    options: question.question_type === 'mcq' ? question.options || emptyOptionSet : null,
    correct_answer: question.question_type === 'mcq' ? question.correct_answer || 'A' : null,
    suggested_answer: question.suggested_answer || '',
    grading_rubric: question.grading_rubric || '',
    explanation: question.explanation || '',
  };
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

export default function Review() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reviewProgress, setReviewProgress] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<QuestionPayload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState<number | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<QuestionType | 'all'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<QuestionDifficulty | 'all'>('all');
  const [rejectTarget, setRejectTarget] = useState<Question | null>(null);

  const selectedQuestion = useMemo(
    () => questions.find((question) => question.id === selectedQuestionId) || null,
    [questions, selectedQuestionId],
  );

  const courseOptions = useMemo(
    () => Array.from(new Set(questions.map((question) => question.course_id))).sort((a, b) => a - b),
    [questions],
  );

  const filteredQuestions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return questions.filter((question) => {
      const matchesSearch =
        !normalizedSearch ||
        question.question_text.toLowerCase().includes(normalizedSearch) ||
        `course #${question.course_id}`.includes(normalizedSearch) ||
        `cdr #${question.learning_outcome_id}`.includes(normalizedSearch);
      const matchesCourse = courseFilter === 'all' || question.course_id === courseFilter;
      const matchesType = typeFilter === 'all' || question.question_type === typeFilter;
      const matchesDifficulty = difficultyFilter === 'all' || question.difficulty === difficultyFilter;

      return matchesSearch && matchesCourse && matchesType && matchesDifficulty;
    });
  }, [courseFilter, difficultyFilter, questions, searchTerm, typeFilter]);

  async function loadPendingQuestions(selectFirst = true) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setReviewProgress(null);
    try {
      const data = await getQuestions({ status: 'pending_review', page: 1, page_size: 50 });
      setQuestions(data.items);
      if (selectFirst) {
        setSelectedQuestionId(data.items[0]?.id || null);
        setIsEditing(false);
        setFormData(data.items[0] ? toPayload(data.items[0]) : null);
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPendingQuestions();
  }, []);

  useEffect(() => {
    if (selectedQuestion) {
      setFormData(toPayload(selectedQuestion));
      setIsEditing(false);
    } else {
      setFormData(null);
    }
  }, [selectedQuestion]);

  const setQuestionType = (questionType: QuestionType) => {
    setFormData((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        question_type: questionType,
        options: questionType === 'mcq' ? current.options || emptyOptionSet : null,
        correct_answer: questionType === 'mcq' ? current.correct_answer || 'A' : null,
        suggested_answer: questionType === 'essay' ? current.suggested_answer || '' : current.suggested_answer,
        grading_rubric: questionType === 'essay' ? current.grading_rubric || '' : current.grading_rubric,
      };
    });
  };

  const setOptionText = (key: QuestionOption['key'], text: string) => {
    setFormData((current) => {
      if (!current) {
        return current;
      }

      const options = current.options || emptyOptionSet;
      return {
        ...current,
        options: options.map((option) => (option.key === key ? { ...option, text } : option)),
      };
    });
  };

  const validateForm = () => {
    if (!formData) {
      return 'Hãy chọn câu hỏi trước.';
    }
    if (!formData.question_text.trim()) {
      return 'Nội dung câu hỏi là bắt buộc.';
    }
    if (formData.question_type === 'mcq') {
      if (!formData.options || formData.options.length !== 4 || formData.options.some((option) => !option.text.trim())) {
        return 'Câu trắc nghiệm cần đủ 4 lựa chọn.';
      }
      if (!formData.correct_answer) {
        return 'Câu trắc nghiệm cần có đáp án đúng.';
      }
    }
    if (formData.question_type === 'essay' && !formData.suggested_answer?.trim() && !formData.grading_rubric?.trim()) {
      return 'Câu tự luận cần có đáp án gợi ý hoặc rubric chấm điểm.';
    }
    return null;
  };

  const handleSave = async () => {
    if (!selectedQuestion || !formData) {
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: QuestionPayload = {
        ...formData,
        question_text: formData.question_text.trim(),
        options:
          formData.question_type === 'mcq'
            ? (formData.options || emptyOptionSet).map((option) => ({ ...option, text: option.text.trim() }))
            : null,
        correct_answer: formData.question_type === 'mcq' ? formData.correct_answer : null,
        suggested_answer: formData.suggested_answer?.trim() || null,
        grading_rubric: formData.grading_rubric?.trim() || null,
        explanation: formData.explanation?.trim() || null,
      };
      const updated = await updateQuestion(selectedQuestion.id, payload);
      setQuestions((current) => current.map((question) => (question.id === updated.id ? updated : question)));
      setSuccess('Đã lưu chỉnh sửa câu hỏi.');
      setIsEditing(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeReviewedQuestion = (questionId: number, actionLabel: 'phê duyệt' | 'từ chối') => {
    setQuestions((current) => {
      const next = current.filter((question) => question.id !== questionId);
      setSelectedQuestionId(next[0]?.id || null);
      setReviewProgress(`Đã ${actionLabel} 1 câu. Còn ${next.length} câu chờ duyệt.`);
      return next;
    });
    setIsEditing(false);
  };

  const handleApprove = async () => {
    if (!selectedQuestion) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await approveQuestion(selectedQuestion.id);
      removeReviewedQuestion(selectedQuestion.id, 'phê duyệt');
      setSuccess('Câu hỏi đã được phê duyệt và chuyển vào ngân hàng câu hỏi.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmReject = async () => {
    if (!rejectTarget) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await rejectQuestion(rejectTarget.id);
      removeReviewedQuestion(rejectTarget.id, 'từ chối');
      setSuccess('Câu hỏi đã được từ chối và rời khỏi danh sách chờ duyệt.');
      setRejectTarget(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setCourseFilter('all');
    setTypeFilter('all');
    setDifficultyFilter('all');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-800">
            <Sparkles className="h-4 w-4" />
            Hàng đợi duyệt
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-950 dark:text-white">Duyệt câu hỏi</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-400">
            Kiểm tra, chỉnh sửa và phê duyệt câu hỏi trước khi đưa vào ngân hàng câu hỏi.
          </p>
        </div>

        <button
          onClick={() => void loadPendingQuestions()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Làm mới
        </button>
      </div>

      {(error || success || reviewProgress) && (
        <div className="space-y-3">
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
          {reviewProgress && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-medium text-blue-700 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300">
              {reviewProgress}
            </div>
          )}
        </div>
      )}

      <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="grid gap-3 lg:grid-cols-[1fr_160px_150px_150px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm câu hỏi đang chờ duyệt..."
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

          <select
            value={courseFilter}
            onChange={(event) => setCourseFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))}
            className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
          >
            <option value="all">Tất cả khóa học</option>
            {courseOptions.map((courseId) => (
              <option key={courseId} value={courseId}>
                Course #{courseId}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as QuestionType | 'all')}
            className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
          >
            <option value="all">Tất cả loại</option>
            <option value="mcq">Trắc nghiệm</option>
            <option value="essay">Tự luận</option>
          </select>

          <select
            value={difficultyFilter}
            onChange={(event) => setDifficultyFilter(event.target.value as QuestionDifficulty | 'all')}
            className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
          >
            <option value="all">Tất cả độ khó</option>
            <option value="easy">Dễ</option>
            <option value="medium">Trung bình</option>
            <option value="hard">Khó</option>
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <Filter className="h-4 w-4" />
            Đặt lại
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
        <aside className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
            <div>
              <h2 className="text-sm font-bold text-gray-950 dark:text-white">Chờ duyệt</h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {filteredQuestions.length} / {questions.length} câu hỏi
              </p>
            </div>
            <Badge className="bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-800">
              pending
            </Badge>
          </div>

          <div className="max-h-[660px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-gray-600 dark:text-gray-300">
                <Loader2 className="h-5 w-5 animate-spin" />
                Đang tải câu hỏi...
              </div>
            ) : questions.length === 0 ? (
              <div className="p-6 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-gray-950 dark:text-white">Không còn câu hỏi chờ duyệt</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Câu hỏi mới được tạo từ màn Tạo câu hỏi AI sẽ xuất hiện tại đây.
                </p>
                <Link
                  to="/ai-generation"
                  className="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Tạo câu hỏi AI
                </Link>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="p-6 text-center">
                <h3 className="text-sm font-bold text-gray-950 dark:text-white">Không có câu hỏi phù hợp</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Thử đặt lại bộ lọc hoặc đổi từ khóa tìm kiếm.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            ) : (
              filteredQuestions.map((question) => (
                <button
                  key={question.id}
                  onClick={() => setSelectedQuestionId(question.id)}
                  className={`block w-full border-b border-gray-100 p-4 text-left transition dark:border-gray-700 ${
                    selectedQuestionId === question.id
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="line-clamp-2 text-sm font-semibold leading-6 text-gray-950 dark:text-white">
                    {question.question_text}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge className="bg-gray-50 text-gray-600 ring-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:ring-gray-700">
                      Course #{question.course_id}
                    </Badge>
                    <Badge className="bg-gray-50 text-gray-600 ring-gray-200 dark:bg-gray-900/50 dark:text-gray-300 dark:ring-gray-700">
                      CDR #{question.learning_outcome_id}
                    </Badge>
                    <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:ring-indigo-800">
                      {questionTypeLabels[question.question_type]}
                    </Badge>
                    <Badge className={difficultyTone(question.difficulty)}>{difficultyLabels[question.difficulty]}</Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="min-h-[620px] rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {!selectedQuestion || !formData ? (
            <div className="flex min-h-[620px] items-center justify-center p-8 text-center">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold text-gray-950 dark:text-white">Chọn một câu hỏi để duyệt</h3>
                <p className="mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-400">
                  Câu hỏi đang chờ duyệt sẽ hiện ở danh sách bên trái.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[620px] flex-col">
              <div className="border-b border-gray-200 p-5 dark:border-gray-700">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-800">
                        Chờ duyệt
                      </Badge>
                      <Badge className="bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:ring-indigo-800">
                        {questionTypeLabels[selectedQuestion.question_type]}
                      </Badge>
                      <Badge className={difficultyTone(selectedQuestion.difficulty)}>
                        {difficultyLabels[selectedQuestion.difficulty]}
                      </Badge>
                    </div>
                    <h2 className="mt-3 text-xl font-bold text-gray-950 dark:text-white">Câu hỏi #{selectedQuestion.id}</h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Course #{selectedQuestion.course_id} / CDR #{selectedQuestion.learning_outcome_id}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => {
                            setFormData(toPayload(selectedQuestion));
                            setIsEditing(false);
                            setError(null);
                          }}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                        >
                          <X className="h-4 w-4" />
                          Hủy
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={isSubmitting}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Lưu
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setIsEditing(true)}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        <Edit className="h-4 w-4" />
                        Sửa câu hỏi
                      </button>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300">
                    Bạn đang chỉnh sửa. Hãy lưu hoặc hủy trước khi duyệt.
                  </div>
                )}
              </div>

              <section className="flex-1 space-y-5 p-5">
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
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-base leading-7 text-gray-950 dark:border-gray-700 dark:bg-gray-900/40 dark:text-white">
                      {selectedQuestion.question_text}
                    </div>
                  )}
                </label>

                {isEditing && (
                  <div className="grid gap-4 md:grid-cols-2">
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
                    <div className="grid gap-3">
                      {(formData.options || emptyOptionSet).map((option) => {
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
                              <div className="grid flex-1 gap-2 md:grid-cols-[1fr_132px]">
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
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-gray-800 dark:text-gray-200">Đáp án gợi ý</span>
                      {isEditing ? (
                        <textarea
                          value={formData.suggested_answer || ''}
                          onChange={(event) =>
                            setFormData((current) => current && { ...current, suggested_answer: event.target.value })
                          }
                          rows={6}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-6 text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
                        />
                      ) : (
                        <div className="min-h-32 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-800 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                          {selectedQuestion.suggested_answer || 'Chưa có đáp án gợi ý.'}
                        </div>
                      )}
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold text-gray-800 dark:text-gray-200">Rubric chấm điểm</span>
                      {isEditing ? (
                        <textarea
                          value={formData.grading_rubric || ''}
                          onChange={(event) =>
                            setFormData((current) => current && { ...current, grading_rubric: event.target.value })
                          }
                          rows={6}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm leading-6 text-gray-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-900/40"
                        />
                      ) : (
                        <div className="min-h-32 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-800 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
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
              </section>

              <div className="flex flex-col gap-3 border-t border-gray-200 p-5 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isEditing ? 'Lưu hoặc hủy chỉnh sửa trước khi phê duyệt.' : 'Phê duyệt để đưa câu hỏi vào ngân hàng câu hỏi.'}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => setRejectTarget(selectedQuestion)}
                    disabled={isSubmitting || isEditing}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/60 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-900/20"
                  >
                    <XCircle className="h-4 w-4" />
                    Từ chối
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={isSubmitting || isEditing}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Phê duyệt
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 px-4">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-950 dark:text-white">Từ chối câu hỏi này?</h2>
                <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-400">
                  Câu hỏi sẽ rời khỏi danh sách chờ duyệt. Bạn vẫn có thể tạo lại hoặc chỉnh sửa câu hỏi khác sau đó.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                disabled={isSubmitting}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Từ chối câu hỏi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
