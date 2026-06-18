import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Edit, Loader2, Plus, Search, Target, Trash2, X } from 'lucide-react';
import { getCourses } from '@/api/courses';
import { getApiErrorMessage } from '@/api/client';
import {
  createLearningOutcome,
  deleteLearningOutcome,
  getLearningOutcomes,
  updateLearningOutcome,
} from '@/api/learningOutcomes';
import type { Course } from '@/types/course';
import type { BloomLevel, LearningOutcome, LearningOutcomePayload } from '@/types/learningOutcome';
import { useApp } from '../context/AppContext';

const bloomLevels: Array<{ value: BloomLevel; label: string }> = [
  { value: 'remember', label: 'Remember' },
  { value: 'understand', label: 'Understand' },
  { value: 'apply', label: 'Apply' },
  { value: 'analyze', label: 'Analyze' },
  { value: 'evaluate', label: 'Evaluate' },
  { value: 'create', label: 'Create' },
];

const emptyPayload: LearningOutcomePayload = {
  code: '',
  description: '',
  bloom_level: '',
};

export default function LearningOutcomes() {
  const { t } = useApp();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingLearningOutcomes, setLoadingLearningOutcomes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLearningOutcome, setEditingLearningOutcome] = useState<LearningOutcome | null>(null);
  const [formData, setFormData] = useState<LearningOutcomePayload>(emptyPayload);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LearningOutcome | null>(null);

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) || null;

  async function loadCourses() {
    setLoadingCourses(true);
    setError(null);
    try {
      const data = await getCourses();
      setCourses(data);
      setSelectedCourseId((current) => current || data[0]?.id || null);
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

  useEffect(() => {
    void loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      void loadLearningOutcomes(selectedCourseId);
    } else {
      setLearningOutcomes([]);
    }
  }, [selectedCourseId]);

  const filteredLearningOutcomes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return learningOutcomes;
    }

    return learningOutcomes.filter((learningOutcome) => {
      return (
        learningOutcome.code.toLowerCase().includes(term) ||
        learningOutcome.description.toLowerCase().includes(term) ||
        (learningOutcome.bloom_level || '').toLowerCase().includes(term)
      );
    });
  }, [learningOutcomes, searchTerm]);

  const openCreateForm = () => {
    setEditingLearningOutcome(null);
    setFormData(emptyPayload);
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
  };

  const openEditForm = (learningOutcome: LearningOutcome) => {
    setEditingLearningOutcome(learningOutcome);
    setFormData({
      code: learningOutcome.code,
      description: learningOutcome.description,
      bloom_level: learningOutcome.bloom_level || '',
    });
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingLearningOutcome(null);
    setFormData(emptyPayload);
    setIsSubmitting(false);
  };

  const handleCourseChange = (courseId: number) => {
    setSelectedCourseId(courseId);
    setSearchTerm('');
    closeForm();
    setDeleteTarget(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCourseId) {
      setError('Select a course before creating learning outcomes.');
      return;
    }

    const payload: LearningOutcomePayload = {
      code: formData.code.trim(),
      description: formData.description.trim(),
      bloom_level: formData.bloom_level || '',
    };

    if (!payload.code || !payload.description) {
      setError('LO code and description are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (editingLearningOutcome) {
        await updateLearningOutcome(editingLearningOutcome.id, payload);
        setSuccess('Learning outcome updated.');
      } else {
        await createLearningOutcome(selectedCourseId, payload);
        setSuccess('Learning outcome created.');
      }
      closeForm();
      await loadLearningOutcomes(selectedCourseId);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !selectedCourseId) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteLearningOutcome(deleteTarget.id);
      setSuccess('Learning outcome deleted.');
      setDeleteTarget(null);
      await loadLearningOutcomes(selectedCourseId);
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('lo.title')}</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Define measurable learning outcomes for each course before generating questions.
          </p>
        </div>
        <button
          onClick={openCreateForm}
          disabled={!selectedCourseId}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-5 w-5" />
          {t('lo.create')}
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Selected Course</div>
              <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                {selectedCourse ? selectedCourse.code : 'None'}
              </div>
            </div>
            <Target className="h-10 w-10 text-blue-600 opacity-20" />
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total LOs</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{learningOutcomes.length}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">Visible Results</div>
          <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {filteredLearningOutcomes.length}
          </div>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:grid-cols-[280px_1fr]">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Course</span>
          <select
            value={selectedCourseId || ''}
            onChange={(event) => handleCourseChange(Number(event.target.value))}
            disabled={loadingCourses || courses.length === 0}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            {loadingCourses ? (
              <option>Loading courses...</option>
            ) : courses.length === 0 ? (
              <option>No courses available</option>
            ) : (
              courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))
            )}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Search</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search learning outcomes..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
          </div>
        </label>
      </div>

      {isFormOpen && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {editingLearningOutcome ? 'Edit learning outcome' : 'Add learning outcome'}
            </h2>
            <button
              onClick={closeForm}
              className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="Close learning outcome form"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-[140px_1fr_200px_auto] lg:items-end">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Code</span>
              <input
                value={formData.code}
                onChange={(event) => setFormData((current) => ({ ...current, code: event.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="LO1"
                maxLength={50}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
              <input
                value={formData.description}
                onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Describe what students should be able to do"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Bloom Level</span>
              <select
                value={formData.bloom_level || ''}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, bloom_level: event.target.value as BloomLevel | '' }))
                }
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Not set</option>
                {bloomLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-w-28 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingLearningOutcome ? 'Save' : 'Create'}
            </button>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Bloom Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loadingLearningOutcomes ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-600 dark:text-gray-300">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading learning outcomes...
                    </span>
                  </td>
                </tr>
              ) : filteredLearningOutcomes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-600 dark:text-gray-300">
                    No learning outcomes found.
                  </td>
                </tr>
              ) : (
                filteredLearningOutcomes.map((learningOutcome) => (
                  <tr key={learningOutcome.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="font-mono font-semibold text-gray-900 dark:text-white">
                        {learningOutcome.code}
                      </span>
                    </td>
                    <td className="max-w-3xl px-6 py-4 text-gray-700 dark:text-gray-300">
                      {learningOutcome.description}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {learningOutcome.bloom_level ? (
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium capitalize text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {learningOutcome.bloom_level}
                        </span>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditForm(learningOutcome)}
                          className="rounded p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                          aria-label={`Edit ${learningOutcome.code}`}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(learningOutcome)}
                          className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                          aria-label={`Delete ${learningOutcome.code}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Delete learning outcome</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Delete <span className="font-semibold">{deleteTarget.code}</span>? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
