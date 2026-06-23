from __future__ import annotations

import argparse
import os
import shutil
import sys
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from fastapi.testclient import TestClient
from sqlalchemy import func, select

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Step-by-step Phase 1F smoke test.")
    parser.add_argument("--file", required=True, help="Explicit PDF or DOCX file path to upload.")
    parser.add_argument("--topic", default=None, help="Optional topic for retrieval/generation.")
    parser.add_argument("--num-questions", type=int, default=1, help="Number of questions to generate.")
    parser.add_argument("--pause", action="store_true", help="Pause after each phase for manual observation.")
    return parser.parse_args()


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    args = parse_args()
    input_path = Path(args.file).expanduser().resolve()
    if not input_path.is_file():
        print(f"File not found: {input_path}", file=sys.stderr)
        return 2

    load_dotenv(REPO_ROOT / ".env", override=False)
    _print_env_summary()

    temp_dir = Path(tempfile.mkdtemp(prefix="phase1f_smoke_"))
    db_path = temp_dir / "phase1f.db"
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path.as_posix()}"
    os.environ.setdefault("APP_ENV", "test")

    from src.main import app
    from src.models.question import Question
    from src.repositories.database import SessionLocal, engine

    uploaded_file_path: Path | None = None
    try:
        with TestClient(app) as client:
            _phase("1. Create course", args.pause)
            course_res = client.post(
                "/api/v1/courses",
                json={
                    "code": "PHASE1F-MANUAL",
                    "name": "Phase 1F Manual Test Course",
                    "description": "Temporary course for manual Phase 1F smoke test.",
                },
            )
            _raise_for_status(course_res, "create course")
            course_id = course_res.json()["data"]["id"]
            print(f"course_id: {course_id}")

            _phase("2. Create learning outcome", args.pause)
            lo_res = client.post(
                f"/api/v1/courses/{course_id}/learning-outcomes",
                json={
                    "code": "LO-PHASE1F",
                    "description": "Explain database concepts, database management systems, and data independence.",
                    "bloom_level": "understand",
                },
            )
            _raise_for_status(lo_res, "create learning outcome")
            learning_outcome_id = lo_res.json()["data"]["id"]
            print(f"learning_outcome_id: {learning_outcome_id}")

            _phase("3. Upload document", args.pause)
            with input_path.open("rb") as file_handle:
                upload_res = client.post(
                    "/api/v1/documents/upload",
                    data={"course_id": str(course_id), "document_type": "lecture"},
                    files={"file": (input_path.name, file_handle, _mime_type(input_path))},
                )
            _raise_for_status(upload_res, "upload document")
            upload_data = upload_res.json()["data"]
            document_id = upload_data["id"]
            print(f"document_id: {document_id}")
            print(f"file_name: {upload_data['file_name']}")
            print(f"file_size_bytes: {upload_data['file_size_bytes']}")
            print(f"page_count: {upload_data['page_count']}")
            print(f"status: {upload_data['status']}")

            _phase("4. Extract and chunk", args.pause)
            extract_res = client.post(f"/api/v1/documents/{document_id}/extract")
            _raise_for_status(extract_res, "extract and chunk")
            extract_data = extract_res.json()["data"]
            print(f"status: {extract_data['status']}")
            print(f"text_length: {extract_data['text_length']}")
            print(f"chunk_count: {extract_data['chunk_count']}")

            detail_res = client.get(f"/api/v1/documents/{document_id}")
            _raise_for_status(detail_res, "load document metadata")
            uploaded_file_path = Path(detail_res.json()["data"]["file_path"])

            _phase("5. Retrieve chunks", args.pause)
            retrieval_res = client.post(
                "/api/v1/retrieval/chunks",
                json={
                    "document_id": document_id,
                    "learning_outcome_id": learning_outcome_id,
                    "topic": args.topic,
                    "top_k": 3,
                },
            )
            _raise_for_status(retrieval_res, "retrieve chunks")
            retrieval_data = retrieval_res.json()["data"]
            source_chunk_ids = [chunk["chunk_id"] for chunk in retrieval_data["chunks"]]
            print(f"source_chunk_ids: {source_chunk_ids}")
            for chunk in retrieval_data["chunks"]:
                print(
                    f"- chunk_index={chunk['chunk_index']} score={chunk['score']} "
                    f"title={chunk['title']!r} reasons={chunk['match_reason']}"
                )

            _phase("6. Generate questions", args.pause)
            generation_res = client.post(
                "/api/v1/ai/generate-questions",
                json={
                    "document_id": document_id,
                    "learning_outcome_id": learning_outcome_id,
                    "question_type": "mcq",
                    "difficulty": "medium",
                    "num_questions": args.num_questions,
                    "topic": args.topic,
                    "top_k": 3,
                    "diversity_mode": True,
                },
            )
            _raise_for_status(generation_res, "generate questions")
            generation_data = generation_res.json()["data"]
            print(f"generated: {generation_data['generated']}")
            print(f"source_chunk_ids: {generation_data['source_chunk_ids']}")
            print(f"warnings: {generation_data['warnings']}")
            for question in generation_data["questions"]:
                print(
                    f"- question_id={question['id']} status={question['status']} "
                    f"preview={_preview(question['question_text'])}"
                )

            _phase("7. Check saved pending_review questions", args.pause)
            with SessionLocal() as db:
                pending_count = db.scalar(
                    select(func.count())
                    .select_from(Question)
                    .where(
                        Question.document_id == document_id,
                        Question.learning_outcome_id == learning_outcome_id,
                        Question.status == "pending_review",
                    )
                )
            print(f"pending_review_count: {pending_count}")

            _phase("8. Check Langfuse Cloud", args.pause)
            print("Open Langfuse Cloud and search trace name: ai_question_generation")
            print("Generation observation name: llm_generate_questions")
            print("If LANGFUSE_ENABLED=false, no trace is expected.")
            print("If LLM_LOG_FULL_PROMPT=false, Langfuse shows prompt preview only.")
    finally:
        engine.dispose()
        if uploaded_file_path and uploaded_file_path.exists():
            uploaded_file_path.unlink()
        shutil.rmtree(temp_dir, ignore_errors=True)

    return 0


