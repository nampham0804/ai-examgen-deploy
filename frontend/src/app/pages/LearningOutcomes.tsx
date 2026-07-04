import { FormEvent, useEffect, useMemo, useState } from 'react';
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

const bloomLevels: Array<{ value: BloomLevel; label: string; hint: string }> = [
  { value: 'remember', label: 'Remember', hint: 'Nhớ' },
  { value: 'understand', label: 'Understand', hint: 'Hiểu' },
  { value: 'apply', label: 'Apply', hint: 'Áp dụng' },
  { value: 'analyze', label: 'Analyze', hint: 'Phân tích' },
  { value: 'evaluate', label: 'Evaluate', hint: 'Đánh giá' },
  { value: 'create', label: 'Create', hint: 'Sáng tạo' },
];

const emptyPayload: LearningOutcomePayload = {
  code: '',
  description: '',
  bloom_level: '',
};

function getBloomLabel(value?: BloomLevel | null) {
  if (!value) {
    return 'Chưa thiết lập';
  }
  const level = bloomLevels.find((item) => item.value === value);
  return level ? `${level.hint} (${level.label})` : value;
}

export default function LearningOutcomes() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [learningOutcomes, setLearningOutcomes] = useState<LearningOutcome[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingLearningOutcomes, setLoadingLearningOutcomes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
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
        (learningOutcome.bloom_level || '').toLowerCase().includes(term) ||
        getBloomLabel(learningOutcome.bloom_level).toLowerCase().includes(term)
      );
    });
  }, [learningOutcomes, searchTerm]);

  const hasSearch = searchTerm.trim().length > 0;

  const openCreateForm = () => {
    setEditingLearningOutcome(null);
    setFormData(emptyPayload);
    setFormError(null);
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
    setFormError(null);
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingLearningOutcome(null);
    setFormData(emptyPayload);
    setFormError(null);
    setIsSubmitting(false);
  };

  const handleCourseChange = (courseId: number) => {
    setSelectedCourseId(courseId);
    setSearchTerm('');
    closeForm();
    setDeleteTarget(null);
    setSuccess(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCourseId) {
      setFormError('Hãy chọn khóa học trước khi tạo chuẩn đầu ra.');
      return;
    }

    const payload: LearningOutcomePayload = {
      code: formData.code.trim(),
      description: formData.description.trim(),
      bloom_level: formData.bloom_level || '',
    };

    if (!payload.code || !payload.description) {
      setFormError('Vui lòng nhập mã CDR và mô tả chuẩn đầu ra.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setSuccess(null);

    try {
      if (editingLearningOutcome) {
        await updateLearningOutcome(editingLearningOutcome.id, payload);
        setSuccess('Đã cập nhật chuẩn đầu ra.');
      } else {
        await createLearningOutcome(selectedCourseId, payload);
        setSuccess('Đã tạo chuẩn đầu ra.');
      }
      closeForm();
      await loadLearningOutcomes(selectedCourseId);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
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
      setSuccess('Đã xóa chuẩn đầu ra.');
      setDeleteTarget(null);
      await loadLearningOutcomes(selectedCourseId);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-1.5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            <Target className="h-4 w-4" />
            Gắn với khóa học
          </div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Chuẩn đầu ra</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Quản lý mục tiêu học tập dùng để định hướng câu hỏi và ma trận đề.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          disabled={!selectedCourseId}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Thêm chuẩn đầu ra
        </button>
      </section>

      {(error || success) && (
        <div
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
            error
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
              : 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300'
          }`}
        >
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <span>{error || success}</span>
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 lg:grid-cols-[320px_1fr_auto] lg:items-end">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Khóa học đang làm việc
            </span>
            <select
              value={selectedCourseId || ''}
              onChange={(event) => handleCourseChange(Number(event.target.value))}
              disabled={loadingCourses || courses.length === 0}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {loadingCourses ? (
                <option>Đang tải khóa học...</option>
              ) : courses.length === 0 ? (
                <option>Chưa có khóa học</option>
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
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Tìm kiếm</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã CDR, mô tả hoặc Bloom..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-10 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              {hasSearch && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  aria-label="Xóa nội dung tìm kiếm"
                  title="Xóa tìm kiếm"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </label>

          <div className="rounded-lg bg-slate-50 px-4 py-2.5 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            <div className="font-semibold text-slate-950 dark:text-white">{filteredLearningOutcomes.length} kết quả</div>
            <div>{learningOutcomes.length} chuẩn đầu ra</div>
          </div>
        </div>
      </section>

      {courses.length === 0 && !loadingCourses && (
        <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <Target className="mx-auto mb-3 h-10 w-10 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Hãy tạo khóa học trước</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Chuẩn đầu ra phải thuộc về một khóa học. Sau khi có khóa học, bạn có thể quay lại đây để khai báo CDR.
          </p>
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2.5 text-left">Mã CDR</th>
                <th className="px-4 py-2.5 text-left">Mô tả</th>
                <th className="px-4 py-2.5 text-left">Bloom level</th>
                <th className="px-4 py-2.5 text-left">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loadingLearningOutcomes ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Đang tải chuẩn đầu ra...
                    </span>
                  </td>
                </tr>
              ) : filteredLearningOutcomes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <div className="mx-auto max-w-md">
                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <Target className="h-5 w-5" />
                      </div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                        {hasSearch ? 'Không có chuẩn đầu ra phù hợp' : 'Chưa có chuẩn đầu ra'}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {hasSearch
                          ? 'Thử đổi từ khóa tìm kiếm hoặc bấm nút X trong ô tìm kiếm.'
                          : selectedCourse
                            ? `Thêm chuẩn đầu ra đầu tiên cho ${selectedCourse.code}.`
                            : 'Hãy chọn hoặc tạo khóa học trước khi khai báo chuẩn đầu ra.'}
                      </p>
                      {!hasSearch && selectedCourse && (
                        <button
                          type="button"
                          onClick={openCreateForm}
                          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4" />
                          Thêm chuẩn đầu ra
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLearningOutcomes.map((learningOutcome) => (
                  <tr key={learningOutcome.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-slate-950 dark:text-white">
                        {learningOutcome.code}
                      </span>
                    </td>
                    <td className="max-w-3xl px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      {learningOutcome.description}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {learningOutcome.bloom_level ? (
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                          {getBloomLabel(learningOutcome.bloom_level)}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">Chưa thiết lập</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditForm(learningOutcome)}
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                          aria-label={`Sửa ${learningOutcome.code}`}
                          title="Sửa chuẩn đầu ra"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(learningOutcome)}
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                          aria-label={`Xóa ${learningOutcome.code}`}
                          title="Xóa chuẩn đầu ra"
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
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  {editingLearningOutcome ? 'Sửa chuẩn đầu ra' : 'Thêm chuẩn đầu ra'}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  CDR thuộc khóa học đang chọn; Bloom là mức tư duy, không phải độ khó đề thi.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Đóng modal chuẩn đầu ra"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4 px-5 py-4">
                {formError && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {selectedCourse && (
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                    Khóa học:{' '}
                    <span className="font-semibold text-slate-950 dark:text-white">{selectedCourse.code}</span> -{' '}
                    {selectedCourse.name}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-[150px_220px]">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Mã CDR</span>
                    <input
                      value={formData.code}
                      onChange={(event) => setFormData((current) => ({ ...current, code: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      placeholder="LO1"
                      maxLength={50}
                      autoFocus
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Bloom level</span>
                    <select
                      value={formData.bloom_level || ''}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, bloom_level: event.target.value as BloomLevel | '' }))
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    >
                      <option value="">Chưa thiết lập</option>
                      {bloomLevels.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.hint} ({level.label})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Mô tả chuẩn đầu ra
                  </span>
                  <textarea
                    value={formData.description}
                    onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                    className="min-h-28 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    placeholder="Ví dụ: Sinh viên có thể giải thích và áp dụng thuật toán..."
                  />
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/40">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex min-w-28 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingLearningOutcome ? 'Lưu' : 'Tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Xóa chuẩn đầu ra</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Bạn có chắc muốn xóa <span className="font-semibold">{deleteTarget.code}</span>? Nếu CDR đang có dữ liệu
              liên quan, hệ thống có thể không cho xóa.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
