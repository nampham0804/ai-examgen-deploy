# AI-ExamGen — Kế hoạch 3 ngày Sprint Demo

> **Mục tiêu:** Demo được end-to-end workflow — từ upload tài liệu → AI sinh câu hỏi → review → tạo đề → export GIFT — trước ban giám khảo.
>
> **Team:** 3 thành viên · **Thời gian:** 72 giờ · **Output:** Web app chạy được, không lỗi trong luồng demo chính.

---

## Mục lục

1. [Scope — Làm gì, bỏ gì](#1-scope)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Workflow & luồng dữ liệu](#3-workflow--luồng-dữ-liệu)
4. [Database schema (rút gọn)](#4-database-schema-rút-gọn)
5. [API Contract](#5-api-contract)
6. [Chuẩn code & cấu trúc thư mục](#6-chuẩn-code--cấu-trúc-thư-mục)
7. [Phân chia công việc 3 ngày](#7-phân-chia-công-việc-3-ngày)
8. [Thứ tự phụ thuộc giữa các thành viên](#8-thứ-tự-phụ-thuộc-giữa-các-thành-viên)
9. [Checkpoint & Definition of Done](#9-checkpoint--definition-of-done)
10. [Rủi ro & cách xử lý](#10-rủi-ro--cách-xử-lý)
11. [Kịch bản demo (Demo Script)](#11-kịch-bản-demo-demo-script)

---

## 1. Scope

### ✅ Làm (MVP Core)

| Tính năng | Module | TV phụ trách |
|---|---|---|
| Course CRUD | Backend + Frontend | TV1 |
| Learning Outcome CRUD | Backend + Frontend | TV1 |
| Upload PDF/DOCX → extract text | Backend + Frontend | TV2 |
| AI sinh câu hỏi trắc nghiệm + tự luận từ tài liệu | Backend + Frontend | TV2 |
| Review: approve / reject câu hỏi | Backend + Frontend | TV1 |
| Question Bank (xem, filter) | Backend + Frontend | TV1 |
| Tạo Blueprint (số câu theo LO + loại câu hỏi + difficulty) | Backend + Frontend | TV3 |
| Validate Blueprint | Backend | TV3 |
| Generate Exam từ Blueprint | Backend + Frontend | TV3 |
| Preview Exam | Frontend | TV3 |
| Export GIFT | Backend + Frontend | TV3 |
| Dashboard (số đếm tổng quan) | Frontend | TV3 |

### ❌ Bỏ ra (không làm trong 3 ngày)

- Auth / login / JWT (hardcode `user_id = 1` trong toàn bộ request)
- Quality score, AI confidence, LO alignment score
- Lịch sử review (bảng `question_reviews`)
- Moodle XML (chỉ làm nếu xong sớm)
- Document chunking phức tạp (dùng full-text extract đơn giản)
- Image / OCR / code block trong câu hỏi
- Analytics nâng cao
- Role permission, multi-user

---

## 2. Kiến trúc hệ thống

### 2.1 Tổng quan

```
┌────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                │
│                    React + Vite (port 5173)                    │
│                                                                │
│  /courses          /learning-outcomes     /ai-generation       │
│  /review           /question-bank         /blueprint           │
│  /exam-generator   /exam/:id/preview      /dashboard           │
└──────────────────────────┬─────────────────────────────────────┘
                           │  REST API · JSON · CORS
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                         BACKEND                                │
│                    FastAPI + Python (port 8000)                │
│                                                                │
│  /api/courses            /api/learning-outcomes                │
│  /api/documents          /api/ai/generate-questions            │
│  /api/questions          /api/blueprints                       │
│  /api/exams              /api/exports                          │
└──────────┬───────────────────────────────────┬─────────────────┘
           │                                   │
           ▼                                   ▼
┌──────────────────────┐           ┌───────────────────────────┐
│     PostgreSQL        │           │       File Storage         │
│     (port 5432)       │           │   /uploads/  /exports/    │
│                       │           │   (local disk, dev only)  │
│  6 bảng chính         │           └───────────────────────────┘
│  (xem Section 4)      │
└──────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────────────────┐
│                        AI LAYER                                │
│           OpenAI API                                           │
│                                                                │
│  Input:  LO description + extracted text chunks                │
│  Output: JSON array of MCQ / essay questions                   │
│  Format: { question_type, question_text, options?,             │
│            correct_answer?, suggested_answer?, rubric?,        │
│            explanation, difficulty, learning_outcome_id }       │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 Tech stack

| Layer | Công nghệ | Ghi chú |
|---|---|---|
| Frontend | React 18 + Vite + TailwindCSS | Không dùng Next.js (quá nặng cho 3 ngày) |
| UI components | shadcn/ui style + Radix UI + lucide-react | Dùng thống nhất, không thêm Ant Design/MUI trong MVP |
| HTTP client | Axios | Base URL = `http://localhost:8000` |
| Backend | FastAPI + Python 3.11 | Pydantic v2 cho validation |
| ORM | SQLAlchemy 2.0 + Alembic | Alembic cho migration |
| Database | PostgreSQL 15 | Docker compose |
| File extract | PyMuPDF (PDF) + python-docx (DOCX) | |
| LLM | OpenAI `gpt-4o-mini` | Rẻ, nhanh, đủ dùng cho MVP; không thêm provider khác trong demo |
| CORS | FastAPI CORSMiddleware | Allow `localhost:5173` |
| Dev environment | Docker Compose | DB + pgAdmin |

---

## 3. Workflow & luồng dữ liệu

### Luồng 1 — Tạo câu hỏi từ tài liệu

```
[TV1] Giảng viên tạo Course
        │
        ▼
[TV1] Giảng viên thêm Learning Outcomes (LO) cho Course
        │
        ▼
[TV2] Giảng viên upload file PDF/DOCX
        │  Backend lưu file vào /uploads/
        ▼
[TV2] Backend extract text từ file
        │  PyMuPDF cho PDF · python-docx cho DOCX
        │  Kết quả: 1 chuỗi text thuần (không chunk phức tạp)
        ▼
[TV2] Giảng viên chọn LO + số câu + độ khó → bấm "Sinh câu hỏi"
        │
        ▼
[TV2] Backend gọi LLM
        │  Input:  LO description + extracted text + số câu + độ khó
        │  Output: JSON array câu hỏi trắc nghiệm hoặc tự luận
        │  Validate output bằng Pydantic
        ▼
[TV2] Lưu câu hỏi vào DB với status = "pending_review"
        │
        ▼
[TV1] Hiển thị ở màn Review & Approval  ◄──── Luồng 2 tiếp theo
```

### Luồng 2 — Review & Approval

```
[TV1] Giảng viên vào trang Review & Approval
        │  GET /api/questions?status=pending_review
        ▼
[TV1] Xem từng câu hỏi (text, 4 đáp án, đáp án đúng, độ khó, LO)
        │
        ├─── Sửa nội dung → PUT /api/questions/:id
        │
        ├─── Approve ────→ POST /api/questions/:id/approve
        │                  status → "approved"
        │                  Câu vào Question Bank
        │
        └─── Reject  ────→ POST /api/questions/:id/reject
                           status → "rejected"
                           Câu không được dùng
```

### Luồng 3 — Tạo đề thi

```
[TV3] Giảng viên chọn Course để tạo Blueprint
        │  Load danh sách LO của Course
        ▼
[TV3] Nhập số câu Easy / Medium / Hard cho từng LO
        │
        ▼
[TV3] Bấm "Validate" → POST /api/blueprints/:id/validate
        │  Backend đếm câu approved trong Question Bank
        │  theo từng LO + loại câu hỏi + difficulty
        │
        ├── Đủ câu → Blueprint hợp lệ → Save
        │
        └── Thiếu câu → Báo lỗi: "LO1.1 thiếu 3 câu Medium"
                         → Quay lại sinh thêm câu (Luồng 1)
        │
        ▼
[TV3] Giảng viên nhập thông tin đề: tên, thời gian thi
        │
        ▼
[TV3] Bấm "Generate" → POST /api/exams/:id/generate
        │  Backend random câu từ Question Bank đúng theo Blueprint
        │  Không trùng câu trong cùng 1 đề
        │
        ▼
[TV3] Preview đề thi
        │  GET /api/exams/:id/preview
        ▼
[TV3] Bấm "Export GIFT" → POST /api/exports/gift
        │  Backend tạo file .gift
        │  Response: file download
        ▼
        Done ✓
```

---

## 4. Database Schema (rút gọn)

> Chỉ tạo 7 bảng. Không tạo thêm bảng nào khác trong 3 ngày này.

### ERD tóm tắt

```
users (1) ────< courses (1) ────< learning_outcomes
                   │
                   └────< documents ────► questions >────< exam_questions
                                             │
                              blueprints >───┘         exams >────< exam_questions
                              blueprint_items
```

### Chi tiết từng bảng

#### Bảng `users` (hardcode 1 user cho dev)

```sql
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    full_name   VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);
-- Seed: INSERT INTO users VALUES (1, 'lecturer@demo.com', 'Demo Lecturer');
```

#### Bảng `courses`

```sql
CREATE TABLE courses (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL,   -- VD: CS401
    name        VARCHAR(255) NOT NULL,   -- VD: Machine Learning
    description TEXT,
    owner_id    INTEGER REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);
```

#### Bảng `learning_outcomes`

```sql
CREATE TABLE learning_outcomes (
    id          SERIAL PRIMARY KEY,
    course_id   INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    code        VARCHAR(50) NOT NULL,    -- VD: LO1, LO2.1
    description TEXT        NOT NULL,   -- Mô tả chuẩn đầu ra
    bloom_level VARCHAR(50),            -- remember/understand/apply/analyze/evaluate/create
    created_at  TIMESTAMP DEFAULT NOW()
);
```

#### Bảng `documents`

```sql
CREATE TABLE documents (
    id               SERIAL PRIMARY KEY,
    course_id        INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    uploaded_by      INTEGER REFERENCES users(id),
    file_name        VARCHAR(255) NOT NULL,
    file_type        VARCHAR(20)  NOT NULL,  -- pdf / docx
    file_path        TEXT         NOT NULL,  -- /uploads/uuid_filename.pdf
    extracted_text   TEXT,                   -- full text sau khi extract
    status           VARCHAR(50) DEFAULT 'uploaded',
    -- uploaded | processing | processed | failed
    created_at       TIMESTAMP DEFAULT NOW()
);
```

#### Bảng `questions`

```sql
CREATE TABLE questions (
    id                   SERIAL PRIMARY KEY,
    course_id            INTEGER REFERENCES courses(id),
    learning_outcome_id  INTEGER REFERENCES learning_outcomes(id),
    document_id          INTEGER REFERENCES documents(id),
    question_text        TEXT        NOT NULL,
    question_type        VARCHAR(50) DEFAULT 'mcq',  -- mcq | essay
    difficulty           VARCHAR(20) NOT NULL,        -- easy | medium | hard
    options              JSONB,
    -- MCQ: [{"key":"A","text":"..."}, {"key":"B","text":"..."}, ...]
    -- Essay: NULL
    correct_answer       TEXT,
    -- MCQ: "A" | "B" | "C" | "D"
    -- Essay: đáp án ngắn / ý chính kỳ vọng (optional)
    suggested_answer     TEXT,
    -- Essay: đáp án mẫu chi tiết hoặc dàn ý chấm điểm
    grading_rubric       TEXT,
    -- Essay: tiêu chí chấm điểm / rubric ngắn gọn
    explanation          TEXT,
    status               VARCHAR(50) DEFAULT 'pending_review',
    -- pending_review | approved | rejected
    created_by_ai        BOOLEAN DEFAULT TRUE,
    created_by           INTEGER REFERENCES users(id),
    approved_by          INTEGER REFERENCES users(id),
    approved_at          TIMESTAMP,
    created_at           TIMESTAMP DEFAULT NOW(),
    updated_at           TIMESTAMP DEFAULT NOW()
);
```

#### Bảng `exam_blueprints` + `exam_blueprint_items`

```sql
CREATE TABLE exam_blueprints (
    id              SERIAL PRIMARY KEY,
    course_id       INTEGER REFERENCES courses(id),
    title           VARCHAR(255) NOT NULL,
    total_questions INTEGER DEFAULT 0,
    status          VARCHAR(50) DEFAULT 'draft',
    -- draft | validated | active
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE exam_blueprint_items (
    id                   SERIAL PRIMARY KEY,
    blueprint_id         INTEGER REFERENCES exam_blueprints(id) ON DELETE CASCADE,
    learning_outcome_id  INTEGER REFERENCES learning_outcomes(id),
    question_type        VARCHAR(50) DEFAULT 'mcq',  -- mcq | essay
    easy_count           INTEGER DEFAULT 0,
    medium_count         INTEGER DEFAULT 0,
    hard_count           INTEGER DEFAULT 0
);
```

#### Bảng `exams` + `exam_questions`

```sql
CREATE TABLE exams (
    id               SERIAL PRIMARY KEY,
    course_id        INTEGER REFERENCES courses(id),
    blueprint_id     INTEGER REFERENCES exam_blueprints(id),
    title            VARCHAR(255) NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    total_questions  INTEGER DEFAULT 0,
    status           VARCHAR(50) DEFAULT 'draft',
    -- draft | generated | exported
    created_by       INTEGER REFERENCES users(id),
    created_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE exam_questions (
    id           SERIAL PRIMARY KEY,
    exam_id      INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    question_id  INTEGER REFERENCES questions(id),
    order_index  INTEGER NOT NULL
);
```

---

## 5. API Contract

> Tất cả response đều wrap trong `{ "data": ..., "message": "..." }`.
> Lỗi trả về `{ "error": "...", "detail": "..." }` với HTTP status code tương ứng.
> `user_id` mặc định là `1` cho tất cả các endpoint (không có auth).

### 5.1 Courses API

```
GET    /api/courses
POST   /api/courses
GET    /api/courses/{id}
PUT    /api/courses/{id}
DELETE /api/courses/{id}

GET /api/courses/{id}/learning-outcomes
```

**POST /api/courses** — Request body:
```json
{
  "code": "CS401",
  "name": "Machine Learning",
  "description": "Học phần nhập môn ML"
}
```

**Response:**
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

### 5.2 Learning Outcomes API

```
GET    /api/courses/{course_id}/learning-outcomes
POST   /api/courses/{course_id}/learning-outcomes
PUT    /api/learning-outcomes/{id}
DELETE /api/learning-outcomes/{id}
```

**POST /api/courses/{course_id}/learning-outcomes** — Request body:
```json
{
  "code": "LO1",
  "description": "Hiểu và giải thích được các khái niệm cơ bản của Machine Learning",
  "bloom_level": "understand"
}
```

### 5.3 Document & AI Generation API

```
POST /api/documents/upload          -- multipart/form-data
GET  /api/documents/{id}
POST /api/documents/{id}/extract    -- trigger extract text
POST /api/ai/generate-questions
```

**POST /api/documents/upload** — Form fields:
```
file        : File (PDF hoặc DOCX, tối đa 10MB)
course_id   : int
```

**Response:**
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

**POST /api/ai/generate-questions** — Request body:
```json
{
  "document_id": 5,
  "learning_outcome_id": 2,
  "question_type": "mcq",
  "difficulty": "medium",
  "num_questions": 10
}
```

**Response:**
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
        "suggested_answer": "Supervised learning học từ dữ liệu có nhãn, unsupervised learning tìm cấu trúc trong dữ liệu không nhãn.",
        "grading_rubric": "Nêu đúng dữ liệu có nhãn/không nhãn; nêu mục tiêu học; có ví dụ minh họa.",
        "explanation": "Câu hỏi yêu cầu so sánh hai nhóm thuật toán học máy cơ bản.",
        "status": "pending_review"
      }
    ]
  },
  "message": "Generated 10 questions"
}
```

### 5.4 Review & Question Bank API

```
GET  /api/questions                          -- filter: status, course_id, learning_outcome_id, question_type, difficulty
GET  /api/questions/{id}
PUT  /api/questions/{id}
POST /api/questions/{id}/approve
POST /api/questions/{id}/reject
```

**GET /api/questions** — Query params:
```
status      : pending_review | approved | rejected  (optional)
course_id   : int  (optional)
learning_outcome_id : int  (optional)
difficulty  : easy | medium | hard  (optional)
question_type: mcq | essay (optional)
page        : int  (default: 1)
page_size   : int  (default: 20)
```

**Response:**
```json
{
  "data": {
    "items": [ ...array of question objects... ],
    "total": 45,
    "page": 1,
    "page_size": 20
  }
}
```

**PUT /api/questions/{id}** — Request body (chỉ các field cần sửa):
```json
{
  "question_text": "Nội dung câu hỏi đã sửa",
  "question_type": "mcq",
  "options": [...],
  "correct_answer": "C",
  "suggested_answer": null,
  "grading_rubric": null,
  "difficulty": "hard"
}
```

**POST /api/questions/{id}/approve** — Request body:
```json
{}
```
Response: `{ "data": { "id": 101, "status": "approved" }, "message": "Approved" }`

**POST /api/questions/{id}/reject** — Request body:
```json
{ "reason": "Câu hỏi không đúng với LO" }
```

### 5.5 Blueprint API

```
GET    /api/blueprints?course_id={id}
POST   /api/blueprints
GET    /api/blueprints/{id}
PUT    /api/blueprints/{id}
POST   /api/blueprints/{id}/validate
DELETE /api/blueprints/{id}
```

**POST /api/blueprints** — Request body:
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

**POST /api/blueprints/{id}/validate** — Response:
```json
{
  "data": {
    "is_valid": false,
    "total_required": 18,
    "details": [
      {
        "learning_outcome_id": 1,
        "learning_outcome_code": "LO1",
        "easy_required": 5, "easy_available": 5,
        "medium_required": 3, "medium_available": 3,
        "hard_required": 2, "hard_available": 1,
        "is_valid": false,
        "missing": "Thiếu 1 câu Hard cho LO1"
      },
      {
        "learning_outcome_id": 2,
        "learning_outcome_code": "LO2",
        "easy_required": 3, "easy_available": 4,
        "medium_required": 4, "medium_available": 4,
        "hard_required": 1, "hard_available": 2,
        "is_valid": true,
        "missing": null
      }
    ]
  },
  "message": "Blueprint is not valid"
}
```

### 5.6 Exam API

```
POST /api/exams
GET  /api/exams?course_id={id}
GET  /api/exams/{id}
POST /api/exams/{id}/generate
GET  /api/exams/{id}/preview
```

**POST /api/exams** — Request body:
```json
{
  "course_id": 1,
  "blueprint_id": 3,
  "title": "Đề thi giữa kỳ - Lần 1",
  "duration_minutes": 60
}
```

**POST /api/exams/{id}/generate** — Không cần body. Backend random câu từ Question Bank theo Blueprint.

**GET /api/exams/{id}/preview** — Response:
```json
{
  "data": {
    "id": 7,
    "title": "Đề thi giữa kỳ - Lần 1",
    "course_name": "Machine Learning",
    "duration_minutes": 60,
    "total_questions": 18,
    "questions": [
      {
        "order_index": 1,
        "question_text": "...",
        "options": [...],
        "correct_answer": "B",
        "difficulty": "easy",
        "learning_outcome_code": "LO1"
      }
    ]
  }
}
```

### 5.7 Export API

```
POST /api/exports/gift?exam_id={id}    -- Returns file download
```

**Response:** File `.gift` (Content-Type: `text/plain`, Content-Disposition: attachment)

### 5.8 Dashboard API

```
GET /api/analytics/dashboard?course_id={id}
```

**Response:**
```json
{
  "data": {
    "total_courses": 3,
    "total_questions": 120,
    "pending_review": 15,
    "approved": 98,
    "rejected": 7,
    "total_exams": 5
  }
}
```

---

## 6. Chuẩn code & cấu trúc thư mục

### 6.1 Cấu trúc repo

**Chuẩn chính thức cho repo hiện tại:** backend nằm ở `src/`, frontend nằm ở `frontend/`. Không tạo thêm thư mục `backend/` mới cho MVP. Sơ đồ dưới đây dùng cấu trúc chuẩn đã chốt trong `team_coding_agreement.md`: mỗi domain có route/schema/model/repository/service riêng.

```
ai-examgen/
├── src/
│   ├── main.py                        # FastAPI app, CORS, include api router
│   ├── config.py                      # Settings (OPENAI_KEY, DB_URL, etc.)
│   ├── api/
│   │   ├── router.py                  # Router tổng, include route modules
│   │   └── routes/
│   │       ├── courses.py             # TV1
│   │       ├── learning_outcomes.py   # TV1
│   │       ├── documents.py           # TV2
│   │       ├── ai_generation.py       # TV2
│   │       ├── questions.py           # TV1
│   │       ├── blueprints.py          # TV3
│   │       ├── exams.py               # TV3
│   │       ├── exports.py             # TV3
│   │       └── analytics.py           # TV3
│   ├── models/                        # SQLAlchemy models theo domain
│   ├── schemas/                       # Pydantic schemas theo domain
│   ├── repositories/                  # DB access layer
│   ├── services/                      # Business logic theo domain
│   ├── ai/                            # prompt/provider/parser LLM
│   └── agents/                        # agent workflows sau MVP
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx
│   │   │   ├── routes.tsx
│   │   │   ├── components/
│   │   │   ├── context/
│   │   │   └── pages/
│   │   ├── api/
│   │   │   ├── client.ts              # Axios instance, base URL
│   │   │   ├── courses.ts             # TV1
│   │   │   ├── questions.ts           # TV1
│   │   │   ├── documents.ts           # TV2
│   │   │   ├── blueprints.ts          # TV3
│   │   │   └── exams.ts               # TV3
│   │   ├── types/
│   │   ├── mocks/
│   │   ├── utils/
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
└── docker-compose.yml                 # PostgreSQL + pgAdmin
```

### 6.2 Quy tắc code

#### Backend

```python
# ✅ Đúng — dùng Pydantic schema cho response
@router.get("/courses", response_model=list[CourseResponse])
def get_courses(db: Session = Depends(get_db)):
    return db.query(Course).all()

# ✅ Đúng — inject db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ❌ Sai — không để logic trong router
# Logic phức tạp (generate exam, export) → đặt trong services/
```

- Mọi router file nằm trong `src/api/routes/` và gọi service, không query DB trực tiếp
- Không gom tất cả model/schema vào một file lớn; dùng `src/models/*.py` và `src/schemas/*.py` theo domain
- Env variables đọc qua `src/config.py` — không hardcode trong router
- Tất cả endpoint đều prefix `/api`

#### Frontend

```typescript
// ✅ Đúng — dùng api layer, không gọi fetch trực tiếp trong component
import { getCourses } from '@/api/courses';

// ✅ Đúng — types được import từ types/index.ts
import { Course, Question } from '@/types';

// ❌ Sai — không gọi axios trong component
// ❌ Sai — không tạo type mới trong component file
```

- Không share state giữa các page bằng prop drilling — dùng context/local state trong MVP; chỉ thêm state library khi team chốt
- File trong `api/` chỉ chứa hàm gọi API, không chứa logic
- Type dùng chung đặt trong `src/types/*.ts`; `types/index.ts` chỉ dùng để re-export nếu cần

### 6.3 File `.env` (backend)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/examgen
OPENAI_API_KEY=sk-...
UPLOAD_DIR=./uploads
EXPORT_DIR=./exports
MAX_FILE_SIZE_MB=10
DEFAULT_USER_ID=1
```

### 6.4 `types/index.ts` — Chốt ngày 1 sáng

```typescript
export interface Course {
  id: number;
  code: string;
  name: string;
  description?: string;
  owner_id: number;
  created_at: string;
}

export interface LearningOutcome {
  id: number;
  course_id: number;
  code: string;
  description: string;
  bloom_level?: string;
}

export interface Question {
  id: number;
  course_id: number;
  learning_outcome_id: number;
  question_type: 'mcq' | 'essay';
  question_text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options?: Array<{ key: string; text: string }> | null;
  correct_answer?: string | null;
  suggested_answer?: string | null;
  grading_rubric?: string | null;
  explanation?: string;
  status: 'pending_review' | 'approved' | 'rejected';
  created_at: string;
}

export interface Blueprint {
  id: number;
  course_id: number;
  title: string;
  status: 'draft' | 'validated' | 'active';
  total_questions: number;
  items: BlueprintItem[];
}

export interface BlueprintItem {
  id: number;
  blueprint_id: number;
  learning_outcome_id: number;
  question_type: 'mcq' | 'essay';
  easy_count: number;
  medium_count: number;
  hard_count: number;
}

export interface Exam {
  id: number;
  course_id: number;
  blueprint_id: number;
  title: string;
  duration_minutes: number;
  total_questions: number;
  status: 'draft' | 'generated' | 'exported';
}

export interface ExamPreview extends Exam {
  course_name: string;
  questions: ExamQuestion[];
}

export interface ExamQuestion {
  order_index: number;
  question_type: 'mcq' | 'essay';
  question_text: string;
  options?: Array<{ key: string; text: string }> | null;
  correct_answer?: string | null;
  suggested_answer?: string | null;
  grading_rubric?: string | null;
  difficulty: string;
  learning_outcome_code: string;
}

export interface Document {
  id: number;
  course_id: number;
  file_name: string;
  file_type: string;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: {
    items: T[];
    total: number;
    page: number;
    page_size: number;
  };
}
```

### 6.5 Prompt template LLM (chuẩn)

```python
QUESTION_GENERATION_PROMPT = """
Bạn là chuyên gia tạo câu hỏi kiểm tra cho môn học đại học.

Dựa trên nội dung tài liệu và chuẩn đầu ra học phần bên dưới, hãy tạo {num_questions} câu hỏi loại {question_type}.

**Chuẩn đầu ra (Learning Outcome):**
{lo_description}

**Nội dung tài liệu:**
{extracted_text}

**Yêu cầu:**
- Loại câu hỏi: {question_type} (mcq=trắc nghiệm, essay=tự luận)
- Độ khó: {difficulty} (easy=nhớ/hiểu, medium=áp dụng, hard=phân tích/đánh giá)
- Nếu question_type = "mcq": mỗi câu có đúng 4 đáp án (A, B, C, D), chỉ 1 đáp án đúng
- Nếu question_type = "essay": không tạo options, cần có suggested_answer và grading_rubric
- Viết bằng tiếng Việt, rõ ràng, không mơ hồ
- Câu hỏi phải liên quan trực tiếp đến nội dung tài liệu và chuẩn đầu ra

**CHỈ trả về JSON, không có text nào khác, không có markdown code block:**
[
  {{
    "question_type": "mcq",
    "question_text": "Câu hỏi ở đây?",
    "options": [
      {{"key": "A", "text": "Đáp án A"}},
      {{"key": "B", "text": "Đáp án B"}},
      {{"key": "C", "text": "Đáp án C"}},
      {{"key": "D", "text": "Đáp án D"}}
    ],
    "correct_answer": "B",
    "suggested_answer": null,
    "grading_rubric": null,
    "explanation": "Giải thích tại sao B đúng"
  }},
  {{
    "question_type": "essay",
    "question_text": "Câu hỏi tự luận ở đây?",
    "options": null,
    "correct_answer": null,
    "suggested_answer": "Đáp án mẫu / các ý chính cần có",
    "grading_rubric": "Tiêu chí chấm điểm ngắn gọn",
    "explanation": "Mục tiêu đánh giá của câu hỏi"
  }}
]
"""
```

### 6.6 GIFT Format chuẩn

```
// Câu hỏi MCQ cơ bản trong GIFT format:

::Q1:: Thuật toán nào thuộc nhóm Supervised Learning? {
  =Linear Regression
  ~K-Means
  ~DBSCAN
  ~PCA
}

// Quy tắc:
// ::TenCau:: — ID câu hỏi (dùng Q1, Q2, ...)
// = — Đáp án đúng
// ~ — Đáp án sai
// Escape ký tự đặc biệt: { } = ~ # : \  →  \{ \} \= \~ \# \: \\

// Câu hỏi tự luận trong GIFT format:

::Q2:: Trình bày sự khác nhau giữa supervised learning và unsupervised learning. {}

// Với tự luận, đáp án mẫu/rubric nên đưa vào phần feedback hoặc comment trong file export nếu cần.
```

---

## 7. Phân chia công việc 3 ngày

> Cách chia mới: mỗi thành viên sở hữu một **vertical slice** có backend + frontend + seed/mock riêng. Vẫn có pipeline demo chung, nhưng mỗi người có thể phát triển và test phần của mình mà không phải chờ người khác quá lâu.

### Nguyên tắc chia việc

- [ ] 08:00-09:00 ngày 1: cả nhóm chốt DB schema, API contract, naming convention, route convention.
- [ ] Sau 09:00: mỗi người code module của mình theo contract đã chốt.
- [ ] Không gom tất cả schema/type vào một file chung nếu dễ conflict. Ưu tiên tách theo domain:
  - Backend: `models/course.py`, `models/question.py`, `models/document.py`, `models/exam.py`
  - Schema: `schemas/course.py`, `schemas/question.py`, `schemas/document.py`, `schemas/exam.py`
  - Frontend API: `api/courses.ts`, `api/questions.ts`, `api/documents.ts`, `api/exams.ts`
- [ ] Mỗi slice phải có seed/mock để tự test độc lập.
- [ ] File chung như `main.py`, `database.py`, `api/client.ts`, router registry chỉ sửa theo khung giờ sync hoặc qua PR nhỏ.

---

### TV1 — Foundation · Course/LO · Review · Question Bank

**Domain:** Dữ liệu nền và workflow kiểm duyệt câu hỏi.

**Sở hữu chính:**
- Course CRUD
- Learning Outcome CRUD
- Question Review: xem, sửa, approve, reject
- Question Bank: xem, filter, pagination
- Seed dữ liệu nền cho cả nhóm dùng

#### Ngày 1 (8 tiếng)

**08:00-09:00 — Contract chung với cả nhóm**

- [ ] Chốt 7 bảng DB, enum/status, tên endpoint, format response.
- [ ] Chốt cấu trúc file tách theo domain để giảm conflict.
- [ ] Chốt seed tối thiểu: 1 user, 1 course demo, 3 LO, 30 câu approved, 10 câu pending.

**Buổi sáng còn lại**

- [ ] Setup backend tối thiểu: `main.py`, `database.py`, migration entrypoint.
- [ ] Tạo model/schema cho `users`, `courses`, `learning_outcomes`, `questions`.
- [ ] Tạo seed data cho Course/LO/questions để TV2 và TV3 không bị block.
- [ ] Chạy migration + seed thành công.

**Buổi chiều**

- [ ] `routers/courses.py`: CRUD Course.
- [ ] `routers/learning_outcomes.py`: CRUD LO + list LO theo Course.
- [ ] `routers/questions.py`: GET list/filter/detail, PUT update, approve, reject.
- [ ] Setup frontend shell chung: Vite, Tailwind, router, layout/sidebar, Axios client.
- [ ] Tạo `types/course.ts`, `types/question.ts` hoặc `types/index.ts` chỉ re-export.

**Output cuối ngày 1:**
- Course/LO API chạy được.
- Question API chạy được với seed pending/approved.
- TV2 có Course/LO seed để test AI Generation.
- TV3 có approved questions seed để test Blueprint/Exam.

#### Ngày 2 (8 tiếng)

- [ ] `pages/Courses/CourseList.tsx`: list, thêm, sửa, xóa Course.
- [ ] `pages/LearningOutcomes/LOList.tsx`: list/tạo/sửa/xóa LO theo Course.
- [ ] `pages/Review/ReviewPage.tsx`: xem pending questions, sửa inline, approve/reject.
- [ ] `pages/QuestionBank/QuestionBankPage.tsx`: table approved questions, filter theo Course/LO/question_type/difficulty/status.
- [ ] Test độc lập TV1: seed pending → approve/reject → câu vào Question Bank.

**Output cuối ngày 2:**
- Course/LO/Review/Question Bank chạy được qua UI.
- TV3 validate blueprint được bằng approved questions thật hoặc seed.

#### Ngày 3 (8 tiếng)

- [ ] Polish Review UI: hiển thị đáp án, highlight đáp án đúng, badge difficulty/status.
- [ ] Polish Question Bank: pagination, empty state, filter state.
- [ ] Chuẩn bị data demo cuối cùng: đủ approved/pending questions theo demo script.
- [ ] Fix bug integration với TV2: câu AI sinh ra xuất hiện đúng ở Review.
- [ ] Fix bug integration với TV3: approved questions được count đúng khi validate blueprint.
- [ ] Viết README phần backend setup + seed.

---

### TV2 — Document Upload · Text Extract · AI Generation

**Domain:** Tạo câu hỏi pending từ tài liệu.

**Sở hữu chính:**
- Upload PDF/DOCX
- Extract text
- Gọi LLM sinh câu hỏi trắc nghiệm hoặc tự luận
- Lưu questions với `status = pending_review`
- UI sinh câu hỏi

#### Ngày 1 (8 tiếng)

**08:00-09:00 — Contract chung với cả nhóm**

- [ ] Chốt input/output của `POST /api/documents/upload`.
- [ ] Chốt input/output của `POST /api/ai/generate-questions`.
- [ ] Chốt shape question sinh ra để khớp Review/Question Bank.

**Buổi sáng còn lại**

- [ ] `requirements.txt`: thêm `openai`, `pymupdf`, `python-docx`, `python-multipart`.
- [ ] `services/document_service.py`:
  - `extract_text_from_pdf(file_path) -> str`
  - `extract_text_from_docx(file_path) -> str`
  - `save_uploaded_file(file, course_id) -> (path, filename)`
- [ ] `core/config.py`: đọc `OPENAI_API_KEY`, `UPLOAD_DIR`.
- [ ] Test extract với 1 PDF thật và 1 DOCX thật.

**Buổi chiều**

- [ ] `routers/documents.py`: upload, get detail, extract.
- [ ] `services/ai_service.py`: sinh câu hỏi trắc nghiệm/tự luận, parse JSON, validate Pydantic, retry 1 lần.
- [ ] `routers/ai_generation.py`: sinh câu hỏi và lưu vào DB.
- [ ] Nếu DB của TV1 chưa sẵn sàng: dùng mock repository hoặc seed local theo contract.

**Output cuối ngày 1:**
- Extract text chạy được.
- AI service sinh được JSON hợp lệ.
- Có thể lưu hoặc mock lưu questions pending theo đúng contract.

#### Ngày 2 (8 tiếng)

- [ ] `pages/AIGeneration/GeneratePage.tsx`:
  - Chọn Course.
  - Load LO theo Course.
  - Upload file.
  - Chọn LO, difficulty, số câu.
  - Bấm sinh câu hỏi, hiển thị loading/error/success.
  - Link sang Review.
- [ ] `api/documents.ts`, `api/aiGeneration.ts`.
- [ ] Error states: file quá lớn, text rỗng, LLM timeout, JSON parse lỗi.
- [ ] Test độc lập TV2: upload PDF → extract → sinh 5 câu → status pending.

**Output cuối ngày 2:**
- Upload → AI Generation → câu pending xuất hiện ở Review API.

#### Ngày 3 (8 tiếng)

- [ ] Handle edge case: text extract quá dài, cắt đoạn đầu đủ cho demo.
- [ ] Chuẩn bị file PDF demo đã verify có text layer.
- [ ] Thêm fallback demo: nếu LLM lỗi, dùng response mẫu để không chết luồng chính.
- [ ] Test integration với TV1: câu mới sinh xuất hiện ở Review và approve được.
- [ ] Viết README phần AI setup: API key, model, fallback.

---

### TV3 — Blueprint · Exam Generator · Preview · Export GIFT · Dashboard

**Domain:** Tạo đề thi từ ngân hàng câu hỏi và xuất file.

**Sở hữu chính:**
- Blueprint CRUD
- Validate Blueprint
- Generate Exam
- Preview Exam
- Export GIFT
- Dashboard số đếm tổng quan

#### Ngày 1 (8 tiếng)

**08:00-09:00 — Contract chung với cả nhóm**

- [ ] Chốt input/output của Blueprint, Exam, Exam Preview, Export GIFT.
- [ ] Chốt cách query approved questions theo `course_id`, `learning_outcome_id`, `difficulty`.
- [ ] Chốt seed approved questions đủ để TV3 test độc lập.

**Buổi sáng còn lại**

- [ ] Model/schema cho `exam_blueprints`, `exam_blueprint_items`, `exams`, `exam_questions`.
- [ ] `routers/blueprints.py`: list, create, detail, delete.
- [ ] `routers/exams.py`: list, create, detail.
- [ ] Nếu Question API chưa xong: dùng seed approved questions trực tiếp từ DB.

**Buổi chiều**

- [ ] `services/exam_service.py` khung logic:
  - `validate_blueprint(blueprint_id, db)`
  - `generate_exam(exam_id, db)`
- [ ] `routers/analytics.py`: dashboard counts.
- [ ] `pages/Dashboard.tsx`: dùng mock trước, sau đó nối API thật.
- [ ] `pages/Blueprint/BlueprintPage.tsx`: dựng form UI với mock Course/LO nếu cần.

**Output cuối ngày 1:**
- Blueprint/Exam CRUD chạy được.
- Dashboard UI có dữ liệu mock.
- TV3 không bị block bởi Review UI vì đã có seed approved questions.

#### Ngày 2 (8 tiếng)

- [ ] Hoàn thiện `validate_blueprint`: đếm approved questions theo LO + question_type + difficulty, trả chi tiết thiếu/đủ.
- [ ] Hoàn thiện `generate_exam`: random đúng số câu, không trùng, lưu `exam_questions`.
- [ ] `routers/blueprints.py`: POST `/{id}/validate`.
- [ ] `routers/exams.py`: POST `/{id}/generate`, GET `/{id}/preview`.
- [ ] `pages/Blueprint/BlueprintPage.tsx`: tạo blueprint, validate, hiển thị kết quả.
- [ ] `pages/Exam/ExamGenerator.tsx`: chọn course/blueprint, nhập tên đề, generate.
- [ ] `pages/Exam/ExamPreview.tsx`: hiển thị đề đầy đủ.

**Output cuối ngày 2:**
- Blueprint → Validate → Generate Exam → Preview chạy được qua UI.

#### Ngày 3 (8 tiếng)

- [ ] `services/export_service.py`: generate GIFT từ exam questions.
- [ ] `routers/exports.py`: POST `/exports/gift?exam_id=...`.
- [ ] Nối nút Export GIFT trên ExamPreview.
- [ ] Test file `.gift` với tiếng Việt và ký tự đặc biệt.
- [ ] Nối Dashboard với API thật.
- [ ] Polish nav/sidebar/routing cùng cả nhóm.
- [ ] Viết `DEMO.md` và chạy thử demo toàn bộ 2 lần.

---

## 8. Thứ tự phụ thuộc giữa các thành viên

> Mục tiêu của phần này là giảm block. Chỉ những thứ thật sự là contract chung mới có deadline cứng; còn lại dùng seed/mock để phát triển song song.

### Ngày 1 — Contract trước, code song song sau

```
08:00  Cả nhóm chốt DB schema + API contract + cấu trúc file
          │
          ▼
09:00  Mỗi TV bắt đầu vertical slice của mình
          │
          ├──► TV1: Course/LO/Question seed + Review API
          ├──► TV2: Document/AI service + Upload API
          └──► TV3: Blueprint/Exam service + seed approved questions

12:00  Sync 15 phút: migration chạy chưa, endpoint nào đổi contract không

17:00  Sync 30 phút: merge nhỏ, chạy thử API chính trên Swagger
```

**Quy tắc:** Không ai phải chờ người khác xong toàn bộ module mới được code. Nếu dependency chưa sẵn sàng, dùng seed/mock theo contract đã chốt.

### Ngày 2 — Tích hợp theo điểm nối chính

```
10:00  TV2 sinh được questions pending
          │
          └──► TV1 kiểm tra Review nhận đúng câu AI sinh

11:00  TV1 có approved questions ổn định
          │
          └──► TV3 validate blueprint bằng data thật

15:00  TV3 generate được exam preview
          │
          └──► TV3 chuẩn bị export GIFT ngày 3

17:00  Cả nhóm chạy thử luồng: AI Gen → Review → Question Bank → Blueprint → Preview
```

### Ngày 3 — Khóa demo script

```
10:00  TV3 xong Export GIFT
          │
          └──► Cả nhóm chạy thử Preview → Export

12:00  Chốt data demo, không đổi schema/API nếu không bắt buộc
          │
          └──► Chỉ fix bug luồng chính

15:00  Chạy demo script lần 2 với data thật/fallback đã chuẩn bị
```

### Ma trận "ai cần ai"

| Tôi cần | Từ TV | Cần xong lúc | Cách tránh block |
|---|---|---|---|
| DB schema + API contract | Cả nhóm | Ngày 1, 09:00 | Chốt sớm trước khi code sâu |
| Seed Course/LO | TV1 | Ngày 1, trưa | TV2 dùng mock Course/LO nếu chưa có DB |
| Seed approved questions | TV1/TV3 | Ngày 1, trưa | TV3 tự seed approved questions theo schema |
| Questions pending từ AI | TV2 | Ngày 2, 10:00 | TV1 dùng seed pending để làm Review trước |
| Approved questions thật | TV1 | Ngày 2, 11:00 | TV3 dùng seed approved để validate trước |
| Exam preview | TV3 | Ngày 2, 15:00 | Export GIFT dùng exam seed nếu preview chưa ổn |
| Export GIFT | TV3 | Ngày 3, 10:00 | Nằm cùng domain Exam nên không cần chờ TV2 |

---

## 9. Checkpoint & Definition of Done

### Checkpoint Ngày 1 — 18:00

**Mục tiêu chung:** Cả 3 vertical slice đều chạy được phần backend/API tối thiểu, có seed/mock để test độc lập.

**TV1 phải xong:**
- [ ] Migration chạy OK cho users/courses/LO/questions.
- [ ] Seed data: 1 user, 1 course demo, 3 LO, 30 approved questions, 10 pending questions.
- [ ] API Course/LO chạy được trên Swagger.
- [ ] API Question list/filter/detail/update/approve/reject có bản đầu.
- [ ] Frontend shell + routing + Axios client.

**TV2 phải xong:**
- [ ] Extract text từ PDF + DOCX chạy được.
- [ ] Document upload API chạy được.
- [ ] AI service sinh được JSON hợp lệ cho cả MCQ và tự luận, có fallback sample.
- [ ] API generate questions lưu được pending questions hoặc mock theo contract.

**TV3 phải xong:**
- [ ] Blueprint/Exam model + schema chạy được.
- [ ] API Blueprint CRUD + Exam CRUD chạy được.
- [ ] Khung validate/generate exam có test bằng seed approved questions.
- [ ] Dashboard UI mock và Blueprint UI bản đầu.

---

### Checkpoint Ngày 2 — 18:00

**Mục tiêu chung:** Luồng Upload → AI Gen → Review → Question Bank → Blueprint → Validate → Generate → Preview chạy được end-to-end.

**TV1 phải xong:**
- [ ] Course/LO UI dùng được.
- [ ] Review UI approve/reject/sửa câu hỏi dùng được với data thật.
- [ ] Question Bank UI filter được theo Course/LO/question_type/difficulty/status.

**TV2 phải xong:**
- [ ] GeneratePage upload file → chọn LO/question_type/difficulty/số câu → sinh câu → redirect/link sang Review.
- [ ] Error states chính: file lỗi, text rỗng, LLM timeout, JSON parse lỗi.
- [ ] Câu sinh từ AI xuất hiện đúng ở Review của TV1.

**TV3 phải xong:**
- [ ] Validate blueprint đếm đúng và báo thiếu đúng LO/question_type/difficulty.
- [ ] Generate exam random đúng blueprint, không trùng câu.
- [ ] Preview exam hiển thị đầy đủ câu hỏi/đáp án.
- [ ] Dashboard nối API thật nếu kịp; nếu chưa, mock ổn định cho demo.

---

### Checkpoint Ngày 3 — 15:00 (trước demo)

**Tất cả phải pass:**
- [ ] Chạy toàn bộ demo script không lỗi (xem Section 11).
- [ ] Không có lỗi màn hình đỏ hoặc 500 trong luồng chính.
- [ ] File GIFT export được, mở được bằng text editor, không lỗi tiếng Việt cơ bản.
- [ ] Data demo sẵn sàng: đủ approved questions, đủ pending questions, có PDF demo đã verify.
- [ ] Có fallback nếu AI live lỗi hoặc chậm.

---

## 10. Rủi ro & cách xử lý

### Rủi ro 1 — LLM trả JSON sai ⚠️ (Cao)

**Triệu chứng:** API trả 500, log thấy `JSONDecodeError` hoặc `ValidationError`

**Xử lý:**
```python
# ai_service.py
import json, re

def parse_llm_response(raw: str) -> list[dict]:
    # Bước 1: strip markdown code block nếu có
    raw = re.sub(r"```json|```", "", raw).strip()
    # Bước 2: parse
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Bước 3: retry với prompt nhấn mạnh hơn
        raise ValueError(f"LLM returned invalid JSON: {raw[:200]}")

# Trong router: retry 1 lần nếu parse lỗi
for attempt in range(2):
    try:
        raw = call_llm(prompt)
        questions = parse_llm_response(raw)
        break
    except ValueError:
        if attempt == 1:
            raise HTTPException(500, "AI service failed after retry")
```

### Rủi ro 2 — TV bị block chờ nhau (Cao)

**Xử lý:** Cả nhóm chốt contract trong 1 giờ đầu. Sau đó TV2 và TV3 dùng seed/mock trong ngày 1 để không phải chờ TV1 hoàn thành toàn bộ backend.

```typescript
// Trong ngày 1, TV2 dùng mock này để test UI:
const MOCK_COURSES = [
  { id: 1, code: "CS401", name: "Machine Learning" }
];
const MOCK_LOS = [
  { id: 1, course_id: 1, code: "LO1", description: "Hiểu ML cơ bản" }
];
```

Xóa mock khi TV1 xong API thật.

### Rủi ro 3 — AI chậm khi demo (Trung bình)

**Xử lý:** Ngày 3 buổi sáng, TV1 seed thêm 50+ câu hỏi approved vào DB. Khi demo, không sinh câu live mà dùng câu từ seed.

### Rủi ro 4 — Không đủ câu để validate blueprint (Trung bình)

**Xử lý:** Blueprint demo chỉ yêu cầu tổng 10 câu (2 LO × 5 câu/LO). Seed đủ 30 câu approved để luôn có thừa.

### Rủi ro 5 — GIFT export lỗi tiếng Việt (Thấp)

**Xử lý:**
```python
# export_service.py
GIFT_SPECIAL_CHARS = str.maketrans({
    '{': '\\{', '}': '\\}',
    '=': '\\=', '~': '\\~',
    '#': '\\#', ':': '\\:',
    '\\': '\\\\'
})

def escape_gift(text: str) -> str:
    return text.translate(GIFT_SPECIAL_CHARS)
```

### Rủi ro 6 — File PDF không extract được text (Thấp)

**Xử lý:** Dùng PDF có text layer (không phải ảnh scan). Chuẩn bị sẵn file test đã verify. Thông báo lỗi rõ ràng nếu text rỗng.

---

## 11. Kịch bản Demo (Demo Script)

> Chuẩn bị sẵn data, không làm bất kỳ thứ gì live có thể lỗi.

### Dữ liệu demo (seed trước)

```
Course: CS401 — Machine Learning
LO1: "Hiểu và giải thích được các khái niệm Supervised vs Unsupervised Learning"
LO2: "Áp dụng được thuật toán Linear Regression để giải bài toán thực tế"
LO3: "Phân tích được ưu nhược điểm của các thuật toán phân loại"

Questions:
- LO1: 10 Easy, 8 Medium, 5 Hard MCQ (approved) + 3 Essay (approved)
- LO2: 8 Easy, 6 Medium, 4 Hard MCQ (approved) + 3 Essay (approved)
- LO3: 6 Easy, 5 Medium, 3 Hard MCQ (approved) + 2 Essay (approved)
- Thêm 10 câu pending_review để demo luồng Review

Blueprint "Đề giữa kỳ":
- LO1 MCQ: 3 Easy, 2 Medium, 1 Hard
- LO1 Essay: 0 Easy, 1 Medium, 0 Hard
- LO2 MCQ: 2 Easy, 2 Medium, 1 Hard
- LO2 Essay: 0 Easy, 1 Medium, 0 Hard
→ Tổng: 13 câu — có cả trắc nghiệm và tự luận nhưng vẫn đủ ít để preview
```

### Kịch bản bấm màn hình (5-7 phút)

```
1. [Dashboard] Mở trang Dashboard → thấy tổng quan: 1 course, 37 câu, 10 pending

2. [Courses] Vào Courses → thấy CS401 → click xem LO (3 LO)

3. [AI Generation] Vào "Sinh câu hỏi"
   → Chọn Course: CS401
   → Upload file: ml_lecture.pdf
   → Chọn LO: LO2
   → Độ khó: Medium · Số câu: 5
   → Bấm "Sinh câu hỏi" → chờ 5-10 giây
   → Thấy thông báo "Sinh được 5 câu" → "Xem ở trang Review"

4. [Review] Vào trang Review & Approval
   → Thấy 5 câu vừa sinh + 5 câu có sẵn từ seed = 10 câu pending
   → Click câu 1: đọc nội dung, 4 đáp án, highlight đáp án đúng
   → Sửa nội dung 1 câu → Save
   → Approve 4 câu → Reject 1 câu (câu sai)

5. [Question Bank] Vào Question Bank
   → Filter: Course = CS401, Status = Approved
   → Thấy 37+ câu, có câu vừa approve
   → Filter thêm: LO = LO1, Difficulty = Hard → thấy 5 câu

6. [Blueprint] Vào Blueprint → Tạo blueprint mới
   → Tên: "Đề giữa kỳ - Demo"
   → Course: CS401
   → LO1: 3 Easy, 2 Medium, 1 Hard
   → LO2: 2 Easy, 2 Medium, 1 Hard
   → Bấm "Validate" → Tất cả LO hiện xanh ✓

7. [Exam Generator] Vào Tạo Đề
   → Chọn Course: CS401
   → Chọn Blueprint: "Đề giữa kỳ - Demo"
   → Tên đề: "Đề thi giữa kỳ CS401 - 01"
   → Thời gian: 60 phút
   → Bấm "Tạo đề" → loading 1-2 giây

8. [Preview] Trang Preview hiển thị 11 câu hỏi đầy đủ
   → Scroll qua vài câu, thấy câu từ LO1 lẫn LO2, các độ khó khác nhau

9. [Export] Bấm "Export GIFT" → file tải về
   → Mở file bằng text editor → thấy format GIFT đúng
   → (Optional) Import vào Moodle, thấy câu hỏi hiện đúng
```

---

*Kế hoạch này được thiết kế để team 3 người hoàn thành trong 72 giờ với điều kiện làm việc tập trung. Ưu tiên tuyệt đối là luồng demo chạy được — UI đẹp là thứ yếu.*
