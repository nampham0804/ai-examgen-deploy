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
    'dashboard.pendingQuestions': 'Pending Questions',
    'dashboard.approvedQuestions': 'Approved Questions',
    'dashboard.totalExams': 'Total Exams',
    'dashboard.blueprints': 'Total Blueprints',
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
    'blueprint.subtitle': 'Design question distribution by Learning Outcome (LO)',
    'blueprint.learningOutcome': 'Learning Outcome',
    'blueprint.easy': 'Easy',
    'blueprint.medium': 'Medium',
    'blueprint.hard': 'Hard',
    'blueprint.total': 'Total',
    'blueprint.validate': 'Validate Blueprint',
    'blueprint.save': 'Save Blueprint',
    'blueprint.selectCourse': 'Select Course (Search)',
    'blueprint.searchPlaceholder': 'Search course code or name...',
    'blueprint.noCourses': 'No courses found.',
    'blueprint.check': 'Check',
    'blueprint.saving': 'Saving...',
    'blueprint.update': 'Update',
    'blueprint.saveSuccess': 'Blueprint saved successfully!',
    'blueprint.saveError': 'Error saving blueprint. Please try again.',
    'blueprint.balanced': 'Difficulty ratio is well-balanced!',
    'blueprint.unbalanced': 'Difficulty ratio needs adjustment',
    'blueprint.balancedDesc': 'Difficulty distribution follows standard (Easy: 30-50%, Medium: 30-50%, Hard: 10-30%)',
    'blueprint.unbalancedDesc': 'Recommended: Easy 30-50%, Medium 30-50%, Hard 10-30%.',
    'blueprint.validationSuccess': 'Blueprint Validated Successfully',
    'blueprint.validationFailed': 'Question Bank Shortage',
    'blueprint.validationSuccessDesc': 'All requested questions are available in the approved Question Bank.',
    'blueprint.validationFailedDesc': 'There are missing questions in the Question Bank. Please add more approved questions or adjust the blueprint.',
    'blueprint.autoTotal': 'Total Questions',
    'blueprint.autoTypes': 'Question Types',
    'blueprint.autoBtn': 'Auto Distribute',
    'blueprint.selectAtLeastOneType': 'Please select at least 1 question type',
    'blueprint.lo': 'Learning Outcome (Content)',
    'blueprint.questionType': 'Question Type',
    'blueprint.numQuestions': 'Number of Questions',
    'blueprint.delete': 'Delete',
    'blueprint.addType': '-- Select question type --',
    'blueprint.addBtn': 'Add',
    'blueprint.allTypesAdded': 'All question types added.',
    'blueprint.addTypeStart': '-- Select question type to start --',
    'blueprint.addTypeBtn': 'Add Q. Type',
    'blueprint.grandTotal': 'GRAND TOTAL',
    'blueprint.confirmDelete': 'Are you sure you want to delete this blueprint?',
    
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

    // New Translations
    'dashboard.typeDistribution': 'Question Type Distribution',
    'dashboard.noData': 'No data available',
    'dashboard.quantity': 'Quantity',
    
    'common.success': 'Success',
    'common.error': 'Error',
    'common.info': 'Information',

    'exam.management': 'Exam Management',
    'exam.managementDesc': 'View, edit and manage all generated exams',
    'exam.createNew': 'Create New Exam',
    'exam.searchPlaceholder': 'Search exams...',
    'exam.totalExams': 'Total Exams',
    'exam.durationLabel': 'Duration',
    'exam.all': 'All',
    'exam.duration_60': '<= 60 min',
    'exam.duration_90': '61 - 90 min',
    'exam.duration_120': '91 - 120 min',
    'exam.duration_more': '> 120 min',
    'exam.numQuestionsFilter': 'Number of questions (from - to)',
    'exam.from': 'From',
    'exam.to': 'To',
    'exam.noExams': 'No exams available',
    'exam.clickToStart': 'Click "Create New Exam" to get started',
    'exam.name': 'Exam Name',
    'exam.numQuestions': 'Questions',
    'exam.createdAt': 'Created At',
    'exam.lastEdited': 'Last Edited',
    'exam.actions': 'Actions',
    'exam.questions': 'questions',
    'exam.minutes': 'minutes',
    'exam.previewTitle': 'Preview',
    'exam.exportTitle': 'Export File',
    'exam.deleteTitle': 'Delete',
    'exam.confirmDelete': 'Confirm delete exam',
    'exam.confirmDeleteMessage': 'Are you sure you want to delete exam "{title}"? This action cannot be undone.',
    'exam.exportFormatTitle': 'Select Export Format',
    'exam.exportFailed': 'Failed to export {format} file!',
    'exam.exportSuccess': 'Successfully exported {format} file! Download is starting.',
    'exam.savedSuccess': 'Exam confirmed and saved successfully! Interface will refresh...',
    'exam.saveDraftSuccess': 'Draft saved successfully!',
    'exam.saveError': 'Error saving exam.',
    'exam.draftError': 'Error saving draft.',
    'exam.changeQuestion': 'Change Question',
    'exam.correctAnswer': 'Correct Answer',
    'exam.explanation': 'Explanation',
    'exam.sampleAnswer': 'Sample Answer',
    'exam.notUpdated': 'Not updated',
    'exam.gradingRubric': 'Grading Rubric',
    'exam.noAlternativeQuestion': 'No alternative questions available in the Bank matching the criteria. Please add more questions.',
    'exam.questionIndex': 'Question {index}',

    'blueprint.missingDetails': 'Missing questions details:',
    'blueprint.continueOrAdd': 'Do you want to continue saving the Blueprint or go to the Question Bank to add more questions?',
    'blueprint.goToGen': 'Go to AI Generation',
    'blueprint.saveAnyway': 'Save Blueprint anyway',
    
    'examGen.selectCourse': 'Select course...',
    'examGen.searchCourse': 'Search course...',
    'examGen.noCourseFound': 'No course found',
    'examGen.validationErrorSelect': 'Please select a valid, approved Blueprint.',
    'examGen.validationErrorNotEnough': 'Not enough questions in the database according to the Blueprint structure. Cannot generate exam.',
    'examGen.generateSuccess': 'Exam generated successfully! Displaying preview...',
    'examGen.generateFailed': 'Exam generation failed. Please check the Question Bank.',
    'examGen.selectBlueprintPlaceholder': '-- Select Blueprint --',
    'examGen.notEnoughLOs': '(Not enough Qs)',
    'examGen.previewDisplay': 'Exam will be displayed here after generation',
    'examGen.previewInstruction': 'Please configure settings on the left and click "Generate Exam" to let AI automatically pull random questions from the bank based on the Blueprint.',
    'examGen.unbalancedLO': 'Unbalanced',
    'examGen.balancedLO': 'Balanced',
    'examGen.veryBalancedLO': 'Very Balanced',
    'examGen.loCovered': 'LO Covered',


    // AI Generation Extended
    'ai.step1': 'Document Upload',
    'ai.step2': 'Knowledge Extraction',
    'ai.step3': 'LO Understanding',
    'ai.step4': 'Question Generation',
    'ai.step5': 'Pending Review',
    'ai.noCourses': 'No courses are available from the backend yet.',
    'ai.noLOs': 'No learning outcomes are available for this course.',
    'ai.clickToChoose': 'Click to choose a file',
    'ai.fileHint': 'PDF or DOCX, max 15 MB',
    'ai.reuseMaterials': 'Reuse uploaded materials for the selected course.',
    'ai.selectCourseLoad': 'Select a course to load existing documents.',
    'ai.noDocuments': 'No uploaded documents found for this course.',
    'ai.requiredBeforeGen': 'Required before generation.',
    'ai.uploadBeforeExtract': 'Upload a document before extraction.',
    'ai.allowedRange': 'Allowed range: 1-5 questions. Default is 3.',
    'ai.nextStep': 'Next step',
    'ai.noExplanation': 'No explanation/source note was returned.',
    'ai.mcqMissing': 'MCQ options are missing from this response.',
    'ai.notProvided': 'Not provided.',
    'ai.section': 'Section',
    'ai.sourceSession': 'uploaded this session',
    'ai.sourceHistory': 'selected from history',

    // Page Subtitles
    'courses.subtitle': 'Manage course list in the system',
    'lo.subtitle': 'Manage Learning Outcomes for each course',
    'bank.subtitle': 'Manage all questions in the bank',
    'review.subtitle': 'Review questions generated by AI before adding them to the bank',
    'analytics.subtitle': 'Overall statistics and analysis of the system',

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
    'dashboard.pendingQuestions': 'Câu Hỏi Chờ Duyệt',
    'dashboard.approvedQuestions': 'Câu Hỏi Đã Duyệt',
    'dashboard.totalExams': 'Tổng Đề Thi',
    'dashboard.blueprints': 'Tổng Ma Trận (Blueprints)',
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
    'blueprint.subtitle': 'Thiết kế phân bổ câu hỏi theo Chuẩn đầu ra (LO)',
    'blueprint.learningOutcome': 'Chuẩn Đầu Ra',
    'blueprint.easy': 'Dễ',
    'blueprint.medium': 'Trung Bình',
    'blueprint.hard': 'Khó',
    'blueprint.total': 'Tổng',
    'blueprint.validate': 'Kiểm Tra Ma Trận',
    'blueprint.save': 'Lưu Ma Trận',
    'blueprint.selectCourse': 'Chọn Môn Học (Tìm kiếm)',
    'blueprint.searchPlaceholder': 'Tìm kiếm mã hoặc tên môn học...',
    'blueprint.noCourses': 'Không tìm thấy môn học.',
    'blueprint.check': 'Kiểm tra',
    'blueprint.saving': 'Đang lưu...',
    'blueprint.update': 'Cập nhật',
    'blueprint.saveSuccess': 'Lưu ma trận đề thi thành công!',
    'blueprint.saveError': 'Có lỗi xảy ra khi lưu ma trận. Vui lòng thử lại.',
    'blueprint.balanced': 'Tỉ lệ độ khó rất cân đối!',
    'blueprint.unbalanced': 'Tỉ lệ câu hỏi cần điều chỉnh lại',
    'blueprint.balancedDesc': 'Phân bổ độ khó đang tuân thủ đúng chuẩn (Dễ: 30-50%, Trung bình: 30-50%, Khó: 10-30%)',
    'blueprint.unbalancedDesc': 'Khuyến nghị: Dễ 30-50%, Trung bình 30-50%, Khó 10-30%.',
    'blueprint.validationSuccess': 'Kiểm tra ma trận thành công',
    'blueprint.validationFailed': 'Thiếu câu hỏi trong ngân hàng',
    'blueprint.validationSuccessDesc': 'Tất cả câu hỏi yêu cầu đã có sẵn trong Ngân hàng câu hỏi đã duyệt.',
    'blueprint.validationFailedDesc': 'Có một số câu hỏi còn thiếu trong Ngân hàng câu hỏi. Vui lòng thêm câu hỏi hoặc điều chỉnh lại ma trận.',
    'blueprint.autoTotal': 'Tổng số câu hỏi',
    'blueprint.autoTypes': 'Loại câu hỏi',
    'blueprint.autoBtn': 'Phân bổ tự động',
    'blueprint.selectAtLeastOneType': 'Vui lòng chọn ít nhất 1 loại câu hỏi',
    'blueprint.lo': 'Chuẩn đầu ra (Nội dung)',
    'blueprint.questionType': 'Loại câu hỏi',
    'blueprint.numQuestions': 'Số câu hỏi',
    'blueprint.delete': 'Xóa',
    'blueprint.addType': '-- Chọn loại câu hỏi --',
    'blueprint.addBtn': 'Thêm',
    'blueprint.allTypesAdded': 'Đã thêm tất cả loại câu hỏi.',
    'blueprint.addTypeStart': '-- Chọn loại câu hỏi để bắt đầu --',
    'blueprint.addTypeBtn': 'Thêm Loại C.Hỏi',
    'blueprint.grandTotal': 'TỔNG CỘNG',
    'blueprint.confirmDelete': 'Bạn có chắc chắn muốn xóa ma trận này không?',
    
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

    // New Translations
    'dashboard.typeDistribution': 'Phân bố loại câu hỏi',
    'dashboard.noData': 'Chưa có dữ liệu câu hỏi',
    'dashboard.quantity': 'Số lượng',

    'common.success': 'Thành công',
    'common.error': 'Lỗi',
    'common.info': 'Thông báo',

    'exam.management': 'Quản lý đề thi',
    'exam.managementDesc': 'Xem, chỉnh sửa và quản lý tất cả các đề thi đã tạo',
    'exam.createNew': 'Tạo đề thi mới',
    'exam.searchPlaceholder': 'Tìm kiếm đề thi...',
    'exam.totalExams': 'Tổng số đề thi',
    'exam.durationLabel': 'Thời lượng',
    'exam.all': 'Tất cả',
    'exam.duration_60': '<= 60 phút',
    'exam.duration_90': '61 - 90 phút',
    'exam.duration_120': '91 - 120 phút',
    'exam.duration_more': '> 120 phút',
    'exam.numQuestionsFilter': 'Số câu hỏi (từ - đến)',
    'exam.from': 'Từ',
    'exam.to': 'Đến',
    'exam.noExams': 'Chưa có đề thi nào',
    'exam.clickToStart': 'Nhấn "Tạo đề thi mới" để bắt đầu',
    'exam.name': 'Tên đề thi',
    'exam.numQuestions': 'Số câu',
    'exam.createdAt': 'Ngày tạo',
    'exam.lastEdited': 'Chỉnh sửa lần cuối',
    'exam.actions': 'Thao tác',
    'exam.questions': 'câu',
    'exam.minutes': 'phút',
    'exam.previewTitle': 'Xem trước',
    'exam.exportTitle': 'Xuất File',
    'exam.deleteTitle': 'Xóa',
    'exam.confirmDelete': 'Xác nhận xóa đề thi',
    'exam.confirmDeleteMessage': 'Bạn có chắc chắn muốn xóa đề thi "{title}"? Hành động này không thể hoàn tác.',
    'exam.exportFormatTitle': 'Chọn định dạng xuất file',
    'exam.exportFailed': 'Xuất file {format} thất bại!',
    'exam.exportSuccess': 'Xuất file {format} thành công! File đang được tải xuống.',
    'exam.savedSuccess': 'Đã xác nhận và lưu đề thi thành công! Giao diện sẽ được làm mới...',
    'exam.saveDraftSuccess': 'Đã lưu bản nháp thành công!',
    'exam.saveError': 'Có lỗi xảy ra khi lưu đề thi.',
    'exam.draftError': 'Có lỗi xảy ra khi lưu bản nháp.',
    'exam.changeQuestion': 'Đổi câu hỏi',
    'exam.correctAnswer': 'Đáp án đúng',
    'exam.explanation': 'Giải thích',
    'exam.sampleAnswer': 'Đáp án mẫu',
    'exam.notUpdated': 'Chưa cập nhật',
    'exam.gradingRubric': 'Rubric chấm điểm',
    'exam.noAlternativeQuestion': 'Không còn câu hỏi tương tự trong Ngân hàng đề đáp ứng điều kiện. Vui lòng bổ sung thêm câu hỏi mới.',
    'exam.questionIndex': 'Câu {index}',

    'blueprint.missingDetails': 'Chi tiết số câu còn thiếu:',
    'blueprint.continueOrAdd': 'Bạn muốn tiếp tục lưu Blueprint hay chuyển sang Ngân hàng đề tạo thêm câu hỏi?',
    'blueprint.goToGen': 'Chuyển sang gen câu hỏi',
    'blueprint.saveAnyway': 'Vẫn lưu Blueprint',

    'examGen.selectCourse': 'Chọn môn học...',
    'examGen.searchCourse': 'Tìm môn học...',
    'examGen.noCourseFound': 'Không tìm thấy môn học',
    'examGen.validationErrorSelect': 'Vui lòng chọn Blueprint (Ma trận đề thi) hợp lệ đã được kiểm duyệt.',
    'examGen.validationErrorNotEnough': 'Không đủ số lượng câu hỏi trong cơ sở dữ liệu theo cấu trúc Blueprint, không thể tạo đề thi.',
    'examGen.generateSuccess': 'Tạo đề thi thành công! Đang hiển thị bản xem trước...',
    'examGen.generateFailed': 'Tạo đề thi thất bại. Vui lòng kiểm tra lại Ngân hàng câu hỏi.',
    'examGen.selectBlueprintPlaceholder': '-- Chọn Ma trận --',
    'examGen.notEnoughLOs': '(Chưa đủ CH)',
    'examGen.previewDisplay': 'Đề thi sẽ được hiển thị sau khi tạo',
    'examGen.previewInstruction': 'Vui lòng thiết lập cấu hình ở bên trái và nhấn nút "Tạo đề thi" để AI tự động lấy câu hỏi ngẫu nhiên từ ngân hàng dựa trên ma trận (Blueprint).',
    'examGen.unbalancedLO': 'Mất cân bằng',
    'examGen.balancedLO': 'Cân bằng',
    'examGen.veryBalancedLO': 'Rất cân bằng',
    'examGen.loCovered': 'Số LO phủ',


    // AI Generation Extended
    'ai.step1': 'Tải lên tài liệu',
    'ai.step2': 'Trích xuất kiến thức',
    'ai.step3': 'Phân tích chuẩn đầu ra',
    'ai.step4': 'Tạo câu hỏi',
    'ai.step5': 'Chờ duyệt',
    'ai.noCourses': 'Chưa có khóa học nào trên hệ thống.',
    'ai.noLOs': 'Khóa học này chưa có chuẩn đầu ra nào.',
    'ai.clickToChoose': 'Nhấn để chọn file',
    'ai.fileHint': 'PDF hoặc DOCX, tối đa 15 MB',
    'ai.reuseMaterials': 'Sử dụng lại tài liệu đã tải lên cho khóa học này.',
    'ai.selectCourseLoad': 'Chọn khóa học để xem tài liệu đã có.',
    'ai.noDocuments': 'Không có tài liệu nào cho khóa học này.',
    'ai.requiredBeforeGen': 'Bắt buộc chọn trước khi tạo.',
    'ai.uploadBeforeExtract': 'Tải lên tài liệu trước khi trích xuất.',
    'ai.allowedRange': 'Cho phép 1-5 câu. Mặc định là 3.',
    'ai.nextStep': 'Bước tiếp theo',
    'ai.noExplanation': 'Không có giải thích hoặc nguồn gốc trích xuất.',
    'ai.mcqMissing': 'Thiếu các lựa chọn trắc nghiệm.',
    'ai.notProvided': 'Không có thông tin.',
    'ai.section': 'Phần',
    'ai.sourceSession': 'vừa tải lên',
    'ai.sourceHistory': 'chọn từ lịch sử',

    // Page Subtitles
    'courses.subtitle': 'Quản lý danh sách các khóa học trong hệ thống',
    'lo.subtitle': 'Quản lý chuẩn đầu ra cho từng khóa học',
    'bank.subtitle': 'Quản lý tất cả câu hỏi trong ngân hàng đề',
    'review.subtitle': 'Duyệt câu hỏi do AI tạo trước khi đưa vào ngân hàng',
    'analytics.subtitle': 'Thống kê và phân tích tổng quan toàn hệ thống',

  },
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [language, setLanguage] = useState<Language>('vi');

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
