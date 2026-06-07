#!/usr/bin/env bash
# Cross-platform Python launcher for AI log hooks.
# Designed to be called as:
#   bash scripts/_pyrun.sh <script> [args...]
#
# Important on Windows:
# - "python" may exist as a Microsoft Store alias but fail when executed.
# - Some hook runners launch Git Bash with a stripped PATH.
# - Hooks should never block the AI tool, so this exits 0 if no real Python is found.

set -u

PY=""

set_python_if_works() {
  "$@" --version >/dev/null 2>&1 || return 1
  PY="$*"
  return 0
}

# 1. Prefer the project's virtual environment.
# These paths are relative to the project root, assuming the hook runs from there.
if [ -x "venv/Scripts/python.exe" ]; then
  PY="venv/Scripts/python.exe"
elif [ -x ".venv/Scripts/python.exe" ]; then
  PY=".venv/Scripts/python.exe"

# 2. Try normal PATH commands, but only accept them if they actually run.
elif command -v python3 >/dev/null 2>&1 && set_python_if_works python3; then
  :
elif command -v python >/dev/null 2>&1 && set_python_if_works python; then
  :
elif command -v py >/dev/null 2>&1 && set_python_if_works py -3; then
  :

# 3. PATH lookup failed or found only broken aliases; probe common Windows installs.
else
  shopt -s nullglob 2>/dev/null || true

  for cand in \
    /c/Users/*/AppData/Local/Programs/Python/Python*/python.exe \
    "/c/Program Files/Python"*/python.exe \
    "/c/Program Files (x86)/Python"*/python.exe \
    /c/Python*/python.exe; do
    if [ -x "$cand" ] && "$cand" --version >/dev/null 2>&1; then
      PY="$cand"
      break
    fi
  done

  shopt -u nullglob 2>/dev/null || true
fi

# No real Python found. Exit successfully so the AI hook never blocks the tool.
[ -n "$PY" ] || exit 0

# shellcheck disable=SC2086
exec $PY "$@"

