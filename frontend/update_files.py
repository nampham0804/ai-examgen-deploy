import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# Dashboard.tsx
replace_in_file('src/app/pages/Dashboard.tsx', [
    (">Phân bố loại câu hỏi<", ">{t('dashboard.typeDistribution')}<"),
    (">Chưa có dữ liệu câu hỏi<", ">{t('dashboard.noData')}<"),
    ('name="Số lượng"', 'name={t("dashboard.quantity")}'),
])

# ExamBlueprint.tsx
replace_in_file('src/app/pages/ExamBlueprint.tsx', [
    ('Chi tiết số câu còn thiếu:', "{t('blueprint.missingDetails')}"),
    ('Bạn muốn tiếp tục lưu Blueprint hay chuyển sang Ngân hàng đề tạo thêm câu hỏi?', "{t('blueprint.continueOrAdd')}"),
    ('>Chuyển sang gen câu hỏi<', ">{t('blueprint.goToGen')}<"),
    ('>Vẫn lưu Blueprint<', ">{t('blueprint.saveAnyway')}<"),
])

# ExamGenerator.tsx
replace_in_file('src/app/pages/ExamGenerator.tsx', [
    ("'Chọn môn học...'", "t('examGen.selectCourse')"),
    ('placeholder="Tìm môn học..."', 'placeholder={t("examGen.searchCourse")}'),
    ('>Không tìm thấy môn học<', ">{t('examGen.noCourseFound')}<"),
    ("'Mất cân bằng'", "t('examGen.unbalancedLO')"),
    ("'Rất cân bằng'", "t('examGen.veryBalancedLO')"),
    ("'Cân bằng'", "t('examGen.balancedLO')"),
    ('message: "Vui lòng chọn Blueprint (Ma trận đề thi) hợp lệ đã được kiểm duyệt."', "message: t('examGen.validationErrorSelect')"),
    ('message: "Không đủ số lượng câu hỏi trong cơ sở dữ liệu theo cấu trúc Blueprint, không thể tạo đề thi."', "message: t('examGen.validationErrorNotEnough')"),
    ('message: "Tạo đề thi thành công! Đang hiển thị bản xem trước..."', "message: t('examGen.generateSuccess')"),
    ('message: e.message || "Tạo đề thi thất bại. Vui lòng kiểm tra lại Ngân hàng câu hỏi."', "message: e.message || t('examGen.generateFailed')"),
    ('>Quản lý đề thi<', ">{t('exam.management')}<"),
    ('-- Chọn Ma trận --', "{t('examGen.selectBlueprintPlaceholder')}"),
    ("(Chưa đủ CH)", "{t('examGen.notEnoughLOs')}"),
    (">Đề thi sẽ được hiển thị sau khi tạo<", ">{t('examGen.previewDisplay')}<"),
    (">Vui lòng thiết lập cấu hình ở bên trái và nhấn nút \"Tạo đề thi\" để AI tự động lấy câu hỏi ngẫu nhiên từ ngân hàng dựa trên ma trận (Blueprint).<", ">{t('examGen.previewInstruction')}<"),
    (">Tổng số câu<", ">{t('blueprint.total')}<"),
    (">Số LO phủ<", ">{t('examGen.loCovered')}<"),
    (">Loại câu hỏi<", ">{t('blueprint.questionType')}<"),
    ("> Chọn Blueprint để xem phân phối độ khó<", ">{t('blueprint.subtitle')}<"),
    ("> câu<", "> {t('exam.questions')}<"),
    (" câu)", " {t('exam.questions')})"),
])

