# Current Working Features

The backend currently exposes a FastAPI app mounted under `/api` from `src/main.py`. The active router includes course, learning outcome, document, retrieval, AI generation, question, analytics, blueprint, and exam routes.

Working backend capabilities visible in the current code:

- Course APIs: list, create, detail, update, delete courses.
- Learning Outcome APIs: list/create LOs under a course, update/delete LOs.
- Document upload API for PDF/DOCX with course validation, document type validation, 15 MB size limit, PDF page count limit, UUID stored filename, and `uploaded` status.
- Document detail API by `document_id`.
- Document extraction/chunking API using MarkItDown for text extraction and deterministic chunking into `document_chunks`.
- Document chunks API for reading chunk metadata/text.
- BM25 chunk retrieval API over `document_chunks`.
- AI question generation API using selected retrieved chunks only.
- Generic OpenAI-compatible LLM provider support with provider config from environment variables.
- Optional Langfuse tracing for AI generation.
- Question quality validation guard before saving AI-generated questions.
- Question APIs for list/detail/create/update/approve/reject.
- Frontend AI Generation page wired to course/LO loading, upload, extract/chunk, generate, and pending-review question listing.

Working frontend capabilities visible in the current code:

- Existing route `/ai-generation` renders `frontend/src/app/pages/AIGeneration.tsx`.
- AI Generation page loads courses and learning outcomes.
- User can upload a PDF/DOCX, trigger extraction, generate MCQ/essay questions, and view latest generated plus saved `pending_review` questions.
- UI shows document processing summary, status, text length, chunk count, pending count, disabled-action reasons, question details, and source chunk chips.

# Current AI Generation Flow

1. Frontend loads courses via `listCourses()` from `frontend/src/app/api/tv2.ts`.
2. When a course is selected, frontend loads its learning outcomes via `listLearningOutcomes(courseId)`.
3. User selects a local PDF/DOCX file and uploads it through `POST /api/documents/upload`.
4. Backend validates upload constraints in `src/services/document_service.py`, stores the file under `uploads/`, and creates a `documents` row with `status = uploaded`.
5. User clicks Extract. Frontend calls `POST /api/documents/{document_id}/extract`.
6. Backend loads the uploaded file path, sets `status = processing`, extracts text using MarkItDown, chunks text through `src/services/chunking_service.py`, deletes old chunks for idempotent re-extraction, writes new `document_chunks`, and sets `status = processed`.
7. User configures topic, question type, difficulty, number of questions, and `top_k`.
8. Frontend calls `POST /api/ai/generate-questions`.
9. Backend validates document and LO ownership, then calls `retrieve_relevant_chunks()` in `src/services/retrieval_service.py`.
10. Retrieval uses BM25 over chunk `title`, `section_path`, `keywords`, and `text`. If a topic exists, topic terms are primary and LO description is secondary.
11. AI prompt is built by `src/ai/prompts/question_generation.py` from selected chunks only. It does not include the full `documents.extracted_text`.
12. LLM response is sent through the generic provider in `src/ai/providers/llm_provider.py`.
13. Parser in `src/ai/parsers/question_parser.py` extracts safe JSON, handles `<think>...</think>`, normalizes MCQ/essay fields, and returns parse warnings for individual malformed questions where possible.
14. Quality guard in `src/services/question_quality_service.py` validates MCQ/essay/source/duplicate rules.
15. Valid questions are saved through `create_questions()` with `status = pending_review`, `created_by_ai = true`, `document_id`, `learning_outcome_id`, `course_id`, and `source_chunk_ids`.
16. Frontend displays questions returned by generation and then calls `GET /api/questions?document_id=<id>&status=pending_review` to display saved pending-review questions.

Important route prefix note: the current backend mounts routes at `/api`, not `/api/v1`, because `src/main.py` uses `app.include_router(router, prefix="/api")`. The TV2 frontend helper currently also targets `/api`, so it matches the current code.

# Current Duplicate Prevention Logic

Duplicate prevention currently happens only in the AI generation save path, not as a database uniqueness constraint.

Implementation:

- `src/services/ai_generation_service.py` loads existing questions for the same `course_id` and `document_id` using `list_questions_for_quality_check()`.
- `src/services/question_quality_service.py` compares each parsed/generated question against:
  - existing questions in the same course/document.
  - already accepted questions in the same current LLM batch.
