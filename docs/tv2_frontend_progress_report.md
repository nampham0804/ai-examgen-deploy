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
