import re
from collections import Counter

TARGET_CHUNK_WORDS = 900
CHUNK_OVERLAP_WORDS = 120
MAX_KEYWORDS = 12

_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
_WORD_RE = re.compile(r"\b[\wÀ-ỹ]+\b", re.UNICODE)
_STOPWORDS = {
    "and",
    "are",
    "các",
    "cho",
    "của",
    "for",
    "from",
    "hay",
    "học",
    "is",
    "một",
    "những",
    "the",
    "this",
    "trong",
    "và",
    "với",
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
                chunks.append(
                    {
                        "title": section["title"],
                        "section_path": section["section_path"],
                        "text": chunk_text_value,
                        "keywords": _extract_keywords(chunk_text_value),
                        "token_count": len(chunk_words),
                    }
                )

    if not chunks and text.strip():
        words = text.split()
        for chunk_words in _window_words(words):
            chunk_text_value = " ".join(chunk_words).strip()
            chunks.append(
                {
                    "title": None,
                    "section_path": None,
                    "text": chunk_text_value,
                    "keywords": _extract_keywords(chunk_text_value),
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
        match = _HEADING_RE.match(line.strip())
        if match:
            saw_heading = True
            _append_section(sections, current_title, current_path, current_lines)
            level = len(match.group(1))
            title = match.group(2).strip()
            current_path = current_path[: level - 1] + [title]
            current_title = title
            current_lines = []
            continue

        current_lines.append(line)

    _append_section(sections, current_title, current_path, current_lines)

    if not saw_heading:
        return [{"title": None, "section_path": None, "body": text.strip()}]

    return sections


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


def _extract_keywords(text: str) -> list[str]:
    words = [
        word.lower()
        for word in _WORD_RE.findall(text)
        if len(word) > 2 and word.lower() not in _STOPWORDS
    ]
    return [word for word, _count in Counter(words).most_common(MAX_KEYWORDS)]
