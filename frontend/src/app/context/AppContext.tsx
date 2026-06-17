import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';
type Language = 'en' | 'vi';

interface AppContextType {
  theme: Theme;
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.courses': 'Courses',
    'nav.learningOutcomes': 'Learning Outcomes',
    'nav.examBlueprint': 'Exam Blueprint',
    'nav.aiGeneration': 'AI Question Generation',
    'nav.questionBank': 'Question Bank',
    'nav.examGenerator': 'Exam Generator',
    'nav.review': 'Review & Approval',
    'nav.analytics': 'Analytics',
    
    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.totalCourses': 'Total Courses',
    'dashboard.totalLOs': 'Total Learning Outcomes',
    'dashboard.totalQuestions': 'Total Questions',
    'dashboard.totalExams': 'Total Exams',
    'dashboard.recentActivities': 'Recent Activities',
    'dashboard.difficultyDistribution': 'Question Difficulty Distribution',
    'dashboard.loCoverage': 'Learning Outcome Coverage',
    'dashboard.aiActivity': 'AI Activity Summary',
    'dashboard.quickActions': 'Quick Actions',
    'dashboard.createCourse': 'Create Course',
    'dashboard.generateQuestions': 'Generate Questions',
    'dashboard.createExam': 'Create Exam',
    'dashboard.recentAIQuestions': 'Recent AI-Generated Questions',
    
    // Courses
    'courses.title': 'Course Management',
    'courses.addCourse': 'Add Course',
    'courses.search': 'Search courses...',
    'courses.code': 'Course Code',
    'courses.name': 'Course Name',
    'courses.credits': 'Credits',
    'courses.status': 'Status',
    'courses.actions': 'Actions',
    'courses.active': 'Active',
    'courses.draft': 'Draft',
    'courses.archived': 'Archived',
    
    // Learning Outcomes
    'lo.title': 'Learning Outcomes',
    'lo.create': 'Create Learning Outcome',
    'lo.code': 'LO Code',
    'lo.description': 'Description',
    'lo.coverage': 'Coverage',
    'lo.course': 'Course',
    
    // Exam Blueprint
    'blueprint.title': 'Exam Blueprint Matrix',
    'blueprint.learningOutcome': 'Learning Outcome',
    'blueprint.easy': 'Easy',
    'blueprint.medium': 'Medium',
    'blueprint.hard': 'Hard',
    'blueprint.total': 'Total',
    'blueprint.validate': 'Validate Blueprint',
    'blueprint.save': 'Save Blueprint',
    
    // AI Generation
    'ai.title': 'AI Question Generation',
    'ai.selectCourse': 'Select Course',
    'ai.selectLO': 'Select Learning Outcome',
    'ai.uploadDocuments': 'Upload Documents',
    'ai.textInput': 'Or Enter Text',
    'ai.questionType': 'Question Type',
    'ai.difficulty': 'Difficulty Level',
    'ai.numQuestions': 'Number of Questions',
    'ai.generate': 'Generate Questions',
    'ai.workflow': 'AI Workflow',
    'ai.processing': 'Processing...',
    'ai.generatedQuestions': 'Generated Questions',
    'ai.accept': 'Accept',
    'ai.edit': 'Edit',
    'ai.regenerate': 'Regenerate',
    'ai.saveToBank': 'Save to Bank',
    
    // Question Bank
    'bank.title': 'Question Bank',
    'bank.search': 'Search questions...',
    'bank.filters': 'Filters',
    'bank.bulkActions': 'Bulk Actions',
    'bank.approved': 'Approved',
    'bank.pending': 'Pending',
    'bank.rejected': 'Rejected',
    
    // Exam Generator
    'exam.title': 'Exam Generator',
    'exam.configure': 'Configure Exam',
    'exam.selectBlueprint': 'Select Blueprint',
    'exam.preview': 'Preview Exam',
    'exam.export': 'Export',
    'exam.generate': 'Generate Exam',
    
    // Review
    'review.title': 'Question Review & Approval',
    'review.approve': 'Approve',
    'review.reject': 'Reject',
    'review.quality': 'Quality Score',
    'review.alignment': 'LO Alignment',
    
    // Analytics
    'analytics.title': 'Analytics Dashboard',
    'analytics.loCoverage': 'LO Coverage Heatmap',
    'analytics.questionGrowth': 'Question Bank Growth',
    'analytics.examStats': 'Exam Generation Statistics',
    'analytics.aiPerformance': 'AI Performance Insights',
    
