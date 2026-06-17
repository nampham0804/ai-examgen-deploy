# Team Coding Agreement - Vì Sao Cần Thống Nhất Trước Khi Code

Tài liệu này dành cho cả nhóm đọc trước khi bắt đầu code. Mục tiêu là để mọi người hiểu rõ vì sao cần thống nhất contract, schema, enum, cách đặt tên, cách mock data, và cách chia file. Nếu không thống nhất từ đầu, mỗi người sẽ code một kiểu, đến lúc ghép lại rất dễ conflict, lỗi API, sai field, sai kiểu dữ liệu, hoặc không chạy được luồng demo.

---

## 1. Vì Sao Cần Thống Nhất Trước Khi Code

Trong project này, các tính năng không tách rời nhau. Chúng nối thành một pipeline:

```text
Course
→ Learning Outcomes
→ Upload Document
→ Extract Text
→ AI Generate Questions
→ Review
→ Question Bank
→ Blueprint
→ Validate
→ Generate Exam
→ Preview
→ Export GIFT
```

Mỗi thành viên làm một đoạn, nhưng dữ liệu của người này là đầu vào của người khác.

Ví dụ:

- TV1 tạo Course/LO.
- TV2 dùng Course/LO để sinh câu hỏi.
- TV1 review câu hỏi do TV2 sinh.
- TV3 dùng câu hỏi đã approved để tạo đề.

Nếu TV1 đặt field là `learning_outcome_id`, TV2 lại gửi `lo_id`, TV3 lại query theo `outcome_id`, hệ thống sẽ vỡ dù từng người đều nghĩ phần mình code đúng.

Thống nhất trước giúp cả nhóm cùng trả lời các câu hỏi:

- Một course gồm những field nào?
- Một câu hỏi trắc nghiệm lưu khác câu hỏi tự luận như thế nào?
- Status của câu hỏi có những giá trị nào?
- API trả response theo format nào?
- Khi thiếu dữ liệu thật thì mock ra sao?
- File nào ai được sửa, file nào dễ conflict cần báo trước?

Nói ngắn gọn: thống nhất trước là để mọi người code độc lập nhưng vẫn ghép lại được.

---

## 2. API Contract Là Gì Và Dùng Để Làm Gì

API contract là “bản cam kết” giữa backend và frontend: frontend gửi gì lên, backend trả gì về.

Ví dụ contract cho tạo course:

```http
POST /api/courses
```

