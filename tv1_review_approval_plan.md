# TV1 - Ke Hoach Chi Tiet: Review & Approval Questions

Nguon tham chieu:

- `plan_mvp_demo.md`
- `team_coding_agreement.md`
- `tv1_ke_hoach_chi_tiet.md`

Muc tieu cua tinh nang nay la cho giang vien kiem duyet cau hoi do AI sinh ra truoc khi dua vao Question Bank. Day la diem noi quan trong giua TV2 va TV3:

```text
TV2 AI Generation
-> questions.status = pending_review
-> TV1 Review & Approval
-> questions.status = approved
-> TV3 Blueprint / Exam Generator
```

---

## 1. Pham Vi Tinh Nang

### Lam trong scope

- Backend CRUD can thiet cho `questions`.
- API list/filter questions.
- API xem detail question.
- API update question noi dung dap an/rubric/difficulty.
- API approve question.
- API reject question.
- Frontend Review page load cau hoi `pending_review`.
- Frontend cho phep xem chi tiet, sua, approve, reject.
- Mock questions dung contract de chay frontend doc lap.
- Test API cho luong Review & Approval.

### Chua lam trong scope nay

- Question generation tu AI cua TV2.
- Question Bank UI day du filter/pagination.
- Blueprint/Exam cua TV3.
- Review history table.
- Auth/JWT/role permission.
- Quality score, AI confidence, LO alignment score.

---

## 2. Contract Chung Phai Bam

### 2.1 Field naming

Tat ca API va frontend type dung `snake_case`, khong dung camelCase cho data trao doi:

```text
course_id
learning_outcome_id
document_id
question_type
question_text
correct_answer
suggested_answer
grading_rubric
created_by_ai
approved_by
approved_at
created_at
updated_at
```

### 2.2 Enum chung

Chi dung dung cac enum da chot:

```text
question_type = "mcq" | "essay"
difficulty = "easy" | "medium" | "hard"
status = "pending_review" | "approved" | "rejected"
```

Khong dung:

```text
"Multiple Choice"
"Essay"
"pending"
"approve"
"hard "
```

### 2.3 Response format

Thanh cong:

```json
{
  "data": {},
  "message": "..."
}
```

Loi:

```json
{
  "error": "...",
  "detail": "..."
}
```

---

## 3. Database Model Can Them

File:

```text
src/models/question.py
```

Bang `questions`:

```python
class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int]
    course_id: Mapped[int]
    learning_outcome_id: Mapped[int]
    document_id: Mapped[int | None]
    question_text: Mapped[str]
    question_type: Mapped[str]
    difficulty: Mapped[str]
    options: Mapped[list[dict] | None]
    correct_answer: Mapped[str | None]
    suggested_answer: Mapped[str | None]
    grading_rubric: Mapped[str | None]
    explanation: Mapped[str | None]
    status: Mapped[str]
    created_by_ai: Mapped[bool]
    created_by: Mapped[int | None]
    approved_by: Mapped[int | None]
    approved_at: Mapped[datetime | None]
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
```

Ghi chu:

- `course_id` foreign key toi `courses.id`.
- `learning_outcome_id` foreign key toi `learning_outcomes.id`.
- `document_id` tam thoi nullable vi TV2 co the chua co document model.
- `options` dung SQLAlchemy `JSON` de chay duoc SQLite test va PostgreSQL dev.
- MVP hardcode user id la `1`.

Can update:

```text
src/repositories/database.py
```

Them import `question` trong `init_db()` de `Base.metadata.create_all()` tao bang.

---

## 4. Backend Files Can Tao

```text
src/models/question.py
src/schemas/question.py
src/repositories/question_repository.py
src/services/question_service.py
src/api/routes/questions.py
tests/test_api/test_questions.py
```

Can sua:

```text
src/api/router.py
src/repositories/database.py
tests/conftest.py
```

---

## 5. Pydantic Schemas

File:

```text
src/schemas/question.py
```

Schemas can co:

```text
QuestionOption
QuestionCreate
QuestionUpdate
QuestionResponse
QuestionListResponse
```

### 5.1 QuestionOption

```json
{
  "key": "A",
  "text": "Linear Regression"
}
```

Validation:

- `key` thuoc `A`, `B`, `C`, `D`.
- `text` khong rong.

### 5.2 QuestionCreate

Dung cho seed/test va de TV2 sau nay co the luu questions:

