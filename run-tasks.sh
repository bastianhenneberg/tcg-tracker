#!/bin/bash

# Ralph Wiggum Method - Task Runner für TCG Tracker
# Jeder Task in eigener Claude Session mit frischem Context

set -e  # Bei Fehler abbrechen

PRD=".claude/prd.md"
PROGRESS=".claude/progress.md"

echo "🎴 TCG Tracker - Ralph Wiggum Method"
echo "====================================="
echo ""

# Prüfen ob PRD existiert
if [ ! -f "$PRD" ]; then
    echo "❌ Fehler: $PRD nicht gefunden!"
    echo "   Bitte erst Tasks in $PRD definieren."
    exit 1
fi

# Progress-Datei initialisieren falls nicht vorhanden
if [ ! -f "$PROGRESS" ]; then
    cat > "$PROGRESS" << 'EOF'
# Task Progress

> Diese Datei wird automatisch vom Runner aktualisiert.
> Claude liest sie um zu wissen welche Tasks erledigt sind.

## Status

| Task | Status | Abgeschlossen |
|:-----|:-------|:--------------|
| Task 1 | pending | - |
| Task 2 | pending | - |
| Task 3 | pending | - |

## Log

<!-- Automatisch gefüllt vom Runner -->
EOF
fi

# Funktion: Task-Status updaten
update_progress() {
    local task_num=$1
    local status=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M')

    # Status in Tabelle updaten
    if [ "$status" = "done" ]; then
        sed -i "s/| Task $task_num | .* |/| Task $task_num | ✅ done | $timestamp |/" "$PROGRESS"
    elif [ "$status" = "in_progress" ]; then
        sed -i "s/| Task $task_num | .* |/| Task $task_num | 🔄 in_progress | - |/" "$PROGRESS"
    fi

    # Log-Eintrag hinzufügen
    echo "- **$timestamp:** Task $task_num → $status" >> "$PROGRESS"
}

# Funktion: Task ausführen
run_task() {
    local task_num=$1
    local task_title=$2

    echo "📋 Task $task_num: $task_title"
    read -p "   Enter drücken zum Starten (s=skip, q=quit)... " choice

    case $choice in
        s|S)
            echo "   ⏭️  Task $task_num übersprungen"
            return 0
            ;;
        q|Q)
            echo "   🛑 Abgebrochen"
            exit 0
            ;;
    esac

    update_progress $task_num "in_progress"

    claude "Lies $PRD und $PROGRESS. Führe NUR Task $task_num aus.
Halte dich strikt an die Akzeptanzkriterien.
Wenn fertig, fasse kurz zusammen was du gemacht hast."

    update_progress $task_num "done"
    echo ""
    echo "   ✅ Task $task_num abgeschlossen"
    echo ""
}

# Tasks ausführen
run_task 1 "$(grep '## Task 1:' $PRD | sed 's/## Task 1: //' || echo '[siehe prd.md]')"
run_task 2 "$(grep '## Task 2:' $PRD | sed 's/## Task 2: //' || echo '[siehe prd.md]')"
run_task 3 "$(grep '## Task 3:' $PRD | sed 's/## Task 3: //' || echo '[siehe prd.md]')"

echo "====================================="
echo "✅ Alle Tasks abgeschlossen!"
echo ""
echo "📊 Progress: $PROGRESS"
echo ""
echo "Nächste Schritte:"
echo "  git diff"
echo "  php artisan test"
echo "  vendor/bin/pint --dirty"