Request:

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
    "created_at": "2026-06-16T10:00:00"
  },
  "message": "Course created"
}
```

Nếu không có contract, frontend có thể gửi:

```json
{
  "courseCode": "CS401",
  "courseName": "Machine Learning"
}
```

Trong khi backend lại chờ:

```json
{
  "code": "...",
  "name": "..."
}
```

Kết quả là API lỗi, frontend không hiểu vì sao.

Chuẩn chung:

- Tất cả response thành công dùng:

```json
{
  "data": {},
  "message": "..."
}
```

- Tất cả response lỗi dùng:

```json
{
  "error": "...",
  "detail": "..."
}
```

- Không tự ý đổi tên field khi chưa báo nhóm.

---

## 3. Database Schema Là Gì Và Dùng Để Làm Gì

Database schema định nghĩa dữ liệu được lưu như thế nào.

Ví dụ bảng `questions` phải hỗ trợ cả trắc nghiệm và tự luận:

```sql
question_type: mcq | essay
options: dùng cho MCQ, essay thì null
correct_answer: dùng cho MCQ, essay thì null
suggested_answer: dùng cho essay
grading_rubric: dùng cho essay
```

Nếu không thống nhất schema, TV2 có thể lưu câu tự luận vào field `answer`, TV1 lại đọc `suggested_answer`, TV3 lại export từ `model_answer`. Lúc đó dữ liệu có trong DB nhưng các module không đọc được của nhau.

Chuẩn chung cho question:

```json
{
  "id": 101,
  "course_id": 1,
  "learning_outcome_id": 2,
  "document_id": 5,
  "question_type": "mcq",
  "question_text": "Thuật toán nào thuộc nhóm supervised learning?",
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
  "explanation": "Linear Regression dùng dữ liệu có nhãn.",
  "status": "pending_review"
}
```

Câu tự luận:

```json
{
  "id": 102,
  "course_id": 1,
  "learning_outcome_id": 2,
  "document_id": 5,
  "question_type": "essay",
  "question_text": "Trình bày sự khác nhau giữa supervised learning và unsupervised learning.",
  "difficulty": "medium",
  "options": null,
  "correct_answer": null,
  "suggested_answer": "Supervised learning học từ dữ liệu có nhãn, unsupervised learning tìm cấu trúc trong dữ liệu không nhãn.",
  "grading_rubric": "Nêu đúng dữ liệu có nhãn/không nhãn; nêu mục tiêu học; có ví dụ minh họa.",
  "explanation": "Câu hỏi đánh giá khả năng so sánh hai nhóm thuật toán.",
  "status": "pending_review"
}
```

---

## 4. Enum Là Gì Và Vì Sao Phải Chốt

Enum là danh sách giá trị cố định mà cả nhóm dùng chung.

Các enum phải chốt:

```text
question_type = "mcq" | "essay"
difficulty = "easy" | "medium" | "hard"
question_status = "pending_review" | "approved" | "rejected"
document_status = "uploaded" | "processing" | "processed" | "failed"
blueprint_status = "draft" | "validated" | "active"
exam_status = "draft" | "generated" | "exported"
```

Vì sao quan trọng?

Nếu TV2 lưu:

```json
"question_type": "multiple_choice"
```

Nhưng TV1 filter:

```text
question_type = "mcq"
```

Thì câu hỏi sẽ không hiện ở Review/Question Bank.

Nếu TV1 approve thành:

```json
"status": "approve"
```

Nhưng TV3 query:

```text
status = "approved"
```

Thì TV3 sẽ tưởng không có câu hỏi nào để tạo đề.

Chuẩn chung: chỉ dùng đúng enum đã chốt, không tự tạo biến thể.

---

## 5. Quy Ước Đặt Tên Field

Dùng `snake_case` cho dữ liệu trao đổi API và DB:

```text
course_id
learning_outcome_id
question_type
correct_answer
suggested_answer
grading_rubric
created_at
```

Không dùng lẫn:

```text
courseId
loId
questionType
correctAnswer
```

Lý do: backend Python/FastAPI và database thường dùng `snake_case`. Nếu frontend muốn dùng camelCase nội bộ thì phải convert rõ ràng, nhưng MVP nên dùng thẳng `snake_case` để giảm lỗi.

Ví dụ sai dễ gây conflict:

```ts
question.learningOutcomeId
```

Trong khi API trả:

```json
{
  "learning_outcome_id": 2
}
```

Frontend sẽ bị `undefined`.

---

## 6. Quy Ước Chia File Để Tránh Conflict

Không gom tất cả vào một file lớn. Mỗi domain có file riêng.

Backend nên chia:

```text
models/course.py
models/question.py
models/document.py
models/exam.py

schemas/course.py
schemas/question.py
schemas/document.py
schemas/exam.py

routers/courses.py
routers/learning_outcomes.py
routers/questions.py
routers/documents.py
routers/ai_generation.py
routers/blueprints.py
routers/exams.py
routers/exports.py
routers/analytics.py
```

Frontend nên chia:

```text
src/api/courses.ts
src/api/questions.ts
src/api/documents.ts
src/api/aiGeneration.ts
src/api/blueprints.ts
src/api/exams.ts
src/api/exports.ts
src/api/analytics.ts

src/types/course.ts
src/types/question.ts
src/types/document.ts
src/types/exam.ts

