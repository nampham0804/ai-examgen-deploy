# TV1 - Kế hoạch chi tiết: Foundation, Course/LO, Review, Question Bank

Nguồn tham chiếu: `plan_mvp_demo.md`

TV1 phụ trách phần dữ liệu nền và workflow kiểm duyệt câu hỏi. Đây là phần mở khóa cho cả hệ thống: TV2 cần Course/LO để sinh câu hỏi, TV3 cần approved questions để tạo blueprint và đề thi.

---

## 1. Course CRUD

### 1.1 Course CRUD Là Gì

CRUD gồm 4 nhóm thao tác chính:

| Thao tác | Ý nghĩa | API |
|---|---|---|
| Create | Tạo course mới | `POST /api/courses` |
| Read | Xem danh sách hoặc chi tiết course | `GET /api/courses`, `GET /api/courses/{id}` |
| Update | Sửa thông tin course | `PUT /api/courses/{id}` |
| Delete | Xóa course | `DELETE /api/courses/{id}` |

Trong MVP này không có login, nên mọi course sẽ gắn mặc định với `owner_id = 1`.

### 1.2 Vai Trò Của Course Trong Toàn Hệ Thống

Course là dữ liệu gốc. Gần như mọi luồng đều bắt đầu từ Course:

```text
Course
  ├── Learning Outcomes
  ├── Documents upload
  ├── AI generated questions
  ├── Question Bank
  ├── Blueprint
  └── Exam
```

Ví dụ:

- TV2 muốn upload tài liệu thì cần chọn Course.
- TV2 muốn AI sinh câu hỏi thì câu hỏi phải thuộc một Course.
- TV3 tạo Blueprint thì phải chọn Course trước.
- Question Bank filter câu hỏi cũng theo Course.

Vì vậy TV1 cần làm Course CRUD và seed Course sớm để TV2, TV3 không bị block.

### 1.3 Database Cho Course

Theo plan, bảng `courses` có cấu trúc:

```sql
CREATE TABLE courses (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id    INTEGER REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);
```

Ý nghĩa từng field:

| Field | Ý nghĩa |
|---|---|
| `id` | Khóa chính của course |
| `code` | Mã học phần, ví dụ `CS401` |
| `name` | Tên học phần, ví dụ `Machine Learning` |
| `description` | Mô tả ngắn về học phần |
| `owner_id` | Người tạo course, MVP hardcode là user `1` |
| `created_at` | Thời điểm tạo |
| `updated_at` | Thời điểm cập nhật |

Validation nên có:

- `code` bắt buộc, không rỗng.
- `name` bắt buộc, không rỗng.
- `code` nên unique trong MVP để tránh trùng mã môn.
- `description` optional.

### 1.4 API Contract

```http
GET    /api/courses
POST   /api/courses
GET    /api/courses/{id}
PUT    /api/courses/{id}
DELETE /api/courses/{id}
GET    /api/courses/{id}/learning-outcomes
```

Response chung:

```json
{
  "data": {},
  "message": "..."
}
```

Lỗi:

```json
{
  "error": "...",
  "detail": "..."
}
```

Ví dụ tạo Course:

```http
POST /api/courses
```

Body:

```json
{
  "code": "CS401",
  "name": "Machine Learning",
  "description": "Học phần nhập môn ML"
}
```

Response:

```json
{
  "data": {
    "id": 1,
    "code": "CS401",
    "name": "Machine Learning",
    "description": "Học phần nhập môn ML",
    "owner_id": 1,
    "created_at": "2024-01-01T00:00:00"
  },
  "message": "Course created"
}
```

### 1.5 Luồng Người Dùng Trên Frontend

Màn hình chính: `CourseList.tsx`.

Luồng danh sách:

```text
User mở trang Courses
→ frontend gọi GET /api/courses
→ hiển thị table/list course
→ mỗi dòng có nút View/Edit/Delete
→ có nút Add Course
```

