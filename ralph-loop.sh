#!/bin/bash

# Ralph Wiggum Loop - TCG Tracker
# Autonomous AI Agent Loop mit frischem Context pro Iteration
#
# Basierend auf: https://github.com/snarktank/ralph
#
# Usage: ./ralph-loop.sh [max_iterations]

set -e

# ===== Konfiguration =====
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
cd "$PROJECT_DIR"

MAX_ITERATIONS="${1:-10}"
PRD_FILE=".claude/prd.json"
PROMPT_FILE=".claude/prompt.md"
PROGRESS_FILE=".claude/progress.txt"
LAST_BRANCH_FILE=".claude/.last-branch"
ARCHIVE_DIR=".claude/archive"

# ===== Funktionen =====
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

get_branch_name() {
  if [[ -f "$PRD_FILE" ]]; then
    jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo ""
  fi
}

archive_previous_run() {
  local old_branch="$1"
  local new_branch="$2"

  if [[ -n "$old_branch" ]] && [[ "$old_branch" != "$new_branch" ]]; then
    local archive_path="$ARCHIVE_DIR/$(date '+%Y-%m-%d')-$old_branch"
    mkdir -p "$archive_path"

    log "📦 Archiviere vorherigen Run: $old_branch → $archive_path"

    [[ -f "$PRD_FILE" ]] && cp "$PRD_FILE" "$archive_path/"
    [[ -f "$PROGRESS_FILE" ]] && cp "$PROGRESS_FILE" "$archive_path/"

    # Progress für neuen Run zurücksetzen
    echo "# Progress Log - $(date '+%Y-%m-%d')" > "$PROGRESS_FILE"
    echo "" >> "$PROGRESS_FILE"
    echo "## Codebase Patterns" >> "$PROGRESS_FILE"
    echo "(Hier werden wiederverwendbare Erkenntnisse gesammelt)" >> "$PROGRESS_FILE"
    echo "" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
    echo "" >> "$PROGRESS_FILE"
  fi
}

check_incomplete_stories() {
  if [[ -f "$PRD_FILE" ]]; then
    local incomplete
    incomplete=$(jq '[.userStories[] | select(.passes != true)] | length' "$PRD_FILE" 2>/dev/null || echo "0")
    [[ "$incomplete" -gt 0 ]]
  else
    return 1
  fi
}

get_next_story() {
  jq -r '.userStories | map(select(.passes != true)) | sort_by(.priority) | .[0] | "\(.id): \(.title)"' "$PRD_FILE" 2>/dev/null || echo "unknown"
}

# ===== Validierung =====
if [[ ! -f "$PRD_FILE" ]]; then
  echo "❌ Fehler: $PRD_FILE nicht gefunden!"
  echo ""
  echo "Erstelle eine prd.json mit dieser Struktur:"
  echo '{'
  echo '  "project": "TCG Tracker",'
  echo '  "branchName": "feature/xyz",'
  echo '  "description": "Feature-Beschreibung",'
  echo '  "userStories": ['
  echo '    {'
  echo '      "id": "US-001",'
  echo '      "title": "Story Titel",'
  echo '      "description": "Als User möchte ich...",'
  echo '      "acceptanceCriteria": ["Kriterium 1", "Kriterium 2"],'
  echo '      "priority": 1,'
  echo '      "passes": false'
  echo '    }'
  echo '  ]'
  echo '}'
  exit 1
fi

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "❌ Fehler: $PROMPT_FILE nicht gefunden!"
  exit 1
fi

# ===== Branch & Archive Management =====
CURRENT_BRANCH=$(get_branch_name)
LAST_BRANCH=""
[[ -f "$LAST_BRANCH_FILE" ]] && LAST_BRANCH=$(cat "$LAST_BRANCH_FILE")

if [[ -n "$CURRENT_BRANCH" ]] && [[ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]]; then
  archive_previous_run "$LAST_BRANCH" "$CURRENT_BRANCH"
  echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
fi

# Progress initialisieren
if [[ ! -f "$PROGRESS_FILE" ]]; then
  echo "# Progress Log - $(date '+%Y-%m-%d')" > "$PROGRESS_FILE"
  echo "" >> "$PROGRESS_FILE"
  echo "## Codebase Patterns" >> "$PROGRESS_FILE"
  echo "" >> "$PROGRESS_FILE"
  echo "---" >> "$PROGRESS_FILE"
  echo "" >> "$PROGRESS_FILE"
fi

# ===== Header =====
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🔄 RALPH WIGGUM LOOP                                        ║"
echo "║  Autonomous AI Agent with Fresh Context per Iteration        ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Branch:         $(printf '%-43s' "${CURRENT_BRANCH:-main}") ║"
echo "║  Max Iterations: $(printf '%-43s' "$MAX_ITERATIONS") ║"
echo "║  PRD:            $(printf '%-43s' "$PRD_FILE") ║"
echo "║  Progress:       $(printf '%-43s' "$PROGRESS_FILE") ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Zeige offene Stories
echo "📋 Offene User Stories:"
jq -r '.userStories[] | select(.passes != true) | "   [\(.priority)] \(.id): \(.title)"' "$PRD_FILE" 2>/dev/null || echo "   (keine)"
echo ""

# ===== Main Loop =====
for i in $(seq 1 $MAX_ITERATIONS); do
  # Prüfe ob noch Stories offen sind
  if ! check_incomplete_stories; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  ✅ ALLE STORIES ABGESCHLOSSEN!                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    log "Alle Stories complete nach $((i-1)) Iterationen"
    exit 0
  fi

  NEXT_STORY=$(get_next_story)

  echo ""
  echo "┌──────────────────────────────────────────────────────────────┐"
  echo "│  ITERATION $i/$MAX_ITERATIONS                                              │"
  echo "│  Next: $(printf '%-54s' "$NEXT_STORY") │"
  echo "└──────────────────────────────────────────────────────────────┘"
  log "Iteration $i gestartet - $NEXT_STORY"

  # Baue den Prompt zusammen
  FULL_PROMPT=$(cat "$PROMPT_FILE")
  FULL_PROMPT="$FULL_PROMPT

---

## Aktuelle PRD

\`\`\`json
$(cat "$PRD_FILE")
\`\`\`

---

## Progress Log (bisherige Learnings)

\`\`\`
$(cat "$PROGRESS_FILE")
\`\`\`
"

  # Starte NEUE Claude Session (frischer Context!)
  # --dangerously-skip-permissions für autonome Ausführung
  # --output-format text für lesbaren Output
  OUTPUT=$(echo "$FULL_PROMPT" | claude --dangerously-skip-permissions 2>&1) || true

  echo "$OUTPUT"

  # Prüfe auf Completion Signal
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  ✅ COMPLETE SIGNAL EMPFANGEN!                               ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    log "Complete signal nach Iteration $i"
    exit 0
  fi

  log "Iteration $i abgeschlossen"

  # Pause zwischen Iterationen
  if [[ $i -lt $MAX_ITERATIONS ]]; then
    echo ""
    echo "⏳ Nächste Iteration in 5 Sekunden... (Ctrl+C zum Abbrechen)"
    sleep 5
  fi
done

# Max Iterations erreicht
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ⚠️  MAX ITERATIONEN ($MAX_ITERATIONS) ERREICHT                            ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Offene Stories:                                             ║"
jq -r '.userStories[] | select(.passes != true) | "║    [\(.priority)] \(.id): \(.title)"' "$PRD_FILE" 2>/dev/null | head -5
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Fortsetzen: ./ralph-loop.sh $MAX_ITERATIONS                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
log "Max Iterationen erreicht"

exit 1
