from __future__ import annotations

import re
import unicodedata
from collections import Counter

from rank_bm25 import BM25Okapi
from sqlalchemy.orm import Session

from src.models.document import Document
from src.models.document_chunk import DocumentChunk
from src.models.learning_outcome import LearningOutcome
from src.repositories.document_chunk_repository import list_document_chunks
from src.repositories.document_repository import get_document
from src.repositories.learning_outcome_repository import get_learning_outcome

DEFAULT_TOP_K = 5
MAX_TOP_K = 10
MIN_RELEVANCE_SCORE = 0.25
TITLE_WEIGHT = 4
SECTION_PATH_WEIGHT = 3
KEYWORD_WEIGHT = 3
TITLE_PHRASE_BOOST = 4.0
SECTION_PHRASE_BOOST = 2.5
KEYWORD_OVERLAP_BOOST = 1.2
TECHNICAL_TOKEN_BOOST = 0.8
MAX_PER_SECTION = 2
TEXT_PREVIEW_CHARS = 360

_TOKEN_RE = re.compile(r"\b[\wÀ-ỹ]+\b", re.UNICODE)
_STOPWORDS = {
    "a",
    "about",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "các",
    "cách",
    "cần",
    "có",
    "cho",
    "của",
    "được",
    "để",
    "đến",
    "đi",
    "đó",
    "đối",
    "for",
    "from",
    "gì",
    "giữa",
    "hay",
    "hơn",
    "hoặc",
    "học",
    "in",
    "is",
    "là",
    "làm",
    "lên",
    "lại",
    "một",
    "này",
    "nên",
    "như",
    "những",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "trong",
    "từ",
    "và",
    "vào",
    "về",
    "với",
}
_TECHNICAL_HINTS = {
    "algorithm",
    "architecture",
    "attribute",
    "bảng",
    "constraint",
    "cơ sở dữ liệu",
    "csdl",
    "data",
    "database",
    "dbms",
    "dependency",
    "entity",
    "hqt",
    "index",
    "khóa",
    "model",
    "normalization",
    "query",
    "quan hệ",
    "relationship",
    "schema",
    "sql",
    "table",
    "transaction",
    "truy vấn",
}


class RetrievalError(Exception):
    def __init__(self, detail: str, status_code: int = 400, error: str = "Retrieval failed") -> None:
        self.detail = detail
        self.status_code = status_code
        self.error = error


def retrieve_relevant_chunks(
    db: Session,
    *,
    document_id: int,
    learning_outcome_id: int,
    topic: str | None = None,
    top_k: int = DEFAULT_TOP_K,
    extra_keywords: list[str] | None = None,
) -> dict:
    document = get_document(db, document_id)
    learning_outcome = get_learning_outcome(db, learning_outcome_id)
    top_k = min(max(top_k, 1), MAX_TOP_K)

    _validate_inputs(document, learning_outcome)
    chunks = list_document_chunks(db, document_id)
    if not chunks:
        raise RetrievalError("Document has no chunks")

    query_text = _build_query(learning_outcome, topic, extra_keywords)
    query_tokens = _tokenize(query_text)
    if not query_tokens:
        raise RetrievalError("Retrieval query is empty after normalization")

    corpus_tokens = [_weighted_chunk_tokens(chunk) for chunk in chunks]
    bm25 = BM25Okapi(corpus_tokens)
    bm25_scores = bm25.get_scores(query_tokens)

    scored = [
        _score_chunk(chunk, bm25_score, query_text, query_tokens)
        for chunk, bm25_score in zip(chunks, bm25_scores, strict=True)
    ]
    relevant = [item for item in scored if item["score"] >= MIN_RELEVANCE_SCORE]
    if not relevant:
        raise RetrievalError("No relevant chunks found for the selected document and learning outcome")

    ranked = sorted(relevant, key=lambda item: (-item["score"], item["chunk_index"]))
    selected = _diverse_select(ranked, top_k)

    return {
        "document_id": document_id,
        "learning_outcome_id": learning_outcome_id,
        "topic": topic,
        "top_k": top_k,
        "chunks": selected,
    }


def _validate_inputs(document: Document | None, learning_outcome: LearningOutcome | None) -> None:
    if document is None:
        raise RetrievalError("Document not found", status_code=404, error="Not found")
    if document.status != "processed":
        raise RetrievalError("Document must be processed before retrieval")
    if learning_outcome is None:
        raise RetrievalError("Learning outcome not found", status_code=404, error="Not found")
    if learning_outcome.course_id != document.course_id:
        raise RetrievalError("Learning outcome does not belong to the document course")


def _build_query(
    learning_outcome: LearningOutcome,
    topic: str | None,
    extra_keywords: list[str] | None,
) -> str:
    parts = [learning_outcome.description]
    if topic:
        parts.append(topic)
    if extra_keywords:
        parts.extend(extra_keywords)
    return " ".join(part for part in parts if part)


def _weighted_chunk_tokens(chunk: DocumentChunk) -> list[str]:
    tokens: list[str] = []
    tokens.extend(_tokenize(chunk.title or "") * TITLE_WEIGHT)
    tokens.extend(_tokenize(chunk.section_path or "") * SECTION_PATH_WEIGHT)
    tokens.extend(_tokenize(" ".join(chunk.keywords or [])) * KEYWORD_WEIGHT)
    tokens.extend(_tokenize(chunk.text or ""))
    return tokens or ["empty"]