Luồng tạo mới:

```text
User bấm Add Course
→ mở CourseForm
→ nhập code, name, description
→ bấm Save
→ frontend gọi POST /api/courses
→ thành công thì quay lại CourseList
→ list được refresh
```

Luồng sửa:

```text
User bấm Edit ở một course
→ frontend gọi GET /api/courses/{id} nếu cần
→ đổ dữ liệu cũ vào form
→ user sửa
→ bấm Save
→ gọi PUT /api/courses/{id}
→ refresh list
```

Luồng xóa:

```text
User bấm Delete
→ hiện confirm
→ gọi DELETE /api/courses/{id}
→ nếu thành công thì xóa khỏi list
```

UI MVP cần đủ:

- Table có `code`, `name`, `description`.
- Button thêm/sửa/xóa.
- Loading state khi gọi API.
- Error message nếu API lỗi.
- Confirm trước khi xóa.

### 1.6 Cách Thực Hiện Backend

File nên có:

```text
models/course.py
schemas/course.py
routers/courses.py
services/course_service.py   optional
```

Luồng backend cho `POST /api/courses`:

```text
Request vào router
→ validate body bằng Pydantic schema
→ kiểm tra code/name hợp lệ
→ kiểm tra trùng code
→ tạo Course object
→ owner_id = 1
→ lưu DB
→ trả response { data, message }
```

Schema nên có:

- `CourseCreate`
- `CourseUpdate`
- `CourseResponse`

Status code nên dùng:

| Trường hợp | Status |
|---|---|
| Tạo thành công | `201` |
| Lấy danh sách thành công | `200` |
| Không tìm thấy course | `404` |
| Dữ liệu không hợp lệ | `422` |
| Trùng mã course | `409` |
| Xóa thành công | `200` |

### 1.7 Cách Thực Hiện Frontend

File chính:

```text
frontend/src/app/pages/Courses.tsx
frontend/src/api/courses.ts
frontend/src/types/course.ts
```

`types/course.ts`:

```ts
export interface Course {
  id: number;
  code: string;
  name: string;
  description?: string;
  owner_id: number;
  created_at: string;
  updated_at?: string;
}

export interface CoursePayload {
  code: string;
  name: string;
  description?: string;
}
```

`api/courses.ts` nên có:

```text
getCourses()
getCourse(id)
createCourse(payload)
updateCourse(id, payload)
deleteCourse(id)
getCourseLearningOutcomes(id)
```

UI state cần có:

- `courses`
- `loading`
- `error`
- `selectedCourse`
- `isFormOpen`
- `isSubmitting`

### 1.8 Quan Hệ Với Tính Năng Khác

Course CRUD không đứng một mình. Sau khi có course, user sẽ tạo Learning Outcome cho course đó.

API liên quan:

```http
GET /api/courses/{id}/learning-outcomes
```

Luồng hợp lý:

```text
CourseList
→ user click một Course
→ mở trang/detail hoặc tab Learning Outcomes
→ gọi GET /api/courses/{id}/learning-outcomes
→ hiển thị danh sách LO thuộc course đó
```

### 1.9 Definition Of Done

Course CRUD xong khi:

- [ ] Migration tạo được bảng `courses`.
- [ ] Seed có ít nhất 1 course demo, ví dụ `CS401 - Machine Learning`.
- [ ] `GET /api/courses` chạy được trên Swagger.
- [ ] `POST /api/courses` tạo course mới được.
- [ ] `PUT /api/courses/{id}` sửa được.
- [ ] `DELETE /api/courses/{id}` xóa được.
- [ ] Frontend hiển thị danh sách course.
- [ ] Frontend thêm/sửa/xóa được course.
- [ ] TV2 có thể dùng course này để upload tài liệu.
- [ ] TV3 có thể dùng course này để tạo blueprint.

---

## 2. Learning Outcome CRUD

### 2.1 Learning Outcome CRUD Là Gì

