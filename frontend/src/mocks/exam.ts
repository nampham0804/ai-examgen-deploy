import { Blueprint, ExamPreviewData, Exam } from '../types/exam';

export const MOCK_APPROVED_QUESTIONS = [
  {
    id: 301,
    course_id: 1,
    learning_outcome_id: 1,
    question_type: "mcq",
    question_text: "Supervised learning dùng loại dữ liệu nào?",
    difficulty: "easy",
    options: [
      { key: "A", text: "Dữ liệu có nhãn" },
      { key: "B", text: "Dữ liệu không có nhãn" },
      { key: "C", text: "Dữ liệu bị xóa" },
      { key: "D", text: "Không cần dữ liệu" }
    ],
    correct_answer: "A",
    suggested_answer: null,
    grading_rubric: null,
    status: "approved"
  },
  {
    id: 302,
    course_id: 1,
    learning_outcome_id: 1,
    question_type: "essay",
    question_text: "So sánh supervised learning và unsupervised learning.",
    difficulty: "medium",
    options: null,
    correct_answer: null,
    suggested_answer: "Supervised learning học từ dữ liệu có nhãn; unsupervised learning tìm cấu trúc từ dữ liệu không nhãn.",
    grading_rubric: "So sánh dữ liệu đầu vào; mục tiêu; ví dụ thuật toán.",
    status: "approved"
  }
];

export const MOCK_BLUEPRINTS: Blueprint[] = [
  {
    id: 1,
    course_id: 1,
    title: "Đề giữa kỳ - Demo 6 câu",
    status: "validated",
    total_questions: 6,
    created_at: "2026-06-16T10:00:00Z",
    updated_at: "2026-06-16T10:00:00Z",
    items: [
      {
        id: 1,
        blueprint_id: 1,
        learning_outcome_id: 1,
        question_type: "mcq",
        easy_count: 2,
        medium_count: 2,
        hard_count: 0
      },
      {
        id: 2,
        blueprint_id: 1,
        learning_outcome_id: 1,
        question_type: "essay",
        easy_count: 0,
        medium_count: 1,
        hard_count: 1
      }
    ]
  },
  {
    id: 2,
    course_id: 1,
    title: "Đề cuối kỳ - Bản nháp",
    status: "draft",
    total_questions: 10,
    created_at: "2026-06-17T10:00:00Z",
    updated_at: "2026-06-17T10:00:00Z",
    items: [
      {
        id: 3,
        blueprint_id: 2,
        learning_outcome_id: 1,
        question_type: "mcq",
        easy_count: 5,
        medium_count: 5,
        hard_count: 0
      }
    ]
  }
];

export const MOCK_VALIDATE_RESULT = {
  is_valid: true,
  total_required: 6,
  details: [
    {
      learning_outcome_id: 1,
      learning_outcome_code: "LO1",
      question_type: "mcq",
      easy_required: 2,
      easy_available: 5,
      medium_required: 2,
      medium_available: 4,
      hard_required: 0,
      hard_available: 2,
      is_valid: true,
      missing: null
    },
    {
      learning_outcome_id: 1,
      learning_outcome_code: "LO1",
      question_type: "essay",
      easy_required: 0,
      easy_available: 1,
      medium_required: 1,
      medium_available: 2,
      hard_required: 1,
      hard_available: 1,
      is_valid: true,
      missing: null
    }
  ]
};

export const MOCK_EXAM_PREVIEW: ExamPreviewData = {
  id: 7,
  course_name: "Machine Learning",
  title: "Đề thi giữa kỳ CS401 - 01",
  duration_minutes: 60,
  total_questions: 2,
  questions: [
    {
      id: 1001,
      exam_id: 7,
      question_id: 301,
      order_index: 1,
      type: "Multiple Choice",
      text: "Supervised learning dùng loại dữ liệu nào?",
      options: [
        "Dữ liệu có nhãn",
        "Dữ liệu không có nhãn",
        "Dữ liệu bị xóa",
        "Không cần dữ liệu"
      ],
      correct_answer: "Dữ liệu có nhãn",
      difficulty: "easy",
      learning_outcome_code: "LO1"
    },
    {
      id: 1002,
      exam_id: 7,
      question_id: 302,
      order_index: 2,
      type: "Essay",
      text: "So sánh supervised learning và unsupervised learning.",
      sample_answer: "Supervised learning học từ dữ liệu có nhãn; unsupervised learning tìm cấu trúc từ dữ liệu không nhãn.",
      rubric: "So sánh dữ liệu đầu vào; mục tiêu; ví dụ thuật toán.",
      difficulty: "medium",
      learning_outcome_code: "LO1"
    }
  ]
};

export const MOCK_EXAMS: Exam[] = [
  {
    id: 7,
    course_id: 1,
    blueprint_id: 1,
    title: "Đề thi giữa kỳ CS401 - 01",
    duration_minutes: 60,
    total_questions: 6,
    status: "generated",
    created_at: "2026-06-16T10:00:00Z",
    updated_at: "2026-06-16T10:00:00Z",
    questions: []
  },
  {
    id: 8,
    course_id: 1,
    blueprint_id: 1,
    title: "Đề thi giữa kỳ CS401 - 02",
    duration_minutes: 90,
    total_questions: 6,
    status: "generated",
    created_at: "2026-06-17T14:30:00Z",
    updated_at: "2026-06-17T14:30:00Z",
    questions: []
  },
  {
    id: 9,
    course_id: 1,
    blueprint_id: 1,
    title: "Đề thi cuối kỳ CS401 - Bản nháp",
    duration_minutes: 120,
    total_questions: 0,
    status: "draft",
    created_at: "2026-06-18T08:00:00Z",
    updated_at: "2026-06-18T08:00:00Z",
    questions: []
  }
];