    // Common
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.settings': 'Settings',
    'common.profile': 'Profile',
    'common.logout': 'Logout',
    'common.notifications': 'Notifications',
    'common.multipleChoice': 'Multiple Choice',
    'common.essay': 'Essay',
    'common.trueFalse': 'True/False',
  },
  vi: {
    // Navigation
    'nav.dashboard': 'Trang Chủ',
    'nav.courses': 'Khóa Học',
    'nav.learningOutcomes': 'Chuẩn Đầu Ra',
    'nav.examBlueprint': 'Ma Trận Đề Thi',
    'nav.aiGeneration': 'Tạo Câu Hỏi AI',
    'nav.questionBank': 'Ngân Hàng Câu Hỏi',
    'nav.examGenerator': 'Tạo Đề Thi',
    'nav.review': 'Duyệt & Phê Duyệt',
    'nav.analytics': 'Phân Tích',
    
    // Dashboard
    'dashboard.title': 'Trang Chủ',
    'dashboard.totalCourses': 'Tổng Khóa Học',
    'dashboard.totalLOs': 'Tổng Chuẩn Đầu Ra',
    'dashboard.totalQuestions': 'Tổng Câu Hỏi',
    'dashboard.totalExams': 'Tổng Đề Thi',
    'dashboard.recentActivities': 'Hoạt Động Gần Đây',
    'dashboard.difficultyDistribution': 'Phân Bổ Độ Khó Câu Hỏi',
    'dashboard.loCoverage': 'Độ Phủ Chuẩn Đầu Ra',
    'dashboard.aiActivity': 'Tóm Tắt Hoạt Động AI',
    'dashboard.quickActions': 'Thao Tác Nhanh',
    'dashboard.createCourse': 'Tạo Khóa Học',
    'dashboard.generateQuestions': 'Tạo Câu Hỏi',
    'dashboard.createExam': 'Tạo Đề Thi',
    'dashboard.recentAIQuestions': 'Câu Hỏi AI Gần Đây',
    
    // Courses
    'courses.title': 'Quản Lý Khóa Học',
    'courses.addCourse': 'Thêm Khóa Học',
    'courses.search': 'Tìm kiếm khóa học...',
    'courses.code': 'Mã Khóa Học',
    'courses.name': 'Tên Khóa Học',
    'courses.credits': 'Tín Chỉ',
    'courses.status': 'Trạng Thái',
    'courses.actions': 'Thao Tác',
    'courses.active': 'Hoạt Động',
    'courses.draft': 'Nháp',
    'courses.archived': 'Lưu Trữ',
    
    // Learning Outcomes
    'lo.title': 'Chuẩn Đầu Ra',
    'lo.create': 'Tạo Chuẩn Đầu Ra',
    'lo.code': 'Mã CDR',
    'lo.description': 'Mô Tả',
    'lo.coverage': 'Độ Phủ',
    'lo.course': 'Khóa Học',
    
    // Exam Blueprint
    'blueprint.title': 'Ma Trận Đề Thi',
    'blueprint.learningOutcome': 'Chuẩn Đầu Ra',
    'blueprint.easy': 'Dễ',
    'blueprint.medium': 'Trung Bình',
    'blueprint.hard': 'Khó',
    'blueprint.total': 'Tổng',
    'blueprint.validate': 'Kiểm Tra Ma Trận',
    'blueprint.save': 'Lưu Ma Trận',
    
    // AI Generation
    'ai.title': 'Tạo Câu Hỏi AI',
    'ai.selectCourse': 'Chọn Khóa Học',
    'ai.selectLO': 'Chọn Chuẩn Đầu Ra',
    'ai.uploadDocuments': 'Tải Lên Tài Liệu',
    'ai.textInput': 'Hoặc Nhập Văn Bản',
    'ai.questionType': 'Loại Câu Hỏi',
    'ai.difficulty': 'Độ Khó',
    'ai.numQuestions': 'Số Câu Hỏi',
    'ai.generate': 'Tạo Câu Hỏi',
    'ai.workflow': 'Quy Trình AI',
    'ai.processing': 'Đang xử lý...',
    'ai.generatedQuestions': 'Câu Hỏi Đã Tạo',
    'ai.accept': 'Chấp Nhận',
    'ai.edit': 'Chỉnh Sửa',
    'ai.regenerate': 'Tạo Lại',
    'ai.saveToBank': 'Lưu Vào Ngân Hàng',
    
    // Question Bank
    'bank.title': 'Ngân Hàng Câu Hỏi',
    'bank.search': 'Tìm kiếm câu hỏi...',
    'bank.filters': 'Bộ Lọc',
    'bank.bulkActions': 'Thao Tác Hàng Loạt',
    'bank.approved': 'Đã Duyệt',
    'bank.pending': 'Chờ Duyệt',
    'bank.rejected': 'Từ Chối',
    
    // Exam Generator
    'exam.title': 'Tạo Đề Thi',
    'exam.configure': 'Cấu Hình Đề Thi',
    'exam.selectBlueprint': 'Chọn Ma Trận',
    'exam.preview': 'Xem Trước Đề Thi',
    'exam.export': 'Xuất File',
    'exam.generate': 'Tạo Đề Thi',
    
    // Review
    'review.title': 'Duyệt & Phê Duyệt Câu Hỏi',
    'review.approve': 'Phê Duyệt',
    'review.reject': 'Từ Chối',
    'review.quality': 'Điểm Chất Lượng',
    'review.alignment': 'Căn Chỉnh CDR',
    
    // Analytics
    'analytics.title': 'Bảng Phân Tích',
    'analytics.loCoverage': 'Bản Đồ Nhiệt Độ Phủ CDR',
    'analytics.questionGrowth': 'Tăng Trưởng Ngân Hàng Câu Hỏi',
    'analytics.examStats': 'Thống Kê Tạo Đề Thi',
    'analytics.aiPerformance': 'Hiệu Suất AI',
    
    // Common
    'common.edit': 'Sửa',
    'common.delete': 'Xóa',
    'common.save': 'Lưu',
    'common.cancel': 'Hủy',
    'common.search': 'Tìm kiếm',
    'common.filter': 'Lọc',
    'common.export': 'Xuất',
    'common.import': 'Nhập',
    'common.settings': 'Cài Đặt',
    'common.profile': 'Hồ Sơ',
    'common.logout': 'Đăng Xuất',
    'common.notifications': 'Thông Báo',
    'common.multipleChoice': 'Trắc Nghiệm',
    'common.essay': 'Tự Luận',
    'common.trueFalse': 'Đúng/Sai',
  },
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    // Apply theme to document
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <AppContext.Provider value={{ theme, toggleTheme, language, setLanguage, t }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