Learning Outcome, viết tắt là LO, là chuẩn đầu ra của từng học phần. CRUD LO gồm:

| Thao tác | Ý nghĩa | API |
|---|---|---|
| Create | Tạo LO cho một course | `POST /api/courses/{course_id}/learning-outcomes` |
| Read | Xem danh sách LO của course | `GET /api/courses/{course_id}/learning-outcomes` |
| Update | Sửa nội dung LO | `PUT /api/learning-outcomes/{id}` |
| Delete | Xóa LO | `DELETE /api/learning-outcomes/{id}` |

### 2.2 Vai Trò Của LO Trong Toàn Hệ Thống

LO là cầu nối giữa nội dung học và câu hỏi:

```text
Course
  └── Learning Outcomes
        ├── AI sinh câu hỏi theo LO
        ├── Review hiển thị câu hỏi thuộc LO nào
        ├── Question Bank filter theo LO
        └── Blueprint yêu cầu số câu theo từng LO
```

Nếu không có LO, TV2 không biết sinh câu hỏi theo mục tiêu nào, TV3 không thể tạo blueprint theo chuẩn đầu ra.

### 2.3 Database Cho LO

```sql
CREATE TABLE learning_outcomes (
    id          SERIAL PRIMARY KEY,
    course_id   INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    code        VARCHAR(50) NOT NULL,
    description TEXT        NOT NULL,
    bloom_level VARCHAR(50),
    created_at  TIMESTAMP DEFAULT NOW()
);
```

Ý nghĩa field:

| Field | Ý nghĩa |
|---|---|
| `id` | Khóa chính của LO |
| `course_id` | Course mà LO thuộc về |
| `code` | Mã LO, ví dụ `LO1`, `LO2.1` |
| `description` | Mô tả chuẩn đầu ra |
| `bloom_level` | Mức Bloom: remember, understand, apply... |
| `created_at` | Thời điểm tạo |

Validation nên có:

- `course_id` phải tồn tại.
- `code` bắt buộc.
- `description` bắt buộc.
- `bloom_level` nếu có thì thuộc danh sách hợp lệ.

### 2.4 API Contract

```http
GET    /api/courses/{course_id}/learning-outcomes
POST   /api/courses/{course_id}/learning-outcomes
PUT    /api/learning-outcomes/{id}
DELETE /api/learning-outcomes/{id}
```

Body tạo LO:

```json
{
  "code": "LO1",
  "description": "Hiểu và giải thích được các khái niệm cơ bản của Machine Learning",
  "bloom_level": "understand"
}
```

### 2.5 Luồng Người Dùng Trên Frontend

```text
User mở Courses
→ chọn course CS401
→ mở tab Learning Outcomes
→ frontend gọi GET /api/courses/1/learning-outcomes
→ hiển thị danh sách LO
→ user thêm/sửa/xóa LO
```

Luồng tạo LO:

```text
Bấm Add LO
→ nhập code, description, bloom_level
→ gọi POST /api/courses/{course_id}/learning-outcomes
→ refresh danh sách LO
```

### 2.6 Cách Thực Hiện Backend

File nên có:

```text
models/learning_outcome.py
schemas/learning_outcome.py
routers/learning_outcomes.py
```

Luồng `POST /api/courses/{course_id}/learning-outcomes`:

```text
Nhận course_id từ URL
→ kiểm tra course tồn tại
→ validate body
→ tạo LO gắn với course_id
→ lưu DB
→ trả response
```

Lưu ý:

- Không lấy `course_id` từ body để tránh sai lệch.
- Khi xóa course, LO bị xóa theo do `ON DELETE CASCADE`.
- Khi xóa LO đã có questions, cần cân nhắc. Trong MVP có thể chặn xóa nếu LO đã có câu hỏi, hoặc chỉ dùng demo data ổn định.

### 2.7 Cách Thực Hiện Frontend

File:

