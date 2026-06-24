import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { examApi } from '../../api/exams';
import { ExamPreviewData, ExamPreviewQuestion } from '../../types/exam';
import { RefreshCw, Download, Loader2, Edit, CheckCircle, AlertCircle, FileDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert';

export default function ExamPreview({ examId, onSaved }: { examId?: number; onSaved?: () => void }) {
  const params = useParams();
  const idStr = params.id;
  const id = examId || (idStr ? parseInt(idStr) : null);
  const navigate = useNavigate();
  const [data, setData] = useState<ExamPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [swappingId, setSwappingId] = useState<number | null>(null);
  const [actionAlert, setActionAlert] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', duration: 60 });

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
      alert(e.message || "Failed to swap question. Might not have alternatives.");
    } finally {
      setSwappingId(null);
    }
  };

  const handleSaveDetails = () => {
    if (!data) return;
    setData({ ...data, title: editForm.title, duration_minutes: editForm.duration });
    setIsEditing(false);
    // In a real app, this would call an API to update the exam metadata
  };

  const handleExportGift = async () => {
    if (!id) return;
    setActionAlert(null);
    setIsExporting(true);
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
      setActionAlert({ type: 'success', message: 'Xuất file GIFT thành công! File đang được tải xuống.' });
    } catch (e) {
      console.error(e);
      setActionAlert({ type: 'error', message: 'Xuất file GIFT thất bại!' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmSave = () => {
    setActionAlert({ type: 'success', message: 'Đã xác nhận và lưu đề thi thành công! Giao diện sẽ được làm mới...' });
    // After 2 seconds, call onSaved to reset parent or navigate
    setTimeout(() => {
      if (onSaved) {
        onSaved();
      }
    }, 2000);
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
          {id && (
            <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => navigate(`/exam/${id}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Advanced Edit
            </Button>
          )}
          {!examId && (
            <Button variant="outline" onClick={() => navigate(-1)}>
              Back
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 space-y-8">
          {data.questions.map((q, index) => (
            <div key={q.id} className="p-5 border rounded-lg bg-slate-50 relative group transition-all hover:border-blue-300 hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg text-slate-800">Question {index + 1}</h3>
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
              
              <div className="text-slate-800 font-medium mb-4 whitespace-pre-wrap">
                {q.text}
              </div>

              {(q.type === 'Multiple Choice' || q.type === 'mcq') && q.options && (
                <div className="space-y-2 mt-4 ml-2">
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
                </div>
              )}

              {(q.type === 'Essay' || q.type === 'essay') && (
                <div className="mt-4 space-y-4">
                  <div className="p-4 bg-white border rounded-md">
                    <div className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Đáp án mẫu</div>
                    <div className="text-slate-700 text-sm whitespace-pre-wrap">{q.sample_answer || 'Chưa cập nhật'}</div>
                  </div>
                  <div className="p-4 bg-slate-100 border rounded-md">
                    <div className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Rubric chấm điểm</div>
                    <div className="text-slate-700 text-sm whitespace-pre-wrap">{q.rubric || 'Chưa cập nhật'}</div>
                  </div>
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
            <Button variant="outline" className="flex items-center gap-2" onClick={handleExportGift} disabled={isExporting}>
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export to GIFT
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2" onClick={handleConfirmSave}>
              <CheckCircle className="w-4 h-4" /> Confirm & Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
