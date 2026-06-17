import re
from collections import Counter

TARGET_CHUNK_WORDS = 900
CHUNK_OVERLAP_WORDS = 120
MAX_KEYWORDS = 12

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
_NUMBERED_HEADING_RE = re.compile(r"^(\d+(?:\.\d+){0,5})[.)]?\s+(.{3,120})$")
_CHAPTER_HEADING_RE = re.compile(
    r"^(chương|chuong|bài|bai|chapter|lesson|unit|module|section|phần|phan)"
    r"\s+([A-ZÀ-Ỹa-zà-ỹ0-9IVXLCivxlc]+[.:)]?)?\s*(.*)$",
    re.IGNORECASE,
)
_WORD_RE = re.compile(r"\b[\wÀ-ỹ]+\b", re.UNICODE)
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?。])\s+")
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
    "gì",
    "giữa",
    "hơn",
    "hoặc",
    "của",
    "for",
    "from",
    "hay",
    "học",
    "in",
    "is",
    "là",
    "làm",
    "lên",
    "lại",
    "này",
    "nên",
    "như",
    "một",
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
    "về",
    "và",
    "vào",
    "với",
}
_GENERIC_SINGLE_WORDS = {
    "dụng",
    "liệu",
    "quản",
    "thống",
    "tin",
    "trình",
}
_TECHNICAL_HINTS = {
    "algorithm",
    "architecture",
    "attribute",
    "bảng",
    "class",
    "constraint",
    "cơ sở dữ liệu",
    "csdl",
    "data",
    "database",
    "dependency",
    "entity",
    "framework",
    "index",
    "khóa",
    "model",
    "normalization",
    "procedure",
    "query",
    "quan hệ",
    "relationship",
    "schema",
    "sql",
    "table",
    "transaction",
    "truy vấn",
}


def chunk_text(text: str) -> list[dict]:
    sections = _split_sections(text)
    chunks: list[dict] = []

    for section in sections:
        section_words = section["body"].split()
        if not section_words:
            continue

        for chunk_words in _window_words(section_words):
            chunk_text_value = " ".join(chunk_words).strip()
            if chunk_text_value:
                title = section["title"] or _infer_chunk_title(chunk_text_value)
                section_path = section["section_path"] or title
                chunks.append(
                    {
                        "title": title,
                        "section_path": section_path,
                        "text": chunk_text_value,
                        "keywords": _extract_keywords(chunk_text_value, title, section_path),
                        "token_count": len(chunk_words),
                    }
                )

    if not chunks and text.strip():
        words = text.split()
        for chunk_words in _window_words(words):
            chunk_text_value = " ".join(chunk_words).strip()
            title = _infer_chunk_title(chunk_text_value)
            chunks.append(
                {
                    "title": title,
                    "section_path": title,
                    "text": chunk_text_value,
                    "keywords": _extract_keywords(chunk_text_value, title, title),
                    "token_count": len(chunk_words),
                }
            )

    return chunks


def _split_sections(text: str) -> list[dict]:
    lines = text.splitlines()
    sections: list[dict] = []
    current_title: str | None = None
    current_path: list[str] = []
    current_lines: list[str] = []
    saw_heading = False

    for line in lines:
        heading = _detect_heading(line, allow_soft=False)
        if heading is not None:
            saw_heading = True
            level, title = heading
            next_path = current_path[: level - 1] + [title]
            if current_title == title and current_path == next_path:
                continue

            _append_section(sections, current_title, current_path, current_lines)
            current_path = next_path
            current_title = title
            current_lines = []
            continue

        current_lines.append(line)

    _append_section(sections, current_title, current_path, current_lines)

    if not saw_heading:
        return [{"title": None, "section_path": None, "body": text.strip()}]

    return sections


