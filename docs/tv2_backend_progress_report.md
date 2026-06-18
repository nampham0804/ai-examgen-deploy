# TV2 Backend Progress Report

This report consolidates TV2 backend work completed through Phase 1F. Future phases should be appended here instead of creating scattered notes.

## Project Goal

This project is an AI question generation and question bank system for higher education. The TV2 backend flow is:

```text
Course/LO -> upload document -> extract text -> chunk -> retrieve relevant chunks -> generate questions -> save pending_review -> trace Langfuse
```

The current MVP is intentionally scoped to uploaded materials. The system must not claim full course coverage when only representative lecture/material files are available.

## Current Backend Pipeline

1. A course and learning outcome are created through API endpoints.
2. A user uploads a PDF or DOCX for a course.
3. The backend stores document metadata and uploaded file path.
4. MarkItDown extracts text from the uploaded file.
5. Extracted text is saved on `documents.extracted_text`.
6. The text is split into `document_chunks`.
7. BM25 retrieves relevant chunks using LO description and optional topic.
8. AI question generation builds the LLM prompt from selected retrieved chunks only.
9. The backend validates LLM JSON and saves questions with `status = pending_review`.
10. Optional Langfuse tracing records the generation flow.

Important: AI generation does not send full `documents.extracted_text` to the LLM prompt. It uses selected `document_chunks` only.

## Environment Configuration

Expected env names are documented in `.env.example`. Real `.env` values are local only and must never be printed, committed, or pasted into chat.

LLM provider config:

```env
LLM_PROVIDER=minimax
LLM_TEMPERATURE=0.7

MINIMAX_API_KEY=...
MINIMAX_BASE_URL=https://api.tokenrouter.com/v1
MINIMAX_MODEL=MiniMax-M3

NINE_ROUTER_API_KEY=...
NINE_ROUTER_BASE_URL=http://localhost:20128/v1
NINE_ROUTER_MODEL=oc/qwen3.6-plus-free
```

Langfuse config:

```env
LANGFUSE_ENABLED=true
LANGFUSE_PUBLIC_KEY=...
LANGFUSE_SECRET_KEY=...
LANGFUSE_HOST=https://cloud.langfuse.com
LANGFUSE_ENV=development
LLM_LOG_FULL_PROMPT=false
LLM_LOG_RESPONSE=false
```

Notes:

- `LLM_PROVIDER` chooses which OpenAI-compatible provider config to use.
- `NINE_ROUTER_*` is preferred over env names that start with digits.
- Legacy 9Router names are supported as fallback where implemented.
- Full prompt/response logging should be enabled only in development.

## Current API Endpoints

### Courses

`GET /api/v1/courses`

- Purpose: list courses.
- Request fields: none.
- Response: course list in `{ "data": ..., "message": "Courses loaded" }`.

`POST /api/v1/courses`

- Purpose: create a course.
- Key fields: `code`, `name`, `description`.
- Response: created course.

### Learning Outcomes

`GET /api/v1/courses/{course_id}/learning-outcomes`

- Purpose: list LOs for a course.
- Key fields: `course_id` path param.
- Response: LO list.

`POST /api/v1/courses/{course_id}/learning-outcomes`

- Purpose: create an LO for a course.
- Key fields: `code`, `description`, `bloom_level`.
- Response: created LO.

### Documents

`POST /api/v1/documents/upload`

- Purpose: upload a course document.
- Request: multipart form with `file`, `course_id`, optional `document_type`.
- Supported file types: PDF and DOCX.
- Response summary: document id, course id, file name, file type, document type, file size, page count, status.

`GET /api/v1/documents/{document_id}`

- Purpose: inspect document metadata.
- Key fields: `document_id`.
- Response: document metadata.

`POST /api/v1/documents/{document_id}/extract`

- Purpose: extract text with MarkItDown and create chunks.
- Key fields: `document_id`.
- Response summary: `id`, `status`, `text_length`, `chunk_count`, `extraction_method`.

`GET /api/v1/documents/{document_id}/chunks`

- Purpose: list chunks for a document.
- Response: chunk metadata and text.

### Retrieval

`POST /api/v1/retrieval/chunks`

- Purpose: retrieve relevant chunks for later AI generation.
- Key fields: `document_id`, `learning_outcome_id`, optional `topic`, optional `top_k`.
- Response: ranked chunks with `score`, `keywords`, `text_preview`, and `match_reason`.

