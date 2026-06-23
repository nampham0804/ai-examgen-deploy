# TV3 - Kế hoạch chi tiết: Blueprint, Exam Generator, Preview, Export GIFT, Dashboard

Nguồn tham chiếu: `plan_mvp_demo.md`

TV3 phụ trách biến ngân hàng câu hỏi đã approve thành đề thi hoàn chỉnh và file export. Đây là slice cuối của pipeline:

```text
Approved Question Bank
→ Blueprint
→ Validate
→ Exam
→ Generate
→ Preview
→ Export GIFT
```

---

## 1. Blueprint CRUD

### 1.1 Blueprint CRUD Là Gì

Blueprint là ma trận thiết kế đề thi. Nó định nghĩa mỗi Learning Outcome cần bao nhiêu câu trắc nghiệm/tự luận ở từng mức Easy, Medium, Hard.

CRUD Blueprint gồm:

| Thao tác | Ý nghĩa | API |
|---|---|---|
| Create | Tạo blueprint mới | `POST /api/blueprints` |
| Read | Xem danh sách hoặc chi tiết blueprint | `GET /api/blueprints`, `GET /api/blueprints/{id}` |
| Update | Sửa blueprint | `PUT /api/blueprints/{id}` |
| Delete | Xóa blueprint | `DELETE /api/blueprints/{id}` |

### 1.2 Vai Trò Trong Toàn Hệ Thống

Blueprint là cầu nối giữa Question Bank và Exam:

```text
Question Bank
→ Blueprint yêu cầu số câu theo LO/question_type/difficulty
→ Validate xem đủ câu chưa
→ Generate Exam
```

Nếu không có Blueprint, hệ thống chỉ random câu hỏi tùy tiện, không đảm bảo đúng chuẩn đầu ra.

### 1.3 Database Cho Blueprint

Bang `exam_blueprints`:

```sql
CREATE TABLE exam_blueprints (
    id              SERIAL PRIMARY KEY,
    course_id       INTEGER REFERENCES courses(id),
    title           VARCHAR(255) NOT NULL,
    total_questions INTEGER DEFAULT 0,
    status          VARCHAR(50) DEFAULT 'draft',
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

Bang `exam_blueprint_items`:

```sql
CREATE TABLE exam_blueprint_items (
    id                   SERIAL PRIMARY KEY,
    blueprint_id         INTEGER REFERENCES exam_blueprints(id) ON DELETE CASCADE,
    learning_outcome_id  INTEGER REFERENCES learning_outcomes(id),
    question_type        VARCHAR(50) DEFAULT 'mcq',
    easy_count           INTEGER DEFAULT 0,
    medium_count         INTEGER DEFAULT 0,
    hard_count           INTEGER DEFAULT 0
);
```

Ý nghĩa:

| Field | Ý nghĩa |
|---|---|
| `course_id` | Course của blueprint |
| `title` | Tên blueprint |
| `total_questions` | Tổng số câu yêu cầu |
| `status` | draft, validated, active |
| `learning_outcome_id` | LO cần phân bổ câu |
| `question_type` | Loại câu hỏi: `mcq` hoặc `essay` |
| `easy_count` | Số câu easy cần lấy |
| `medium_count` | Số câu medium cần lấy |
| `hard_count` | Số câu hard cần lấy |

### 1.4 API Contract

```http
GET    /api/blueprints?course_id={id}
POST   /api/blueprints
GET    /api/blueprints/{id}
PUT    /api/blueprints/{id}
DELETE /api/blueprints/{id}
```

Body tạo blueprint:

```json
{
  "course_id": 1,
  "title": "Đề giữa kỳ - CS401",
  "items": [
    { "learning_outcome_id": 1, "question_type": "mcq", "easy_count": 5, "medium_count": 3, "hard_count": 2 },
    { "learning_outcome_id": 1, "question_type": "essay", "easy_count": 0, "medium_count": 1, "hard_count": 1 },
    { "learning_outcome_id": 2, "question_type": "mcq", "easy_count": 3, "medium_count": 4, "hard_count": 1 }
  ]
}
```

### 1.5 Luồng Người Dùng Trên Frontend

```text
User mở trang Blueprint
→ chọn Course
→ frontend load LO của course
→ user chọn loại câu hỏi cho từng dòng blueprint: trắc nghiệm hoặc tự luận
→ user nhập số câu Easy/Medium/Hard cho từng LO + loại câu hỏi
→ hệ thống tính tổng số câu
→ user bấm Save
→ frontend gọi POST /api/blueprints
→ tạo blueprint status = draft
```

### 1.6 Cách Thực Hiện Backend

File:

```text
models/exam.py
schemas/exam.py
routers/blueprints.py
services/exam_service.py
```

Luồng tạo blueprint:

```text
Nhận request
→ kiểm tra course tồn tại
→ kiểm tra từng LO thuộc course
→ tính total_questions
→ tạo exam_blueprints
→ tạo exam_blueprint_items
→ trả blueprint detail
```

Validation:

- `title` bắt buộc.
- `course_id` phải tồn tại.
- Mỗi `learning_outcome_id` phải thuộc course.
- `question_type` phải là `mcq` hoặc `essay`.
- Count không được âm.
- Tổng số câu phải lớn hơn 0.

### 1.7 Cách Thực Hiện Frontend

File:

```text
frontend/src/app/pages/ExamBlueprint.tsx
frontend/src/api/blueprints.ts
frontend/src/types/exam.ts
```

UI cần có:

- Select Course.
- Table LO.
- Select loại câu hỏi cho từng dòng hoặc tách 2 nhóm MCQ/Tự luận.
- Mỗi LO có 3 input number: Easy, Medium, Hard.
- Tổng số câu.
- Button Save.
- Button Validate.

### 1.8 Quan Hệ Với Tính Năng Khác

- Cần Course/LO từ TV1.
- Cần approved questions từ Question Bank.
- Là đầu vào cho Exam Generator.

### 1.9 Definition Of Done

- [ ] Tạo blueprint được.
- [ ] Xem danh sách blueprint theo course.
- [ ] Xem chi tiết blueprint.
- [ ] Sửa/xóa blueprint được nếu kịp.
- [ ] Blueprint lưu đúng các item theo LO.
- [ ] Tổng số câu tính đúng.

---

## 2. Validate Blueprint

### 2.1 Validate Blueprint Là Gì

Validate Blueprint là tính năng kiểm tra Question Bank có đủ câu hỏi approved theo từng LO, loại câu hỏi và difficulty hay không.

Ví dụ blueprint yêu cầu:

```text
LO1 + MCQ: 3 Easy, 2 Medium, 1 Hard
LO1 + Essay: 0 Easy, 1 Medium, 1 Hard
```

Backend phải kiểm tra trong bảng `questions` có đủ:

- 3 câu `approved`, `LO1`, `mcq`, `easy`.
- 2 câu `approved`, `LO1`, `mcq`, `medium`.
- 1 câu `approved`, `LO1`, `mcq`, `hard`.
- 1 câu `approved`, `LO1`, `essay`, `medium`.
- 1 câu `approved`, `LO1`, `essay`, `hard`.

### 2.2 Vai Trò Trong Toàn Hệ Thống

Validate giúp tránh generate exam thất bại hoặc thiếu câu:

```text
Blueprint draft
→ Validate
→ nếu đủ câu: status = validated
→ nếu thiếu câu: báo thiếu chi tiết
```

### 2.3 Database Liên Quan

Đọc:

- `exam_blueprints`
- `exam_blueprint_items`
- `questions`
- `learning_outcomes`

Chỉ count câu hỏi có:

```text
questions.status = "approved"
```

### 2.4 API Contract

```http
POST /api/blueprints/{id}/validate
```

Response:

```json
{
  "data": {
    "is_valid": false,
    "total_required": 18,
    "details": [
      {
        "learning_outcome_id": 1,
        "learning_outcome_code": "LO1",
        "question_type": "mcq",
        "easy_required": 5,
        "easy_available": 5,
        "medium_required": 3,
        "medium_available": 3,
        "hard_required": 2,
        "hard_available": 1,
        "is_valid": false,
        "missing": "Thiếu 1 câu Hard MCQ cho LO1"
      }
    ]
  },
  "message": "Blueprint is not valid"
}
```

### 2.5 Luồng Người Dùng Trên Frontend

```text
User tạo hoặc chọn blueprint
→ bấm Validate
→ frontend gọi POST /api/blueprints/{id}/validate
→ backend trả chi tiết đủ/thiếu
→ UI hiển thị badge xanh nếu đủ
→ UI hiển thị badge đỏ và số câu thiếu nếu chưa đủ, có ghi rõ thiếu MCQ hay tự luận
```

### 2.6 Cách Thực Hiện Backend

Hàm chính:

```python
validate_blueprint(blueprint_id, db) -> ValidationResult
```

Luồng:

```text
Load blueprint
→ load blueprint_items
→ với mỗi item:
   → count approved questions theo question_type + easy
   → count approved questions theo question_type + medium
   → count approved questions theo question_type + hard
   → so sánh required vs available