def _detect_heading(line: str, *, allow_soft: bool = True) -> tuple[int, str] | None:
    clean = _clean_line(line)
    if not clean:
        return None

    markdown_match = _HEADING_RE.match(clean)
    if markdown_match:
        return len(markdown_match.group(1)), _normalize_title(markdown_match.group(2))

    numbered_match = _NUMBERED_HEADING_RE.match(clean)
    if numbered_match and _is_heading_tail(numbered_match.group(2)):
        level = numbered_match.group(1).count(".") + 1
        return min(level, 6), _normalize_title(clean)

    chapter_match = _CHAPTER_HEADING_RE.match(clean)
    if (
        chapter_match
        and _is_heading_designator(chapter_match.group(2) or "")
        and _meaningful_word_count(clean) >= 2
    ):
        return 1, _normalize_title(clean)

    if allow_soft and _is_all_caps_heading(clean):
        return 2, _normalize_title(clean)

    if allow_soft and _is_title_like_line(clean):
        return 2, _normalize_title(clean)

    return None


def _append_section(
    sections: list[dict],
    title: str | None,
    path: list[str],
    lines: list[str],
) -> None:
    body = "\n".join(lines).strip()
    if body:
        sections.append(
            {
                "title": title,
                "section_path": " > ".join(path) if path else None,
                "body": body,
            }
        )


def _window_words(words: list[str]) -> list[list[str]]:
    if len(words) <= TARGET_CHUNK_WORDS:
        return [words]

    windows: list[list[str]] = []
    step = TARGET_CHUNK_WORDS - CHUNK_OVERLAP_WORDS
    start = 0
    while start < len(words):
        window = words[start : start + TARGET_CHUNK_WORDS]
        if window:
            windows.append(window)
        if start + TARGET_CHUNK_WORDS >= len(words):
            break
        start += step
    return windows


def _infer_chunk_title(text: str) -> str | None:
    lines = [_clean_line(line) for line in text.splitlines()]
    meaningful_lines = [line for line in lines if _meaningful_word_count(line) >= 2]

    for line in meaningful_lines[:12]:
        heading = _detect_heading(line)
        if heading is not None:
            return heading[1]

    for line in meaningful_lines[:12]:
        if _is_title_like_line(line) or _is_all_caps_heading(line):
            return _normalize_title(line)

    first_sentence = _first_meaningful_sentence(text)
    if first_sentence:
        return _normalize_title(first_sentence, max_words=12)

    return None


def _extract_keywords(text: str, title: str | None = None, section_path: str | None = None) -> list[str]:
    tokens = _keyword_tokens(text)
    context_terms = set(_candidate_text(title or "")) | set(_candidate_text(section_path or ""))
    scores: Counter[str] = Counter()

    for size in (1, 2, 3):
        for index in range(0, max(len(tokens) - size + 1, 0)):
            gram_tokens = tokens[index : index + size]
            if not _valid_ngram(gram_tokens):
                continue
            term = " ".join(token["display"] for token in gram_tokens)
            normalized_term = " ".join(token["normalized"] for token in gram_tokens)
            score = 1.0 + (size - 1) * 1.3
            if any(token["is_acronym"] for token in gram_tokens):
                score += 1.5
            if _has_technical_hint(normalized_term):
                score += 2.0
            if normalized_term in context_terms:
                score += 2.5
            scores[term] += score

    ranked = sorted(scores.items(), key=lambda item: (-item[1], -len(item[0].split()), item[0]))
    selected: list[str] = []
    for term, _score in ranked:
        normalized = term.casefold()
        if any(_terms_overlap(normalized, existing.casefold()) for existing in selected):
            continue
        selected.append(term)
        if len(selected) == MAX_KEYWORDS:
            break

    return selected


def _keyword_tokens(text: str) -> list[dict]:
    tokens: list[dict] = []
    for raw in _WORD_RE.findall(text):
        normalized = raw.casefold()
        if normalized in _STOPWORDS:
            continue
        is_acronym = raw.isupper() and len(raw) > 1
        display = raw if is_acronym else normalized
        tokens.append(
            {
                "display": display,
                "normalized": normalized,
                "is_acronym": is_acronym,
            }
        )
    return tokens


