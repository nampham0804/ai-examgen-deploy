# TV2 Frontend Progress Report

## Phase 1H: AI Generation Page Backend Integration

* Date: 2026-06-18
* Owner: TV2

### Purpose

Connect the existing AI Generation page to the TV2 backend pipeline without changing the global frontend architecture or pages owned by other members.

### Files Changed

* `frontend/src/app/pages/AIGeneration.tsx`
* `frontend/src/app/api/tv2.ts`
* `docs/tv2_frontend_progress_report.md`

### APIs Connected

* `GET /api/v1/courses`
* `GET /api/v1/courses/{course_id}/learning-outcomes`
* `POST /api/v1/documents/upload`
* `POST /api/v1/documents/{document_id}/extract`
* `POST /api/v1/ai/generate-questions`
* `GET /api/v1/questions?document_id=<id>&status=pending_review`

### Implementation

The existing AI Generation page now loads real courses and learning outcomes, uploads PDF/DOCX documents, triggers extract/chunk processing, generates questions from the backend, and reloads saved `pending_review` questions for the uploaded document.

The page keeps the existing workflow-style layout and local visual style. It adds scoped loading states, backend error handling using `error/detail`, concise debug IDs/counts, and displays generated and saved questions with source chunk IDs. It does not show provider configuration, API keys, full prompts, full LLM responses, or Langfuse internals.

### Manual Test Steps

1. Start backend from repo root:

```powershell
.\venv\Scripts\python.exe -m uvicorn src.main:app --reload
```

2. Start frontend:

```powershell
cd frontend
npm.cmd run dev
```

3. Open the app and navigate to the existing AI Generation page.
4. Select a course and learning outcome.
5. Upload one explicit PDF or DOCX file through the page.
6. Click `Extract`.
7. Confirm `document_id`, `status`, `text_length`, and `chunk_count` appear.
8. Enter an optional topic, select question type/difficulty, set `num_questions=1`, and click `Generate`.
9. Confirm the latest generated question appears.
10. Confirm saved `pending_review` questions load from `GET /api/v1/questions`.
11. If Langfuse is enabled in backend env, open Langfuse Cloud and search for trace name `ai_question_generation`.

### Caveats

* The page assumes backend data already exists for courses and learning outcomes.
* The frontend does not implement approve/reject/edit review workflow yet.
* The frontend does not retry generation automatically because retries could duplicate saved questions.
* Browser verification still depends on local frontend dependencies being installed successfully.

### Next Step

Phase 1I should integrate the pending-review handoff or review display flow without changing backend AI generation behavior.

## Phase 1H.3: AI Generation Page UI Polish

* Date: 2026-06-18
* Owner: TV2

### Purpose

Improve readability and status clarity on the existing AI Generation page after the backend flow was connected.

### Files Changed

* `frontend/src/app/pages/AIGeneration.tsx`
* `docs/tv2_frontend_progress_report.md`

### APIs Connected

No API contracts changed. The page still uses the Phase 1H endpoints for courses, learning outcomes, document upload, extract/chunk, generation, and pending-review question listing.

### Manual Test

1. Select a course and learning outcome.
2. Upload a PDF or DOCX.
3. Confirm the document summary shows `document_id`, status, `page_count`, `text_length`, `chunk_count`, and pending-review count.
4. Run extraction and confirm the next-step text changes.
5. Generate one MCQ.
6. Confirm the latest generated question and saved `pending_review` question cards show readable question text, MCQ options, correct answer, explanation, and source chunk chips.
7. Confirm no approve/reject/edit controls are shown.

### Results

The page now shows clearer document processing states, disabled-action reasons, improved empty states, compact source chunk badges, and separate MCQ/Essay detail sections.

### Caveats

The frontend remains display-only for generated questions. It does not perform quality validation, review approval, edit, retry, exam blueprint, or export behavior.

### Next Step

Phase 1I should integrate the pending-review handoff or review display flow when that ownership boundary is ready.

## Future Phase Template

## Phase X: <name>

* Date:
* Owner:
* Purpose:
* Files changed:
* APIs connected:
* Manual test:
* Results:
* Caveats:
* Next step:

Append future frontend phase updates to this report instead of creating scattered notes.