src/app/pages/Courses.tsx
src/app/pages/AIGeneration.tsx
src/app/pages/Review.tsx
src/app/pages/QuestionBank.tsx
src/app/pages/ExamBlueprint.tsx
src/app/pages/ExamGenerator.tsx
src/app/pages/ExamPreview.tsx
```

File dễ conflict:

```text
main.py
database.py
router registry
frontend router
layout/sidebar
types/index.ts
```

Quy tắc:

- Ai cần sửa file chung thì báo nhóm trước.
- Ưu tiên mỗi người sửa file trong domain của mình.
- Không format lại toàn bộ file nếu không cần.
- Không đổi tên field/API khi chưa update plan và báo nhóm.

---

## 7. Quy Ước API Status Code

Nên dùng chung:

| Trường hợp | Status |
|---|---|
| GET thành công | `200` |
| POST tạo mới thành công | `201` |
| PUT/PATCH thành công | `200` |
| DELETE thành công | `200` |
| Request sai dữ liệu | `422` |
| Không tìm thấy | `404` |
| Trùng dữ liệu | `409` |
| Lỗi server | `500` |

Ví dụ lỗi không tìm thấy course:

```json
{
  "error": "Not found",
  "detail": "Course not found"
}
```

---

## 8. Quy Ước UI/Frontend Chung

Mỗi màn hình cần có tối thiểu:

- Loading state.
- Error state.
- Empty state.
- Success feedback.
- Không crash nếu API trả lỗi.

Ví dụ Question Bank:

```text
Đang tải câu hỏi...
Không có câu hỏi phù hợp bộ lọc.
Không thể tải câu hỏi, vui lòng thử lại.
```

Không nên mỗi màn hình xử lý lỗi một kiểu. Các API function nên throw error theo cùng format để UI dễ xử lý.

---

## 9. Mock Là Gì Và Dùng Để Làm Gì

Mock là dữ liệu giả hoặc hàm giả dùng tạm khi phần thật chưa xong.

Mục đích:

- TV2 không phải chờ TV1 xong Course/LO API mới làm UI AI Generation.
- TV3 không phải chờ TV1 approve câu hỏi mới test Blueprint.
- Frontend có thể dựng UI trước khi backend xong.
- Backend service có thể test logic mà chưa cần LLM thật.

Mock không phải code bỏ đi vô nghĩa. Nó là cách để phát triển song song.

Nhưng mock phải theo đúng contract đã chốt. Nếu mock sai shape, sau này nối API thật vẫn lỗi.

---

## 10. TV1 Nên Mock Như Thế Nào

TV1 cần seed/mock để test Course, LO, Review, Question Bank.

### Mock Course

```ts
export const MOCK_COURSES = [
  {
    id: 1,
    code: "CS401",
    name: "Machine Learning",
    description: "Học phần nhập môn Machine Learning",
    owner_id: 1,
    created_at: "2026-06-16T08:00:00",
    updated_at: "2026-06-16T08:00:00"
  }
];
```

### Mock Learning Outcomes

```ts
export const MOCK_LEARNING_OUTCOMES = [
  {
    id: 1,
    course_id: 1,
    code: "LO1",
    description: "Hiểu và giải thích supervised vs unsupervised learning",
    bloom_level: "understand",
    created_at: "2026-06-16T08:00:00"
  },
  {
    id: 2,
    course_id: 1,
    code: "LO2",
    description: "Áp dụng linear regression cho bài toán thực tế",
    bloom_level: "apply",
    created_at: "2026-06-16T08:00:00"
  }
];
```

### Mock Questions Pending

```ts
export const MOCK_PENDING_QUESTIONS = [
  {
    id: 101,
    course_id: 1,
    learning_outcome_id: 1,
    document_id: 5,
    question_type: "mcq",
    question_text: "Thuật toán nào thuộc nhóm supervised learning?",
    difficulty: "medium",
    options: [
      { key: "A", text: "K-Means" },
      { key: "B", text: "Linear Regression" },
      { key: "C", text: "DBSCAN" },
      { key: "D", text: "PCA" }
    ],
    correct_answer: "B",
    suggested_answer: null,
    grading_rubric: null,
    explanation: "Linear Regression học từ dữ liệu có nhãn.",
    status: "pending_review",
    created_at: "2026-06-16T08:00:00"
  },
  {
    id: 102,
    course_id: 1,
    learning_outcome_id: 1,
    document_id: 5,
    question_type: "essay",
    question_text: "Trình bày sự khác nhau giữa supervised learning và unsupervised learning.",
    difficulty: "medium",
    options: null,
    correct_answer: null,
    suggested_answer: "Supervised learning dùng dữ liệu có nhãn; unsupervised learning tìm cấu trúc trong dữ liệu không nhãn.",
    grading_rubric: "Nêu đúng dữ liệu có nhãn/không nhãn; nêu mục tiêu học; có ví dụ minh họa.",
    explanation: "Câu hỏi đánh giá khả năng so sánh hai nhóm thuật toán.",
    status: "pending_review",
    created_at: "2026-06-16T08:00:00"
  }
];
```

TV1 dùng mock này để:

- Test Review UI.
- Test approve/reject.
- Test Question Bank filter `mcq` và `essay`.

---

## 11. TV2 Nên Mock Như Thế Nào

TV2 cần mock Course/LO nếu API TV1 chưa xong, và mock LLM nếu chưa có API key hoặc LLM lỗi.

### Mock Course/LO Cho GeneratePage

```ts
export const MOCK_COURSES = [
  { id: 1, code: "CS401", name: "Machine Learning" }
];