```text
frontend/src/app/pages/LearningOutcomes.tsx
frontend/src/api/learningOutcomes.ts
frontend/src/types/course.ts
```

UI cần có:

- Chọn hoặc nhận `course_id` từ Course page.
- Table LO gồm `code`, `description`, `bloom_level`.
- Form thêm/sửa LO.
- Select cho Bloom level.
- Loading/error state.

### 2.8 Quan Hệ Với Tính Năng Khác

- TV2 dùng LO để sinh câu hỏi AI.
- TV1 dùng LO để hiển thị trong Review và Question Bank.
- TV3 dùng LO để nhập số câu trong Blueprint.

### 2.9 Definition Of Done

- [ ] Tạo được LO cho course.
- [ ] Xem được danh sách LO theo course.
- [ ] Sửa được LO.
- [ ] Xóa được LO.
- [ ] LO hiển thị đúng trong AI Generation, Review, Question Bank, Blueprint.
- [ ] Seed có ít nhất 3 LO cho course demo.

---

## 3. Review & Approval

### 3.1 Review & Approval Là Gì

Review & Approval là bước giảng viên kiểm duyệt câu hỏi do AI sinh ra trước khi đưa vào Question Bank.

Các thao tác chính:

| Thao tác | Ý nghĩa | API |
|---|---|---|
| List pending | Xem câu hỏi chờ duyệt | `GET /api/questions?status=pending_review` |
| Detail | Xem chi tiết câu hỏi | `GET /api/questions/{id}` |
| Edit | Sửa câu hỏi | `PUT /api/questions/{id}` |
| Approve | Duyệt câu hỏi | `POST /api/questions/{id}/approve` |
| Reject | Từ chối câu hỏi | `POST /api/questions/{id}/reject` |

### 3.2 Vai Trò Trong Toàn Hệ Thống

AI sinh câu hỏi không được đưa thẳng vào đề thi. Cần review để đảm bảo chất lượng:

```text
AI Generation
→ questions.status = pending_review
→ Review & Approval
→ approved questions
→ Question Bank
→ Blueprint/Exam
```

Chỉ câu hỏi `approved` mới được TV3 dùng để validate blueprint và generate exam.

### 3.3 Database Liên Quan

Bang `questions` có các field quan trọng:

| Field | Ý nghĩa |
|---|---|
| `course_id` | Course của câu hỏi |
| `learning_outcome_id` | LO của câu hỏi |
| `question_type` | Loại câu hỏi: `mcq` hoặc `essay` |
| `question_text` | Nội dung câu hỏi |
| `difficulty` | easy, medium, hard |
| `options` | MCQ: 4 đáp án dạng JSON; Essay: null |
| `correct_answer` | MCQ: A/B/C/D; Essay: null hoặc đáp án ngắn |
| `suggested_answer` | Essay: đáp án mẫu / các ý chính cần có |
| `grading_rubric` | Essay: tiêu chí chấm điểm |
| `explanation` | Giải thích đáp án |
| `status` | pending_review, approved, rejected |
| `approved_by` | Người duyệt |
| `approved_at` | Thời điểm duyệt |

### 3.4 API Contract

```http
GET  /api/questions?status=pending_review
GET  /api/questions/{id}
PUT  /api/questions/{id}
POST /api/questions/{id}/approve
POST /api/questions/{id}/reject
```

Body update:

```json
{
  "question_text": "Nội dung câu hỏi đã sửa",
  "question_type": "mcq",
  "options": [
    {"key": "A", "text": "..."},
    {"key": "B", "text": "..."},
    {"key": "C", "text": "..."},
    {"key": "D", "text": "..."}
  ],
  "correct_answer": "C",
  "suggested_answer": null,
  "grading_rubric": null,
  "difficulty": "hard"
}
```

Với câu tự luận:

