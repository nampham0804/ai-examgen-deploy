# TV2 - Kế hoạch chi tiết: Document Upload, Text Extract, AI Generation

Nguồn tham chiếu: `plan_mvp_demo.md`

TV2 phụ trách biến tài liệu học tập thành câu hỏi trắc nghiệm hoặc tự luận ở trạng thái `pending_review`. Đây là phần nối giữa dữ liệu nền của TV1 và workflow Review/Question Bank.

```text
Course/LO của TV1
→ Upload PDF/DOCX
→ Extract text
→ AI sinh câu hỏi trắc nghiệm hoặc tự luận
→ Lưu questions pending
→ TV1 review/approve
```

---

## 1. Document Upload

### 1.1 Document Upload Là Gì

Document Upload là tính năng cho phép giảng viên tải tài liệu học tập lên hệ thống. File upload sẽ được lưu vào local storage, còn metadata được lưu vào bảng `documents`.

Các thao tác chính:

| Thao tác | Ý nghĩa | API |
|---|---|---|
| Upload | Tải PDF/DOCX lên server | `POST /api/documents/upload` |
| Read | Xem thông tin document | `GET /api/documents/{id}` |
| Extract | Trích xuất text từ document | `POST /api/documents/{id}/extract` |

### 1.2 Vai Trò Trong Toàn Hệ Thống

Document là nguồn nội dung để AI sinh câu hỏi:

```text
Course
  └── Document
        └── extracted_text
              └── AI Generation
                    └── pending questions
```

Nếu không upload và extract được document, AI không có input đáng tin cậy để sinh câu hỏi.

### 1.3 Database Cho Document

```sql
CREATE TABLE documents (
    id               SERIAL PRIMARY KEY,
    course_id        INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    uploaded_by      INTEGER REFERENCES users(id),
    file_name        VARCHAR(255) NOT NULL,
    file_type        VARCHAR(20)  NOT NULL,
    file_path        TEXT         NOT NULL,
    extracted_text   TEXT,
    status           VARCHAR(50) DEFAULT 'uploaded',
    created_at       TIMESTAMP DEFAULT NOW()
);
```

Ý nghĩa field:

| Field | Ý nghĩa |
|---|---|
| `id` | Khóa chính document |
| `course_id` | Course mà tài liệu thuộc về |
| `uploaded_by` | Người upload, MVP hardcode `1` |
| `file_name` | Tên file gốc |
| `file_type` | `pdf` hoặc `docx` |
| `file_path` | Đường dẫn file trong `/uploads/` |
| `extracted_text` | Text sau khi extract |
| `status` | uploaded, processing, processed, failed |
| `created_at` | Thời điểm upload |

### 1.4 API Contract

```http
POST /api/documents/upload
GET  /api/documents/{id}
POST /api/documents/{id}/extract
```

`POST /api/documents/upload` dùng `multipart/form-data`:

```text
file      : File PDF hoặc DOCX, tối đa 10MB
course_id : int
```

Response:

```json
{
  "data": {
    "id": 5,
    "file_name": "lecture_notes.pdf",
    "file_type": "pdf",
    "status": "uploaded"
  },
  "message": "Upload successful"
}
```

### 1.5 Luồng Người Dùng Trên Frontend

```text
User mở trang AI Generation
→ chọn Course
→ chọn file PDF/DOCX
→ frontend gửi multipart/form-data
→ backend validate file
→ backend lưu file vào /uploads/
→ backend tạo record documents
→ frontend nhận document_id
```

UI cần có:

- Select Course.
- File input hoặc drag/drop.
- Hiển thị tên file đã chọn.
- Loading khi upload.
- Error nếu file sai định dạng hoặc quá lớn.

### 1.6 Cách Thực Hiện Backend

File nên có:

```text
services/document_service.py
routers/documents.py
schemas/document.py
```

Hàm cần có:

```python
save_uploaded_file(file, course_id) -> tuple[str, str]
```

Validation:

- Chỉ nhận `.pdf` và `.docx`.
- Giới hạn dung lượng 10MB.
- `course_id` phải tồn tại.
- Filename lưu trên disk nên dùng UUID để tránh trùng.
- `uploaded_by = 1`.
- Sau upload, `status = uploaded`.

### 1.7 Cách Thực Hiện Frontend

