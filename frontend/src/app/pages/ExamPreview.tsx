import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { examApi } from '../../api/exams';
import { ExamPreviewData, ExamPreviewQuestion } from '../../types/exam';
import { RefreshCw, Download, Loader2, Edit, CheckCircle, AlertCircle, FileDown, ArrowUp, ArrowDown, GripVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert';

export default function ExamPreview({ examId, onSaved, hideExport }: { examId?: number; onSaved?: () => void; hideExport?: boolean }) {
  const params = useParams();
  const idStr = params.id;
  const id = examId || (idStr ? parseInt(idStr) : null);
  const navigate = useNavigate();
  const [data, setData] = useState<ExamPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [swappingId, setSwappingId] = useState<number | null>(null);
  const [actionAlert, setActionAlert] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('gift');
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', duration: 60 });

  // Reorder State
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const fetchPreview = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await examApi.getExamPreview(id);
      setData(res.data);
      setEditForm({ title: res.data.title, duration: res.data.duration_minutes });
    } catch (e) {
      console.error(e);
      alert("Failed to load exam preview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [id]);

  const handleSwap = async (questionId: number) => {
    if (!id) return;
    try {
      setSwappingId(questionId);
      // Calls the swap API. Since backend currently returns new ID, we refetch whole preview to get the full detailed question.
      // Or in the mock we return the whole object, but refetching is safer for both cases.
      await examApi.swapQuestion(id, questionId);
      await fetchPreview(); 
    } catch (e: any) {
      console.error(e);
      const errMsg = e.response?.data?.detail || e.message || "Không còn câu hỏi tương tự trong Ngân hàng đề đáp ứng điều kiện. Vui lòng bổ sung thêm câu hỏi mới.";
      setActionAlert({ type: 'error', message: errMsg });
      setTimeout(() => setActionAlert(null), 5000);
    } finally {
      setSwappingId(null);
    }
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (!data || !id) return;
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= data.questions.length || toIndex >= data.questions.length) return;
    if (fromIndex === toIndex) return;

    // Create new array
    const newQuestions = [...data.questions];
    const [movedItem] = newQuestions.splice(fromIndex, 1);
    newQuestions.splice(toIndex, 0, movedItem);

    // Update order_index for all
    const updatedQuestions = newQuestions.map((q, idx) => ({ ...q, order_index: idx + 1 }));

    // Optimistic UI update
    setData({ ...data, questions: updatedQuestions });
    setIsReordering(true);

    try {
      const items = updatedQuestions.map(q => ({ id: q.id, order_index: q.order_index }));
      await examApi.reorderExam(id, items);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to reorder questions.");
      // Rollback on fail
      await fetchPreview();
    } finally {
      setIsReordering(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex !== null && draggedItemIndex !== index) {
      handleReorder(draggedItemIndex, index);
    }
    setDraggedItemIndex(null);
  };

  const handleSaveDetails = () => {
    if (!data) return;
    setData({ ...data, title: editForm.title, duration_minutes: editForm.duration });
    setIsEditing(false);
    // In a real app, this would call an API to update the exam metadata
  };

  const handleExportSubmit = async () => {
    if (!id) return;
    setExportModalOpen(false);
    setActionAlert(null);
    setIsExporting(true);
    try {
      const blob = await examApi.exportExam(id, selectedFormat);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exam_${id}.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setActionAlert({ type: 'success', message: t('exam.exportSuccess').replace('{format}', selectedFormat.toUpperCase()) });
    } catch (e) {
      console.error(e);
      setActionAlert({ type: 'error', message: t('exam.exportFailed').replace('{format}', selectedFormat.toUpperCase()) });
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!id || !data) return;
    try {
      await examApi.updateExam(id, { 
        title: data.title,
        duration_minutes: data.duration_minutes,
        status: 'approved' 
      });
      setData({ ...data, status: 'approved' });
      setActionAlert({ type: 'success', message: t('exam.savedSuccess') });
      // After 2 seconds, call onSaved to reset parent or navigate
      setTimeout(() => {
        if (onSaved) {
          onSaved();
        } else {
          navigate('/exam-list');
        }
      }, 2000);
    } catch (e) {
      console.error(e);
      setActionAlert({ type: 'error', message: t('exam.saveError') });
    }
  };

  const handleSaveDraft = async () => {
    if (!id || !data) return;
    try {
      await examApi.updateExam(id, { 
        title: data.title, 
        duration_minutes: data.duration_minutes, 
        status: 'draft' 
      });
      setData({ ...data, status: 'draft' });
      setActionAlert({ type: 'success', message: t('exam.saveDraftSuccess') });
    } catch (e) {
      console.error(e);
      setActionAlert({ type: 'error', message: t('exam.draftError') });
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!data) {
    return <div className="p-6 text-center text-red-500">Exam not found or failed to load.</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">{data.title}</h1>
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  <Edit className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Exam Details</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Exam Title</label>
                    <input 
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={editForm.title}
                      onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Duration (minutes)</label>
                    <input 
                      type="number"
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={editForm.duration}
                      onChange={(e) => setEditForm({...editForm, duration: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveDetails}>Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-gray-500 mt-1">Course: {data.course_name} • Duration: {data.duration_minutes} mins • {data.total_questions} Questions</p>
        </div>
        <div className="flex items-center gap-2">
          {!examId && (
            <Button variant="outline" onClick={() => navigate(-1)}>
              Back
            </Button>
          )}
        </div>
      </div>

      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${isReordering ? 'opacity-70 pointer-events-none' : ''}`}>
        <div className="p-6 space-y-8">
          {data.questions.map((q, index) => (
            <div 
              key={q.id} 
              className={`p-5 border rounded-lg bg-slate-50 relative group transition-all hover:border-blue-300 hover:shadow-md ${draggedItemIndex === index ? 'opacity-50 border-dashed border-blue-500' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="cursor-grab hover:bg-slate-200 p-1 rounded active:cursor-grabbing text-slate-400">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-lg text-slate-800">{t('exam.questionIndex').replace('{index}', (index + 1).toString())}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${
                    q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    q.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {q.difficulty}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    {q.type}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                    {q.learning_outcome_code}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex flex-col mr-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                      disabled={index === 0}
                      onClick={() => handleReorder(index, index - 1)}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-slate-400 hover:text-blue-600 disabled:opacity-30"
                      disabled={index === data.questions.length - 1}
                      onClick={() => handleReorder(index, index + 1)}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-slate-600 hover:text-blue-600 flex items-center gap-2"
                    onClick={() => handleSwap(q.question_id)}
                    disabled={swappingId === q.question_id}
                  >
                    {swappingId === q.question_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Đổi câu hỏi
                  </Button>
                </div>
              </div>
              
              <div className="text-slate-800 font-medium mb-4 whitespace-pre-wrap ml-9">
                {q.text}
              </div>

              {(q.type === 'Multiple Choice' || q.type === 'mcq') && q.options && (
                <div className="space-y-2 mt-4 ml-11">
                  {q.options.map((opt, i) => {
                    const isCorrect = q.correct_answer === opt;
                    return (
                      <div key={i} className={`flex items-start space-x-3 p-2 rounded ${isCorrect ? 'bg-green-50 border border-green-200' : ''}`}>
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-sm font-medium ${isCorrect ? 'bg-green-500 text-white border-green-600' : 'bg-white text-slate-500 border-slate-300'}`}>
                          {String.fromCharCode(65 + i)}
                        </div>
                        <div className={isCorrect ? 'text-green-800 font-medium' : 'text-slate-700'}>
                          {opt}
                        </div>
                      </div>
                    )
                  })}
                  
                  {(q.correct_answer || q.explanation) && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-md space-y-3">
                      {q.correct_answer && (
                        <div>
                          <div className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wider">{t('exam.correctAnswer')}</div>
                          <div className="text-slate-800 text-sm font-medium">{q.correct_answer}</div>
                        </div>
                      )}
                      {q.explanation && (
                        <div>
                          <div className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wider">{t('exam.explanation')}</div>
                          <div className="text-slate-700 text-sm whitespace-pre-wrap">{q.explanation}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {(q.type === 'Essay' || q.type === 'essay') && (
                <div className="mt-4 space-y-4 ml-9">
                  <div className="p-4 bg-white border rounded-md">
                    <div className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">{t('exam.sampleAnswer')}</div>
                    <div className="text-slate-700 text-sm whitespace-pre-wrap">{q.sample_answer || t('exam.notUpdated')}</div>
                  </div>
                  <div className="p-4 bg-slate-100 border rounded-md">
                    <div className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">{t('exam.gradingRubric')}</div>
                    <div className="text-slate-700 text-sm whitespace-pre-wrap">{q.rubric || t('exam.notUpdated')}</div>
                  </div>
                  {q.explanation && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-md">
                      <div className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wider">{t('exam.explanation')}</div>
                      <div className="text-slate-700 text-sm whitespace-pre-wrap">{q.explanation}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-6 bg-slate-50 border-t space-y-4">
          {actionAlert && (
            <Alert variant={actionAlert.type === 'error' ? 'destructive' : 'default'} className={`${actionAlert.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}`}>
              {actionAlert.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4" />}
              <AlertTitle>{actionAlert.type === 'success' ? 'Thành công' : 'Lỗi'}</AlertTitle>
              <AlertDescription>{actionAlert.message}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end gap-3">
            {!hideExport && (
              <Button variant="outline" className="flex items-center gap-2" onClick={() => setExportModalOpen(true)} disabled={isExporting || data.status !== 'approved'}>
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export File
              </Button>
            )}
            <Button variant="outline" className="flex items-center gap-2 text-slate-700" onClick={handleSaveDraft}>
              Lưu bản nháp
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2" onClick={handleConfirmSave}>
              <CheckCircle className="w-4 h-4" /> Confirm & Save
            </Button>
          </div>
        </div>
      </div>

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
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleExportSubmit}>
              <Download className="w-4 h-4 mr-2" />
              Xuất File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
