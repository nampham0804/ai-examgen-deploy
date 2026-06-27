import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router';
import { FileText, Download, Eye, CheckCircle, AlertCircle, Loader2, List, Search, ChevronDown } from 'lucide-react';
import { useState, useEffect, useMemo, useRef } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { examApi } from '../../api/exams';
import { blueprintApi } from '../../api/blueprints';
import { Blueprint } from '../../types/exam';
import { getCourses } from '../../api/courses';
import { Course } from '../../types/course';
import { getLearningOutcomes } from '../../api/learningOutcomes';
import { Alert, AlertTitle, AlertDescription } from '../components/ui/alert';
import ExamPreview from './ExamPreview';

// Custom Searchable Combobox Component
function SearchableCourseSelect({
  courses,
  selectedId,
  onChange,
  disabled
}: {
  courses: Course[],
  selectedId: number,
  onChange: (id: number) => void,
  disabled: boolean
}) {
  const { t } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedCourse = courses.find(c => c.id === selectedId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCourses = courses.filter(c =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div
        className={`flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 border ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 dark:border-gray-600'} rounded-lg cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="truncate text-gray-900 dark:text-white">
          {selectedCourse ? `${selectedCourse.code} - ${selectedCourse.name}` : t('examGen.selectCourse')}
        </div>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              autoFocus
              placeholder={t("examGen.searchCourse")}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-none focus:outline-none text-sm text-gray-900 dark:text-white placeholder-gray-500"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredCourses.length > 0 ? (
              filteredCourses.map(c => (
                <div
                  key={c.id}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-900 dark:text-gray-100 ${selectedId === c.id ? 'bg-blue-50 dark:bg-blue-900/40 font-medium' : ''}`}
                  onClick={() => {
                    onChange(c.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <span className="font-semibold">{c.code}</span> - {c.name}
                </div>
              ))
            ) : (
              <div className="p-3 text-sm text-gray-500 text-center">{t('examGen.noCourseFound')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExamGenerator() {
  const { t } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [generatedExamId, setGeneratedExamId] = useState<number | null>(null);
  const [examConfig, setExamConfig] = useState({
    title: 'Midterm Exam',
    courseId: 1, // mock CS401
    duration: 60,
    blueprintId: null as number | null,
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [totalCourseLOs, setTotalCourseLOs] = useState<number>(0);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const fetchedCourses = await getCourses();
        setCourses(fetchedCourses);
        if (fetchedCourses.length > 0) {
          setExamConfig(prev => ({ ...prev, courseId: fetchedCourses[0].id }));
        }
      } catch (e) {
        console.error("Failed to load courses", e);
      }
    };
    fetchCourses();
  }, []);

  const filteredCourses = useMemo(() => {
    return courses.filter(c =>
      c.code.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
      c.name.toLowerCase().includes(courseSearchTerm.toLowerCase())
    );
  }, [courseSearchTerm, courses]);

  useEffect(() => {
    // Fetch blueprints for the selected course
    const fetchBlueprints = async () => {
      try {
        const res = await blueprintApi.getBlueprints(examConfig.courseId);
        // Allow all blueprints to be selected as per requirements
        setBlueprints(res.data);
        // Do not auto-select blueprint so user has to choose
      } catch (e) {
        console.error('Failed to fetch blueprints', e);
      }
    };
    if (examConfig.courseId) {
      fetchBlueprints();
    }
  }, [examConfig.courseId]);

  useEffect(() => {
    const fetchLOs = async () => {
      try {
        const outcomes = await getLearningOutcomes(examConfig.courseId);
        setTotalCourseLOs(outcomes.length);
      } catch (e) {
        console.error('Failed to fetch learning outcomes', e);
      }
    };
    if (examConfig.courseId) {
      fetchLOs();
    }
  }, [examConfig.courseId]);

  // Derived state for difficulty distribution from selected blueprint
  const selectedBlueprint = useMemo(() => {
    if (!examConfig.blueprintId) return null;
    return blueprints.find(b => b.id === examConfig.blueprintId) || null;
  }, [examConfig.blueprintId, blueprints]);

  const difficultyData = useMemo(() => {
    if (!selectedBlueprint) {
      return [
        { name: 'Easy', value: 0, color: '#10b981' },
        { name: 'Medium', value: 0, color: '#f59e0b' },
        { name: 'Hard', value: 0, color: '#ef4444' },
      ];
    }
    let easy = 0, medium = 0, hard = 0;
    selectedBlueprint.items.forEach(item => {
      easy += item.easy_count;
      medium += item.medium_count;
      hard += item.hard_count;
    });
    return [
      { name: 'Easy', value: easy, color: '#10b981' },
      { name: 'Medium', value: medium, color: '#f59e0b' },
      { name: 'Hard', value: hard, color: '#ef4444' },
    ];
  }, [selectedBlueprint]);

  const qualityInfo = useMemo(() => {
    if (!selectedBlueprint) return null;
    
    // 1. Tổng số câu: Lấy theo tổng số lượng câu hỏi được quy định trong Blueprint
    const totalQ = selectedBlueprint.total_questions || 0;
    
    // 2. Số LO phủ: Tổng số lượng chuẩn đầu ra có trong Blueprint đó
    const loCount = new Set(selectedBlueprint.items.map(i => i.learning_outcome_id)).size;
    
    // 3. Loại câu hỏi: Hiển thị danh sách các định dạng câu hỏi
    const typeSet = new Set(selectedBlueprint.items.map(i => i.question_type));
    const typeMap: Record<string, string> = { 'mcq': 'MCQ', 'essay': 'Essay' };
    const displayTypes = Array.from(typeSet).map(t => typeMap[t] || t).join(' + ') || 'N/A';

    let easy = 0, medium = 0, hard = 0;
    selectedBlueprint.items.forEach(item => {
      easy += item.easy_count;
      medium += item.medium_count;
      hard += item.hard_count;
    });

    const actualTotalItems = easy + medium + hard;

    // 4. Blueprint Alignment: Thực hiện tính toán so khớp ma trận
    let blueprintAlignment = 0;
    if (totalQ > 0) {
      const diff = Math.abs(totalQ - actualTotalItems);
      blueprintAlignment = Math.max(0, 100 - Math.round((diff / totalQ) * 100));
    } else if (actualTotalItems === 0 && totalQ === 0) {
      blueprintAlignment = 100;
    }

    // 4. Balance Score: Tính toán độ cân bằng phân bổ LO (sử dụng độ lệch chuẩn/CV)
    let balanceScore = 'N/A';
    
    // Gộp tổng số lượng câu hỏi cho từng learning_outcome_id
    const loDistribution = new Map<number, number>();
    selectedBlueprint.items.forEach(item => {
      const sum = item.easy_count + item.medium_count + item.hard_count;
      loDistribution.set(
        item.learning_outcome_id, 
        (loDistribution.get(item.learning_outcome_id) || 0) + sum
      );
    });

    const counts = Array.from(loDistribution.values());
    
    if (loCount < totalCourseLOs && totalCourseLOs > 0) {
      balanceScore = t('examGen.unbalancedLO'); // Thiếu LO so với môn học
    } else if (counts.length > 0) {
      if (counts.length === 1) {
        balanceScore = t('examGen.veryBalancedLO'); // Chỉ có 1 LO
      } else {
        const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
        const variance = counts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / counts.length;
        const sd = Math.sqrt(variance);
        const cv = mean > 0 ? sd / mean : 0;
        
        if (cv <= 0.2) {
          balanceScore = t('examGen.veryBalancedLO');
        } else if (cv <= 0.5) {
          balanceScore = t('examGen.balancedLO');
        } else {
          balanceScore = t('examGen.unbalancedLO');
        }
      }
    }

    // Tính phần trăm loCoverage dựa trên totalCourseLOs
    const loCoverage = totalCourseLOs > 0 ? Math.min(100, Math.round((loCount / totalCourseLOs) * 100)) : (loCount > 0 ? 100 : 0);

    return {
      totalQuestions: totalQ,
      loCount,
      totalCourseLOs,
      displayTypes,
      loCoverage,
      blueprintAlignment,
      balanceScore,
    };
  }, [selectedBlueprint, totalCourseLOs]);

  const handleBlueprintChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setExamConfig({ ...examConfig, blueprintId: parseInt(e.target.value) });
    setStep(2); // Step 2: Select Blueprint
    setAlertInfo(null);
  };

  const handleGenerate = async () => {
    setAlertInfo(null);
    if (!examConfig.blueprintId) {
      setAlertInfo({ type: 'error', message: t('examGen.validationErrorSelect') });
      return;
    }

    setIsLoading(true);
    try {
      // Check eligibility first
      const eligibility = await blueprintApi.checkEligibility(examConfig.blueprintId);
      if (!eligibility.data.is_valid) {
        setAlertInfo({ type: 'error', message: t('examGen.validationErrorNotEnough') });
        setIsLoading(false);
        return;
      }

      setStep(3); // Step 3: Generating
      // Create draft exam
      const draftRes = await examApi.createExam({
        course_id: examConfig.courseId,
        blueprint_id: examConfig.blueprintId,
        title: examConfig.title,
        duration_minutes: examConfig.duration
      });

      // Generate questions
      const examData = await examApi.generateExam(draftRes.data.id);

      setAlertInfo({ type: 'success', message: t('examGen.generateSuccess') });

      // Instead of navigating, display it inline
      setGeneratedExamId(examData.data.id);
      setStep(4); // Step 4: Review
    } catch (e: any) {
      console.error(e);
      setAlertInfo({ type: 'error', message: e.message || t('examGen.generateFailed') });
      setStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('exam.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Create comprehensive exams from your question bank</p>
        </div>
        <button
          onClick={() => navigate('/exam-list')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm shadow-sm"
        >
          <List className="w-4 h-4" />
          Quản lý đề thi
        </button>
      </div>

      {/* Progress Steps */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((s, index) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${step >= s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:bg-gray-400'
                  }`}>
                  {step > s ? <CheckCircle className="w-6 h-6" /> : s}
                </div>
                <span className="text-xs mt-2 text-gray-600 dark:text-gray-400">
                  {s === 1 && 'Configure'}
                  {s === 2 && 'Select Blueprint'}
                  {s === 3 && 'Generate'}
                  {s === 4 && 'Review'}
                </span>
              </div>
              {index < 3 && (
                <div className={`h-1 flex-1 mx-2 ${step > s ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('exam.configure')}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Exam Title
                </label>
                <input
                  type="text"
                  value={examConfig.title}
                  onChange={(e) => setExamConfig({ ...examConfig, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course
                </label>
                <SearchableCourseSelect
                  courses={courses}
                  selectedId={examConfig.courseId}
                  onChange={(id) => setExamConfig({ ...examConfig, courseId: id, blueprintId: null })}
                  disabled={isLoading || courses.length === 0}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={examConfig.duration}
                  onChange={(e) => setExamConfig({ ...examConfig, duration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('exam.selectBlueprint')}
                </label>
                <select
                  value={examConfig.blueprintId || ''}
                  onChange={handleBlueprintChange}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>{t('examGen.selectBlueprintPlaceholder')}</option>
                  {blueprints.map(b => (
                    <option key={b.id} value={b.id}>{b.title} ({b.total_questions} {t('exam.questions')}) {b.status !== 'validated' ? '(Chưa đủ ĐK)' : ''}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isLoading || !examConfig.blueprintId}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {t('exam.generate')}
              </button>

              {alertInfo && (
                <Alert variant={alertInfo.type === 'error' ? 'destructive' : 'default'} className={`mt-4 ${alertInfo.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : alertInfo.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' : ''}`}>
                  {alertInfo.type === 'success' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4" />}
                  <AlertTitle>{alertInfo.type === 'success' ? 'Thành công' : alertInfo.type === 'info' ? 'Thông báo' : 'Lỗi'}</AlertTitle>
                  <AlertDescription>{alertInfo.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          {/* Difficulty Distribution - Dynamic from Blueprint */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Difficulty Distribution</h2>
            {selectedBlueprint ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={difficultyData.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={70}
                      dataKey="value"
                    >
                      {difficultyData.filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1.5 text-sm">
                  {difficultyData.map(d => (
                    <div key={d.name} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-gray-600 dark:text-gray-400">{d.name}</span>
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{d.value} câu</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <FileText className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Chọn Blueprint để xem phân phối độ khó</p>
              </div>
            )}
          </div>

          {/* Quality Validation - Dynamic from Blueprint */}
          {selectedBlueprint && qualityInfo && (
            <div className={`bg-gradient-to-br ${qualityInfo.loCoverage === 100 ? 'from-green-500 to-green-600' : 'from-amber-500 to-amber-600'} rounded-xl shadow-lg p-6 text-white`}>
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-6 h-6" />
                <h3 className="font-semibold">Quality Validation</h3>
              </div>
              <div className="space-y-2 text-sm opacity-90">
                <div className="flex items-center justify-between">
                  <span>{t('blueprint.total')}</span>
                  <span className="font-semibold">{qualityInfo.totalQuestions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('examGen.loCovered')}</span>
                  <span className="font-semibold">{qualityInfo.loCount}/{qualityInfo.totalCourseLOs} LO</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('blueprint.questionType')}</span>
                  <span className="font-semibold">{qualityInfo.displayTypes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Blueprint Alignment</span>
                  <span className="font-semibold">{qualityInfo.blueprintAlignment}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Balance Score</span>
                  <span className="font-semibold">{qualityInfo.balanceScore}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Exam Preview */}
        <div className="lg:col-span-2">
          {step === 4 && generatedExamId ? (
            <ExamPreview examId={generatedExamId} onSaved={() => setStep(1)} hideExport={true} />
          ) : (
            <div className="bg-slate-50 dark:bg-gray-800/50 rounded-xl shadow-inner border border-dashed border-slate-300 dark:border-gray-700 p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-medium text-slate-800 dark:text-slate-200 mb-2">{t('examGen.previewDisplay')}</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm">
                Vui lòng thiết lập cấu hình ở bên trái và nhấn nút "Tạo đề thi" để AI tự động lấy câu hỏi ngẫu nhiên từ ngân hàng dựa trên ma trận (Blueprint).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