export const MOCK_LOS = [
  {
    id: 1,
    course_id: 1,
    code: "LO1",
    description: "Hiểu supervised vs unsupervised learning",
    bloom_level: "understand"
  },
  {
    id: 2,
    course_id: 1,
    code: "LO2",
    description: "Áp dụng linear regression",
    bloom_level: "apply"
  }
];
```

### Mock Document Upload Response

```ts
export const MOCK_UPLOADED_DOCUMENT = {
  id: 5,
  course_id: 1,
  file_name: "ml_lecture.pdf",
  file_type: "pdf",
  status: "uploaded",
  created_at: "2026-06-16T08:00:00"
};
```

### Mock Extract Response

```ts
export const MOCK_EXTRACTED_DOCUMENT = {
  id: 5,
  course_id: 1,
  file_name: "ml_lecture.pdf",
  file_type: "pdf",
  status: "processed",
  text_length: 3500
};
```

### Mock LLM Response

```ts
export const MOCK_GENERATED_QUESTIONS = {
  generated: 2,
  questions: [
    {
      id: 201,
      course_id: 1,
      learning_outcome_id: 1,
      document_id: 5,
      question_type: "mcq",
      question_text: "Đặc điểm nào đúng với supervised learning?",
      difficulty: "medium",
      options: [
        { key: "A", text: "Không cần dữ liệu huấn luyện" },
        { key: "B", text: "Dùng dữ liệu có nhãn để học" },
        { key: "C", text: "Chỉ dùng cho clustering" },
        { key: "D", text: "Không cần mô hình" }
      ],
      correct_answer: "B",
      suggested_answer: null,
      grading_rubric: null,
      explanation: "Supervised learning học từ dữ liệu có nhãn.",
      status: "pending_review"
    },
    {
      id: 202,
      course_id: 1,
      learning_outcome_id: 1,
      document_id: 5,
      question_type: "essay",
      question_text: "Giải thích vì sao dữ liệu có nhãn quan trọng trong supervised learning.",
      difficulty: "medium",
      options: null,
      correct_answer: null,
      suggested_answer: "Dữ liệu có nhãn cung cấp đầu ra mong muốn để mô hình học ánh xạ từ input sang output.",
      grading_rubric: "Nêu vai trò của nhãn; giải thích input-output; có ví dụ.",
      explanation: "Câu hỏi kiểm tra hiểu biết về dữ liệu có nhãn.",
      status: "pending_review"
    }
  ]
};
```

TV2 dùng mock này khi:

- Chưa có OpenAI/API key.
- LLM timeout.
- JSON parse lỗi.
- Backend chưa nối DB nhưng frontend cần demo luồng.

Quy tắc quan trọng: mock LLM phải có cả `mcq` và `essay` để TV1 test Review đúng.

---

## 12. TV3 Nên Mock Như Thế Nào

TV3 cần mock approved questions để test Blueprint/Validate/Exam mà không chờ TV1 approve thật.

### Mock Approved Questions

```ts
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
```

### Mock Blueprint

```ts
export const MOCK_BLUEPRINT = {
  id: 1,
  course_id: 1,
  title: "Đề giữa kỳ - Demo",
  status: "draft",
  total_questions: 4,
  items: [
    {
      id: 1,
      blueprint_id: 1,
      learning_outcome_id: 1,
      question_type: "mcq",
      easy_count: 1,
      medium_count: 1,
      hard_count: 0
    },
    {
      id: 2,
      blueprint_id: 1,
      learning_outcome_id: 1,
      question_type: "essay",
      easy_count: 0,
      medium_count: 1,
      hard_count: 0
    }
  ]
};
```

### Mock Validate Response

```ts
export const MOCK_VALIDATE_RESULT = {
  is_valid: true,
  total_required: 3,
  details: [
    {
      learning_outcome_id: 1,
      learning_outcome_code: "LO1",
      question_type: "mcq",
      easy_required: 1,
      easy_available: 5,
      medium_required: 1,
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
      hard_required: 0,
      hard_available: 1,
      is_valid: true,
      missing: null
    }
  ]
};
```

### Mock Exam Preview

```ts
export const MOCK_EXAM_PREVIEW = {
  id: 7,
  course_id: 1,
  blueprint_id: 1,
  title: "Đề thi giữa kỳ CS401 - 01",
  duration_minutes: 60,
  total_questions: 3,
  status: "generated",
  course_name: "Machine Learning",
  questions: [
    {
      order_index: 1,
      question_type: "mcq",
      question_text: "Supervised learning dùng loại dữ liệu nào?",
      options: [
        { key: "A", text: "Dữ liệu có nhãn" },
        { key: "B", text: "Dữ liệu không có nhãn" },
        { key: "C", text: "Dữ liệu bị xóa" },
        { key: "D", text: "Không cần dữ liệu" }
      ],
      correct_answer: "A",
      suggested_answer: null,
      grading_rubric: null,
      difficulty: "easy",
      learning_outcome_code: "LO1"
    },
    {
      order_index: 2,
      question_type: "essay",
      question_text: "So sánh supervised learning và unsupervised learning.",
      options: null,
      correct_answer: null,
      suggested_answer: "Supervised learning học từ dữ liệu có nhãn; unsupervised learning tìm cấu trúc từ dữ liệu không nhãn.",
      grading_rubric: "So sánh dữ liệu đầu vào; mục tiêu; ví dụ thuật toán.",
      difficulty: "medium",
      learning_outcome_code: "LO1"
    }
  ]
};
```

TV3 dùng mock này để:

- Test Validate Blueprint.
- Test Generate Exam.
- Test Preview hiển thị cả MCQ và tự luận.
- Test Export GIFT trước khi API thật hoàn chỉnh.

---

## 13. Khi Nào Được Dùng Mock Và Khi Nào Phải Bỏ Mock

Được dùng mock khi:

- API thật chưa xong.
- Cần dựng UI trước.
- Cần test logic độc lập.
- LLM chưa có key hoặc đang lỗi.
- Dữ liệu demo thật chưa seed xong.

Phải bỏ hoặc thay mock bằng API thật khi:

- Endpoint thật đã chạy được.
- Bắt đầu test integration.
- Trước demo cuối.

Quy tắc:

- Mock phải nằm ở file riêng, ví dụ `src/mocks/questions.ts`.
- Không trộn mock lung tung trong component.
- Nên có flag rõ:

```ts
const USE_MOCK = false;
```

Hoặc dùng environment:

```text
VITE_USE_MOCK=true
```

Ví dụ:

```ts
export async function getCourses() {
  if (import.meta.env.VITE_USE_MOCK === "true") {
    return MOCK_COURSES;
  }

  const res = await api.get("/api/courses");
  return res.data.data;
}
```

---

## 14. Checklist Trước Khi Code

Cả nhóm cần chốt xong:

- [ ] DB schema cuối cùng.
- [ ] API contract cho từng module.
- [ ] Enum chung.
- [ ] Format response thành công/lỗi.
- [ ] Tên field dùng `snake_case`.
- [ ] Cấu trúc thư mục backend/frontend.
- [ ] File nào là file chung dễ conflict.
- [ ] Seed data tối thiểu.
- [ ] Mock data cho TV1, TV2, TV3.
- [ ] Definition of Done của từng người.

---

## 15. Checklist Khi Code Hàng Ngày

Mỗi người trước khi push/merge nên tự hỏi:

- [ ] Mình có đổi field/API nào không?
- [ ] Nếu có đổi, đã báo nhóm chưa?
- [ ] Response có đúng format `{ data, message }` không?
- [ ] Error có đúng format `{ error, detail }` không?
- [ ] Có dùng đúng enum không?
- [ ] Có test với cả `mcq` và `essay` chưa?
- [ ] Có làm hỏng mock của người khác không?
- [ ] Có sửa file chung không cần thiết không?

---

## 16. Kết Luận

Thống nhất trước không phải để làm chậm team, mà để team code nhanh hơn. Khi contract rõ, mỗi thành viên có thể code phần của mình bằng mock, sau đó ghép lại ít lỗi hơn.

Điều quan trọng nhất là mọi người phải dùng chung một ngôn ngữ dữ liệu:

```text
Course giống nhau
LO giống nhau
Question giống nhau
Status giống nhau
API response giống nhau
Mock giống shape API thật
```

Nếu làm được điều này, project sẽ dễ quản lý hơn rất nhiều và giảm mạnh nguy cơ mỗi người code một kiểu.

---

## 17. Tech Stack Chốt Cho MVP

Phần này là công nghệ thống nhất cho MVP. Cả nhóm nên dùng đúng stack này để tránh tình trạng mỗi người cài một thư viện, một framework, một cách gọi API khác nhau.

### 17.1 Backend

| Mục | Công nghệ chốt | Lý do |
|---|---|---|
| Web framework | FastAPI | Nhanh, dễ chia router, có Swagger `/docs` để test API |
| Language | Python 3.11+ | Phù hợp xử lý AI, document, backend API |
| Validation | Pydantic v2 | Validate request/response, nhất là `mcq` và `essay` |
| ORM | SQLAlchemy 2.0 | Quản lý model DB rõ ràng, dễ scale |
| Migration | Alembic | Theo dõi thay đổi schema, tránh sửa DB thủ công |
| Server | Uvicorn | Chuẩn phổ biến cho FastAPI |
| Config | pydantic-settings + `.env` | Quản lý API key, DB URL, upload dir |

Backend không nên gọi DB trực tiếp trong router. Router chỉ nhận request và gọi service.

### 17.2 Database

| Mục | Công nghệ chốt | Lý do |
|---|---|---|
| Database chính | PostgreSQL | Có quan hệ rõ, hỗ trợ JSONB cho `options` của MCQ |
| Dev environment | Docker Compose | Cả nhóm chạy DB giống nhau |
| JSON field | JSONB | Lưu options MCQ dạng `[{key, text}]` |

MVP dùng PostgreSQL qua Docker Compose ngay từ đầu. Không dùng SQLite cho code tích hợp chung để tránh lệch migration, kiểu JSONB và môi trường test giữa các thành viên.

### 17.3 Frontend

| Mục | Công nghệ chốt | Lý do |
|---|---|---|
| Framework | React | Dễ chia page/component theo thành viên |
| Build tool | Vite | Khởi động nhanh, cấu hình nhẹ |
| Language | TypeScript | Giảm lỗi sai field như `question_type`, `learning_outcome_id` |
| Routing | React Router | Quản lý các trang Dashboard/Courses/Review/Exam |
| HTTP client | Axios | Dễ cấu hình baseURL/interceptor |
| Styling | TailwindCSS | Làm UI nhanh, ít phụ thuộc CSS global |
| UI library | shadcn/ui style components + Radix UI | Chốt dùng 1 hệ component theo frontend hiện tại, không dùng lẫn Ant Design/MUI để tránh lệch style |
| Icons | lucide-react | Dùng thống nhất cho icon trong button, sidebar, action |

Chuẩn UI cho MVP: dùng shadcn/ui style components dựa trên Radix UI + TailwindCSS, icon dùng `lucide-react`. Không thêm Ant Design hoặc MUI cho màn mới; nếu dependency MUI đang tồn tại nhưng không dùng trong code thì có thể gỡ sau để giảm nhiễu.

### 17.4 AI Và Document Processing

| Mục | Công nghệ chốt | Lý do |
|---|---|---|
| LLM provider | OpenAI API | Dễ gọi, đủ tốt cho sinh MCQ/essay |
| Model | `gpt-4o-mini` | Chốt một model cho MVP để tránh lệch prompt, chi phí và output format |
| PDF extract | PyMuPDF | Extract text PDF có text layer tốt |
| DOCX extract | python-docx | Đọc DOCX đơn giản |
| Upload file | python-multipart | FastAPI cần cho multipart/form-data |

Không làm OCR trong MVP. Chỉ dùng PDF có text layer. Nếu file extract rỗng thì báo lỗi rõ.

### 17.5 Export

| Mục | Công nghệ chốt | Lý do |
|---|---|---|
| GIFT export | Tự viết bằng Python string builder | Format không quá phức tạp |
| File response | FastAPI FileResponse hoặc StreamingResponse | Trả file `.gift` để download |

Cần support cả:

- MCQ GIFT.
- Essay GIFT.
- Escape ký tự đặc biệt `{ } = ~ # : \`.

