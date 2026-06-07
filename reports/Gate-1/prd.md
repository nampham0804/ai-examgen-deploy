# TÀI LIỆU YÊU CẦU SẢN PHẨM (PRD)

# AI-ExamGen - Hệ thống AI Tạo Đề Thi & Ngân Hàng Câu Hỏi Theo Chuẩn Đầu Ra

## Thông tin tài liệu

| Thuộc tính | Giá trị |
|------------|----------|
| Tên sản phẩm | AI-ExamGen |
| Phiên bản | 1.0 |
| Trạng thái | Draft |
| Ngày cập nhật | 08/06/2026 |

---

# 1. Tổng quan dự án

## 1.1 Bối cảnh

Tại các trường đại học, việc xây dựng ngân hàng câu hỏi và đề thi theo Chuẩn đầu ra (Learning Outcomes - LO) là một yêu cầu bắt buộc nhằm đảm bảo chất lượng đào tạo.

Tuy nhiên, quá trình này hiện nay vẫn được thực hiện chủ yếu bằng phương pháp thủ công, gây ra nhiều khó khăn:

- Tốn nhiều thời gian biên soạn câu hỏi.
- Khó đảm bảo sự đồng nhất về chất lượng.
- Khó kiểm soát độ khó của câu hỏi.
- Khó đánh giá mức độ bao phủ các Chuẩn đầu ra.
- Dễ phát sinh các câu hỏi trùng lặp trong ngân hàng.
- Việc xây dựng đề thi thường phụ thuộc nhiều vào kinh nghiệm cá nhân của giảng viên.

Sự phát triển của các mô hình ngôn ngữ lớn (LLM) cho phép tự động hóa phần lớn các công việc trên, từ đó nâng cao hiệu quả và chất lượng xây dựng đề thi.

## 1.2 Mục tiêu sản phẩm

### Tối ưu hiệu suất

- Giảm tối thiểu 70% thời gian xây dựng ngân hàng câu hỏi và đề thi.

### Chuẩn hóa chất lượng

Đảm bảo mỗi câu hỏi:

- Được gắn với ít nhất một Chuẩn đầu ra (LO).
- Được phân loại độ khó rõ ràng.
- Được kiểm duyệt trước khi lưu vào ngân hàng chính thức.

### Số hóa quy trình

Xây dựng một nền tảng tập trung cho phép:

- Quản lý học phần.
- Quản lý chuẩn đầu ra.
- Sinh câu hỏi bằng AI.
- Quản lý ngân hàng câu hỏi.
- Tạo đề thi tự động.
- Xuất bản đề thi đa định dạng.

---

# 2. Đối tượng sử dụng

## 2.1 Giảng viên (Primary User)

Là người sử dụng chính của hệ thống.

### Nhiệm vụ

- Quản lý học phần.
- Khai báo chuẩn đầu ra.
- Upload tài liệu môn học.
- Sinh câu hỏi bằng AI.
- Chỉnh sửa và phê duyệt câu hỏi.
- Quản lý ngân hàng câu hỏi.
- Tạo đề thi.
- Xuất đề thi.

---

# 3. Phạm vi sản phẩm (MVP)

## 3.1 Phân hệ Quản lý Học phần & Chuẩn đầu ra

### Chức năng

#### Quản lý học phần

- Tạo học phần mới.
- Cập nhật thông tin học phần.
- Xóa học phần.
- Xem danh sách học phần.

Thông tin học phần:

- Mã học phần
- Tên học phần
- Số tín chỉ
- Mô tả môn học

#### Quản lý Chuẩn đầu ra (LO)

Giảng viên có thể:

- Thêm LO mới.
- Chỉnh sửa LO.
- Xóa LO.
- Xem danh sách LO.

Ví dụ:

- LO1: Hiểu các khái niệm cơ bản.
- LO2: Phân tích và đánh giá vấn đề.
- LO3: Vận dụng kiến thức để giải quyết bài toán thực tế.

#### Thiết lập ma trận đề thi

| Chuẩn đầu ra | Độ khó | Tỷ lệ |
|--------------|---------|--------|
| LO1 | Dễ | 70% |
| LO2 | Trung bình | 20% |
| LO3 | Khó | 10% |

---

## 3.2 Phân hệ AI Sinh Câu Hỏi

### Dữ liệu đầu vào

#### Chọn Chuẩn đầu ra

Giảng viên lựa chọn LO mục tiêu.

#### Cung cấp tài liệu

**Nhập văn bản trực tiếp**

Người dùng có thể nhập nội dung thủ công.

**Upload tài liệu**

Hỗ trợ:

- PDF
- DOCX
- PPT/PPTX
- XLS/XLSX

Dung lượng tối đa: **50MB/tệp**

### Xử lý AI

1. Đọc tài liệu.
2. Trích xuất kiến thức.
3. Hiểu nội dung liên quan tới LO.
4. Sinh câu hỏi phù hợp.

### Kết quả đầu ra

#### Câu hỏi trắc nghiệm

Yêu cầu:

- 4 phương án trả lời.
- 1 đáp án đúng duy nhất.

#### Câu hỏi tự luận

Bao gồm:

- Nội dung câu hỏi.
- Đáp án mẫu.
- Hướng dẫn chấm điểm.

#### Gắn nhãn độ khó

- Dễ
- Trung bình
- Khó

#### Giải thích Mapping LO

AI phải giải thích:

- Câu hỏi đang đánh giá năng lực nào.
- Vì sao câu hỏi phù hợp với LO đã chọn.

...