### AI Generation

`POST /api/v1/ai/generate-questions`

- Purpose: generate MCQ or essay questions from retrieved chunks only.
- Key fields: `document_id`, `learning_outcome_id`, `question_type`, `difficulty`, `num_questions`, optional `topic`, optional `top_k`, optional `diversity_mode`.
- Response: generated count, source chunk ids, warnings, and saved question records.

### Questions

`GET /api/v1/questions`

- Purpose: list saved generated questions for UI display/review.
- Optional filters: `course_id`, `document_id`, `learning_outcome_id`, `status`, `question_type`, `difficulty`.
- Pagination: `limit` default 20, max 100; `offset` default 0.
- Response: paginated `items`, `total`, `limit`, and `offset`.

`GET /api/v1/questions/{question_id}`

- Purpose: inspect one saved question record.
- Key fields: `question_id`.
- Response: full question record including options/answers/rubric, `source_chunk_ids`, and `status`.

## Current Retrieval Design

- Uses `rank-bm25`.
- No vector DB, embeddings, FAISS, pgvector, or LLM reranking.
- Chunk index text combines:
  - `title`
  - `section_path`
  - `keywords`
  - `text`
- If `topic` is provided:
  - topic is the primary retrieval signal.
  - LO description is secondary context.
  - topic terms receive higher weight than LO terms.
- If `topic` is missing:
  - LO description is the main query.
- `top_k` is configurable.
- `DEFAULT_TOP_K = 5`.
- `MAX_TOP_K = 10`.
- Returned chunks include `match_reason` for debugging, such as `bm25`, `topic_weighted`, `title_boost`, `section_path_boost`, `keyword_overlap`, and `technical_token_match`.

## Current LLM Design

- Uses a generic OpenAI-compatible chat completions provider.
- No hard-coded OpenAI provider or `OPENAI_API_KEY` dependency.
- Supported provider families:
  - MiniMax via `MINIMAX_*`.
  - Nine Router style via `NINE_ROUTER_*`.
- Provider request target:

```text
POST {base_url}/chat/completions
```

- Provider-backed smoke test succeeded with MiniMax-M3.
- Generated questions are saved with:
  - `status = pending_review`
  - `created_by_ai = true`
  - `document_id`
  - `learning_outcome_id`
  - `course_id`
  - `source_chunk_ids`
  - `generation_topic`
- MCQ validation expects:
  - 4 options A/B/C/D
  - one correct answer
  - explanation
  - source chunk ids, with fallback to selected chunks if missing.
- Essay validation expects:
  - no options
  - suggested answer
  - grading rubric
  - explanation/source note
  - source chunk ids, with fallback to selected chunks if missing.

## Current Langfuse Design

- Langfuse tracing is optional.
- Controlled by `LANGFUSE_ENABLED`.
- If disabled, generation behavior is unchanged.
- If enabled but keys are missing, generation does not fail.
- If Langfuse export fails, generation does not fail.
- Trace name: `ai_question_generation`.
- Generation observation name: `llm_generate_questions`.
- Logged metadata includes document id, LO id, topic, question type, difficulty, requested count, top k, source chunk ids, provider/model, latency, token usage when available, generated count, saved count, parse status, and sanitized error metadata.
- Prompt logging:
  - `LLM_LOG_FULL_PROMPT=false`: preview and metadata only.
  - `LLM_LOG_FULL_PROMPT=true`: full final prompt from selected chunks.
- Response logging:
  - controlled by `LLM_LOG_RESPONSE`.
- Full prompt/response logging is development-only because selected chunk text may contain uploaded course material.

## Smoke Test Summary

Successful manual/provider-backed tests have verified:

- explicit sample PDF upload through the API.
- MarkItDown extraction.
- chunk creation.
- BM25 retrieval from `document_chunks`.
- MiniMax-M3 provider-backed AI generation.
- generated questions saved as `pending_review`.
- Langfuse trace created in Langfuse Cloud.
- full `documents.extracted_text` was not sent to the LLM.
- only selected chunks were used in the prompt.
- API keys were not printed.

Smoke helper docs/scripts:

- `docs/tv2_phase1f_manual_test.md`
- `scripts/dev_smoke_phase1f_step_by_step.py`
- `scripts/dev_smoke_extract_chunk.py`

## Known Caveats