### 17.6 Testing Và Code Quality

| Mục | Công nghệ chốt | Lý do |
|---|---|---|
| Backend test | pytest | Dễ test service/API |
| API test | FastAPI TestClient hoặc httpx | Test endpoint |
| Lint Python | ruff | Nhanh, repo đã có `ruff.toml` |
| Frontend test | Manual test theo demo script trong MVP | Tiết kiệm thời gian 3 ngày |

MVP tối thiểu nên test:

- Parse AI response MCQ/essay.
- Validate question schema.
- Validate blueprint theo `LO + question_type + difficulty`.
- Export GIFT escape ký tự đặc biệt.

### 17.7 Không Nên Dùng Trong MVP

Các thứ nên tránh trong 3 ngày:

- Next.js: nặng hơn nhu cầu MVP.
- Redux: chưa cần, state chưa quá phức tạp.
- Microservices: không cần, gây chậm.
- OCR: vượt scope.
- Role/Auth/JWT: plan đã bỏ.
- Nhiều UI library cùng lúc: dễ lệch style.
- Agent phức tạp ngay từ đầu: nên tách service sạch trước, agent thêm sau.

### 17.8 Stack Tóm Tắt

Nếu cần chốt một dòng:

```text
React + Vite + TypeScript + TailwindCSS
FastAPI + Pydantic + SQLAlchemy + Alembic
PostgreSQL + Docker Compose
OpenAI API + PyMuPDF + python-docx
pytest + ruff
```