def _score_chunk(
    chunk: DocumentChunk,
    bm25_score: float,
    query_text: str,
    query_tokens: list[str],
) -> dict:
    reasons = ["bm25"] if bm25_score > 0 else []
    boost = 0.0
    query_phrases = _query_phrases(query_text, query_tokens)
    title_text = _normalize(chunk.title or "")
    section_text = _normalize(chunk.section_path or "")

    if any(phrase and phrase in title_text for phrase in query_phrases):
        boost += TITLE_PHRASE_BOOST
        reasons.append("title_boost")

    if any(phrase and phrase in section_text for phrase in query_phrases):
        boost += SECTION_PHRASE_BOOST
        reasons.append("section_path_boost")

    keyword_overlap = _keyword_overlap(query_tokens, chunk.keywords or [])
    if keyword_overlap:
        boost += KEYWORD_OVERLAP_BOOST * keyword_overlap
        reasons.append("keyword_overlap")

    technical_overlap = _technical_overlap(query_tokens, chunk)
    if technical_overlap:
        boost += TECHNICAL_TOKEN_BOOST * technical_overlap
        reasons.append("technical_token_match")

    total_score = round(float(bm25_score) + boost, 4)
    return {
        "chunk_id": chunk.id,
        "chunk_index": chunk.chunk_index,
        "title": chunk.title,
        "section_path": chunk.section_path,
        "score": total_score,
        "keywords": chunk.keywords,
        "text_preview": _preview(chunk.text),
        "match_reason": reasons or ["low_bm25"],
        "_diversity_key": chunk.section_path or chunk.title or f"chunk-{chunk.chunk_index}",
    }


def _diverse_select(ranked: list[dict], top_k: int) -> list[dict]:
    selected: list[dict] = []
    section_counts: Counter[str] = Counter()

    for item in ranked:
        key = item["_diversity_key"]
        if section_counts[key] >= MAX_PER_SECTION:
            continue
        selected.append(item)
        section_counts[key] += 1
        if len(selected) == top_k:
            break

    if len(selected) < top_k:
        selected_ids = {item["chunk_id"] for item in selected}
        for item in ranked:
            if item["chunk_id"] in selected_ids:
                continue
            selected.append(item)
            if len(selected) == top_k:
                break

    return [_public_result(item) for item in selected]


def _public_result(item: dict) -> dict:
    return {key: value for key, value in item.items() if not key.startswith("_")}


def _tokenize(text: str) -> list[str]:
    return [
        _normalize(token)
        for token in _TOKEN_RE.findall(text)
        if len(_normalize(token)) > 1 and _normalize(token) not in _STOPWORDS
    ]


def _normalize(text: str) -> str:
    lowered = text.casefold()
    decomposed = unicodedata.normalize("NFD", lowered)
    without_marks = "".join(char for char in decomposed if unicodedata.category(char) != "Mn")
    return without_marks.replace("đ", "d")


def _query_phrases(query_text: str, query_tokens: list[str]) -> list[str]:
    phrases = []
    normalized_query = _normalize(query_text)
    if 2 <= len(normalized_query.split()) <= 12:
        phrases.append(normalized_query)

    for size in (3, 2):
        for index in range(0, max(len(query_tokens) - size + 1, 0)):
            phrases.append(" ".join(query_tokens[index : index + size]))
    return phrases


def _keyword_overlap(query_tokens: list[str], keywords: list[str]) -> int:
    query_set = set(query_tokens) | set(_ngrams(query_tokens, 2)) | set(_ngrams(query_tokens, 3))
    keyword_set = set()
    for keyword in keywords:
        keyword_tokens = _tokenize(keyword)
        keyword_set.update(keyword_tokens)
        keyword_set.update(_ngrams(keyword_tokens, 2))
        keyword_set.update(_ngrams(keyword_tokens, 3))
    return len(query_set & keyword_set)


def _technical_overlap(query_tokens: list[str], chunk: DocumentChunk) -> int:
    chunk_text = " ".join(
        [
            chunk.title or "",
            chunk.section_path or "",
            " ".join(chunk.keywords or []),
            chunk.text or "",
        ]
    )
    chunk_tokens = set(_tokenize(chunk_text))
    technical_query_terms = {
        token
        for token in query_tokens
        if token in _normalized_technical_hints() or token.isupper()
    }
    return len(technical_query_terms & chunk_tokens)


def _normalized_technical_hints() -> set[str]:
    return {_normalize(term) for term in _TECHNICAL_HINTS} | {
        token for term in _TECHNICAL_HINTS for token in _tokenize(term)
    }


def _ngrams(tokens: list[str], size: int) -> list[str]:
    return [
        " ".join(tokens[index : index + size])
        for index in range(0, max(len(tokens) - size + 1, 0))
    ]


def _preview(text: str) -> str:
    compact = " ".join(text.split())
    if len(compact) <= TEXT_PREVIEW_CHARS:
        return compact
    return f"{compact[:TEXT_PREVIEW_CHARS].rstrip()}..."
