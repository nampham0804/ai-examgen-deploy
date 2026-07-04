import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, Edit, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { createCourse, deleteCourse, getCourses, updateCourse } from '@/api/courses';
import { getApiErrorMessage } from '@/api/client';
import type { Course, CoursePayload } from '@/types/course';

const emptyPayload: CoursePayload = {
  code: '',
  name: '',
  description: '',
};

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState<CoursePayload>(emptyPayload);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);

  async function loadCourses() {
    setLoading(true);
    setError(null);
    try {
      const data = await getCourses();
      setCourses(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCourses();
  }, []);

  const filteredCourses = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return courses;
    }

    return courses.filter((course) => {
      return (
        course.code.toLowerCase().includes(term) ||
        course.name.toLowerCase().includes(term) ||
        (course.description || '').toLowerCase().includes(term)
      );
    });
  }, [courses, searchTerm]);

  const hasSearch = searchTerm.trim().length > 0;

  const openCreateForm = () => {
    setEditingCourse(null);
    setFormData(emptyPayload);
    setFormError(null);
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
  };

  const openEditForm = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      code: course.code,
      name: course.name,
      description: course.description || '',
    });
    setFormError(null);
    setIsFormOpen(true);
    setError(null);
    setSuccess(null);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingCourse(null);
    setFormData(emptyPayload);
    setFormError(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      code: formData.code.trim(),
      name: formData.name.trim(),
      description: formData.description?.trim(),
    };

    if (!payload.code || !payload.name) {
      setFormError('Vui lòng nhập mã khóa học và tên khóa học.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setSuccess(null);

    try {
      if (editingCourse) {
        await updateCourse(editingCourse.id, payload);
        setSuccess('Đã cập nhật khóa học.');
      } else {
        await createCourse(payload);
        setSuccess('Đã tạo khóa học.');
      }
      closeForm();
      await loadCourses();
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await deleteCourse(deleteTarget.id);
      setSuccess('Đã xóa khóa học.');
      setDeleteTarget(null);
      await loadCourses();
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
            <BookOpen className="h-4 w-4" />
            Bước thiết lập
          </div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Quản lý khóa học</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Quản lý các khóa học dùng trong quy trình tạo câu hỏi và đề thi.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Thêm khóa học
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

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm khóa học..."
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
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {filteredCourses.length} kết quả / {courses.length} khóa học
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2.5 text-left">Mã khóa học</th>
                <th className="px-4 py-2.5 text-left">Tên khóa học</th>
                <th className="px-4 py-2.5 text-left">Mô tả</th>
                <th className="px-4 py-2.5 text-left">Thao tac</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Đang tải danh sách khóa học...
                    </span>
                  </td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <div className="mx-auto max-w-md">
                      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                        {hasSearch ? 'Không có khóa học phù hợp' : 'Chưa có khóa học'}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {hasSearch
                          ? 'Thử đổi từ khóa tìm kiếm hoặc bấm nút X trong ô tìm kiếm.'
                          : 'Tạo khóa học đầu tiên trước khi khai báo chuẩn đầu ra hoặc tạo câu hỏi.'}
                      </p>
                      {!hasSearch && (
                        <button
                          type="button"
                          onClick={openCreateForm}
                          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          <Plus className="h-4 w-4" />
                          Thêm khóa học
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-slate-950 dark:text-white">{course.code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-950 dark:text-white">{course.name}</div>
                    </td>
                    <td className="max-w-xl px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                      {course.description || <span className="text-slate-400">Chưa có mô tả</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditForm(course)}
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                          aria-label={`Sửa ${course.code}`}
                          title="Sửa khóa học"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(course)}
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                          aria-label={`Xóa ${course.code}`}
                          title="Xóa khóa học"
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
          <div className="w-full max-w-xl overflow-hidden rounded-lg bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                  {editingCourse ? 'Sửa khóa học' : 'Thêm khóa học'}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Nhập thông tin ngắn gọn để dùng trong chuẩn đầu ra, câu hỏi và đề thi.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Đóng modal khóa học"
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

                <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Mã khóa học</span>
                    <input
                      value={formData.code}
                      onChange={(event) => setFormData((current) => ({ ...current, code: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      placeholder="CS401"
                      maxLength={50}
                      autoFocus
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Tên khóa học</span>
                    <input
                      value={formData.name}
                      onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      placeholder="Machine Learning"
                      maxLength={255}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Mô tả</span>
                  <textarea
                    value={formData.description || ''}
                    onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                    className="min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    placeholder="Mô tả ngắn về khóa học"
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
                  {editingCourse ? 'Lưu' : 'Tạo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Xóa khóa học</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Bạn có chắc muốn xóa <span className="font-semibold">{deleteTarget.code}</span>? Nếu khóa học đang có dữ
              liệu liên quan, hệ thống có thể không cho xóa.
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