- OCR/scanned PDFs are not handled yet.
- Vector DB and embeddings are intentionally not used in the MVP.
- Retrieval is keyword/BM25-based and may need later improvement.
- Full prompt/response Langfuse logging is controlled by env config and should remain development-only.
- Frontend is not integrated yet.
- Question list/detail/review APIs still need to be implemented.
- Approval/rejection/edit workflow belongs to a later phase or another team member unless assigned.
- The current representative lecture files do not cover the whole course, so generated questions must remain scoped to uploaded materials and available chunks.

## Phase 1A: DB Foundation, Course And Learning Outcome APIs

- Purpose: establish backend persistence and minimal course/LO domain APIs.
- Problem solved: the scaffold lacked a DB foundation and selectable course/LO records for later document and generation flows.
- Implementation:
  - Added SQLAlchemy engine, `SessionLocal`, `Base`, `get_db`, and `init_db`.
  - Added ORM models for `Course`, `LearningOutcome`, `Document`, `DocumentChunk`, and `Question`.
  - Added basic course and LO schemas/routes.
- Technologies: SQLAlchemy, PostgreSQL-compatible models, SQLite-compatible local smoke tests.
- Files changed/added:
  - `src/repositories/database.py`
  - `src/models/course.py`
  - `src/models/learning_outcome.py`
  - `src/models/document.py`
  - `src/models/document_chunk.py`
  - `src/models/question.py`
  - `src/schemas/course.py`
  - `src/schemas/learning_outcome.py`
  - `src/schemas/document.py`
  - `src/schemas/document_chunk.py`
  - `src/schemas/question.py`
  - `src/api/routes/courses.py`
  - `src/api/router.py`
  - `src/main.py`
- Endpoints:
  - `GET /api/v1/courses`
  - `POST /api/v1/courses`
  - `GET /api/v1/courses/{course_id}/learning-outcomes`
  - `POST /api/v1/courses/{course_id}/learning-outcomes`
- Data/tables:
  - `courses`
  - `learning_outcomes`
  - `documents`
  - `document_chunks`
  - `questions`
- Design decisions:
  - kept enum values as strings.
  - used `snake_case` fields.
  - kept response envelope format.
  - added `init_db` because Alembic was not configured.
- Verification:
  - import app check.
  - temporary SQLite smoke checks.
  - existing tests passed.
- Results:
  - backend can create/select courses and LOs.
- Limitations:
  - no migrations yet.
  - no list/detail question APIs yet.
- Next recommended task:
  - add document upload API.

## Phase 1B: Document Upload API

- Purpose: allow users to upload learning materials for a course.
- Problem solved: no way to store document metadata or uploaded files before extraction.
- Implementation:
  - Added `POST /api/v1/documents/upload`.
  - Added `GET /api/v1/documents/{document_id}`.
  - Validated course existence, file type, file size, and PDF page count.
  - Saved file under `uploads/` with UUID stored file name.
- Technologies/dependencies:
  - FastAPI multipart upload.
  - PyMuPDF only for PDF page count metadata.
- Files changed/added:
  - `src/api/routes/documents.py`
  - `src/services/document_service.py`
  - `src/repositories/document_repository.py`
  - `src/schemas/document.py`
  - `src/api/router.py`
  - `requirements.txt`
- Endpoints:
  - `POST /api/v1/documents/upload`
  - `GET /api/v1/documents/{document_id}`
- Data/tables:
  - `documents`
- Design decisions:
  - supported PDF/DOCX only for MVP.
  - max file size: 15 MB.
  - PDF page count must be less than 400 when readable.
  - `documents.error_message` is the error field.
  - no extraction during upload.
- Verification:
  - upload smoke with temporary SQLite.
  - confirmed no chunks created at upload.
- Results:
  - upload stores document metadata with `status = uploaded`.
- Limitations:
  - no OCR or extraction in this phase.
- Next recommended task:
  - extract text and chunk uploaded documents.

## Phase 1C: MarkItDown Extraction And Chunk Creation

- Purpose: convert uploaded PDFs/DOCX files into text and reusable chunks.
- Problem solved: generation needs scoped source text rather than raw uploaded files.
- Implementation:
  - Added extract endpoint.
  - Set document status to `processing`, then `processed` or `failed`.
  - Saved `documents.extracted_text`, `text_length`, `chunk_count`, and `error_message`.
  - Deleted old chunks and recreated them on re-extraction.
- Technologies/dependencies:
  - MarkItDown for PDF/DOCX extraction.
  - SQLAlchemy for chunk persistence.