File:

```text
frontend/src/api/documents.ts
frontend/src/pages/AIGeneration/GeneratePage.tsx
```

`api/documents.ts` nên có:

```text
uploadDocument(file, courseId)
getDocument(id)
extractDocument(id)
```

State cần có:

- `selectedCourseId`
- `file`
- `uploadedDocument`
- `loadingUpload`
- `uploadError`

### 1.8 Quan Hệ Với Tính Năng Khác

- Cần Course từ TV1.
- Sau khi upload, document được dùng cho Extract Text.
- Sau khi extract, document được dùng cho AI Generation.

### 1.9 Definition Of Done

- [ ] Upload được PDF.
- [ ] Upload được DOCX.
- [ ] Chặn file sai định dạng.
- [ ] Chặn hoặc báo lỗi file quá lớn.
- [ ] Record `documents` được lưu đúng.
- [ ] File nằm trong `/uploads/`.
- [ ] Frontend nhận được `document_id`.

---

## 2. Text Extract

### 2.1 Text Extract Là Gì

Text Extract là quá trình đọc nội dung chữ từ file PDF/DOCX để tạo `extracted_text`. Đây là input chính cho AI.

Các thao tác chính:

| Thao tác | Ý nghĩa | API |
|---|---|---|
| Extract | Trích xuất text từ file | `POST /api/documents/{id}/extract` |
| Read result | Xem text/status sau extract | `GET /api/documents/{id}` |

### 2.2 Vai Trò Trong Toàn Hệ Thống

```text
Uploaded document
→ extracted_text
→ prompt cho LLM
→ generated questions
```

Nếu `extracted_text` rỗng hoặc lỗi, AI sẽ sinh câu hỏi kém hoặc không sinh được.

### 2.3 Database Liên Quan

Text extract cập nhật các field trong bảng `documents`:

| Field | Khi extract |
|---|---|
| `extracted_text` | Lưu text trích xuất |
| `status` | `processing`, sau đó `processed` hoặc `failed` |

### 2.4 API Contract

```http
POST /api/documents/{id}/extract
```

Response gợi ý:

```json
{
  "data": {
    "id": 5,
    "status": "processed",
    "text_length": 12450
  },
  "message": "Extract successful"
}
```

### 2.5 Luồng Backend

```text
POST /api/documents/{id}/extract
→ tìm document
→ status = processing
→ nếu pdf: dùng PyMuPDF
→ nếu docx: dùng python-docx
→ kiểm tra text không rỗng
→ lưu extracted_text
→ status = processed
→ trả response
```

Nếu lỗi:

```text
status = failed
→ trả lỗi rõ ràng
```

### 2.6 Cách Thực Hiện Backend

PDF:

```python
import fitz

def extract_text_from_pdf(file_path: str) -> str:
    doc = fitz.open(file_path)
    pages = [page.get_text() for page in doc]
    return "\n".join(pages).strip()
```

DOCX:

```python
from docx import Document

def extract_text_from_docx(file_path: str) -> str:
    doc = Document(file_path)
    return "\n".join(p.text for p in doc.paragraphs).strip()
```

Edge cases:

- PDF scan ảnh sẽ extract rỗng.
- File hỏng format.
- Text quá dài. Trong demo có thể cắt phần đầu đủ dùng.
- File không tồn tại trên disk.

### 2.7 Cách Thực Hiện Frontend

Sau upload thành công, frontend có thể tự gọi extract:

```text
uploadDocument()
→ nhận document_id
→ extractDocument(document_id)
→ nếu processed thì cho phép sinh câu hỏi
```

UI cần:

- Loading "Đang trích xuất nội dung".
- Message thành công.
- Message lỗi nếu text rỗng.

### 2.8 Quan Hệ Với Tính Năng Khác

AI Generation chỉ nên chạy khi:

- Document tồn tại.
- `status = processed`.
- `extracted_text` không rỗng.

### 2.9 Definition Of Done

- [ ] Extract PDF có text layer thành công.
- [ ] Extract DOCX thành công.
- [ ] Text được lưu vào `documents.extracted_text`.
- [ ] Status chuyển đúng: uploaded → processing → processed.
- [ ] Lỗi thì status = failed.
- [ ] Text rỗng thì báo lỗi rõ.