- Text is normalized by lowercasing and tokenizing with regex.
- Exact normalized matches are rejected.
- Near-duplicates are rejected only if both thresholds pass:
  - `SequenceMatcher` ratio >= `0.94`.
  - token Jaccard similarity >= `0.85`.
- This is intentionally conservative and lightweight. It does not use embeddings, vector search, FAISS, pgvector, or LLM reranking.
- If some questions are duplicates/malformed and others are valid, valid questions are saved and warnings are returned.
- If all questions are rejected, generation returns an error and saves nothing.

Limitations:

- Manual `POST /api/questions` creation does not appear to use the same duplicate guard.
- Duplicate checking is scoped to the same `course_id` and `document_id`; it does not currently check across all documents in a course.
- There is no DB-level unique index for semantic or normalized duplicate prevention.

# Relevant Backend Files

Core app/router:

- `src/main.py`: FastAPI app, CORS, startup `init_db()`, global error formatting, mounts API router under `/api`.
- `src/api/router.py`: includes document, retrieval, AI generation, questions, courses, learning outcomes, analytics, blueprints, exams.
- `src/repositories/database.py`: SQLAlchemy engine/session/Base/init_db.

Document APIs and processing:

- `src/api/routes/documents.py`: upload, detail, extract, chunks endpoints.
- `src/services/document_service.py`: upload validation, file storage, PDF page count metadata.
- `src/services/extraction_service.py`: MarkItDown extraction, document status transitions, re-extraction behavior.
- `src/services/chunking_service.py`: deterministic section-aware/fallback chunking, title/section inference, keywords.
- `src/repositories/document_repository.py`: `get_document()`, `create_document()`.
- `src/repositories/document_chunk_repository.py`: list/delete/create chunks.
- `src/models/document.py`: `documents` table.
- `src/models/document_chunk.py`: `document_chunks` table.
- `src/schemas/document.py`: document read/upload/extract response schemas.
- `src/schemas/document_chunk.py`: chunk response schema.

Retrieval:

- `src/api/routes/retrieval.py`: debug retrieval endpoint.
- `src/services/retrieval_service.py`: BM25 retrieval, topic-first weighting, metadata boosts, diversity selection.
- `src/schemas/retrieval.py`: retrieval request/response schemas.

AI generation:

- `src/api/routes/ai_generation.py`: `POST /ai/generate-questions`.
- `src/services/ai_generation_service.py`: generation orchestration, retrieval, prompt build, provider call, parse, validation, save, tracing.
- `src/ai/prompts/question_generation.py`: prompt construction from selected chunks only.
- `src/ai/providers/llm_provider.py`: OpenAI-compatible provider config, timeout/retry/fallback behavior.
- `src/ai/parsers/question_parser.py`: safe JSON extraction and question parsing.
- `src/services/question_quality_service.py`: MCQ/essay/source/duplicate quality validation.
- `src/observability/langfuse_tracer.py`: optional Langfuse tracing.
- `src/schemas/ai_generation.py`: generation request/response schemas.

Questions:

- `src/api/routes/questions.py`: list/detail/create/update/approve/reject question endpoints.
- `src/services/question_service.py`: service layer for manual question APIs.
- `src/repositories/question_repository.py`: batch create, list/filter/page, quality-check list, update, approve, reject.
- `src/models/question.py`: `questions` table.
- `src/schemas/question.py`: question create/update/read/list response schemas.

Courses and LOs:

- `src/api/routes/courses.py`
- `src/api/routes/learning_outcomes.py`
- `src/services/course_service.py`
- `src/services/learning_outcome_service.py`
- `src/repositories/course_repository.py`
- `src/repositories/learning_outcome_repository.py`
- `src/models/course.py`
- `src/models/learning_outcome.py`
- `src/schemas/course.py`
- `src/schemas/learning_outcome.py`

# Relevant Frontend Files

AI Generation page:

- `frontend/src/app/pages/AIGeneration.tsx`: current AI Generation UI and state machine.
- `frontend/src/app/api/tv2.ts`: TV2-specific fetch helper/types for courses, LOs, upload, extract, generate, list questions.
- `frontend/src/app/routes.tsx`: route `/ai-generation` maps to `AIGeneration`.
- `frontend/src/app/components/Layout.tsx`: global layout/sidebar route shell, not directly part of TV2 flow.
- `frontend/src/app/context/AppContext.tsx`: translations used by the page.