def _valid_ngram(tokens: list[dict]) -> bool:
    if not tokens:
        return False
    if len(tokens) == 1:
        token = tokens[0]
        normalized = token["normalized"]
        return (
            len(token["normalized"]) > 2
            and token["normalized"] not in _GENERIC_SINGLE_WORDS
        ) or token["is_acronym"] or normalized in _TECHNICAL_HINTS

    normalized_term = " ".join(token["normalized"] for token in tokens)
    return _has_technical_hint(normalized_term) or any(
        len(token["normalized"]) > 2 and token["normalized"] not in _GENERIC_SINGLE_WORDS
        for token in tokens
    )


def _candidate_text(text: str) -> list[str]:
    tokens = [token["normalized"] for token in _keyword_tokens(text)]
    candidates: list[str] = []
    for size in (1, 2, 3):
        for index in range(0, max(len(tokens) - size + 1, 0)):
            candidates.append(" ".join(tokens[index : index + size]))
    return candidates


def _has_technical_hint(term: str) -> bool:
    if term in _TECHNICAL_HINTS:
        return True
    return any(hint in term for hint in _TECHNICAL_HINTS if " " in hint)


def _terms_overlap(term: str, existing: str) -> bool:
    return term in existing or existing in term


def _clean_line(line: str) -> str:
    return re.sub(r"\s+", " ", line.strip(" \t\r\n-•●▪*")).strip()


def _normalize_title(title: str, max_words: int = 18) -> str:
    clean = _clean_line(title).rstrip(" .:-")
    words = clean.split()
    if len(words) > max_words:
        clean = " ".join(words[:max_words])
    return clean


def _is_heading_tail(text: str) -> bool:
    clean = _clean_line(text)
    return 2 <= _meaningful_word_count(clean) <= 14 and not clean.endswith((".", ",", ";"))


def _is_heading_designator(text: str) -> bool:
    clean = text.strip(" .:)")
    if not clean:
        return False
    return clean.isdigit() or bool(re.fullmatch(r"[IVXLCivxlc]+", clean))


def _is_title_like_line(line: str) -> bool:
    clean = _clean_line(line)
    word_count = _meaningful_word_count(clean)
    if not (2 <= word_count <= 14):
        return False
    if clean.endswith((".", ",", ";")):
        return False
    if len(clean) > 120 or "@" in clean or "http" in clean.casefold():
        return False

    tokens = _WORD_RE.findall(clean)
    if not tokens:
        return False

    informative = [
        token for token in tokens if token.casefold() not in _STOPWORDS and len(token) > 2
    ]
    density = len(informative) / len(tokens)
    has_signal = any(
        token.isupper() and len(token) > 1 or any(char.isdigit() for char in token)
        for token in tokens
    )
    has_title_case = sum(1 for token in tokens if token[:1].isupper()) >= max(1, len(tokens) // 2)

    return density >= 0.55 and (has_signal or has_title_case or word_count <= 7)


def _is_all_caps_heading(line: str) -> bool:
    clean = _clean_line(line)
    if len(clean) > 100 or _meaningful_word_count(clean) < 2:
        return False
    letters = [char for char in clean if char.isalpha()]
    if len(letters) < 4:
        return False
    uppercase = sum(1 for char in letters if char.upper() == char)
    return uppercase / len(letters) >= 0.75


def _meaningful_word_count(text: str) -> int:
    return sum(1 for word in _WORD_RE.findall(text) if word.casefold() not in _STOPWORDS)


def _first_meaningful_sentence(text: str) -> str | None:
    compact = " ".join(text.split())
    for sentence in _SENTENCE_SPLIT_RE.split(compact):
        if _meaningful_word_count(sentence) >= 4:
            return sentence
    words = compact.split()
    return " ".join(words[:12]) if words else None
