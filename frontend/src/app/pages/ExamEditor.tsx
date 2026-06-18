import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { examApi } from '../../api/exams';
import { Loader2, ArrowUp, ArrowDown, Save, X, GripVertical } from 'lucide-react';

export default function ExamEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExam = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const res = await examApi.getExamPreview(parseInt(id));
        setData(res.data);
      } catch (e) {
        console.error(e);
        alert("Failed to load exam for editing");
      } finally {
        setLoading(false);
      }
    };
    fetchExam();
  }, [id]);

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    if (!data) return;
    const newQuestions = [...data.questions];
    if (direction === 'up' && index > 0) {
      [newQuestions[index - 1], newQuestions[index]] = [newQuestions[index], newQuestions[index - 1]];
    } else if (direction === 'down' && index < newQuestions.length - 1) {
      [newQuestions[index + 1], newQuestions[index]] = [newQuestions[index], newQuestions[index + 1]];
    }
    setData({ ...data, questions: newQuestions });
  };

  const updateQuestionText = (index: number, text: string) => {
    if (!data) return;
    const newQuestions = [...data.questions];
    newQuestions[index].text = text;
    setData({ ...data, questions: newQuestions });
  };

  const updateOption = (qIndex: number, optIndex: number, val: string) => {
    if (!data) return;
    const newQuestions = [...data.questions];
    if (newQuestions[qIndex].options) {
      newQuestions[qIndex].options[optIndex] = val;
    }
    setData({ ...data, questions: newQuestions });
  };

  const setCorrectAnswer = (qIndex: number, val: string) => {
    if (!data) return;
    const newQuestions = [...data.questions];
    newQuestions[qIndex].correct_answer = val;
    setData({ ...data, questions: newQuestions });
  };

  const moveOption = (qIndex: number, optIndex: number, direction: 'up' | 'down') => {
    if (!data) return;
    const newQuestions = [...data.questions];
    const opts = newQuestions[qIndex].options;
    if (!opts) return;

    if (direction === 'up' && optIndex > 0) {
      [opts[optIndex - 1], opts[optIndex]] = [opts[optIndex], opts[optIndex - 1]];
    } else if (direction === 'down' && optIndex < opts.length - 1) {
      [opts[optIndex + 1], opts[optIndex]] = [opts[optIndex], opts[optIndex + 1]];
    }
    setData({ ...data, questions: newQuestions });
  };

  const handleSaveAll = () => {
    // In a real app, call examApi.updateExam(...)
    alert("Lưu toàn bộ thay đổi thành công! (Mock)");
    navigate(-1);
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-10 py-4 border-b">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Exam: {data.title}</h1>
          <p className="text-gray-500 mt-1">Make direct changes to questions and options</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveAll}>
            <Save className="w-4 h-4 mr-2" />
            Save All Changes
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {data.questions.map((q: any, qIndex: number) => (
          <div key={q.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex gap-4">
            <div className="flex flex-col items-center gap-2 pt-2 text-slate-400">
              <GripVertical className="w-5 h-5 cursor-grab" />
              <button 
                disabled={qIndex === 0} 
                onClick={() => moveQuestion(qIndex, 'up')}
                className="hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
              <div className="font-semibold text-slate-800">{qIndex + 1}</div>
              <button 
                disabled={qIndex === data.questions.length - 1} 
                onClick={() => moveQuestion(qIndex, 'down')}
                className="hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowDown className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    q.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                    q.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {q.difficulty}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    {q.type}
                  </span>
                </div>
                <div className="text-sm font-medium text-slate-500">
                  {q.points || 1} pts
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Question Content</label>
                <textarea 
                  className="w-full border border-slate-300 rounded-lg p-3 min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={q.text}
                  onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                />
              </div>

              {q.type === 'Multiple Choice' && q.options && (
                <div className="space-y-3 mt-4">
                  <label className="block text-sm font-medium text-slate-700">Options (Select the correct one)</label>
                  {q.options.map((opt: string, optIndex: number) => (
                    <div key={optIndex} className="flex items-center gap-3 bg-slate-50 p-2 rounded border border-slate-200">
                      <input 
                        type="radio" 
                        name={`correct-${q.id}`} 
                        checked={q.correct_answer === opt}
                        onChange={() => setCorrectAnswer(qIndex, opt)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <input 
                        className="flex-1 bg-transparent border-none focus:ring-0 p-1 font-medium text-slate-800"
                        value={opt}
                        onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                      />
                      <div className="flex flex-col">
                        <button disabled={optIndex === 0} onClick={() => moveOption(qIndex, optIndex, 'up')} className="text-slate-400 hover:text-blue-600 disabled:opacity-30">
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button disabled={optIndex === q.options.length - 1} onClick={() => moveOption(qIndex, optIndex, 'down')} className="text-slate-400 hover:text-blue-600 disabled:opacity-30">
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {q.type === 'Essay' && (
                <div className="space-y-3 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sample Answer / Guide</label>
                    <textarea 
                      className="w-full border border-slate-300 rounded-lg p-3 min-h-[60px] focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      defaultValue={q.sample_answer || ''}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