General frontend API infrastructure:

- `frontend/src/api/client.ts`: shared axios client used by other frontend modules.
- `frontend/src/api/courses.ts`
- `frontend/src/api/learningOutcomes.ts`
- `frontend/src/api/questions.ts`

Potential reuse-related frontend files:

- `frontend/src/app/pages/AIGeneration.tsx`: would need UI state for selecting an existing document.
- `frontend/src/app/api/tv2.ts`: would need document list/detail helper types/functions.

# Risks/Constraints

- Do not scan or pre-ingest `data/raw` folders. Current upload flow only processes a file after user upload.
- AI generation must remain scoped to selected uploaded/processed document chunks; it must not assume full course coverage.
- Prompt must continue using selected retrieved chunks only, not full `documents.extracted_text`.
- No vector DB, embeddings, FAISS, pgvector, or LLM reranking are currently used.
- Upload currently supports PDF/DOCX only.
- Extraction uses MarkItDown; scanned PDFs/OCR are not handled.
- Page count validation uses PyMuPDF only for PDF metadata during upload.
- `documents.extracted_text` is stored, but retrieval/generation use `document_chunks`.
- Document re-extraction deletes old chunks and recreates them.
- There is currently no `GET /api/documents?course_id=...` list endpoint, so frontend cannot select/reuse existing uploaded documents without a new backend API.
- Frontend currently stores only one `documentUpload`/`documentExtract` state; switching to reuse will require distinguishing uploaded-this-session documents from selected-existing documents.
- Question duplicate prevention exists for AI generation only and is scoped to same course/document.
- Manual question create/update path has separate schema validation but does not appear to run the AI duplicate guard.
- Question APIs now include approve/reject/update routes; ownership with TV1/review workflow should be clarified before exposing these controls in TV2 UI.
- Existing report/history docs mention earlier `/api/v1` paths, but current code uses `/api`.

# Proposed Integration Points for Reusing Existing Documents

Backend integration points:

- Add a document listing repository method in `src/repositories/document_repository.py`, likely filtered by `course_id`, `status`, `document_type`, pagination, and maybe `uploaded_by`.
- Add a document list schema in `src/schemas/document.py`, or reuse/extend `DocumentRead` with a lighter list item shape.
- Add `GET /api/documents` in `src/api/routes/documents.py` with filters:
  - `course_id`
  - `status`
  - `document_type`
  - `limit`
  - `offset`
- Keep `GET /api/documents/{document_id}` for metadata refresh.
- Reuse existing `POST /api/documents/{document_id}/extract` for existing documents that are `uploaded` or `failed`.
- Reuse existing `GET /api/documents/{document_id}/chunks` for inspection/debug.
- Reuse existing `POST /api/ai/generate-questions`; it already accepts `document_id` and works for any processed document.
- Retrieval service already filters by `document_id` and validates document/LO course ownership, so it is compatible with document reuse.

Frontend integration points:

- Extend `frontend/src/app/api/tv2.ts` with:
  - `listDocuments({ course_id, status?, document_type?, limit?, offset? })`
  - optionally `getDocument(documentId)`
- Extend `frontend/src/app/pages/AIGeneration.tsx` with a small "Use existing document" section:
  - load documents after course selection.
  - show file name, type, status, page count, text length, chunk count, created date.
  - allow selecting a processed document and skip upload/extract.
  - allow extracting selected uploaded/failed document if it has no chunks.
  - keep generation blocked unless selected document has `status = processed` and `chunk_count > 0`.
- Keep upload path intact for new documents.
- When course changes, clear selected document/generated/pending state as the page already does for upload state.
- After selecting an existing processed document, call `GET /api/questions?document_id=<id>&status=pending_review` to show previous generated pending questions.

Minimal implementation order for document reuse:

1. Backend: add list documents repository/schema/route.
2. Backend: add tests for filtering by course/status and response shape.
3. Frontend helper: add `listDocuments`.
4. AI Generation page: add existing document selector with minimal state changes.
5. Verify:
   - select course.
   - see existing processed documents.
   - select one.
   - generate from selected document without re-upload.
   - pending-review questions load for that document.