- Files changed/added:
  - `src/services/extraction_service.py`
  - `src/services/chunking_service.py`
  - `src/repositories/document_chunk_repository.py`
  - `src/api/routes/documents.py`
  - `src/schemas/document_chunk.py`
  - `requirements.txt`
- Endpoints:
  - `POST /api/v1/documents/{document_id}/extract`
  - `GET /api/v1/documents/{document_id}/chunks`
- Data/tables:
  - `documents`
  - `document_chunks`
- Design decisions:
  - MarkItDown is the main extraction tool.
  - PyMuPDF remains upload-time page count only.
  - chunk target is around 700-900 words/tokens.
  - overlap is around 100-120 words/tokens.
  - page start/end are null when unavailable.
- Verification:
  - generated DOCX/PDF smoke tests.
  - real explicit PDF smoke test.
- Results:
  - uploaded documents can become processed documents with chunks.
- Limitations:
  - no OCR for scanned PDFs.
  - section/page metadata is best effort.
- Next recommended task:
  - improve chunk metadata and keywords.

## Phase 1C.1: Improved Chunk Metadata And Keyword Extraction

- Purpose: improve chunk titles, section paths, and keywords for real slide PDFs.
- Problem solved: initial chunks often had null titles/section paths and generic keywords.
- Implementation:
  - Improved generic heading inference.
  - Detected numbered headings, chapter/lesson-like headings, title-like lines, repeated slide titles, all-caps/title-case lines.
  - Added fallback title from first meaningful line/sentence.
  - Improved deterministic keyword extraction with Vietnamese/English stopword removal, n-grams, technical token preservation, and title/section boosts.
- Technologies/dependencies:
  - pure Python deterministic rules.
  - no LLM, embeddings, KeyBERT, or heavy dependency.
- Files changed/added:
  - `src/services/chunking_service.py`
- Endpoints:
  - no new endpoint.
- Data/tables:
  - `document_chunks.title`
  - `document_chunks.section_path`
  - `document_chunks.keywords`
- Design decisions:
  - no hard-coded course-specific headings.
  - deterministic lightweight extraction.
- Verification:
  - ruff on changed file.
  - dev smoke with explicit PDF path.
  - inspected debug `chunks.json`.
- Results:
  - better title/section/keyword metadata for retrieval.
- Limitations:
  - still heuristic, not semantic.
- Next recommended task:
  - implement retrieval over chunks.

## Phase 1D: BM25-Based Retrieval Over Document Chunks

- Purpose: retrieve relevant chunks for a document and LO.
- Problem solved: question generation needs selected context, not full document text.
- Implementation:
  - Added retrieval service using BM25.
  - Built query from LO description, optional topic, and optional extra keywords.
  - Combined chunk title, section path, keywords, and text for scoring.
  - Added deterministic boosts and diversity selection.
- Technologies/dependencies:
  - `rank-bm25`.
- Files changed/added:
  - `src/services/retrieval_service.py`
  - `src/api/routes/retrieval.py`
  - `src/schemas/retrieval.py`
  - `src/repositories/learning_outcome_repository.py`
  - `src/api/router.py`
  - `requirements.txt`
- Endpoints:
  - `POST /api/v1/retrieval/chunks`
- Data/tables:
  - `documents`
  - `learning_outcomes`
  - `document_chunks`
- Design decisions:
  - no vector DB in MVP.
  - BM25 plus metadata boosts.
  - clear errors for missing document, unprocessed document, missing LO, or no chunks.
- Verification:
  - ruff checks.
  - existing tests.
  - temporary SQLite smoke with explicit uploaded PDF.
- Results:
  - relevant chunks returned with scores and match reasons.
- Limitations:
  - lexical retrieval can miss semantic matches.
- Next recommended task:
  - calibrate topic-specific retrieval.

## Phase 1D.1: Retrieval Calibration With Topic-First Weighting

- Purpose: prevent long LO descriptions from dominating topic-specific retrieval.
- Problem solved: topic terms could be diluted by LO terms.
- Implementation:
  - Added internal query context.
  - Topic terms weighted higher when topic exists.
  - LO description kept as secondary context.
  - Metadata boosts use the primary signal.
- Technologies/dependencies:
  - existing `rank-bm25`.
- Files changed/added:
  - `src/services/retrieval_service.py`
- Endpoints:
  - no API contract change.
- Data/tables:
  - `document_chunks`
  - `learning_outcomes`