```json
{
  "course_id": 1,
  "learning_outcome_id": 1,
  "document_id": null,
  "question_type": "mcq",
  "question_text": "Question text",
  "difficulty": "medium",
  "options": [
    {"key": "A", "text": "..."},
    {"key": "B", "text": "..."},
    {"key": "C", "text": "..."},
    {"key": "D", "text": "..."}
  ],
  "correct_answer": "B",
  "suggested_answer": null,
  "grading_rubric": null,
  "explanation": "Explanation",
  "status": "pending_review"
}
```

### 5.3 QuestionUpdate

Cho Review UI sua cau hoi:

```json
{
  "question_text": "Updated question",
  "question_type": "mcq",
  "difficulty": "hard",
  "options": [],
  "correct_answer": "A",
  "suggested_answer": null,
  "grading_rubric": null,
  "explanation": "Updated explanation"
}
```

Validation bat buoc:

- Neu `question_type = "mcq"`:
  - `options` phai co dung 4 phan tu.
  - `correct_answer` phai thuoc `A/B/C/D`.
  - `suggested_answer` va `grading_rubric` co the null.
- Neu `question_type = "essay"`:
  - `options` phai null hoac rong.
  - `correct_answer` nen null.
  - Can co it nhat mot trong hai field `suggested_answer` hoac `grading_rubric`.
- `difficulty` phai thuoc `easy/medium/hard`.
- `question_text` khong rong.

---

## 6. API Contract

Router:

```text
src/api/routes/questions.py
```

Dang ky trong:

```text
src/api/router.py
```

```python
from src.api.routes import courses, learning_outcomes, questions

router.include_router(questions.router, prefix="/questions", tags=["questions"])
```

### 6.1 List/filter questions

```http
GET /api/questions?status=pending_review&course_id=1&learning_outcome_id=1&question_type=mcq&difficulty=medium&page=1&page_size=20
```

Response:

```json
{
  "data": {
    "items": [],
    "total": 10,
    "page": 1,
    "page_size": 20
  },
  "message": "Questions loaded"
}
```

Default:

- `page = 1`
- `page_size = 20`
- sort `id desc`

### 6.2 Get question detail

```http
GET /api/questions/{id}
```

Response:

```json
{
  "data": {},
  "message": "Question loaded"
}
```

### 6.3 Update question

```http
PUT /api/questions/{id}
```

Response:

```json
{
  "data": {},
  "message": "Question updated"
}
```

### 6.4 Approve question

```http
POST /api/questions/{id}/approve
```

Behavior:

- Set `status = "approved"`.
- Set `approved_by = 1`.
- Set `approved_at = now()`.

Response:

```json
{
  "data": {
    "id": 101,
    "status": "approved"
  },
  "message": "Question approved"
}
```

### 6.5 Reject question

```http
POST /api/questions/{id}/reject
```

Behavior:

- Set `status = "rejected"`.
- Clear `approved_by`.
- Clear `approved_at`.

Response:

```json
{
  "data": {
    "id": 101,
    "status": "rejected"
  },
  "message": "Question rejected"
}
```

---

## 7. Repository Layer

File:

```text
src/repositories/question_repository.py
```

Functions:

```text
get_questions(db, filters, page, page_size) -> tuple[list[Question], int]
get_question_by_id(db, question_id) -> Question | None
create_question(db, payload, created_by=1) -> Question
update_question(db, question, payload) -> Question
approve_question(db, question, approved_by=1) -> Question
reject_question(db, question) -> Question
```

Query filter can ho tro:

```text
status
course_id
learning_outcome_id
question_type
difficulty
```

---

## 8. Service Layer

File:

```text
src/services/question_service.py
```

Responsibilities:

- Validate course ton tai.
- Validate learning outcome ton tai.
- Validate LO thuoc dung course.
- Validate question business rules.
- Raise `HTTPException` dung format loi.
- Khong de router query DB truc tiep.

Functions:

```text
list_questions(db, filters)
get_question(db, question_id)
create_question(db, payload)
update_question(db, question_id, payload)
approve_question(db, question_id)
reject_question(db, question_id)
```

Loi can tra:

- `404`: Question/Course/LO not found.
- `409`: Neu can chan action khong hop le.
- `422`: Validation schema sai.

---

## 9. Seed Data Cho Review

Trong MVP, can co data mau de chay demo/doc lap.

Co 2 cach:

### Cach A - Seed trong test/mock frontend

Lam truoc de nhanh va an toan:

- `tests/test_api/test_questions.py` tu tao course/LO/question trong test.
- `frontend/src/mocks/questions.ts` co mock pending/approved/rejected.

