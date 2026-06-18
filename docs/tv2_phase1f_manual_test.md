# TV2 Phase 1F Manual Test Guide

This guide verifies the upload -> extract/chunk -> retrieve -> AI generate -> save pending review -> Langfuse trace flow.

It does not require scanning any folder. Always pass one explicit PDF or DOCX file path.

## 0. Environment

From the repository root, check `.env` has the provider and Langfuse values.

Required LLM variables:

```env
LLM_PROVIDER=minimax
LLM_TEMPERATURE=0.7

MINIMAX_API_KEY=...
MINIMAX_BASE_URL=https://api.tokenrouter.com/v1
MINIMAX_MODEL=MiniMax-M3
```

Or, for 9Router:

```env
LLM_PROVIDER=nine_router
NINE_ROUTER_API_KEY=...
NINE_ROUTER_BASE_URL=http://localhost:20128/v1
NINE_ROUTER_MODEL=oc/qwen3.6-plus-free
```

Required Langfuse variables:

```env
LANGFUSE_ENABLED=true
LANGFUSE_ENV=development
LANGFUSE_PUBLIC_KEY=...
LANGFUSE_SECRET_KEY=...
LANGFUSE_HOST=https://cloud.langfuse.com
LLM_LOG_FULL_PROMPT=false
LLM_LOG_RESPONSE=false
```

To see the full prompt and full LLM response in Langfuse, set:

```env
LLM_LOG_FULL_PROMPT=true
LLM_LOG_RESPONSE=true
```

Use full prompt/response logging only in development. The prompt contains selected chunk text from uploaded learning materials.

Never print or paste API keys into chat, terminal logs, or screenshots.

## 1. Run The Step-By-Step Script

Use one explicit sample file path. Example:

```powershell
.\venv\Scripts\python.exe scripts\dev_smoke_phase1f_step_by_step.py `
  --file "D:\Vin\C2-App-141\data\raw\CSDL\mock_syllabus\C1_ Giới Thiệu.pdf" `
  --topic "hệ quản trị cơ sở dữ liệu DBMS" `
  --num-questions 1 `
  --pause
```

Without pauses:

```powershell
.\venv\Scripts\python.exe scripts\dev_smoke_phase1f_step_by_step.py `
  --file "D:\path\to\your\sample.pdf" `
  --topic "your topic" `
  --num-questions 2
```

The script uses a temporary SQLite database and deletes temporary uploaded files afterward. It loads `.env`, but it never prints API keys.

## 2. Expected Output By Phase

### 1. Create Course

Expected output:

```text
course_id: 1
```

Observe: a temporary course exists in the script's SQLite DB.

### 2. Create Learning Outcome

Expected output:

```text
learning_outcome_id: 1
```

Observe: the LO belongs to the created course.

### 3. Upload Document

Expected output:

```text
document_id: 1
file_name: sample.pdf
file_size_bytes: 12345
page_count: 20
status: uploaded
```

Observe: no extraction or chunking has happened yet.

### 4. Extract And Chunk

Expected output:

```text
status: processed
text_length: 12345
chunk_count: 5
```

Observe: `document_chunks` are now created. The script does not print full extracted text.

### 5. Retrieve Chunks

Expected output:

```text
source_chunk_ids: [8, 9, 5]
- chunk_index=7 score=... title='...' reasons=[...]
```

Observe: retrieval is based on the selected document, LO, and optional topic.

### 6. Generate Questions

Expected output:

```text
generated: 1
source_chunk_ids: [8, 9, 5]
warnings: []
- question_id=1 status=pending_review preview=...
```

Observe: generated questions are based on selected chunks only.

### 7. Check Saved Pending Review Questions

Expected output:

```text
pending_review_count: 1
```

Observe: generated questions are saved with `status = pending_review`.

### 8. Check Langfuse Cloud

Open Langfuse Cloud and search:

```text
ai_question_generation
```

Expected trace:

```text
trace name: ai_question_generation
generation name: llm_generate_questions
metadata: document_id, learning_outcome_id, topic, source_chunk_ids, llm_provider, llm_model
```

If `LLM_LOG_FULL_PROMPT=false`, the trace shows prompt preview only.

If `LLM_LOG_FULL_PROMPT=true`, the trace shows the final prompt built from selected chunks. It must not include the full `documents.extracted_text`.

## 3. Optional Backend Server / Swagger Path

Start the backend:

```powershell
.\venv\Scripts\python.exe -m uvicorn src.main:app --reload
```

Open Swagger:

```text
http://localhost:8000/docs
```

Call these endpoints manually:

1. `POST /api/v1/courses`
2. `POST /api/v1/courses/{course_id}/learning-outcomes`
3. `POST /api/v1/documents/upload`
4. `POST /api/v1/documents/{document_id}/extract`
5. `POST /api/v1/retrieval/chunks`
6. `POST /api/v1/ai/generate-questions`
7. Check Langfuse Cloud for `ai_question_generation`

Keep responses/screenshots sanitized. Do not show API keys or full uploaded document text.