- Design decisions:
  - no hard-coded topic examples in implementation.
  - kept `DEFAULT_TOP_K = 5`, `MAX_TOP_K = 10`.
  - added `topic_weighted` in `match_reason`.
- Verification:
  - ruff checks.
  - existing tests.
  - smoke retrieval with several generic topics from uploaded document.
- Results:
  - exact topic matches in title/section rank higher.
- Limitations:
  - still lexical and metadata dependent.
- Next recommended task:
  - implement AI generation from retrieved chunks.

## Phase 1E: AI Question Generation From Retrieved Chunks

- Purpose: generate MCQ/essay questions using selected chunks.
- Problem solved: backend could retrieve context but not generate/save questions.
- Implementation:
  - Added AI generation endpoint.
  - Used retrieval service to select chunks.
  - Built prompt from selected chunks only.
  - Added generic OpenAI-compatible provider client.
  - Added parser/validator for MCQ and essay JSON.
  - Saved questions to `questions` table.
- Technologies/dependencies:
  - FastAPI.
  - HTTPX.
  - Pydantic.
  - SQLAlchemy.
- Files changed/added:
  - `src/api/routes/ai_generation.py`
  - `src/services/ai_generation_service.py`
  - `src/ai/prompts/question_generation.py`
  - `src/ai/providers/llm_provider.py`
  - `src/ai/parsers/question_parser.py`
  - `src/repositories/question_repository.py`
  - `src/schemas/ai_generation.py`
  - `src/api/router.py`
  - `.env.example`
- Endpoints:
  - `POST /api/v1/ai/generate-questions`
- Data/tables:
  - `questions`
  - `documents`
  - `document_chunks`
  - `courses`
  - `learning_outcomes`
- Design decisions:
  - no mock questions in backend.
  - no official OpenAI-only SDK.
  - no full `extracted_text` in prompts.
  - save generated records as `pending_review`.
- Verification:
  - missing `LLM_PROVIDER` smoke returns clear error.
  - missing selected provider key smoke returns clear error.
  - ruff and tests passed.
- Results:
  - backend can generate and save questions from retrieved chunks.
- Limitations:
  - review/list/edit APIs not yet implemented.
  - parser depends on valid model JSON output.
- Next recommended task:
  - run provider-backed smoke with real configured provider.

## Phase 1E.1: Provider-Backed MiniMax Smoke Test

- Purpose: verify real provider-backed generation end to end.
- Problem solved: confirmed that generic provider path works with MiniMax.
- Implementation:
  - Used `.env` MiniMax config without printing secrets.
  - Created temporary course/LO/document in SQLite smoke.
  - Uploaded explicit PDF, extracted/chunked, retrieved chunks, generated questions.
- Technologies/dependencies:
  - MiniMax-M3 through OpenAI-compatible endpoint.
  - FastAPI TestClient.
- Files changed/added:
  - no backend logic changes required for the smoke.
- Endpoints:
  - exercised existing endpoints from courses through AI generation.
- Data/tables:
  - all core pipeline tables.
- Design decisions:
  - no API keys printed.
  - no full prompt/response printed.
- Verification:
  - generated question count matched saved pending review count.
  - `source_chunk_ids` matched retrieved chunks.
  - confirmed full `extracted_text` not in prompt.
- Results:
  - MiniMax-M3 generation succeeded.
- Limitations:
  - requires real configured provider and outbound network.
- Next recommended task:
  - add optional Langfuse tracing.

## Phase 1F: Optional Langfuse Tracing

- Purpose: observe AI generation calls in Langfuse without changing generation behavior.
- Problem solved: generation was working but not traceable for debugging/monitoring.
- Implementation:
  - Added optional Langfuse tracer wrapper.
  - Added provider metadata and token usage capture from OpenAI-compatible responses.
  - Wrapped AI generation flow with trace/generation observations.
  - Added prompt/response logging controls.
- Technologies/dependencies:
  - `langfuse`.
- Files changed/added:
  - `src/observability/langfuse_tracer.py`
  - `src/observability/__init__.py`
  - `src/services/ai_generation_service.py`
  - `src/ai/providers/llm_provider.py`
  - `requirements.txt`
  - `.env.example`
- Endpoints:
  - no new endpoint.
  - tracing applies to `POST /api/v1/ai/generate-questions`.
- Data/tables:
  - no DB schema change.
