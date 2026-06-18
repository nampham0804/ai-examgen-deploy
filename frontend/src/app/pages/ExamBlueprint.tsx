import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, AlertCircle, Save, Loader2, Trash2, RefreshCw, Plus, Search, ChevronDown } from 'lucide-react';
import { blueprintApi } from '../../api/blueprints';
import { BlueprintCreatePayload, BlueprintUpdatePayload, BlueprintItemCreate, ValidationResultData } from '../../types/exam';

// Generate 120 mock courses to demonstrate scalable dropdown
const MOCK_COURSES = [
  { id: 1, code: 'CS401', name: 'Machine Learning' },
  { id: 2, code: 'CS101', name: 'Intro to CS' },
  ...Array.from({ length: 118 }).map((_, i) => ({
    id: i + 3,
    code: `CS${102 + i}`,
    name: `Computer Science Topic ${i + 1}`
  }))
];

const MOCK_LOS: Record<number, { id: number; lo: string; description: string }[]> = {
  1: [
    { id: 1, lo: 'LO1', description: 'Understand supervised learning fundamentals' },
    { id: 2, lo: 'LO2', description: 'Apply model evaluation metrics' },
    { id: 3, lo: 'LO3', description: 'Analyze model performance and limitations' },
  ],
  2: [
    { id: 4, lo: 'LO1', description: 'Basic programming concepts' },
    { id: 5, lo: 'LO2', description: 'Control structures and loops' },
  ]
};

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
  courses: typeof MOCK_COURSES, 
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
  
  const [selectedCourse, setSelectedCourse] = useState<number>(MOCK_COURSES[0].id);
  const [blueprintId, setBlueprintId] = useState<number | null>(null);
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  
  const [selectedTypesToAdd, setSelectedTypesToAdd] = useState<Record<number, QuestionType>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResultData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadCourseBlueprint(selectedCourse);
  }, [selectedCourse]);

  const loadCourseBlueprint = async (courseId: number) => {
    try {
      setIsLoading(true);
      setSaveStatus('idle');
      setIsValidated(false);
      setValidationResult(null);
      setSelectedTypesToAdd({});

      const response = await blueprintApi.getBlueprints(courseId);
      const existingBlueprint = response.data.length > 0 ? response.data[0] : null;

      // In a real app, you would fetch LOs dynamically based on courseId
      const courseLOs = MOCK_LOS[courseId] || [
        { id: courseId * 100, lo: 'LO1', description: 'Understand core concepts' },
        { id: courseId * 100 + 1, lo: 'LO2', description: 'Apply techniques to problems' }
      ];
      
      const newMatrix: MatrixRow[] = courseLOs.map(lo => ({
        loId: lo.id,
        loCode: lo.lo,
        description: lo.description,
        items: []
      }));

      if (existingBlueprint) {
        setBlueprintId(existingBlueprint.id);
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
      } else {
        setBlueprintId(null);
      }
      
      setMatrix(newMatrix);
    } catch (error) {
      console.error("Failed to load blueprint", error);
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
    setIsValidated(false);
    setValidationResult(null);
    setSaveStatus('idle');
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
    setIsValidated(false);
    setValidationResult(null);
    setSaveStatus('idle');
  };

  const removeQuestionType = (loId: number, type: QuestionType) => {
    setMatrix(prev => prev.map(row => {
      if (row.loId === loId) {
        return { ...row, items: row.items.filter(i => i.type !== type) };
      }
      return row;
    }));
    setIsValidated(false);
    setSaveStatus('idle');
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

  const validateBlueprint = async () => {
    if (!blueprintId) {
      alert(t('blueprint.saveBeforeValidate') || 'Please save the blueprint before validating');
      return;
    }
    try {
      setIsLoading(true);
      const res = await blueprintApi.validateBlueprint(blueprintId);
      setValidationResult(res.data);
      setIsValidated(true);
      setSaveStatus('idle');
    } catch (e) {
      console.error("Failed to validate blueprint", e);
      alert('Failed to validate blueprint');
    } finally {
      setIsLoading(false);
    }
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

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveStatus('idle');
      
      const items = constructItemsPayload();
      
      if (blueprintId) {
        await blueprintApi.updateBlueprint(blueprintId, { items });
      } else {
        const course = MOCK_COURSES.find(c => c.id === selectedCourse);
        await blueprintApi.createBlueprint({
          course_id: selectedCourse,
          title: `Ma trận đề thi - ${course?.code}`,
          items: items
        });
      }
      
      // Reload to get actual DB IDs and standard state
      await loadCourseBlueprint(selectedCourse);
      
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
      setIsValidated(false);
      setValidationResult(null);
      setSaveStatus('idle');
    } catch (error) {
      console.error("Failed to delete blueprint", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const isBalanced = percentages.easy >= 30 && percentages.easy <= 50 &&
                     percentages.medium >= 30 && percentages.medium <= 50 &&
                     percentages.hard >= 10 && percentages.hard <= 30;

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
              courses={MOCK_COURSES}
              selectedId={selectedCourse}
              onChange={setSelectedCourse}
              disabled={isLoading || isSaving}
            />
          </div>
          
          <div className="flex items-center gap-2 mt-6 sm:mt-5">
            <button
              onClick={validateBlueprint}
              disabled={isLoading || grandTotal === 0}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-5 h-5" />
              {t('blueprint.check')}
            </button>
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
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {t('blueprint.saveError')}
        </div>
      )}

      {/* Validation Alert */}
      {isValidated && validationResult && (
        <div className={`p-4 rounded-lg border-2 flex flex-col gap-3 ${
          validationResult.is_valid 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' 
            : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
        }`}>
          <div className="flex items-start gap-3">
            {validationResult.is_valid ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <div className={`font-semibold ${validationResult.is_valid ? 'text-green-900 dark:text-green-200' : 'text-red-900 dark:text-red-200'}`}>
                {validationResult.is_valid ? t('blueprint.balanced') || 'Blueprint Validated Successfully' : t('blueprint.unbalanced') || 'Blueprint Validation Failed'}
              </div>
              <div className={`text-sm mt-1 ${validationResult.is_valid ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {validationResult.is_valid 
                  ? t('blueprint.balancedDesc') || 'All requested questions are available in the approved Question Bank.' 
                  : t('blueprint.unbalancedDesc') || 'There are missing questions in the Question Bank. Please add more approved questions or adjust the blueprint.'}
              </div>
            </div>
          </div>
          {!validationResult.is_valid && (
            <div className="mt-2 pl-8">
               <ul className="list-disc text-sm text-red-700 dark:text-red-300 space-y-1">
                 {validationResult.details.filter(d => !d.is_valid).map((detail, idx) => (
                   <li key={idx}>
                     <span className="font-medium">{detail.learning_outcome_code}</span> ({t(QUESTION_TYPES.find(q => q.value === detail.question_type)?.labelKey || detail.question_type)}): {detail.missing}
                   </li>
                 ))}
               </ul>
            </div>
          )}
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
                {matrix.map((row) => {
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
                })}
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
    </div>
  );
}