→ tổng hợp details
→ nếu tất cả đủ: status = validated
→ trả kết quả
```

### 2.7 Cách Thực Hiện Frontend

Trong `BlueprintPage.tsx`:

- Sau khi bấm Validate, lưu kết quả vào state `validationResult`.
- Hiển thị từng LO một dòng.
- Màu xanh nếu đủ.
- Màu đỏ nếu thiếu.
- Message cụ thể như "LO1 thiếu 1 câu Hard".

### 2.8 Quan Hệ Với Tính Năng Khác

- Phụ thuộc vào approved questions từ TV1.
- Nếu thiếu câu, quay lại TV2 sinh thêm hoặc TV1 approve thêm.
- Exam Generate nên validate lại trước khi random câu.

### 2.9 Definition Of Done

- [ ] Validate count đúng từng LO/question_type/difficulty.
- [ ] Validate phân biệt đúng MCQ và tự luận.
- [ ] Chỉ count câu `approved`.
- [ ] Trả chi tiết thiếu/đủ.
- [ ] Blueprint đủ thì status chuyển `validated`.
- [ ] UI hiển thị kết quả dễ hiểu.

---

## 3. Exam Generator

### 3.1 Exam Generator Là Gì

Exam Generator là tính năng tạo đề thi từ blueprint. Hệ thống random câu hỏi approved đúng theo số lượng blueprint yêu cầu.

Các thao tác chính:

| Thao tác | Ý nghĩa | API |
|---|---|---|
| Create Exam | Tạo exam draft | `POST /api/exams` |
| Generate | Random câu theo blueprint | `POST /api/exams/{id}/generate` |
| Read | Xem exam | `GET /api/exams/{id}` |

### 3.2 Vai Trò Trong Toàn Hệ Thống

```text
Validated Blueprint
→ Create Exam
→ Generate Exam
→ Exam Preview
→ Export GIFT
```

Đây là bước biến ngân hàng câu hỏi thành một đề thi cụ thể.

### 3.3 Database Cho Exam

Bang `exams`:

```sql
CREATE TABLE exams (
    id               SERIAL PRIMARY KEY,
    course_id        INTEGER REFERENCES courses(id),
    blueprint_id     INTEGER REFERENCES exam_blueprints(id),
    title            VARCHAR(255) NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    total_questions  INTEGER DEFAULT 0,
    status           VARCHAR(50) DEFAULT 'draft',
    created_by       INTEGER REFERENCES users(id),
    created_at       TIMESTAMP DEFAULT NOW()
);
```

Bang `exam_questions`:

```sql
CREATE TABLE exam_questions (
    id           SERIAL PRIMARY KEY,
    exam_id      INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    question_id  INTEGER REFERENCES questions(id),
    order_index  INTEGER NOT NULL
);
```

### 3.4 API Contract

```http
POST /api/exams
GET  /api/exams?course_id={id}
GET  /api/exams/{id}
POST /api/exams/{id}/generate
```

Request tạo exam:

```json
{
  "course_id": 1,
  "blueprint_id": 3,
  "title": "Đề thi giữa kỳ - Lần 1",
  "duration_minutes": 60
}
```

### 3.5 Luồng Người Dùng Trên Frontend

```text
User mở Exam Generator
→ chọn Course
→ chọn Blueprint đã validate
→ nhập tên đề thi
→ nhập thời gian thi
→ bấm Tạo đề
→ frontend gọi POST /api/exams
→ gọi POST /api/exams/{id}/generate
→ điều hướng sang Preview
```

### 3.6 Cách Thực Hiện Backend

Hàm chính:

```python
generate_exam(exam_id, db)
```

Luồng:

```text
Load exam
→ load blueprint và blueprint_items
→ validate blueprint lại
→ với mỗi item:
   → random easy_count câu approved đúng question_type + easy
   → random medium_count câu approved đúng question_type + medium
   → random hard_count câu approved đúng question_type + hard