### Cach B - Seed trong app startup

Lam sau neu can demo backend co data san:

- Them seed function trong `src/repositories/database.py`.
- Seed 1 course `CS401`, 3 LO, 30 approved, 10 pending.

Uu tien:

```text
Lam Cach A truoc -> API pass -> UI mock/API pass -> sau do moi seed demo neu can.
```

---

## 10. Frontend Files Can Tao/Sua

Tao:

```text
frontend/src/types/question.ts
frontend/src/api/questions.ts
frontend/src/mocks/questions.ts
```

Sua:

```text
frontend/src/types/index.ts
frontend/src/app/pages/Review.tsx
```

Khong sua lon:

```text
frontend/src/app/routes.tsx
frontend/src/app/components/Layout.tsx
frontend/src/api/client.ts
```

Neu can sua file chung thi chi sua toi thieu.

---

## 11. Frontend Types

File:

```text
frontend/src/types/question.ts
```

Types:

```ts
export type QuestionType = 'mcq' | 'essay';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionStatus = 'pending_review' | 'approved' | 'rejected';

export interface QuestionOption {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface Question {
  id: number;
  course_id: number;
  learning_outcome_id: number;
  document_id?: number | null;
  question_type: QuestionType;
  question_text: string;
  difficulty: QuestionDifficulty;
  options?: QuestionOption[] | null;
  correct_answer?: string | null;
  suggested_answer?: string | null;
  grading_rubric?: string | null;
  explanation?: string | null;
  status: QuestionStatus;
  created_by_ai: boolean;
  created_by?: number | null;
  approved_by?: number | null;
  approved_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface QuestionPayload {
  question_type: QuestionType;
  question_text: string;
  difficulty: QuestionDifficulty;
  options?: QuestionOption[] | null;
  correct_answer?: string | null;
  suggested_answer?: string | null;
  grading_rubric?: string | null;
  explanation?: string | null;
}
```

---

## 12. Frontend API

File:

```text
frontend/src/api/questions.ts
```

Functions:

```text
getQuestions(filters)
getQuestion(id)
updateQuestion(id, payload)
approveQuestion(id)
rejectQuestion(id)
```

Can dung flag mock:

```ts
const useMock = import.meta.env.VITE_USE_MOCK === 'true';
```

Endpoints:

```text
GET  /api/questions
GET  /api/questions/{id}
PUT  /api/questions/{id}
POST /api/questions/{id}/approve
POST /api/questions/{id}/reject
```

---

## 13. Mock Questions

File:

```text
frontend/src/mocks/questions.ts
```

Mock phai co ca:

- `mcq`
- `essay`
- `pending_review`
- `approved`
- `rejected`
- `easy`, `medium`, `hard`

Mock functions:

```text
mockGetQuestions(filters)
mockGetQuestion(id)
mockUpdateQuestion(id, payload)
mockApproveQuestion(id)
mockRejectQuestion(id)
```

Mock phai update in-memory list de UI thay doi sau approve/reject.

---

## 14. Review UI Flow

File:

```text
frontend/src/app/pages/Review.tsx
```

### State can co

```text
questions
selectedQuestion
loading
error
success
isEditing
formData
isSubmitting
```

### Load page

```text
on mount
-> getQuestions({ status: 'pending_review' })
-> set questions
-> auto select first question neu co
```

### UI can co

- Left panel: danh sach questions pending.
- Right panel: chi tiet selected question.
- Badge course/LO/difficulty/question_type/status.
- Neu MCQ: hien 4 options va highlight correct answer.
- Neu Essay: hien suggested_answer va grading_rubric.
- Button Edit/Save.
- Button Approve.
- Button Reject.
- Loading state.
- Empty state: khong co cau hoi cho duyet.
- Error state.
- Success feedback.

### Actions

Edit:

```text
click Edit
-> open form inline
-> submit PUT /api/questions/{id}
-> refresh selected question and list
```

Approve:

```text
click Approve
-> POST /api/questions/{id}/approve
-> remove question from pending list
-> select next question
-> show success
```

Reject:

```text
click Reject
-> POST /api/questions/{id}/reject
-> remove question from pending list
-> select next question
-> show success
```

---

## 15. Validation Tren UI

Truoc khi call update:

- `question_text` khong rong.
- `difficulty` thuoc enum.
- `question_type` thuoc enum.
- Neu `mcq`:
  - Du 4 options.
  - Moi option text khong rong.
  - `correct_answer` thuoc A/B/C/D.
