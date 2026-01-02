# Future Features

## AI-Integration (Claude API)

Anbindung von Claude via Anthropic API für intelligente Kartendatenbank-Abfragen:

### Mögliche Features:
- **Kartenfragen beantworten**: "Welche Leader gibt es in Rot/Grün?", "Zeig mir alle Karten mit Counter 2000+"
- **Deckbuilding-Hilfe**: "Welche Karten passen zu Monkey D. Luffy Leader?", "Erstelle mir ein Budget-Deck"
- **Preisanalysen**: "Was sind meine wertvollsten Karten?", "Wie hat sich mein Sammlungswert entwickelt?"
- **Regelauskunft**: Fragen zu Spielmechaniken und Karteninteraktionen

### Technische Umsetzung:
```php
// API-Endpoint für Chat
Route::post('/api/chat', function (Request $request) {
    $question = $request->input('question');

    // Kontext aus DB laden (Karten, Inventar, Sammlung)
    $context = [
        'cards' => OpCard::with('printings')->get(),
        'inventory' => auth()->user()->opInventory()->with('printing.card')->get(),
    ];

    // An Claude API senden
    $response = Http::withHeaders([
        'x-api-key' => config('services.anthropic.key'),
        'anthropic-version' => '2023-06-01',
    ])->post('https://api.anthropic.com/v1/messages', [
        'model' => 'claude-sonnet-4-20250514',
        'max_tokens' => 1024,
        'messages' => [
            ['role' => 'user', 'content' => "Kontext: " . json_encode($context) . "\n\nFrage: " . $question]
        ],
    ]);

    return $response->json();
});
```

### Benötigte Schritte:
1. Anthropic API Key in `.env` hinzufügen
2. Chat-Controller erstellen
3. Frontend Chat-Komponente bauen
4. Kontext-Optimierung (nur relevante Daten senden)
5. Caching für häufige Anfragen