---

## 18. Cấu Trúc Thư Mục Đề Xuất Để Scale Sau Này

Repo hiện tại đã có nền FastAPI và thư mục `agents/`, nhưng nếu code thẳng tất cả vào vài file chung như `routes.py`, `schemas.py`, `services/llm.py` thì sau này sẽ rất khó mở rộng. Cấu trúc nên đi theo hướng: mỗi domain có route, schema, model, repository, service riêng; phần AI/agent nằm riêng và gọi lại service qua tool.

Mục tiêu của cấu trúc này:

- MVP 3 ngày vẫn code nhanh.
- Mỗi thành viên ít đụng file của nhau.
- Sau này thêm agent không cần đập lại API/frontend.
- Dễ test từng domain.
- Dễ tìm bug vì file nằm đúng chỗ.

### 18.1 Cấu Trúc Backend Đề Xuất

```text
src/
  main.py
  config.py

  api/
    deps.py
    router.py
    routes/
      courses.py
      learning_outcomes.py
      documents.py
      ai_generation.py
      questions.py
      blueprints.py
      exams.py
      exports.py
      analytics.py

  models/
    base.py
    user.py
    course.py
    learning_outcome.py
    document.py
    question.py
    exam.py

  schemas/
    common.py
    course.py
    learning_outcome.py
    document.py
    question.py
    blueprint.py
    exam.py
    export.py
    analytics.py

  repositories/
    user_repository.py
    course_repository.py
    learning_outcome_repository.py
    document_repository.py
    question_repository.py
    exam_repository.py

  services/
    course_service.py
    learning_outcome_service.py
    document_service.py
    ai_generation_service.py
    question_service.py
    exam_service.py
    export_service.py
    analytics_service.py

  ai/
    prompts/
      question_generation.py
    providers/
      openai_provider.py
    parsers/
      question_parser.py

  agents/
    orchestrator.py
    state.py
    tools/
      course_tools.py
      document_tools.py
      question_tools.py
      exam_tools.py
    workflows/
      question_generation_agent.py
      exam_review_agent.py

  utils/
    logging.py
    file_utils.py
    time_utils.py
```

