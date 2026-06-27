import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, AlertCircle, Save, Loader2, Trash2, RefreshCw, Plus, Search, ChevronDown, Wand2 } from 'lucide-react';
import { blueprintApi } from '../../api/blueprints';
import { BlueprintCreatePayload, BlueprintUpdatePayload, BlueprintItemCreate, ValidationResultData } from '../../types/exam';
import { getCourses, getCourseLearningOutcomes } from '../../api/courses';
import { Course } from '../../types/course';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router';
import { getQuestions } from '../../api/questions';




export type QuestionType = 'mcq' | 'essay';

const QUESTION_TYPES: { value: QuestionType; labelKey: string }[] = [
  { value: 'mcq', labelKey: 'common.multipleChoice' },
  { value: 'essay', labelKey: 'common.essay' },
];

interface MatrixItem {
  type: QuestionType;
  easy: number;
  medium: number;
  hard: number;
}

interface MatrixRow {
  loId: number;
  loCode: string;
  description: string;
  items: MatrixItem[];
}

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
    <div className="relative w-full max-w-sm" ref={wrapperRef}>
      <div
        className={`flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 border ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-gray-300 dark:border-gray-600'} rounded-lg cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="truncate text-gray-900 dark:text-white">
          {selectedCourse ? `${selectedCourse.code} - ${selectedCourse.name}` : 'Select a course...'}
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
              placeholder={t('blueprint.searchPlaceholder')}
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
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-gray-900 dark:text-gray-100 ${selectedId === c.id ? 'bg-indigo-50 dark:bg-indigo-900/40 font-medium' : ''}`}
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
              <div className="p-3 text-sm text-gray-500 text-center">{t('blueprint.noCourses')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExamBlueprint() {
  const { t } = useApp();

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null);
  const [blueprintId, setBlueprintId] = useState<number | null>(null);
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);

  const [selectedTypesToAdd, setSelectedTypesToAdd] = useState<Record<number, QuestionType>>({});

  const [autoTypeCounts, setAutoTypeCounts] = useState<Record<QuestionType, number>>({
    mcq: 10,
    essay: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [validationResult, setValidationResult] = useState<ValidationResultData | null>(null);
  const [showUnbalancedWarning, setShowUnbalancedWarning] = useState(false);
  const [showMissingWarning, setShowMissingWarning] = useState(false);
  const [missingDetails, setMissingDetails] = useState<string[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const fetchedCourses = await getCourses();
        setCourses(fetchedCourses);
        if (fetchedCourses.length > 0) {
          setSelectedCourse(fetchedCourses[0].id);
        }
      } catch (e) {
        console.error("Failed to load courses", e);
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse !== null) {
      loadCourseBlueprint(selectedCourse);
    }
  }, [selectedCourse]);

  const loadCourseBlueprint = async (courseId: number) => {
    try {
      setIsLoading(true);
      setSaveStatus('idle');
      setErrorMessage(null);
      setSelectedTypesToAdd({});

      const response = await blueprintApi.getBlueprints(courseId);
      const existingBlueprint = response.data.length > 0 ? response.data[0] : null;

      const courseLOs = await getCourseLearningOutcomes(courseId);

      const newMatrix: MatrixRow[] = courseLOs.map(lo => ({
        loId: lo.id,
        loCode: lo.code,
        description: lo.description,
        items: [{ type: 'mcq', easy: 0, medium: 0, hard: 0 }]
      }));

      if (existingBlueprint) {
        setBlueprintId(existingBlueprint.id);
        // Clear default items before populating from DB
        newMatrix.forEach(row => row.items = []);
        existingBlueprint.items.forEach(item => {
          const row = newMatrix.find(r => r.loId === item.learning_outcome_id);
          if (row) {
            row.items.push({
              type: item.question_type as QuestionType,
              easy: item.easy_count,
              medium: item.medium_count,
              hard: item.hard_count
            });
          }
        });

        try {
          const validationRes = await blueprintApi.validateBlueprint(existingBlueprint.id);
          setValidationResult(validationRes.data);
        } catch (e) {
          console.error("Failed to load validation status", e);
          setValidationResult(null);
        }
      } else {
        setBlueprintId(null);
        setValidationResult(null);
      }

      setMatrix(newMatrix);
    } catch (error) {
      console.error("Failed to load blueprint", error);
      setErrorMessage(error instanceof Error ? error.message : "Có lỗi xảy ra khi tải dữ liệu CLO hoặc Blueprint từ hệ thống.");
      setMatrix([]);
    } finally {
      setIsLoading(false);
    }
  };

  const updateItemCount = (loId: number, type: QuestionType, difficulty: 'easy' | 'medium' | 'hard', value: number) => {
    setMatrix(prev => prev.map(row => {
      if (row.loId === loId) {
        return {
          ...row,
          items: row.items.map(item =>
            item.type === type ? { ...item, [difficulty]: Math.max(0, value) } : item
          )
        };
      }
      return row;
    }));
    setSaveStatus('idle');
    setErrorMessage(null);
  };

  const addQuestionType = (loId: number) => {
    const typeToAdd = selectedTypesToAdd[loId];
    if (!typeToAdd) return;

    setMatrix(prev => prev.map(row => {
      if (row.loId === loId) {
        if (row.items.some(i => i.type === typeToAdd)) return row;
        return {
          ...row,
          items: [...row.items, { type: typeToAdd, easy: 0, medium: 0, hard: 0 }]
        };
      }
      return row;
    }));

    setSelectedTypesToAdd(prev => ({ ...prev, [loId]: '' as any }));
    setSaveStatus('idle');
    setErrorMessage(null);
  };

  const removeQuestionType = (loId: number, type: QuestionType) => {
    setMatrix(prev => prev.map(row => {
      if (row.loId === loId) {
        return { ...row, items: row.items.filter(i => i.type !== type) };
      }
      return row;
    }));
    setSaveStatus('idle');
    setErrorMessage(null);
  };


  const handleAutoDistribute = () => {
    const typesToDistribute = (Object.keys(autoTypeCounts) as QuestionType[]).filter(t => autoTypeCounts[t] > 0);

    if (typesToDistribute.length === 0) {
      alert(t('blueprint.selectAtLeastOneType') || 'Vui lòng chọn ít nhất 1 loại câu hỏi (điền số lượng > 0)');
      return;
    }
    if (matrix.length === 0) return;

    const newMatrix = matrix.map(row => ({
      ...row,
      items: typesToDistribute.map(t => ({ type: t, easy: 0, medium: 0, hard: 0 }))
    }));

    // Distribute independently per type
    typesToDistribute.forEach(type => {
      const totalForType = autoTypeCounts[type];
      let currentEasy = 0;
      let currentMedium = 0;
      let currentHard = 0;

      for (let i = 0; i < totalForType; i++) {
        // Sequentially assign across LOs
        const loIndex = i % newMatrix.length;
        const loRow = newMatrix[loIndex];

        const targetEasy = (i + 1) * 0.4;
        const targetMedium = (i + 1) * 0.4;
        const targetHard = (i + 1) * 0.2;

        const diffEasy = targetEasy - currentEasy;
        const diffMedium = targetMedium - currentMedium;
        const diffHard = targetHard - currentHard;

        let diff: 'easy' | 'medium' | 'hard' = 'easy';
        if (diffMedium > diffEasy && diffMedium >= diffHard) diff = 'medium';
        else if (diffHard > diffEasy && diffHard > diffMedium) diff = 'hard';

        if (diff === 'easy') currentEasy++;
        else if (diff === 'medium') currentMedium++;
        else currentHard++;

        const item = loRow.items.find(item => item.type === type);
        if (item) {
          item[diff]++;
        }
      }
    });

    setMatrix(newMatrix);
    setSaveStatus('idle');
    setErrorMessage(null);
  };



  const constructItemsPayload = (): BlueprintItemCreate[] => {
    const payloadItems: BlueprintItemCreate[] = [];
    matrix.forEach(row => {
      row.items.forEach(item => {
        if (item.easy > 0 || item.medium > 0 || item.hard > 0) {
          payloadItems.push({
            learning_outcome_id: row.loId,
            question_type: item.type,
            easy_count: item.easy,
            medium_count: item.medium,
            hard_count: item.hard
          });
        }
      });
    });
    return payloadItems;
  };

  let totals = { easy: 0, medium: 0, hard: 0 };
  matrix.forEach(row => {
    row.items.forEach(item => {
      totals.easy += item.easy;
      totals.medium += item.medium;
      totals.hard += item.hard;
    });
  });

  const grandTotal = totals.easy + totals.medium + totals.hard;

  const percentages = {
    easy: grandTotal > 0 ? Math.round((totals.easy / grandTotal) * 100) : 0,
    medium: grandTotal > 0 ? Math.round((totals.medium / grandTotal) * 100) : 0,
    hard: grandTotal > 0 ? Math.round((totals.hard / grandTotal) * 100) : 0,
  };

  const isBalanced = percentages.easy >= 30 && percentages.easy <= 50 &&
    percentages.medium >= 30 && percentages.medium <= 50 &&
    percentages.hard >= 10 && percentages.hard <= 30;

  const handleSave = async () => {
    setErrorMessage(null);
    if (!isBalanced) {
      setShowUnbalancedWarning(true);
      return;
    }
    await checkMissingQuestions();
  };

  const handleUnbalancedProceed = async () => {
    setShowUnbalancedWarning(false);
    await checkMissingQuestions();
  };

  const checkMissingQuestions = async () => {
    if (selectedCourse === null) return;
    try {
      setIsSaving(true);
      
      let allQuestions: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const res = await getQuestions({ course_id: selectedCourse, status: 'approved', page, page_size: 100 });
        allQuestions = [...allQuestions, ...res.items];
        if (allQuestions.length >= res.total || res.items.length === 0) {
          hasMore = false;
        } else {
          page++;
        }
      }
      
      const availableQuestions = allQuestions;
      let hasMissing = false;
      const details: string[] = [];

      matrix.forEach(row => {
        row.items.forEach(item => {
          if (item.easy > 0 || item.medium > 0 || item.hard > 0) {
            const relevantQ = availableQuestions.filter(q => q.learning_outcome_id === row.loId && q.question_type === item.type);
            const availEasy = relevantQ.filter(q => q.difficulty === 'easy').length;
            const availMed = relevantQ.filter(q => q.difficulty === 'medium').length;
            const availHard = relevantQ.filter(q => q.difficulty === 'hard').length;

            if (item.easy > availEasy) details.push(`CLO ${row.loCode} (${item.type}): Thiếu ${item.easy - availEasy} câu Dễ`);
            if (item.medium > availMed) details.push(`CLO ${row.loCode} (${item.type}): Thiếu ${item.medium - availMed} câu Trung bình`);
            if (item.hard > availHard) details.push(`CLO ${row.loCode} (${item.type}): Thiếu ${item.hard - availHard} câu Khó`);

            if (item.easy > availEasy || item.medium > availMed || item.hard > availHard) {
              hasMissing = true;
            }
          }
        });
      });

      setMissingDetails(details);
      setIsSaving(false);
      if (hasMissing) {
        setShowMissingWarning(true);
      } else {
        await executeSave();
      }
    } catch (e) {
      console.error(e);
      setIsSaving(false);
      await executeSave(); // fallback
    }
  };

  const executeSave = async () => {
    setShowUnbalancedWarning(false);
    setShowMissingWarning(false);
    try {
      setIsSaving(true);
      setSaveStatus('idle');

      const items = constructItemsPayload();

      if (blueprintId) {
        await blueprintApi.updateBlueprint(blueprintId, { items });
      } else {
        if (selectedCourse === null) return;
        const course = courses.find(c => c.id === selectedCourse);
        await blueprintApi.createBlueprint({
          course_id: selectedCourse,
          title: `Ma trận đề thi - ${course?.code || 'Course'}`,
          items: items
        });
      }

      // Reload to get actual DB IDs and standard state
      if (selectedCourse !== null) {
        await loadCourseBlueprint(selectedCourse);
      }

      setSaveStatus('success');
    } catch (error) {
      console.error("Failed to save blueprint", error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!blueprintId) return;
    if (!confirm(t('blueprint.confirmDelete'))) return;

    try {
      setIsDeleting(true);
      await blueprintApi.deleteBlueprint(blueprintId);
      setBlueprintId(null);
      setMatrix(matrix.map(row => ({ ...row, items: [] })));
      setSaveStatus('idle');
      setErrorMessage(null);
    } catch (error) {
      console.error("Failed to delete blueprint", error);
    } finally {
      setIsDeleting(false);
    }
  };



  return (
    <div className="space-y-6">
      {/* Header & Course Selection */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('blueprint.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('blueprint.subtitle')}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex flex-col w-full sm:w-auto">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('blueprint.selectCourse')}</label>
            <SearchableCourseSelect
              courses={courses}
              selectedId={selectedCourse || 0}
              onChange={setSelectedCourse}
              disabled={isLoading || isSaving || courses.length === 0}
            />
          </div>

          <div className="flex items-center gap-2 mt-6 sm:mt-5">

            <button
              onClick={handleSave}
              disabled={isLoading || isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (blueprintId ? <RefreshCw className="w-5 h-5" /> : <Save className="w-5 h-5" />)}
              {isSaving ? t('blueprint.saving') : (blueprintId ? t('blueprint.update') : t('common.save'))}
            </button>
            {blueprintId && (
              <button
                onClick={handleDelete}
                disabled={isLoading || isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 rounded-lg transition-colors disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                {t('blueprint.delete')}
              </button>
            )}
          </div>
        </div>
      </div>

      {saveStatus === 'success' && (
        <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">
          {t('blueprint.saveSuccess')}
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage || t('blueprint.saveError')}</span>
        </div>
      )}

      {/* Auto Distribution */}
      {matrix.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('blueprint.autoTypes') || 'Nhập số lượng cho từng loại câu hỏi'}
              </label>
              <div className="flex flex-wrap items-center gap-4">
                {QUESTION_TYPES.map(qt => (
                  <div key={qt.value} className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-28 truncate" title={t(qt.labelKey)}>
                      {t(qt.labelKey)}:
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={autoTypeCounts[qt.value] === 0 ? '' : autoTypeCounts[qt.value]}
                      placeholder="0"
                      onChange={(e) => setAutoTypeCounts({ ...autoTypeCounts, [qt.value]: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-20 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2 mt-2 md:mt-0">
              <div className="text-sm text-gray-500 dark:text-gray-400 font-medium md:mr-2">
                {t('blueprint.autoTotal') || 'Tổng'}: <span className="text-xl text-indigo-600 dark:text-indigo-400 font-bold ml-1">{Object.values(autoTypeCounts).reduce((a, b) => a + b, 0)}</span>
              </div>
              <button
                onClick={handleAutoDistribute}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2 h-[42px]"
              >
                <Wand2 className="w-5 h-5" />
                {t('blueprint.autoBtn') || 'Phân bổ tự động'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Table Matrix */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-300 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                <tr>
                  <th rowSpan={2} className="px-6 py-4 border border-gray-300 dark:border-gray-600 w-1/3 font-bold text-center align-middle">
                    {t('blueprint.lo')}
                  </th>
                  <th rowSpan={2} className="px-4 py-4 border border-gray-300 dark:border-gray-600 w-1/4 font-bold text-center align-middle">
                    {t('blueprint.questionType')}
                  </th>
                  <th colSpan={4} className="px-4 py-2 border border-gray-300 dark:border-gray-600 font-bold text-center">
                    {t('blueprint.numQuestions')}
                  </th>
                  <th rowSpan={2} className="px-2 py-4 border border-gray-300 dark:border-gray-600 w-12 font-bold text-center align-middle">
                    {t('blueprint.delete')}
                  </th>
                </tr>
                <tr>
                  <th className="px-2 py-2 border border-gray-300 dark:border-gray-600 text-center font-semibold text-green-700 dark:text-green-400">D (30%)</th>
                  <th className="px-2 py-2 border border-gray-300 dark:border-gray-600 text-center font-semibold text-amber-700 dark:text-amber-400">TB (40%)</th>
                  <th className="px-2 py-2 border border-gray-300 dark:border-gray-600 text-center font-semibold text-red-700 dark:text-red-400">K (30%)</th>
                  <th className="px-2 py-2 border border-gray-300 dark:border-gray-600 text-center font-bold text-indigo-700 dark:text-indigo-400">{t('blueprint.total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {matrix.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Môn học này hiện chưa có Chuẩn đầu ra (CLO) nào trong CSDL. Vui lòng thêm CLO trước khi tạo Ma trận đề thi.
                    </td>
                  </tr>
                ) : (
                  matrix.map((row) => {
                    const rowSpan = row.items.length + 1; // +1 for the "Add Type" row
                    const availableTypes = QUESTION_TYPES.filter(qt => !row.items.some(i => i.type === qt.value));

                    return (
                      <React.Fragment key={row.loId}>
                        {row.items.length > 0 ? (
                          <>
                            {/* Render active types rows */}
                            {row.items.map((item, index) => {
                              const itemTotal = item.easy + item.medium + item.hard;
                              return (
                                <tr key={item.type} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                  {index === 0 && (
                                    <td rowSpan={rowSpan} className="px-6 py-4 border border-gray-300 dark:border-gray-600 align-top bg-white dark:bg-gray-800">
                                      <div className="font-bold text-gray-900 dark:text-white">{row.loCode}</div>
                                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{row.description}</div>
                                    </td>
                                  )}
                                  <td className="px-4 py-3 border border-gray-300 dark:border-gray-600 font-medium text-gray-800 dark:text-gray-200">
                                    {t(QUESTION_TYPES.find(q => q.value === item.type)?.labelKey || item.type)}
                                  </td>
                                  <td className="px-2 py-2 border border-gray-300 dark:border-gray-600">
                                    <input
                                      type="number" min="0" value={item.easy || ''} placeholder="0"
                                      onChange={(e) => updateItemCount(row.loId, item.type, 'easy', parseInt(e.target.value) || 0)}
                                      className="w-16 mx-auto block px-2 py-1 text-center bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                                    />
                                  </td>
                                  <td className="px-2 py-2 border border-gray-300 dark:border-gray-600">
                                    <input
                                      type="number" min="0" value={item.medium || ''} placeholder="0"
                                      onChange={(e) => updateItemCount(row.loId, item.type, 'medium', parseInt(e.target.value) || 0)}
                                      className="w-16 mx-auto block px-2 py-1 text-center bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                                    />
                                  </td>
                                  <td className="px-2 py-2 border border-gray-300 dark:border-gray-600">
                                    <input
                                      type="number" min="0" value={item.hard || ''} placeholder="0"
                                      onChange={(e) => updateItemCount(row.loId, item.type, 'hard', parseInt(e.target.value) || 0)}
                                      className="w-16 mx-auto block px-2 py-1 text-center bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500"
                                    />
                                  </td>
                                  <td className="px-4 py-3 border border-gray-300 dark:border-gray-600 text-center font-bold text-gray-900 dark:text-white text-lg bg-gray-50/50 dark:bg-gray-800/30">
                                    {itemTotal}
                                  </td>
                                  <td className="px-2 py-2 border border-gray-300 dark:border-gray-600 text-center">
                                    <button
                                      onClick={() => removeQuestionType(row.loId, item.type)}
                                      className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                                      title="Xóa loại câu hỏi này"
                                    >
                                      <Trash2 className="w-4 h-4 mx-auto" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Render Add Type row */}
                            <tr>
                              <td colSpan={6} className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-blue-50/30 dark:bg-blue-900/10">
                                {availableTypes.length > 0 ? (
                                  <div className="flex items-center gap-2 max-w-sm">
                                    <select
                                      value={selectedTypesToAdd[row.loId] || ''}
                                      onChange={e => setSelectedTypesToAdd(prev => ({ ...prev, [row.loId]: e.target.value as QuestionType }))}
                                      className="flex-1 px-2 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="" disabled>{t('blueprint.addType')}</option>
                                      {availableTypes.map(type => <option key={type.value} value={type.value}>{t(type.labelKey)}</option>)}
                                    </select>
                                    <button
                                      onClick={() => addQuestionType(row.loId)}
                                      disabled={!selectedTypesToAdd[row.loId]}
                                      className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded transition-colors disabled:opacity-50"
                                    >
                                      <Plus className="w-4 h-4" /> {t('blueprint.addBtn')}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-500 italic">{t('blueprint.allTypesAdded')}</span>
                                )}
                              </td>
                            </tr>
                          </>
                        ) : (
                          // No items yet, just render the LO column and the Add Type span
                          <tr>
                            <td className="px-6 py-4 border border-gray-300 dark:border-gray-600 align-top bg-white dark:bg-gray-800">
                              <div className="font-bold text-gray-900 dark:text-white">{row.loCode}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{row.description}</div>
                            </td>
                            <td colSpan={6} className="px-4 py-4 border border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30">
                              <div className="flex flex-col sm:flex-row items-center gap-3">
                                <select
                                  value={selectedTypesToAdd[row.loId] || ''}
                                  onChange={e => setSelectedTypesToAdd(prev => ({ ...prev, [row.loId]: e.target.value as QuestionType }))}
                                  className="w-full max-w-xs px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="" disabled>{t('blueprint.addTypeStart')}</option>
                                  {availableTypes.map(type => <option key={type.value} value={type.value}>{t(type.labelKey)}</option>)}
                                </select>
                                <button
                                  onClick={() => addQuestionType(row.loId)}
                                  disabled={!selectedTypesToAdd[row.loId]}
                                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  <Plus className="w-5 h-5" />
                                  {t('blueprint.addTypeBtn')}
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  }))}
              </tbody>
              <tfoot className="bg-gray-100 dark:bg-gray-700 font-bold border-t-4 border-gray-400 dark:border-gray-500 text-lg">
                <tr>
                  <td colSpan={2} className="px-6 py-4 border border-gray-300 dark:border-gray-600 text-center uppercase tracking-wider text-gray-900 dark:text-white">
                    {t('blueprint.grandTotal')}
                  </td>
                  <td className="px-4 py-4 border border-gray-300 dark:border-gray-600 text-center text-green-700 dark:text-green-400">
                    {totals.easy}
                  </td>
                  <td className="px-4 py-4 border border-gray-300 dark:border-gray-600 text-center text-amber-700 dark:text-amber-400">
                    {totals.medium}
                  </td>
                  <td className="px-4 py-4 border border-gray-300 dark:border-gray-600 text-center text-red-700 dark:text-red-400">
                    {totals.hard}
                  </td>
                  <td className="px-4 py-4 border border-gray-300 dark:border-gray-600 text-center text-2xl text-indigo-700 dark:text-indigo-400">
                    {grandTotal}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <Dialog open={showUnbalancedWarning} onOpenChange={setShowUnbalancedWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tỉ lệ phân bố chưa chuẩn</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-gray-700 dark:text-gray-300">
            <p className="mb-4">
              Tỉ lệ phân bố hiện tại đang là: <span className="font-semibold text-green-600">Dễ ({percentages.easy}%)</span> - <span className="font-semibold text-amber-600">TB ({percentages.medium}%)</span> - <span className="font-semibold text-red-600">Khó ({percentages.hard}%)</span>.
            </p>
            <p className="mb-4">
              Tỉ lệ chuẩn được khuyến nghị là <strong>Dễ (30-50%), TB (30-50%), Khó (10-30%)</strong>. Việc lưu ma trận với tỉ lệ không chuẩn có thể ảnh hưởng đến chất lượng đề thi.
            </p>
            <p className="font-medium text-red-600 dark:text-red-400">Bạn có chắc chắn muốn lưu ma trận này không?</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnbalancedWarning(false)}>Kiểm tra lại</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleUnbalancedProceed}>Vẫn lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMissingWarning} onOpenChange={setShowMissingWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thiếu câu hỏi trong Ngân hàng</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-sm text-gray-700 dark:text-gray-300">
            <p className="mb-4">
              Học phần này không đáp ứng đủ số câu hỏi theo Blueprint bạn vừa thiết lập. Blueprint sẽ được lưu dưới dạng <strong>Bản nháp (Draft)</strong> và không thể dùng để tạo đề thi cho đến khi bạn bổ sung đủ câu hỏi.
            </p>
            {missingDetails.length > 0 && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-100 dark:border-red-800">
                <p className="font-semibold text-red-800 dark:text-red-400 mb-2">{t('blueprint.missingDetails')}</p>
                <ul className="list-disc pl-5 space-y-1 text-red-700 dark:text-red-300">
                  {missingDetails.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="font-medium text-red-600 dark:text-red-400">Bạn muốn tiếp tục lưu Blueprint hay chuyển sang Ngân hàng để tạo thêm câu hỏi?</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => navigate('/ai-generation')}>{t('blueprint.goToGen')}</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={executeSave}>{t('blueprint.saveAnyway')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
