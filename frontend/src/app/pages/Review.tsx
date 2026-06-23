import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Edit,
  Loader2,
  Save,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { approveQuestion, getQuestions, rejectQuestion, updateQuestion } from '@/api/questions';
import { getApiErrorMessage } from '@/api/client';
import type { Question, QuestionDifficulty, QuestionOption, QuestionPayload, QuestionType } from '@/types/question';
import { useApp } from '../context/AppContext';

const emptyOptionSet: QuestionOption[] = [
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
    options: question.question_type === 'mcq' ? question.options || emptyOptionSet : null,
    correct_answer: question.question_type === 'mcq' ? question.correct_answer || 'A' : null,
    suggested_answer: question.suggested_answer || '',
    grading_rubric: question.grading_rubric || '',
    explanation: question.explanation || '',
  };
}

function formatLabel(value: string) {
  return value.replace('_', ' ');
}

export default function Review() {
  const { t } = useApp();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<QuestionPayload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedQuestion = useMemo(
    () => questions.find((question) => question.id === selectedQuestionId) || null,
    [questions, selectedQuestionId],
  );

  async function loadPendingQuestions(selectFirst = true) {
    setLoading(true);
    setError(null);
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
  }, [selectedQuestionId]);

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
      return 'Select a question first.';
    }
    if (!formData.question_text.trim()) {
      return 'Question text is required.';
    }
    if (formData.question_type === 'mcq') {
      if (!formData.options || formData.options.length !== 4 || formData.options.some((option) => !option.text.trim())) {
        return 'MCQ questions need 4 non-empty options.';
      }
      if (!formData.correct_answer) {
        return 'MCQ questions need a correct answer.';
      }
    }
    if (formData.question_type === 'essay' && !formData.suggested_answer?.trim() && !formData.grading_rubric?.trim()) {
      return 'Essay questions need a suggested answer or grading rubric.';
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
      setSuccess('Question updated.');
      setIsEditing(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeReviewedQuestion = (questionId: number) => {
    setQuestions((current) => {
      const next = current.filter((question) => question.id !== questionId);
      setSelectedQuestionId(next[0]?.id || null);
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
      removeReviewedQuestion(selectedQuestion.id);
      setSuccess('Question approved.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedQuestion) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await rejectQuestion(selectedQuestion.id);
      removeReviewedQuestion(selectedQuestion.id);
      setSuccess('Question rejected.');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('review.title')}</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Review AI-generated questions before they enter the approved question bank.
          </p>
        </div>
        <button
          onClick={() => void loadPendingQuestions()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 p-4 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Pending Review</div>
            <div className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{questions.length}</div>
          </div>

          <div className="max-h-[640px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-gray-600 dark:text-gray-300">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading questions...
              </div>
            ) : questions.length === 0 ? (
              <div className="p-8 text-center text-gray-600 dark:text-gray-300">
                No pending questions.
              </div>
            ) : (
              questions.map((question) => (
                <button
                  key={question.id}
                  onClick={() => setSelectedQuestionId(question.id)}
                  className={`block w-full border-b border-gray-100 p-4 text-left transition-colors dark:border-gray-700 ${
                    selectedQuestionId === question.id
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="line-clamp-2 font-medium text-gray-900 dark:text-white">{question.question_text}</div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      Course #{question.course_id}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-1 font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      LO #{question.learning_outcome_id}
                    </span>
                    <span className="rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {question.question_type}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                      {question.difficulty}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          {!selectedQuestion || !formData ? (
            <div className="flex min-h-96 items-center justify-center p-8 text-gray-600 dark:text-gray-300">
              Select a pending question to review.
            </div>
          ) : (
            <div className="space-y-6 p-6">
              <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 dark:border-gray-700 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {formatLabel(selectedQuestion.status)}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {selectedQuestion.question_type}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {selectedQuestion.difficulty}
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Question #{selectedQuestion.id}</h2>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Course #{selectedQuestion.course_id} / LO #{selectedQuestion.learning_outcome_id}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => {
                          setFormData(toPayload(selectedQuestion));
                          setIsEditing(false);
                        }}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                  )}
                </div>
              </div>

              <section className="space-y-4">
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
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Question Type</span>
                      <select
                        value={formData.question_type}
                        onChange={(event) => setQuestionType(event.target.value as QuestionType)}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="mcq">mcq</option>
                        <option value="essay">essay</option>
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
                        <option value="easy">easy</option>
                        <option value="medium">medium</option>
                        <option value="hard">hard</option>
                      </select>
                    </label>
                  </div>
                )}

                {formData.question_type === 'mcq' ? (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Options</h3>
                    {(formData.options || emptyOptionSet).map((option) => (
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
                          <div className="grid flex-1 gap-2 md:grid-cols-[1fr_120px]">
                            <input
                              value={option.text}
                              onChange={(event) => setOptionText(option.key, event.target.value)}
                              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => setFormData((current) => current && { ...current, correct_answer: option.key })}
                              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                                formData.correct_answer === option.key
                                  ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                                  : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                              }`}
                            >
                              Correct
                            </button>
                          </div>
                        ) : (
                          <span className="pt-1 text-gray-800 dark:text-gray-200">{option.text}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Suggested Answer</span>
                      {isEditing ? (
                        <textarea
                          value={formData.suggested_answer || ''}
                          onChange={(event) =>
                            setFormData((current) => current && { ...current, suggested_answer: event.target.value })
                          }
                          rows={6}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <div className="min-h-32 rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-800 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                          {selectedQuestion.suggested_answer || 'No suggested answer.'}
                        </div>
                      )}
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Grading Rubric</span>
                      {isEditing ? (
                        <textarea
                          value={formData.grading_rubric || ''}
                          onChange={(event) =>
                            setFormData((current) => current && { ...current, grading_rubric: event.target.value })
                          }
                          rows={6}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <div className="min-h-32 rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-800 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
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
              </section>

              <div className="flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-gray-700 sm:flex-row sm:justify-end">
                <button
                  onClick={handleReject}
                  disabled={isSubmitting || isEditing}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <XCircle className="h-5 w-5" />}
                  {t('review.reject')} Question
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isSubmitting || isEditing}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
                  {t('review.approve')} Question
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