### 18.2 Ý Nghĩa Từng Nhóm Thư Mục Backend

| Thư mục | Mục đích | Có nên chứa gì |
|---|---|---|
| `api/routes/` | Khai báo HTTP endpoint | FastAPI routers, request/response wiring |
| `models/` | SQLAlchemy ORM models | Bảng DB, relationship |
| `schemas/` | Pydantic schemas | Request/response DTO, validation |
| `repositories/` | Truy cập DB | Query, create, update, delete |
| `services/` | Business logic | Workflow nghiệp vụ chính |
| `ai/` | Logic LLM không phải agent | Prompt, provider, parser |
| `agents/` | Workflow agent sau này | Orchestrator, tools, graph/workflow |
| `utils/` | Hàm tiện ích thuần | Logging, file utils, time utils |

Quy tắc quan trọng:

```text
Router không gọi DB trực tiếp.
Router không gọi OpenAI trực tiếp.
Router không chứa prompt dài.
Service không phụ thuộc frontend.
Agent không query DB lung tung, agent dùng tools/service.
Repository không chứa logic nghiệp vụ phức tạp.
```

Luồng hiện tại nên là:

```text
Router
→ Service
→ Repository
→ Database
```

Luồng sau này khi có agent:

```text
Router
→ Agent Orchestrator
→ Agent Tools
→ Service
→ Repository
→ Database
```

Nhờ vậy API và frontend không cần đổi khi nâng cấp service thành agent.

### 18.3 Ví Dụ Với AI Generation

Không nên viết:

```text
api/routes/ai_generation.py
  → tự lấy document từ DB
  → tự viết prompt
  → tự gọi OpenAI
  → tự parse JSON
  → tự lưu questions
```

Nên viết:

```text
api/routes/ai_generation.py
  → gọi ai_generation_service.generate_questions()

services/ai_generation_service.py
  → lấy document qua document_repository
  → lấy LO qua learning_outcome_repository
  → gọi ai/providers/openai_provider.py
  → parse bằng ai/parsers/question_parser.py
  → lưu bằng question_repository
```

Sau này thêm agent:

```text
api/routes/ai_generation.py
  → gọi agents/workflows/question_generation_agent.py

question_generation_agent.py
  → dùng document_tools.get_document_text()
  → dùng question_tools.generate_questions()
  → dùng question_tools.validate_questions()
  → dùng question_tools.save_questions()
```

API vẫn là:

```http
POST /api/ai/generate-questions
```

Frontend không cần biết bên trong backend đang dùng service hay agent.

### 18.4 Cấu Trúc Frontend Đề Xuất

