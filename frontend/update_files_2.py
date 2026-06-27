import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# AIGeneration.tsx
replace_in_file('src/app/pages/AIGeneration.tsx', [
    ("'Document Upload'", "t('ai.step1')"),
    ("'Knowledge Extraction'", "t('ai.step2')"),
    ("'LO Understanding'", "t('ai.step3')"),
    ("'Question Generation'", "t('ai.step4')"),
    ("'Pending Review'", "t('ai.step5')"),
    (">No courses are available from the backend yet.<", ">{t('ai.noCourses')}<"),
    (">No learning outcomes are available for this course.<", ">{t('ai.noLOs')}<"),
    ("selectedFile ? selectedFile.name : 'Click to choose a file'", "selectedFile ? selectedFile.name : t('ai.clickToChoose')"),
    (">PDF or DOCX, max 15 MB<", ">{t('ai.fileHint')}<"),
    ("'uploaded this session'", "t('ai.sourceSession')"),
    ("'selected from history'", "t('ai.sourceHistory')"),
    (">Reuse uploaded materials for the selected course.<", ">{t('ai.reuseMaterials')}<"),
    (">Select a course to load existing documents.<", ">{t('ai.selectCourseLoad')}<"),
    (">No uploaded documents found for this course.<", ">{t('ai.noDocuments')}<"),
    (">Required before generation.<", ">{t('ai.requiredBeforeGen')}<"),
    (">Upload a document before extraction.<", ">{t('ai.uploadBeforeExtract')}<"),
    (">Allowed range: 1-5 questions. Default is 3.<", ">{t('ai.allowedRange')}<"),
    (">Next step<", ">{t('ai.nextStep')}<"),
    (">No explanation/source note was returned.<", ">{t('ai.noExplanation')}<"),
    (">MCQ options are missing from this response.<", ">{t('ai.mcqMissing')}<"),
    (">Not provided.<", ">{t('ai.notProvided')}<"),
    ("Section: ", "{t('ai.section')}: "),
])

# Courses.tsx
replace_in_file('src/app/pages/Courses.tsx', [
    (">Quản lý danh sách các khóa học trong hệ thống<", ">{t('courses.subtitle')}<"),
])

# LearningOutcomes.tsx
replace_in_file('src/app/pages/LearningOutcomes.tsx', [
    (">Quản lý danh sách các chuẩn đầu ra theo môn học<", ">{t('lo.subtitle')}<"),
])

# QuestionBank.tsx
replace_in_file('src/app/pages/QuestionBank.tsx', [
    (">Quản lý, tìm kiếm và lọc tất cả các câu hỏi trong hệ thống<", ">{t('bank.subtitle')}<"),
])

# Review.tsx
replace_in_file('src/app/pages/Review.tsx', [
    (">Duyệt và phê duyệt các câu hỏi được tạo bởi AI<", ">{t('review.subtitle')}<"),
])

# Analytics.tsx
replace_in_file('src/app/pages/Analytics.tsx', [
    (">Thống kê tổng quan và báo cáo về hoạt động của hệ thống<", ">{t('analytics.subtitle')}<"),
])

print("Finished updating UI components.")