- Design decisions:
  - tracing disabled by default unless `LANGFUSE_ENABLED=true`.
  - tracing errors never fail generation.
  - missing Langfuse keys produce sanitized warning only.
  - full prompt logging is controlled by env.
- Verification:
  - ruff and tests passed.
  - disabled tracing smoke generated normally.
  - missing Langfuse keys smoke generated normally with warning.
  - configured Langfuse Cloud smoke created a queryable trace.
- Results:
  - Langfuse trace `ai_question_generation` and generation `llm_generate_questions` are created when configured.
- Limitations:
  - trace ingestion may require a delay before it appears in Langfuse Cloud.
  - full prompt/response logging is development-only.
- Next recommended task:
  - add question list/detail APIs for generated pending review records.

## Phase 1G: Generated Questions List And Detail API

- Date: 2026-06-18
- Owner: TV2 backend
- Purpose: expose saved generated questions so the UI can list and inspect pending review records after generation.
- Problem solved: questions were saved to the `questions` table but had no read API for UI/API consumers.
- Implementation:
  - Added repository helpers to get one question and list filtered/paginated questions.
  - Added question list/detail response schemas.
  - Added `questions` API router and registered it in the API router.
  - Added manual validation for enum-like filters to preserve project error shape.
- Technologies:
  - FastAPI
  - SQLAlchemy
  - Pydantic
- Files changed:
  - `src/api/routes/questions.py`
  - `src/repositories/question_repository.py`
  - `src/schemas/question.py`
  - `src/api/router.py`
  - `docs/tv2_backend_progress_report.md`
- Endpoints:
  - `GET /api/v1/questions`
  - `GET /api/v1/questions/{question_id}`
- Tests:
  - ruff check on changed files.
  - `pytest tests -q`.
  - manual smoke with generated pending review question and list/detail endpoint calls.
- Results:
  - generated questions can be listed with filters and pagination.
  - one generated question can be inspected by id.
  - detail includes `source_chunk_ids` and `status = pending_review`.
- Caveats:
  - approve/reject/edit workflow is not implemented in this phase.
  - no frontend integration yet.
- Next step:
  - integrate the existing frontend AI Generation page with upload/extract/retrieve/generate/list APIs.

## Phase 1G.1: Questions API Audit And Pagination Error Shape Fix

- Date: 2026-06-18
- Owner: TV2 backend
- Purpose: audit generated question list/detail behavior before frontend integration.
- Problem solved: non-numeric `limit` and `offset` query values returned FastAPI's default 422 response instead of the project error shape.
- Implementation:
  - Changed `GET /api/v1/questions` to parse `limit` and `offset` internally as strings.
  - Returned `{ "error": "Invalid request", "detail": "..." }` for malformed pagination values.
  - Kept numeric limit/offset validation and all filters unchanged.
- Technologies:
  - FastAPI
  - SQLAlchemy
  - Pydantic
- Files changed:
  - `src/api/routes/questions.py`
  - `docs/tv2_backend_progress_report.md`
- Endpoints:
  - `GET /api/v1/questions`
- Tests:
  - audited pagination defaults, max limit, total count, invalid enum filters, invalid pagination values, MCQ serialization, essay null fields, detail success, and detail not found.
  - ruff check on changed files.
  - `pytest tests -q`.
- Results:
  - invalid `limit=abc` and `offset=abc` now return the project error shape.
  - `source_chunk_ids` serializes as a JSON list.
  - `created_at` serializes as a JSON string.
  - MCQ and essay records both serialize correctly.
- Caveats:
  - FastAPI may still return default validation errors for non-integer id filters such as `course_id=abc`; this audit focused on the required Phase 1G filters and pagination behavior.
- Next step:
  - proceed to frontend integration for question listing/detail display.

## Next Task Plan

Recommended next work:

1. Phase 1H: frontend integration for the existing AI Generation page.
2. Phase 1I: pending_review display and handoff to review/approve workflow.
3. Cleanup before merge:
   - run focused ruff checks on changed files.
   - run `pytest tests -q`.
   - verify no `.env` or real keys are committed.
   - verify no data folder pre-ingestion assumptions.

## Future Phase Template

## Phase X: <name>

- Date:
- Owner:
- Purpose:
- Problem solved:
- Implementation:
- Technologies:
- Files changed:
- Endpoints:
- Tests:
- Results:
- Caveats:
- Next step:

Whenever a future phase is completed, append a new section to this same report instead of creating scattered notes.