def _phase(title: str, pause: bool) -> None:
    print("")
    print("=" * 72)
    print(title)
    print("=" * 72)
    if pause:
        input("Press Enter to continue...")


def _raise_for_status(response, phase: str) -> None:
    if response.status_code < 400:
        return

    print(f"{phase} failed")
    print(f"status_code: {response.status_code}")
    try:
        error_body = response.json()
    except ValueError:
        error_body = {"error": "Non-JSON response", "detail": _preview(response.text)}
    print(f"error: {error_body.get('error')}")
    print(f"detail: {error_body.get('detail')}")
    response.raise_for_status()


def _print_env_summary() -> None:
    provider = os.getenv("LLM_PROVIDER")
    minimax_ready = all(os.getenv(key) for key in ("MINIMAX_API_KEY", "MINIMAX_BASE_URL", "MINIMAX_MODEL"))
    nine_router_ready = all(
        os.getenv(key) for key in ("NINE_ROUTER_API_KEY", "NINE_ROUTER_BASE_URL", "NINE_ROUTER_MODEL")
    )
    langfuse_enabled = os.getenv("LANGFUSE_ENABLED", "false")
    langfuse_ready = all(os.getenv(key) for key in ("LANGFUSE_PUBLIC_KEY", "LANGFUSE_SECRET_KEY", "LANGFUSE_HOST"))
    print("Environment summary; secret values are not printed.")
    print(f"LLM_PROVIDER: {provider}")
    print(f"MINIMAX_* configured: {minimax_ready}")
    print(f"NINE_ROUTER_* configured: {nine_router_ready}")
    print(f"LANGFUSE_ENABLED: {langfuse_enabled}")
    print(f"LANGFUSE_* configured: {langfuse_ready}")
    print(f"LLM_LOG_FULL_PROMPT: {os.getenv('LLM_LOG_FULL_PROMPT', 'false')}")
    print(f"LLM_LOG_RESPONSE: {os.getenv('LLM_LOG_RESPONSE', 'unset')}")


def _mime_type(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return "application/pdf"
    if suffix == ".docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return "application/octet-stream"


def _preview(text: str, limit: int = 160) -> str:
    compact = " ".join(text.split())
    if len(compact) <= limit:
        return compact
    return f"{compact[:limit].rstrip()}..."


if __name__ == "__main__":
    raise SystemExit(main())