→ đảm bảo không trùng question_id
→ lưu vào exam_questions
→ cập nhật exam.status = generated
→ cập nhật exam.total_questions
```

Random MVP:

```sql
ORDER BY RANDOM()
LIMIT :count
```

Hoặc query list rồi dùng `random.sample()` trong Python.

### 3.7 Cách Thực Hiện Frontend

File:

```text
frontend/src/app/pages/ExamGenerator.tsx
frontend/src/api/exams.ts
```

UI cần có:

- Select Course.
- Select Blueprint.
- Input title.
- Input duration.
- Button Generate.
- Loading khi generate.
- Error nếu blueprint chưa đủ câu.

### 3.8 Quan Hệ Với Tính Năng Khác

- Cần Blueprint đã validate.
- Cần approved questions từ Question Bank.
- Tạo dữ liệu cho Preview và Export.

### 3.9 Definition Of Done

- [ ] Tạo exam draft được.
- [ ] Generate đúng số câu theo blueprint.
- [ ] Không trùng câu trong cùng đề.
- [ ] Chỉ lấy câu `approved`.
- [ ] Exam status chuyển `generated`.
- [ ] Nếu thiếu câu thì báo lỗi rõ.

---

## 4. Exam Preview

### 4.1 Exam Preview Là Gì

Exam Preview là màn hình xem trước đề thi sau khi generate. Giảng viên kiểm tra đề trước khi export.

### 4.2 Vai Trò Trong Toàn Hệ Thống

```text
Generated Exam
→ Preview
→ kiểm tra câu hỏi
→ Export GIFT
```

Preview giúp demo rõ rằng hệ thống đã tạo được đề hoàn chỉnh, không chỉ tạo dữ liệu ngầm trong DB.

### 4.3 Database Liên Quan

Preview đọc:

- `exams`
- `exam_questions`
- `questions`
- `courses`
- `learning_outcomes`

### 4.4 API Contract

```http
GET /api/exams/{id}/preview
```

Response nên gom:

```json
{
  "data": {
    "id": 7,
    "title": "Đề thi giữa kỳ - Lần 1",
    "course_name": "Machine Learning",
    "duration_minutes": 60,
    "total_questions": 11,
    "questions": []
  },
  "message": "Exam preview loaded"
}
```

### 4.5 Luồng Người Dùng Trên Frontend

```text
Generate exam thành công
→ điều hướng sang /exam/{id}/preview
→ frontend gọi GET /api/exams/{id}/preview
→ hiển thị metadata đề thi
→ hiển thị danh sách câu hỏi theo thứ tự
→ user bấm Export GIFT nếu đề ổn
```

### 4.6 Cách Thực Hiện Backend

```text
Load exam
→ load exam_questions order by order_index
→ join questions
→ join course/LO nếu cần
→ trả response đầy đủ cho UI
```

### 4.7 Cách Thực Hiện Frontend

File:

```text
frontend/src/app/pages/ExamPreview.tsx
frontend/src/api/exams.ts
```

UI cần có:

- Tên đề.
- Course.
- Duration.
- Tổng số câu.
- Danh sách câu hỏi đánh số.
- Nếu MCQ: 4 options A/B/C/D và đáp án đúng.
- Nếu tự luận: đáp án mẫu và rubric chấm điểm.
- Badge LO và difficulty.
- Button Export GIFT.

### 4.8 Quan Hệ Với Tính Năng Khác

- Nhận dữ liệu từ Exam Generator.
- Là màn hình gắn nút Export GIFT.
- Là bước quan trọng trong demo script.

### 4.9 Definition Of Done

- [ ] Preview load được exam generated.
- [ ] Câu hỏi hiển thị đúng thứ tự.
- [ ] Hiển thị đủ options với MCQ.
- [ ] Hiển thị đáp án mẫu/rubric với tự luận.
- [ ] Hiển thị metadata đề.
- [ ] Có nút Export GIFT.

---

## 5. Export GIFT

### 5.1 Export GIFT Là Gì

Export GIFT là tính năng xuất đề thi thành file `.gift` để import vào Moodle.

Các thao tác chính:

| Thao tác | Ý nghĩa | API |
|---|---|---|
| Export | Tạo file GIFT từ exam | `POST /api/exports/gift?exam_id={id}` |

### 5.2 Vai Trò Trong Toàn Hệ Thống

Export GIFT là đầu ra cuối cùng của demo:

```text
Preview Exam
→ Export GIFT
→ file .gift
→ Moodle import
```

Đây là bằng chứng hệ thống không chỉ tạo đề trên web mà còn tạo được artifact có thể dùng ở LMS.

### 5.3 Database Liên Quan

Export đọc:

- `exams`
- `exam_questions`
- `questions`

Chỉ export exam đã generate.

### 5.4 API Contract

```http
POST /api/exports/gift?exam_id={id}
```

Response:

- Trả file download `.gift`.
- Content type có thể là `text/plain`.
- Filename ví dụ: `exam_7.gift`.

### 5.5 Luồng Người Dùng Trên Frontend

```text
User mở Exam Preview
→ bấm Export GIFT
→ frontend gọi POST /api/exports/gift?exam_id=7
→ browser tải file .gift
→ user mở file bằng text editor
```

### 5.6 Cách Thực Hiện Backend

File:

```text
services/export_service.py
routers/exports.py
```

Luồng:

```text
Nhận exam_id
→ kiểm tra exam tồn tại
→ kiểm tra exam.status = generated hoặc exported
→ load questions theo order_index
→ convert từng câu sang GIFT
→ escape ký tự đặc biệt
→ trả file download
```

Format GIFT cơ bản:

```text
::Q1::Nội dung câu hỏi {
~Đáp án sai 1
=Đáp án đúng
~Đáp án sai 2
~Đáp án sai 3
####Giải thích
}
```

Format GIFT cho câu tự luận:

```text
::Q2::Trình bày sự khác nhau giữa supervised learning và unsupervised learning. {}
```

Với tự luận, có thể đưa đáp án mẫu/rubric vào feedback/comment trong file export để giảng viên tham khảo.

Escape ký tự đặc biệt:

```python
GIFT_SPECIAL_CHARS = str.maketrans({
    "{": "\\{",
    "}": "\\}",
    "=": "\\=",
    "~": "\\~",
    "#": "\\#",
    ":": "\\:",
    "\\": "\\\\"
})
```

### 5.7 Cách Thực Hiện Frontend

Trong `ExamPreview.tsx`:

```text
User bấm Export
→ gọi API với responseType blob
→ tạo object URL
→ trigger download file .gift
```

UI cần:

- Loading khi export.
- Error nếu export lỗi.
- Không làm mất trang preview sau khi download.

### 5.8 Quan Hệ Với Tính Năng Khác

- Phụ thuộc vào Exam Preview/Exam generated.
- Không phụ thuộc TV2 nữa vì Export thuộc domain Exam của TV3.

### 5.9 Definition Of Done

- [ ] Export được file `.gift`.
- [ ] File mở được bằng text editor.
- [ ] Câu hỏi MCQ và options đúng format.
- [ ] Câu hỏi tự luận export được ở dạng essay GIFT.
- [ ] Đáp án đúng dùng `=`.
- [ ] Đáp án sai dùng `~`.
- [ ] Escape tiếng Việt và ký tự đặc biệt ổn.
- [ ] Nút Export trên Preview hoạt động.

---

## 6. Dashboard

### 6.1 Dashboard Là Gì

Dashboard là màn hình tổng quan để demo số liệu hệ thống.

Các chỉ số chính:

- Số course.
- Tổng số questions.
- Số pending questions.
- Số approved questions.
- Số blueprints.
- Số exams.

### 6.2 Vai Trò Trong Toàn Hệ Thống

Dashboard là màn hình mở đầu demo, giúp ban giám khảo thấy hệ thống có dữ liệu và workflow đã chạy.

### 6.3 API Contract

```http
GET /api/analytics/dashboard
```

Response:

```json
{
  "data": {
    "courses": 1,
    "questions_total": 45,
    "questions_pending": 10,
    "questions_approved": 35,
    "blueprints": 2,
    "exams": 1
  },
  "message": "Dashboard loaded"
}
```

### 6.4 Luồng Người Dùng Trên Frontend

```text
User mở Dashboard
→ frontend gọi GET /api/analytics/dashboard
→ hiển thị các stat card
→ user chuyển sang Courses hoặc AI Generation
```

### 6.5 Cách Thực Hiện Backend

Trong `routers/analytics.py`:

```text
count courses
count questions total
count questions where status = pending_review
count questions where status = approved
count blueprints
count exams
return response
```

### 6.6 Cách Thực Hiện Frontend

File:

```text
frontend/src/app/pages/Dashboard.tsx
frontend/src/api/analytics.ts
```

UI:

- Stat cards.
- Loading state.
- Nếu API chưa kịp, dùng mock ổn định cho demo.

### 6.7 Quan Hệ Với Tính Năng Khác

Dashboard đọc số liệu từ toàn hệ thống nhưng không sửa dữ liệu. Vì vậy có thể làm mock trước, nối API thật sau.

### 6.8 Definition Of Done

- [ ] Dashboard hiển thị số course.
- [ ] Hiển thị total/pending/approved questions.
- [ ] Hiển thị số blueprints/exams.
- [ ] Không crash nếu API lỗi.
- [ ] Dữ liệu demo nhìn hợp lý.

---

## 7. Seed/Mock TV3 Cần Có

TV3 cần tự có seed approved questions để không bị block:

- Course `CS401`.
- LO1, LO2, LO3.
- Mỗi LO có đủ easy/medium/hard cho cả MCQ và một số câu tự luận.
- Ít nhất 30 approved questions.

Lưu ý: generate exam chỉ được lấy `status = approved`. Không lấy `pending_review` hoặc `rejected`.

---

## 8. Checklist Tổng Của TV3

- [ ] Blueprint CRUD chạy được.
- [ ] Tạo blueprint với nhiều LO, question_type và difficulty count.
- [ ] Validate blueprint đếm đúng approved questions.
- [ ] Validate trả chi tiết thiếu/đủ từng LO.
- [ ] Tạo exam draft được.
- [ ] Generate exam đúng blueprint, không trùng câu.
- [ ] Preview exam hiển thị đủ thông tin.
- [ ] Export GIFT tạo file tải về được.
- [ ] GIFT escape ký tự đặc biệt đúng.
- [ ] Dashboard có số đếm tổng quan.
- [ ] Luồng Blueprint → Validate → Generate → Preview → Export chạy được trên UI.