- Neu `essay`:
  - Co `suggested_answer` hoac `grading_rubric`.

Backend van la nguon validate chinh; frontend validate de UX tot hon.

---

## 16. Tests Can Viet

File:

```text
tests/test_api/test_questions.py
```

Test cases:

1. Create seed course + LO + pending MCQ, list `status=pending_review`.
2. Get question detail.
3. Update MCQ question.
4. Approve question:
   - status thanh `approved`
   - co `approved_by`
   - co `approved_at`
5. Reject question:
   - status thanh `rejected`
6. Filter questions:
   - `course_id`
   - `learning_outcome_id`
   - `question_type`
   - `difficulty`
   - `status`
7. Validation:
   - MCQ thieu options -> 422.
   - essay khong co answer/rubric -> 422.

Lenh verify:

```powershell
python -m pytest tests/test_api/test_courses.py tests/test_api/test_learning_outcomes.py tests/test_api/test_questions.py -v
npm run build
```

---

## 17. Thu Tu Code De It Loi

### Buoc 1 - Backend model/schema

- Tao `src/models/question.py`.
- Tao `src/schemas/question.py`.
- Update `src/repositories/database.py`.

Verify nhanh:

```powershell
python -m pytest tests/test_api/test_courses.py tests/test_api/test_learning_outcomes.py -v
```

### Buoc 2 - Repository/service/router

- Tao `question_repository.py`.
- Tao `question_service.py`.
- Tao `routes/questions.py`.
- Register router trong `src/api/router.py`.

### Buoc 3 - Backend tests

- Tao `tests/test_api/test_questions.py`.
- Chay test den khi pass.

### Buoc 4 - Frontend types/api/mock

- Tao `frontend/src/types/question.ts`.
- Export trong `frontend/src/types/index.ts`.
- Tao `frontend/src/api/questions.ts`.
- Tao `frontend/src/mocks/questions.ts`.

### Buoc 5 - Refactor Review.tsx

- Bo `questionForReview` hardcode.
- Load data tu `getQuestions({ status: 'pending_review' })`.
- Them edit/approve/reject logic.

### Buoc 6 - Verify

```powershell
python -m pytest tests/test_api/test_courses.py tests/test_api/test_learning_outcomes.py tests/test_api/test_questions.py -v
npm run build
```

---

## 18. Definition Of Done

Tinh nang Review & Approval duoc xem la xong khi:

- [ ] Co model `Question`.
- [ ] Co schema validate dung `mcq` va `essay`.
- [ ] Co API `GET /api/questions`.
- [ ] Co API `GET /api/questions/{id}`.
- [ ] Co API `PUT /api/questions/{id}`.
- [ ] Co API `POST /api/questions/{id}/approve`.
- [ ] Co API `POST /api/questions/{id}/reject`.
- [ ] API list filter duoc theo status/course/LO/type/difficulty.
- [ ] Approve set `status = approved`, `approved_by = 1`, `approved_at`.
- [ ] Reject set `status = rejected`.
- [ ] Review UI load questions pending tu API/mock.
- [ ] Review UI edit/save duoc.
- [ ] Review UI approve/reject xong remove khoi pending list.
- [ ] Mock dung contract va bat bang `VITE_USE_MOCK=true`.
- [ ] Test backend pass.
- [ ] Frontend build pass.

---

## 19. Rủi Ro Va Cach Xu Ly

### Rủi ro: TV2 chua co document model

Xu ly:

- De `document_id` nullable.
- Review/Question Bank van chay voi seed questions khong co document.

### Rủi ro: TV3 can approved questions som

Xu ly:

- Sau khi API question xong, them mock/seed approved questions.
- Dam bao `GET /api/questions?status=approved` tra ve data dung.

### Rủi ro: enum lech voi UI cu

Xu ly:

- Xoa hoac map het `Essay`, `Multiple Choice`, `pending`.
- UI chi dung `essay`, `mcq`, `pending_review`.

### Rủi ro: form edit MCQ/Essay phuc tap

Xu ly:

- MVP cho edit inline cac field chinh truoc:
  - `question_text`
  - `difficulty`
  - `options`
  - `correct_answer`
  - `suggested_answer`
  - `grading_rubric`
- Chua can modal dep, uu tien dung va on dinh.

---

## 20. Commit Goi Y

Nen commit theo tung moc:

```text
feat: add question review api
test: add question review api tests
feat: connect review page to question api
```

Neu lam mot commit cho nhanh:

```text
feat: implement question review approval
```
