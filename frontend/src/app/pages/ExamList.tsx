import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { examApi } from '../../api/exams';
import { Exam } from '../../types/exam';
import { Course } from '../../types/course';
import { getCourses } from '../../api/courses';
import { Button } from '../components/ui/button';
import {
  FileText, Plus, Eye, Trash2, Loader2, Search,
  Clock, Download, Filter, ArrowUpDown, X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { useApp } from '../context/AppContext';
import { getExamStatusClass, getExamStatusLabel } from '../utils/examStatus';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';

type SortField = 'created_at' | 'duration_minutes' | 'total_questions';
type SortDir = 'asc' | 'desc';

export default function ExamList() {
  const { t } = useApp();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageAlert, setPageAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Export State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportingExamId, setExportingExamId] = useState<number | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('gift');
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterDuration, setFilterDuration] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'approved'>('all');
  const [filterCourseId, setFilterCourseId] = useState<string>('all');
  const [filterQuestionMin, setFilterQuestionMin] = useState<number | ''>('');
  const [filterQuestionMax, setFilterQuestionMax] = useState<number | ''>('');

  const fetchExams = async () => {
    try {
      setLoading(true);
      const [examRes, courseRes] = await Promise.all([examApi.getAllExams(), getCourses()]);
      setExams(examRes.data);
      setCourses(courseRes);
    } catch (e) {
      console.error(e);
      setPageAlert({ type: 'error', message: 'Không tải được danh sách đề thi. Vui lòng thử lại.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await examApi.deleteExam(deleteTarget.id);
      setExams(prev => prev.filter(e => e.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
      setPageAlert({ type: 'error', message: 'Không thể xóa đề thi. Vui lòng thử lại.' });
    } finally {
      setDeleting(false);
    }
  };

  const handleExportSubmit = async () => {
    if (!exportingExamId) return;
    setExportModalOpen(false);
    setIsExporting(true);
    try {
      const blob = await examApi.exportExam(exportingExamId, selectedFormat);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam_${exportingExamId}.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      setPageAlert({ type: 'error', message: t("exam.exportFailed").replace("{format}", selectedFormat.toUpperCase()) });
    } finally {
      setIsExporting(false);
      setExportingExamId(null);
    }
  };

  const filteredAndSortedExams = useMemo(() => {
    let result = exams.filter(e => {
      const keyword = searchTerm.toLowerCase();
      return (
        e.title.toLowerCase().includes(keyword) ||
        (e.course_name || '').toLowerCase().includes(keyword) ||
        (e.blueprint_name || '').toLowerCase().includes(keyword)
      );
    });

    if (filterStatus !== 'all') {
      result = result.filter(e => e.status === filterStatus);
    }

    if (filterCourseId !== 'all') {
      result = result.filter(e => e.course_id === Number(filterCourseId));
    }

    // Filter by duration
    if (filterDuration !== 'all') {
      const maxDur = parseInt(filterDuration);
      if (maxDur === 60) result = result.filter(e => e.duration_minutes <= 60);
      else if (maxDur === 90) result = result.filter(e => e.duration_minutes > 60 && e.duration_minutes <= 90);
      else if (maxDur === 120) result = result.filter(e => e.duration_minutes > 90 && e.duration_minutes <= 120);
      else if (maxDur === 999) result = result.filter(e => e.duration_minutes > 120);
    }

    // Filter by question count range
    if (filterQuestionMin !== '') {
      result = result.filter(e => e.total_questions >= filterQuestionMin);
    }
    if (filterQuestionMax !== '') {
      result = result.filter(e => e.total_questions <= filterQuestionMax);
    }

    // Sort
    result.sort((a, b) => {
      let valA: number, valB: number;
      if (sortField === 'created_at') {
        valA = new Date(a.created_at).getTime();
        valB = new Date(b.created_at).getTime();
      } else if (sortField === 'duration_minutes') {
        valA = a.duration_minutes;
        valB = b.duration_minutes;
      } else {
        valA = a.total_questions;
        valB = b.total_questions;
      }
      return sortDir === 'desc' ? valB - valA : valA - valB;
    });

    return result;
  }, [exams, searchTerm, filterDuration, filterStatus, filterCourseId, filterQuestionMin, filterQuestionMax, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    filterCourseId !== 'all' ||
    filterStatus !== 'all' ||
    filterDuration !== 'all' ||
    filterQuestionMin !== '' ||
    filterQuestionMax !== '';

  const resetFilters = () => {
    setSearchTerm('');
    setFilterCourseId('all');
    setFilterStatus('all');
    setFilterDuration('all');
    setFilterQuestionMin('');
    setFilterQuestionMax('');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý đề thi</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Xem, chỉnh sửa và quản lý tất cả các đề thi đã tạo
          </p>
        </div>
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => navigate('/exam-generator')}
        >
          <Plus className="w-4 h-4 mr-2" />
          Tạo đề thi mới
        </Button>
      </div>

      {pageAlert && (
        <Alert variant={pageAlert.type === 'error' ? 'destructive' : 'default'} className={pageAlert.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}>
          <AlertTitle>{pageAlert.type === 'success' ? 'Thành công' : 'Lỗi'}</AlertTitle>
          <AlertDescription>{pageAlert.message}</AlertDescription>
        </Alert>
      )}

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 dark:border-gray-700 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Filter className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold">Bộ lọc đề thi</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
            <span>
              {filteredAndSortedExams.length} kết quả / {exams.length} đề thi
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Đặt lại
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[18rem] flex-[2_1_22rem]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t("exam.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Tìm kiếm đề thi"
              className="h-12 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:text-white"
                aria-label="Xóa nội dung tìm kiếm"
                title="Xóa tìm kiếm"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="min-w-[12rem] flex-1">
            <select
              value={filterCourseId}
              onChange={(e) => setFilterCourseId(e.target.value)}
              aria-label="Lọc theo học phần"
              className="h-12 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Tất cả học phần</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.code}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[12rem] flex-1">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'draft' | 'approved')}
              aria-label="Lọc theo trạng thái"
              className="h-12 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="draft">Bản nháp</option>
              <option value="approved">Đã duyệt</option>
            </select>
          </div>

          <div className="min-w-[12rem] flex-1">
            <select
              value={filterDuration}
              onChange={(e) => setFilterDuration(e.target.value)}
              aria-label="Lọc theo thời lượng"
              className="h-12 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Tất cả thời lượng</option>
              <option value="60">≤ 60 {t('exam.minutes')}</option>
              <option value="90">{t('exam.duration_90')}</option>
              <option value="120">{t('exam.duration_120')}</option>
              <option value="999">&gt; 120 {t('exam.minutes')}</option>
            </select>
          </div>

          <div className="min-w-[15rem] flex-[1_1_15rem]">
            <div className="grid h-12 grid-cols-[minmax(4.5rem,1fr)_auto_minmax(4.5rem,1fr)] items-center gap-2">
              <input
                type="number"
                min="0"
                placeholder="Từ"
                value={filterQuestionMin === '' ? '' : filterQuestionMin}
                onChange={(e) => setFilterQuestionMin(e.target.value ? parseInt(e.target.value) : '')}
                aria-label="Số câu tối thiểu"
                className="h-12 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-2 text-center text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                min="0"
                placeholder="Đến"
                value={filterQuestionMax === '' ? '' : filterQuestionMax}
                onChange={(e) => setFilterQuestionMax(e.target.value ? parseInt(e.target.value) : '')}
                aria-label="Số câu tối đa"
                className="h-12 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-2 text-center text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Exam Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredAndSortedExams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <FileText className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-lg font-medium">
              {exams.length === 0 ? t('exam.noExams') : 'Không tìm thấy đề thi phù hợp'}
            </p>
            <p className="mt-1 text-sm">
              {exams.length === 0
                ? t('exam.clickToStart')
                : 'Thử đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc.'}
            </p>
            {exams.length > 0 && hasActiveFilters && (
              <Button variant="outline" className="mt-4 gap-2" onClick={resetFilters}>
                <X className="h-4 w-4" />
                Đặt lại bộ lọc
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-700/50">
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('exam.name')}</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <button onClick={() => toggleSort('total_questions')} className="flex items-center gap-1 hover:text-blue-600">
                      Số câu
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <button onClick={() => toggleSort('duration_minutes')} className="flex items-center gap-1 hover:text-blue-600">
                      Thời lượng
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-blue-600">
                      Ngày tạo
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('exam.lastEdited')}</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('exam.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredAndSortedExams.map(exam => (
                  <tr key={exam.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                            <span className="max-w-[360px] truncate" title={exam.title}>{exam.title}</span>
                            <span className={`shrink-0 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${getExamStatusClass(exam.status)}`}>
                              {getExamStatusLabel(exam.status)}
                            </span>
                          </p>
                          <p className="mt-0.5 max-w-[420px] truncate text-xs text-gray-500 dark:text-gray-400">
                            {exam.course_name ? `${exam.course_name}` : ''}
                            {exam.blueprint_name ? ` • ${exam.blueprint_name}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {exam.total_questions} câu
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        {exam.duration_minutes} phút
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(exam.created_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(exam.updated_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                          onClick={() => navigate(`/exam/${exam.id}/preview`)}
                          title={t("exam.previewTitle")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700"
                          onClick={() => {
                            setExportingExamId(exam.id);
                            setExportModalOpen(true);
                          }}
                          title={exam.status !== 'approved' ? 'Cần duyệt đề thi trước khi export' : t("exam.exportTitle")}
                          disabled={exam.status !== 'approved'}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeleteTarget(exam)}
                          title={t("exam.deleteTitle")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('exam.confirmDelete')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400 py-4">
            {t('exam.confirmDeleteMessage').replace('{title}', deleteTarget?.title || '')}
            {deleteTarget?.status === 'approved' ? ' Đây là đề thi đã duyệt, chỉ xóa khi chắc chắn không còn sử dụng.' : ' Danh sách câu hỏi đã chọn trong đề này cũng sẽ bị xóa.'}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Hủy
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('exam.exportFormatTitle')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {[
              { id: 'gift', label: 'GIFT Format (.gift)' },
              { id: 'xml', label: 'Moodle XML (.xml)' },
              { id: 'doc', label: 'Microsoft Word (.doc)' },
              { id: 'txt', label: 'Text Format (.txt)' }
            ].map(fmt => (
              <label key={fmt.id} className={`flex items-center space-x-3 p-3 border rounded-md cursor-pointer transition-colors ${selectedFormat === fmt.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50 border-slate-200'}`}>
                <input 
                  type="radio" 
                  name="export-format" 
                  value={fmt.id} 
                  checked={selectedFormat === fmt.id} 
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" 
                />
                <span className={`font-medium ${selectedFormat === fmt.id ? 'text-blue-700' : 'text-slate-700'}`}>
                  {fmt.label}
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>{t('common.cancel')}</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleExportSubmit} disabled={isExporting}>
              {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Xuất file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
