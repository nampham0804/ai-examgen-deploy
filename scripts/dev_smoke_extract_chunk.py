from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import tempfile
from datetime import datetime
from pathlib import Path

from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Smoke test upload, MarkItDown extract, and chunk flow.")
    parser.add_argument("--file", required=True, help="Explicit PDF or DOCX file path to upload.")
    parser.add_argument("--document_type", default="lecture", help="Document type, default: lecture.")
    parser.add_argument("--save-output", action="store_true", help="Save metadata, extracted text, and chunks.")
    parser.add_argument("--keep-artifacts", action="store_true", help="Keep temp SQLite DB and uploaded file.")
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

    temp_dir = Path(tempfile.mkdtemp(prefix="phase1c_smoke_"))
    db_path = temp_dir / "smoke.db"
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path.as_posix()}"

    from src.main import app
    from src.models.document import Document
    from src.repositories.database import SessionLocal, engine

    uploaded_file_path: Path | None = None
    try:
        with TestClient(app) as client:
            course_res = client.post(
                "/api/v1/courses",
                json={
                    "code": "DEV-SMOKE",
                    "name": "Dev Smoke Course",
                    "description": "Temporary course for upload/extract/chunk smoke test.",
                },
            )
            course_res.raise_for_status()
            course_id = course_res.json()["data"]["id"]

            with input_path.open("rb") as file_handle:
                upload_res = client.post(
                    "/api/v1/documents/upload",
                    data={"course_id": str(course_id), "document_type": args.document_type},
                    files={"file": (input_path.name, file_handle, _mime_type(input_path))},
                )
            upload_res.raise_for_status()
            upload_data = upload_res.json()["data"]
            document_id = upload_data["id"]

            extract_res = client.post(f"/api/v1/documents/{document_id}/extract")
            extract_res.raise_for_status()
            extract_data = extract_res.json()["data"]

            chunks_res = client.get(f"/api/v1/documents/{document_id}/chunks")
            chunks_res.raise_for_status()
            chunks = chunks_res.json()["data"]

            extracted_text = ""
            with SessionLocal() as db:
                document = db.get(Document, document_id)
                if document is not None:
                    uploaded_file_path = Path(document.file_path)
                    extracted_text = document.extracted_text or ""

            assert extract_data["status"] == "processed"
            assert extract_data["text_length"] > 0
            assert extract_data["chunk_count"] > 0
            assert len(chunks) > 0

            metadata = {
                "document_id": document_id,
                "file_name": upload_data["file_name"],
                "file_size_bytes": upload_data["file_size_bytes"],
                "page_count": upload_data["page_count"],
                "status": extract_data["status"],
                "text_length": extract_data["text_length"],
                "chunk_count": extract_data["chunk_count"],
            }

            if args.save_output:
                output_dir = _write_debug_output(metadata, extracted_text, chunks)
                print(f"debug output dir: {output_dir}")

            first_chunk = chunks[0]
            print(f"uploaded document id: {document_id}")
            print(f"file_name: {upload_data['file_name']}")
            print(f"file_size_bytes: {upload_data['file_size_bytes']}")
            print(f"page_count: {upload_data['page_count']}")
            print(f"status: {extract_data['status']}")
            print(f"text_length: {extract_data['text_length']}")
            print(f"chunk_count: {extract_data['chunk_count']}")
            print(f"first chunk title: {first_chunk.get('title')}")
            print(f"first chunk text preview: {_preview(first_chunk.get('text') or '')}")
    finally:
        engine.dispose()
        if args.keep_artifacts:
            print(f"temporary sqlite db: {db_path}")
            if uploaded_file_path is not None:
                print(f"uploaded file: {uploaded_file_path}")
        else:
            if uploaded_file_path and uploaded_file_path.exists():
                uploaded_file_path.unlink()
            shutil.rmtree(temp_dir, ignore_errors=True)

    return 0


def _mime_type(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return "application/pdf"
    if suffix == ".docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return "application/octet-stream"


def _preview(text: str, limit: int = 240) -> str:
    compact = " ".join(text.split())
    if len(compact) <= limit:
        return compact
    return f"{compact[:limit].rstrip()}..."


def _write_debug_output(metadata: dict, extracted_text: str, chunks: list[dict]) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = REPO_ROOT / "data" / "debug" / "extract_smoke" / timestamp
    output_dir.mkdir(parents=True, exist_ok=True)

    (output_dir / "metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (output_dir / "extracted_text.md").write_text(extracted_text, encoding="utf-8")
    (output_dir / "chunks.json").write_text(
        json.dumps([_chunk_debug_payload(chunk) for chunk in chunks], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return output_dir


def _chunk_debug_payload(chunk: dict) -> dict:
    return {
        "chunk_index": chunk.get("chunk_index"),
        "title": chunk.get("title"),
        "section_path": chunk.get("section_path"),
        "token_count": chunk.get("token_count"),
        "keywords": chunk.get("keywords"),
        "text": chunk.get("text"),
    }


if __name__ == "__main__":
    raise SystemExit(main())
