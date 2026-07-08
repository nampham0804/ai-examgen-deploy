import { Blueprint, Exam, ValidationDetail } from '../../types/exam';

const difficultyLabels: Record<string, string> = {
  easy: 'Dễ',
  medium: 'Trung bình',
  hard: 'Khó',
};

const questionTypeLabels: Record<string, string> = {
  mcq: 'Trắc nghiệm',
  essay: 'Tự luận',
  'Multiple Choice': 'Trắc nghiệm',
  Essay: 'Tự luận',
};

export function getBlueprintStatusLabel(status: Blueprint['status']) {
  return status === 'validated' ? 'Sẵn sàng tạo đề' : 'Chưa đủ điều kiện';
}

export function getBlueprintStatusClass(status: Blueprint['status']) {
  return status === 'validated'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';
}

export function getExamStatusLabel(status: Exam['status']) {
  return status === 'approved' ? 'Đã duyệt' : 'Bản nháp';
}

export function getExamStatusClass(status: Exam['status']) {
  return status === 'approved'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-amber-50 text-amber-700 border-amber-200';
}

export function isApprovedExam(status: Exam['status']) {
  return status === 'approved';
}

export function getDifficultyLabel(difficulty: string) {
  return difficultyLabels[difficulty] || difficulty;
}

export function getQuestionTypeLabel(questionType: string) {
  return questionTypeLabels[questionType] || questionType;
}

export function formatValidationMissingDetail(detail: ValidationDetail) {
  const questionType = getQuestionTypeLabel(detail.question_type);
  const missingParts = [
    ['easy', detail.easy_required - detail.easy_available],
    ['medium', detail.medium_required - detail.medium_available],
    ['hard', detail.hard_required - detail.hard_available],
  ]
    .filter(([, missing]) => Number(missing) > 0)
    .map(([difficulty, missing]) => `${missing} câu ${questionType} mức ${getDifficultyLabel(String(difficulty))}`);

  if (missingParts.length === 0) {
    return `${detail.learning_outcome_code} còn thiếu câu ${questionType}`;
  }

  return `${detail.learning_outcome_code} còn thiếu ${missingParts.join(', ')}`;
}