```text
frontend/
  src/
    main.tsx
    App.tsx

    app/
      router.tsx
      layout/
        AppLayout.tsx
        Sidebar.tsx
        Header.tsx

    api/
      client.ts
      courses.ts
      learningOutcomes.ts
      documents.ts
      aiGeneration.ts
      questions.ts
      blueprints.ts
      exams.ts
      exports.ts
      analytics.ts

    types/
      common.ts
      course.ts
      learningOutcome.ts
      document.ts
      question.ts
      exam.ts
      analytics.ts

    app/
      App.tsx
      routes.tsx
      components/
        Layout.tsx
        ui/
      context/
        AppContext.tsx
      pages/
        Dashboard.tsx
        Courses.tsx
        LearningOutcomes.tsx
        AIGeneration.tsx
        Review.tsx
        QuestionBank.tsx
        ExamBlueprint.tsx
        ExamGenerator.tsx
        ExamPreview.tsx

    components/
      common/
        LoadingState.tsx
        ErrorState.tsx
        EmptyState.tsx
      forms/
      tables/
      ui/

    mocks/
      courses.ts
      learningOutcomes.ts
      documents.ts
      questions.ts
      blueprints.ts
      exams.ts

    utils/
      formatDate.ts
      downloadFile.ts
```

### 18.5 Ý Nghĩa Từng Nhóm Thư Mục Frontend

| Thư mục | Mục đích |
|---|---|
| `app/` | Router, layout chính, sidebar/header |
| `api/` | Hàm gọi backend API |
| `types/` | TypeScript type dùng chung |
| `pages/` | Màn hình theo route |
| `components/` | Component tái sử dụng |
| `mocks/` | Mock data đúng API contract |
| `utils/` | Hàm tiện ích frontend |

Quy tắc:

- Component page không gọi `axios` trực tiếp, mà gọi qua `api/*.ts`.
- Type phải đặt trong `types/`, không khai báo lung tung trong từng component nếu dùng chung.
- Mock phải để trong `mocks/`, không hardcode ngay trong component.
- `CourseDetail` chứa `LearningOutcomesPanel`; không cần một menu Learning Outcome độc lập trong MVP.

### 18.6 Cấu Trúc Tests Đề Xuất

```text
tests/
  test_api/
    test_courses.py
    test_documents.py
    test_questions.py
    test_blueprints.py
    test_exams.py

  test_services/
    test_document_service.py
    test_ai_generation_service.py
    test_question_service.py
    test_exam_service.py
    test_export_service.py

  test_agents/
    test_question_generation_agent.py

  fixtures/
    sample_questions.py
    sample_documents.py
```

MVP không cần test quá nặng, nhưng tối thiểu nên có test cho:

- Parse AI response MCQ/essay.
- Validate question schema.
- Validate blueprint count theo `LO + question_type + difficulty`.
- Export GIFT escape ký tự đặc biệt.

### 18.7 Ai Nên Sửa Khu Vực Nào

| Thành viên | Khu vực chính |
|---|---|
| TV1 | `courses`, `learning_outcomes`, `questions`, `Review`, `QuestionBank` |
| TV2 | `documents`, `ai_generation`, `ai/prompts`, `ai/providers`, `AIGeneration` |
| TV3 | `blueprints`, `exams`, `exports`, `analytics`, `Blueprint`, `Exam` |

File chung cần cẩn thận:

```text
src/main.py
src/api/router.py
src/config.py
frontend/src/app/router.tsx
frontend/src/app/layout/*
frontend/src/api/client.ts
```

Nếu cần sửa file chung, nên báo nhóm trước.

### 18.8 Cách Migration Từ Cấu Trúc Hiện Tại

Hiện tại repo đang có:

```text
src/api/routes/
src/api/router.py
src/models/
src/schemas/
src/services/
src/agents/
frontend/src/.gitkeep
```

Nên migrate nhẹ theo thứ tự:

1. Tạo `src/api/routes/`.
2. Dùng `src/api/router.py` làm router tổng; không tạo lại file `src/api/routes.py`.
3. Đặt Pydantic schema trong `src/schemas/*.py`; không tạo lại `src/models/schemas.py`.
4. Tạo `src/models/*.py` cho SQLAlchemy models.
5. Tạo `src/repositories/*_repository.py`.
6. Tạo `src/services/*_service.py` theo domain.
7. Tạo `src/ai/` cho prompt/provider/parser.
8. Giữ `src/agents/` để dùng sau, không xóa.
9. Scaffold frontend thật trong `frontend/src`.

Không cần làm tất cả trong một commit lớn. Có thể làm dần, nhưng nên chốt cấu trúc trước khi team bắt đầu code nhiều.

### 18.9 Cấu Trúc Này Có Làm Chậm MVP Không

Không, nếu làm vừa đủ.

MVP chỉ cần tạo các file cần dùng ngay:

```text
routes/courses.py
routes/documents.py
routes/questions.py
routes/blueprints.py
routes/exams.py

schemas/course.py
schemas/question.py
schemas/document.py
schemas/exam.py

services/document_service.py
services/ai_generation_service.py
services/exam_service.py
```

Các file agent nâng cao có thể để trống hoặc chưa tạo. Quan trọng là không viết code theo kiểu dính chặt vào router.