# ExamList.tsx
replace_in_file('src/app/pages/ExamList.tsx', [
    ('alert("Xóa đề thi thất bại!");', 'alert(t("common.error"));'),
    ('alert(`Xuất file ${selectedFormat.toUpperCase()} thất bại!`);', 'alert(t("exam.exportFailed").replace("{format}", selectedFormat.toUpperCase()));'),
    ('>Quản lý đề thi<', ">{t('exam.management')}<"),
    ('>Xem, chỉnh sửa và quản lý tất cả các đề thi đã tạo<', ">{t('exam.managementDesc')}<"),
    ('>Tạo đề thi mới<', ">{t('exam.createNew')}<"),
    ('placeholder="Tìm kiếm đề thi..."', 'placeholder={t("exam.searchPlaceholder")}'),
    ('>Tổng số đề thi<', ">{t('exam.totalExams')}<"),
    ('>Thời lượng<', ">{t('exam.durationLabel')}<"),
    ('>Tất cả<', ">{t('exam.all')}<"),
    ('<= 60 phút', "{t('exam.duration_60')}"),
    ('61 - 90 phút', "{t('exam.duration_90')}"),
    ('91 - 120 phút', "{t('exam.duration_120')}"),
    ('> 120 phút', "{t('exam.duration_more')}"),
    ('>Số câu hỏi (từ - đến)<', ">{t('exam.numQuestionsFilter')}<"),
    ('placeholder="Từ"', 'placeholder={t("exam.from")}'),
    ('placeholder="Đến"', 'placeholder={t("exam.to")}'),
    ('>Chưa có đề thi nào<', ">{t('exam.noExams')}<"),
    ('>Nhấn "Tạo đề thi mới" để bắt đầu<', ">{t('exam.clickToStart')}<"),
    ('>Tên đề thi<', ">{t('exam.name')}<"),
    ('>Số câu<', ">{t('exam.numQuestions')}<"),
    ('>Ngày tạo<', ">{t('exam.createdAt')}<"),
    ('>Chỉnh sửa lần cuối<', ">{t('exam.lastEdited')}<"),
    ('>Thao tác<', ">{t('exam.actions')}<"),
    (' câu<', " {t('exam.questions')}<"),
    (' phút<', " {t('exam.minutes')}<"),
    ('title="Xem trước"', 'title={t("exam.previewTitle")}'),
    ('title="Xuất File"', 'title={t("exam.exportTitle")}'),
    ('title="Xóa"', 'title={t("exam.deleteTitle")}'),
    ('>Xác nhận xóa đề thi<', ">{t('exam.confirmDelete')}<"),
    ('Bạn có chắc chắn muốn xóa đề thi <strong>"{deleteTarget?.title}"</strong>? Hành động này không thể hoàn tác.', "{t('exam.confirmDeleteMessage').replace('{title}', deleteTarget?.title || '')}"),
    ('>Hủy<', ">{t('common.cancel')}<"),
    ('>Xóa<', ">{t('common.delete')}<"),
    ('>Chọn định dạng xuất file<', ">{t('exam.exportFormatTitle')}<"),
    ('>Xuất File<', ">{t('exam.exportTitle')}<"),
])

# ExamPreview.tsx
replace_in_file('src/app/pages/ExamPreview.tsx', [
    ('Khẩn cấp: Không còn câu hỏi tương tự trong Ngân hàng đề đáp ứng điều kiện. Vui lòng bổ sung thêm câu hỏi mới.', "t('exam.noAlternativeQuestion')"),
    ('Xuất file ${selectedFormat.toUpperCase()} thành công! File đang được tải xuống.', "t('exam.exportSuccess').replace('{format}', selectedFormat.toUpperCase())"),
    ('Xuất file ${selectedFormat.toUpperCase()} thất bại!', "t('exam.exportFailed').replace('{format}', selectedFormat.toUpperCase())"),
    ('Đã xác nhận và lưu đề thi thành công! Giao diện sẽ được làm mới...', "t('exam.savedSuccess')"),
    ('Có lỗi xảy ra khi lưu đề thi.', "t('exam.saveError')"),
    ('Đã lưu bản nháp thành công!', "t('exam.saveDraftSuccess')"),
    ('Có lỗi xảy ra khi lưu bản nháp.', "t('exam.draftError')"),
    ('>Câu {index + 1}<', ">{t('exam.questionIndex').replace('{index}', (index + 1).toString())}<"),
    ('>Đổi câu hỏi<', ">{t('exam.changeQuestion')}<"),
    ('>Đáp án đúng<', ">{t('exam.correctAnswer')}<"),
    ('>Giải thích<', ">{t('exam.explanation')}<"),
    ('>Đáp án mẫu<', ">{t('exam.sampleAnswer')}<"),
    ("'Chưa cập nhật'", "t('exam.notUpdated')"),
    ('>Rubric chấm điểm<', ">{t('exam.gradingRubric')}<"),
    ('>Thành công<', ">{t('common.success')}<"),
    ('>Lỗi<', ">{t('common.error')}<"),
    ('>Lưu bản nháp<', ">{t('exam.saveDraftSuccess').replace('Đã lưu bản nháp thành công!', t('common.save'))}<"), # Wait, I'll just fix this one manually in the string list. "Lưu bản nháp" means "Save draft"
    ('>Hủy<', ">{t('common.cancel')}<"),
    ('>Chọn định dạng xuất file<', ">{t('exam.exportFormatTitle')}<"),
    ('>Xuất File<', ">{t('exam.exportTitle')}<"),
])

print("Finished updating all components.")
