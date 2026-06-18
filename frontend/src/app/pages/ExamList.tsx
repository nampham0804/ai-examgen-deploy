import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { examApi } from '../../api/exams';
import { Exam } from '../../types/exam';
import { Button } from '../components/ui/button';
import {
  FileText, Plus, Eye, Edit, Trash2, Loader2, Search,
  Clock, Download, Filter, ArrowUpDown
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';

type SortField = 'created_at' | 'duration_minutes' | 'total_questions';
type SortDir = 'asc' | 'desc';

export default function ExamList() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterDuration, setFilterDuration] = useState<string>('all');
  const [filterQuestionMin, setFilterQuestionMin] = useState<number | ''>('');
  const [filterQuestionMax, setFilterQuestionMax] = useState<number | ''>('');

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await examApi.getAllExams();
      setExams(res.data);
    } catch (e) {
      console.error(e);
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
      alert("Xóa đề thi thất bại!");
    } finally {
      setDeleting(false);
    }
  };

  const handleExportGift = async (id: number) => {
    try {
      const blob = await examApi.exportToGift(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam_${id}.gift`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
      alert("Xuất file GIFT thất bại!");
    }
  };

  const filteredAndSortedExams = useMemo(() => {
    let result = exams.filter(e =>
      e.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
  }, [exams, searchTerm, filterDuration, filterQuestionMin, filterQuestionMax, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quản lý Đề thi</h1>
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

      {/* Search, Stats & Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm đề thi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Total Exams */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{exams.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tổng số đề thi</p>
          </div>
        </div>

        {/* Filter: Duration */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            <Filter className="w-3 h-3 inline mr-1" />Thời lượng
          </label>
          <select
            value={filterDuration}
            onChange={(e) => setFilterDuration(e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả</option>
            <option value="60">≤ 60 phút</option>
            <option value="90">61 - 90 phút</option>
            <option value="120">91 - 120 phút</option>
            <option value="999">&gt; 120 phút</option>
          </select>
        </div>

        {/* Filter: Questions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            <Filter className="w-3 h-3 inline mr-1" />Số câu hỏi (từ - đến)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              placeholder="Từ"
              value={filterQuestionMin === '' ? '' : filterQuestionMin}
              onChange={(e) => setFilterQuestionMin(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            />
            <span className="text-gray-400">-</span>
            <input
              type="number"
              min="0"
              placeholder="Đến"
              value={filterQuestionMax === '' ? '' : filterQuestionMax}
              onChange={(e) => setFilterQuestionMax(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
            />
          </div>
        </div>
      </div>

      {/* Exam Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredAndSortedExams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <FileText className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-lg font-medium">Chưa có đề thi nào</p>
            <p className="text-sm mt-1">Nhấn "Tạo đề thi mới" để bắt đầu</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tên đề thi</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button onClick={() => toggleSort('total_questions')} className="flex items-center gap-1 hover:text-blue-600">
                    Số câu
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button onClick={() => toggleSort('duration_minutes')} className="flex items-center gap-1 hover:text-blue-600">
                    Thời lượng
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 hover:text-blue-600">
                    Ngày tạo
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Chỉnh sửa lần cuối</th>
                <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedExams.map(exam => (
                <tr key={exam.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{exam.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">ID: {exam.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {exam.total_questions} câu
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
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
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => navigate(`/exam/${exam.id}/preview`)}
                        title="Xem trước"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        onClick={() => navigate(`/exam/${exam.id}/edit`)}
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleExportGift(exam.id)}
                        title="Xuất GIFT"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setDeleteTarget(exam)}
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Xác nhận xóa đề thi</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400 py-4">
            Bạn có chắc chắn muốn xóa đề thi <strong>"{deleteTarget?.title}"</strong>? Hành động này không thể hoàn tác.
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
    </div>
  );
}