```json
{
  "question_text": "Trình bày sự khác nhau giữa supervised learning và unsupervised learning.",
  "question_type": "essay",
  "options": null,
  "correct_answer": null,
  "suggested_answer": "Supervised learning dùng dữ liệu có nhãn, unsupervised learning tìm cấu trúc trong dữ liệu không nhãn.",
  "grading_rubric": "Nêu đúng dữ liệu có nhãn/không nhãn; nêu đúng mục tiêu học; có ví dụ minh họa.",
  "difficulty": "medium"
}
```

Approve response:

```json
{
  "data": {
    "id": 101,
    "status": "approved"
  },
  "message": "Approved"
}
```

### 3.5 Luồng Người Dùng Trên Frontend

```text
User mở Review Page
→ frontend gọi GET /api/questions?status=pending_review
→ hiển thị danh sách câu pending
→ user chọn một câu
→ xem question_type, question_text, đáp án/rubric, explanation, LO, difficulty
→ nếu cần thì sửa nội dung
→ bấm Approve hoặc Reject
```

Approve:

```text
Bấm Approve
→ gọi POST /api/questions/{id}/approve
→ status chuyển thành approved
→ câu biến mất khỏi pending list
→ câu xuất hiện trong Question Bank
```

Reject:

```text
Bấm Reject
→ gọi POST /api/questions/{id}/reject
→ status chuyển thành rejected
→ câu không được dùng tạo đề
```

### 3.6 Cách Thực Hiện Backend

File:

```text
models/question.py
schemas/question.py
routers/questions.py
```

Validation quan trọng:

- `difficulty` phải là `easy`, `medium`, `hard`.
- `question_type` phải là `mcq` hoặc `essay`.
- Nếu `question_type = mcq`: `options` phải có đủ 4 đáp án, `correct_answer` phải là `A`, `B`, `C`, `D`.
- Nếu `question_type = essay`: `options` có thể null, cần có `suggested_answer` hoặc `grading_rubric` để giảng viên review.
- Approve thì set `approved_by = 1`, `approved_at = now()`.
- Reject thì set `status = rejected`.

### 3.7 Cách Thực Hiện Frontend

File:

```text
frontend/src/app/pages/Review.tsx
frontend/src/api/questions.ts
frontend/src/types/question.ts
```

UI cần có:

- List/table câu pending.
- Panel chi tiết câu hỏi.
- Nếu là MCQ: hiện 4 đáp án, highlight đáp án đúng.
- Nếu là tự luận: hiện đáp án mẫu và rubric chấm điểm.
- Inline edit hoặc modal edit.
- Button Save, Approve, Reject.
- Badge question_type, difficulty, LO, status.

### 3.8 Quan Hệ Với Tính Năng Khác

- Nhận đầu vào từ TV2: AI Generation tạo câu `pending_review`.
- Tạo đầu ra cho TV3: câu `approved` được dùng trong Blueprint/Exam.
- Question Bank chỉ nên hiển thị approved mặc định.

### 3.9 Definition Of Done

- [ ] Xem được danh sách câu pending.
- [ ] Xem được chi tiết câu hỏi.
- [ ] Sửa được câu hỏi.
- [ ] Approve đổi status sang approved.
- [ ] Reject đổi status sang rejected.
- [ ] Câu approved xuất hiện trong Question Bank.
- [ ] TV3 validate blueprint count đúng câu approved.

---

## 4. Question Bank

### 4.1 Question Bank Là Gì

Question Bank là ngân hàng câu hỏi đã được duyệt. Đây là nguồn dữ liệu chính để TV3 tạo đề thi.

Các thao tác chính:

| Thao tác | Ý nghĩa | API |
|---|---|---|
| List | Xem câu hỏi | `GET /api/questions` |
| Filter | Lọc câu hỏi | `GET /api/questions?status=&course_id=&learning_outcome_id=&question_type=&difficulty=` |
| Pagination | Phân trang | `page`, `page_size` |

### 4.2 Vai Trò Trong Toàn Hệ Thống

Question Bank nằm giữa Review và Blueprint:

