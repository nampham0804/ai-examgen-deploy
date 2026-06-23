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
          {selectedCourse ? `${selectedCourse.code} - ${selectedCourse.name}` : 'Chọn môn học...'}
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
              placeholder="Tìm môn học..."
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
              <div className="p-3 text-sm text-gray-500 text-center">Không tìm thấy môn học</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExamGenerator() {
  const { t } = useApp();
  const [step, setStep] = useState(1);
  const [examConfig, setExamConfig] = useState({
    title: 'Midterm Exam',
    courseId: 1, // mock CS401
    duration: 60,
    blueprintId: null as number | null,
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseSearchTerm, setCourseSearchTerm] = useState('');

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
        // Only validated blueprints can be used
        const validBlueprints = res.data.filter(b => b.status === 'validated');
        setBlueprints(validBlueprints);
        // Do not auto-select blueprint so user has to choose
      } catch (e) {
        console.error('Failed to fetch blueprints', e);
      }
    };
    fetchBlueprints();
  }, [examConfig.courseId]);

  // Compute difficulty distribution from selected blueprint
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
    const totalQ = selectedBlueprint.total_questions;
    const loCount = new Set(selectedBlueprint.items.map(i => i.learning_outcome_id)).size;
    const typeCount = new Set(selectedBlueprint.items.map(i => i.question_type)).size;

    let easy = 0, medium = 0, hard = 0;
    selectedBlueprint.items.forEach(item => {
      easy += item.easy_count;
      medium += item.medium_count;
      hard += item.hard_count;
    });

    // Balance score: check distribution evenness
    const diffLevels = [easy, medium, hard].filter(v => v > 0).length;
    const balanceScore = diffLevels >= 3 ? 'A+' : diffLevels === 2 ? 'B+' : 'C';

    return {
      totalQuestions: totalQ,
      loCount,
      typeCount,
      loCoverage: selectedBlueprint.status === 'validated' ? 100 : 0,
      blueprintAlignment: selectedBlueprint.status === 'validated' ? 100 : 0,
      balanceScore,
    };
  }, [selectedBlueprint]);

  const handleBlueprintChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setExamConfig({ ...examConfig, blueprintId: parseInt(e.target.value) });
    setStep(2); // Step 2: Select Blueprint
    setAlertInfo(null);
  };

  const handleGenerate = async () => {
    setAlertInfo(null);
    if (!examConfig.blueprintId) {
      setAlertInfo({ type: 'error', message: "Vui lòng chọn Blueprint (Ma trận đề thi) hợp lệ đã được kiểm duyệt." });
      return;
    }

    setIsLoading(true);
    setStep(3); // Step 3: Generating
    try {
      // Create draft exam
      const draftRes = await examApi.createExam({
        course_id: examConfig.courseId,
        blueprint_id: examConfig.blueprintId,
        title: examConfig.title,
        duration_minutes: examConfig.duration
      });

      // Generate questions
      const examData = await examApi.generateExam(draftRes.data.id);

      setAlertInfo({ type: 'success', message: "Tạo đề thi thành công! Đang hiển thị bản xem trước..." });

      // Instead of navigating, display it inline
      setGeneratedExamId(examData.data.id);
      setStep(4); // Step 4: Review
    } catch (e: any) {
      console.error(e);
      setAlertInfo({ type: 'error', message: e.message || "Tạo đề thi thất bại. Vui lòng kiểm tra lại Ngân hàng câu hỏi." });
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
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
            <Eye className="w-5 h-5" />
            {t('exam.preview')}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <Download className="w-5 h-5" />
            {t('exam.export')}
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((s, index) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${step >= s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
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
                  Total Questions
                </label>
                <input
                  type="number"
                  value={examConfig.totalQuestions}
                  onChange={(e) => setExamConfig({ ...examConfig, totalQuestions: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('exam.selectBlueprint')}
                </label>
                <select className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Blueprint 1 - Standard Distribution</option>
                  <option>Blueprint 2 - Advanced Focus</option>
                  <option>Blueprint 3 - Practical Skills</option>
                </select>
              </div>

              <button
                onClick={() => setStep(Math.min(4, step + 1))}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                {t('exam.generate')}
              </button>
            </div>
          </div>

          {/* Difficulty Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Difficulty Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={difficultyData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={70}
                  dataKey="value"
                >
                  {difficultyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Quality Validation */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-6 h-6" />
              <h3 className="font-semibold">Quality Validation</h3>
            </div>
            <div className="space-y-2 text-sm opacity-90">
              <div className="flex items-center justify-between">
                <span>LO Coverage</span>
                <span className="font-semibold">96%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Blueprint Alignment</span>
                <span className="font-semibold">100%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Balance Score</span>
                <span className="font-semibold">A+</span>
              </div>
            </div>
          </div>
        </div>

        {/* Exam Preview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            {/* Exam Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{examPreview.title}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Course</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{examPreview.course}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Duration</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{examPreview.duration}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Questions</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{examPreview.totalQuestions}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Points</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{examPreview.totalPoints}</div>
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sample Questions</h3>
              {examPreview.questions.map((q, index) => (
                <div key={q.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">Question {index + 1}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${q.difficulty === 'Easy' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            q.difficulty === 'Medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                              'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                          {q.difficulty}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                          {q.type}
                        </span>
                      </div>
                      <p className="text-gray-900 dark:text-white">{q.text}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Points</div>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{q.points}</div>
                    </div>
                  </div>
                  {q.type === 'Multiple Choice' && (
                    <div className="mt-4 space-y-2 pl-4">
                      <div className="text-sm text-gray-700 dark:text-gray-300">A. Option 1</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">B. Option 2</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">C. Option 3</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">D. Option 4</div>
                    </div>
                  )}
                  {q.type === 'Essay' && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600">
                      <div className="text-sm text-gray-600 dark:text-gray-400 italic">
                        [Answer space for students]
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                ... and {examPreview.totalQuestions - examPreview.questions.length} more questions
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Export Options</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group">
                <FileText className="w-8 h-8 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">PDF</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Printable format</div>
                </div>
              </button>
              <button className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group">
                <FileText className="w-8 h-8 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">Word</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Editable document</div>
                </div>
              </button>
              <button className="flex flex-col items-center gap-3 p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group">
                <FileText className="w-8 h-8 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                <div className="text-center">
                  <div className="font-semibold text-gray-900 dark:text-white">JSON</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Data format</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