---

## 3. AI Generation

### 3.1 AI Generation Là Gì

AI Generation là tính năng dùng LLM để sinh câu hỏi từ tài liệu đã extract và LO được chọn. MVP cần hỗ trợ 2 loại:

- `mcq`: câu hỏi trắc nghiệm 4 lựa chọn, có 1 đáp án đúng.
- `essay`: câu hỏi tự luận, có đáp án mẫu và rubric chấm điểm.

Các thao tác chính:

| Thao tác | Ý nghĩa | API |
|---|---|---|
| Generate | Sinh câu hỏi từ document + LO | `POST /api/ai/generate-questions` |
| Save | Lưu câu hỏi vào DB | Thực hiện trong cùng API |

### 3.2 Vai Trò Trong Toàn Hệ Thống

AI Generation tạo đầu vào cho Review:

```text
Document processed
→ AI Generation
→ questions.status = pending_review
→ TV1 Review
→ Question Bank
```

Câu hỏi sinh ra chưa được dùng ngay để tạo đề. Nó phải qua Review & Approval.

### 3.3 Database Liên Quan

AI Generation đọc:

- `documents`
- `learning_outcomes`
- `courses`

AI Generation ghi vào bảng `questions`:

| Field | Giá trị |
|---|---|
| `course_id` | Lấy từ document |
| `learning_outcome_id` | Lấy từ request |
| `document_id` | Lấy từ request |
| `question_type` | Lấy từ request: `mcq` hoặc `essay` |
| `question_text` | LLM sinh |
| `options` | MCQ: 4 đáp án; Essay: null |
| `correct_answer` | MCQ: A/B/C/D; Essay: null |
| `suggested_answer` | Essay: đáp án mẫu / các ý chính |
| `grading_rubric` | Essay: tiêu chí chấm điểm |
| `difficulty` | Lấy từ request |
| `explanation` | LLM sinh |
| `status` | `pending_review` |
| `created_by_ai` | `true` |
| `created_by` | `1` |

### 3.4 API Contract

```http
POST /api/ai/generate-questions
```

Request:

```json
{
  "document_id": 5,
  "learning_outcome_id": 2,
  "question_type": "mcq",
  "difficulty": "medium",
  "num_questions": 10
}
```

Response:

```json
{
  "data": {
    "generated": 10,
    "questions": [
      {
        "id": 101,
        "question_type": "mcq",
        "question_text": "Thuật toán nào sau đây thuộc nhóm Supervised Learning?",
        "difficulty": "medium",
        "options": [
          {"key": "A", "text": "K-Means"},
          {"key": "B", "text": "Linear Regression"},
          {"key": "C", "text": "DBSCAN"},
          {"key": "D", "text": "PCA"}
        ],
        "correct_answer": "B",
        "suggested_answer": null,
        "grading_rubric": null,
        "explanation": "Linear Regression là thuật toán học có giám sát vì cần nhãn y để huấn luyện.",
        "status": "pending_review"
      },
      {
        "id": 102,
        "question_type": "essay",
        "question_text": "Trình bày sự khác nhau giữa supervised learning và unsupervised learning.",
        "difficulty": "medium",
        "options": null,
        "correct_answer": null,
        "suggested_answer": "Supervised learning học từ dữ liệu có nhãn; unsupervised learning tìm cấu trúc trong dữ liệu không nhãn.",
        "grading_rubric": "Nêu đúng dữ liệu có nhãn/không nhãn; nêu mục tiêu học; có ví dụ minh họa.",
        "explanation": "Câu hỏi đánh giá khả năng so sánh hai nhóm thuật toán học máy.",
        "status": "pending_review"
      }
    ]
  },
  "message": "Generated 10 questions"
}
```

### 3.5 Luồng Người Dùng Trên Frontend

```text
User mở AI Generation
→ chọn Course
→ frontend load LO theo course
→ upload file
→ extract text
→ chọn LO
→ chọn loại câu hỏi: trắc nghiệm hoặc tự luận
→ chọn difficulty
→ nhập số câu
→ bấm Sinh câu hỏi
→ frontend gọi POST /api/ai/generate-questions
→ hiển thị số câu sinh được
→ hiện link sang Review
```

### 3.6 Cách Thực Hiện Backend

File:

```text
services/ai_service.py
routers/ai_generation.py
schemas/question.py
```

Luồng backend:

```text
Nhận request generate
→ tìm document
→ kiểm tra document.status = processed
→ kiểm tra extracted_text không rỗng
→ tìm LO
→ tạo prompt
→ gọi LLM
→ parse JSON
→ validate từng câu hỏi
→ lưu vào bảng questions
→ trả danh sách câu hỏi
```

Prompt cần yêu cầu:

- Sinh đúng `num_questions`.
- Câu hỏi bám theo LO description.
- Loại câu hỏi đúng request: `mcq` hoặc `essay`.
- Difficulty đúng request.
- Nếu `mcq`: mỗi câu có đúng 4 options A/B/C/D và 1 đáp án đúng.
- Nếu `essay`: không tạo options, phải có `suggested_answer` và `grading_rubric`.
- Chỉ trả JSON array, không markdown.

Parse và retry:

```python
raw = raw.replace("```json", "").replace("```", "").strip()
questions = json.loads(raw)
```

Nếu parse lỗi:

- Retry 1 lần.
- Nếu vẫn lỗi, dùng fallback sample cho demo.

Validation:

- `question_type` thuộc mcq/essay.
- Nếu MCQ: `options` có đúng 4 phần tử, `correct_answer` thuộc A/B/C/D.
- Nếu tự luận: `options = null`, có `suggested_answer` hoặc `grading_rubric`.
- `difficulty` thuộc easy/medium/hard.
- `question_text` không rỗng.

### 3.7 Cách Thực Hiện Frontend

File:

```text
frontend/src/pages/AIGeneration/GeneratePage.tsx
frontend/src/api/aiGeneration.ts
frontend/src/api/documents.ts
```

State cần có:

- `courses`
- `selectedCourseId`
- `learningOutcomes`
- `selectedLoId`
- `questionType`
- `file`
- `uploadedDocument`
- `difficulty`
- `numQuestions`
- `loadingUpload`
- `loadingGenerate`
- `error`
- `generatedCount`

UI cần có:

- Select Course.
- Select LO.
- Select loại câu hỏi: Trắc nghiệm / Tự luận.
- File upload.
- Select difficulty.
- Input số câu.
- Button Sinh câu hỏi.
- Loading spinner.
- Success message và link sang Review.

### 3.8 Quan Hệ Với Tính Năng Khác

- Cần Course/LO từ TV1.
- Tạo questions cho Review của TV1.
- Không tạo trực tiếp approved questions.
- TV3 chỉ dùng được câu hỏi sau khi TV1 approve.

### 3.9 Definition Of Done

- [ ] Generate API nhận đúng request.
- [ ] Chặn generate nếu document chưa extract.
- [ ] Gọi LLM sinh JSON hợp lệ.
- [ ] Parse và validate JSON.
- [ ] Lưu câu hỏi vào DB với `status = pending_review`.
- [ ] Frontend chạy được luồng upload → extract → generate.
- [ ] Câu hỏi xuất hiện ở Review của TV1.
- [ ] Có fallback nếu LLM lỗi hoặc chậm.

---

## 4. Error States Cần Xử Lý

Các lỗi tối thiểu:

- Chưa chọn Course.
- Course chưa có LO.
- Chưa upload file.
- File không phải PDF/DOCX.
- File quá lớn.
- Extract text rỗng.
- LLM timeout.
- LLM trả JSON sai.
- Backend lưu question lỗi.

Mỗi lỗi cần hiển thị message rõ ràng trên UI và không làm crash trang.

---

## 5. Checklist Tổng Của TV2

- [ ] Upload PDF/DOCX thành công.
- [ ] File được lưu vào `/uploads/`.
- [ ] Record document được tạo đúng.
- [ ] Extract PDF thành công.
- [ ] Extract DOCX thành công.
- [ ] Extract rỗng thì báo lỗi rõ.
- [ ] AI service sinh JSON hợp lệ cho cả MCQ và tự luận.
- [ ] Câu hỏi được lưu vào DB với `pending_review`.
- [ ] GeneratePage chạy được hết luồng.
- [ ] Câu hỏi sinh ra xuất hiện trên Review của TV1.
- [ ] Có fallback nếu LLM lỗi/chậm.