```text
Review approved
→ Question Bank
→ Blueprint validate
→ Exam generate
```

Nếu Question Bank không đủ câu theo LO/question_type/difficulty, TV3 sẽ validate blueprint thất bại.

### 4.3 Database Liên Quan

Question Bank dùng bảng `questions`, chủ yếu filter theo:

- `status`
- `course_id`
- `learning_outcome_id`
- `question_type`
- `difficulty`

Mặc định nên hiển thị `status = approved`.

### 4.4 API Contract

```http
GET /api/questions?status=approved&course_id={id}&learning_outcome_id={id}&question_type={mcq|essay}&difficulty={level}&page=1&page_size=20
```

Response:

```json
{
  "data": {
    "items": [],
    "total": 45,
    "page": 1,
    "page_size": 20
  },
  "message": "Questions loaded"
}
```

### 4.5 Luồng Người Dùng Trên Frontend

```text
User mở Question Bank
→ frontend gọi GET /api/questions?status=approved
→ hiển thị table câu hỏi
→ user chọn Course
→ user chọn LO
→ user chọn loại câu hỏi: trắc nghiệm hoặc tự luận
→ user chọn difficulty
→ frontend gọi lại API với query params
→ table cập nhật kết quả
```

### 4.6 Cách Thực Hiện Backend

Trong `routers/questions.py`, xây query động:

```text
query = SELECT questions
if status: filter status
if course_id: filter course_id
if learning_outcome_id: filter learning_outcome_id
if question_type: filter question_type
if difficulty: filter difficulty
apply pagination
return items + total
```

Lưu ý:

- `page` default = 1.
- `page_size` default = 20.
- Sort mới nhất trước hoặc theo `id desc`.

### 4.7 Cách Thực Hiện Frontend

File:

```text
frontend/src/app/pages/QuestionBank.tsx
frontend/src/api/questions.ts
```

UI cần có:

- Filter Course.
- Filter LO.
- Filter loại câu hỏi.
- Filter difficulty.
- Filter status nếu cần.
- Table câu hỏi.
- Pagination.
- Empty state nếu không có kết quả.

### 4.8 Quan Hệ Với Tính Năng Khác

- Nhận câu hỏi approved từ Review.
- Cung cấp câu hỏi cho TV3 validate/generate exam.
- Là màn hình demo để chứng minh AI questions đã được đưa vào ngân hàng câu hỏi.

### 4.9 Definition Of Done

- [ ] Hiển thị được approved questions.
- [ ] Filter được theo Course.
- [ ] Filter được theo LO.
- [ ] Filter được theo loại câu hỏi.
- [ ] Filter được theo difficulty.
- [ ] Pagination hoạt động.
- [ ] Câu vừa approve từ Review xuất hiện trong Question Bank.

---

## 5. Seed Data TV1 Cần Chuẩn Bị

Seed tối thiểu:

- 1 user: `lecturer@demo.com`.
- 1 course demo: `CS401 - Machine Learning`.
- 3 LO.
- 30 approved questions.
- 10 pending questions.

Mục tiêu:

- TV2 có Course/LO để test AI Generation.
- TV3 có approved questions để validate blueprint và generate exam.
- TV1 có pending questions để test Review mà không cần chờ TV2.

---

## 6. Checklist Tổng Của TV1

- [ ] Migration chạy OK cho users/courses/LO/questions.
- [ ] Seed data đầy đủ.
- [ ] Course CRUD API pass trên Swagger.
- [ ] LO CRUD API pass trên Swagger.
- [ ] Review API pass trên Swagger.
- [ ] Question Bank API filter đúng.
- [ ] Course UI dùng được.
- [ ] LO UI dùng được.
- [ ] Review UI approve/reject/sửa câu hỏi được.
- [ ] Question Bank UI filter được.
- [ ] Câu hỏi TV2 sinh ra xuất hiện đúng ở Review.
- [ ] Approved questions được TV3 count đúng khi validate blueprint.
