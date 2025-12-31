<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OllamaService
{
    protected string $host;

    protected string $model;

    protected int $timeout;

    public function __construct()
    {
        $this->host = config('services.ollama.host');
        $this->model = config('services.ollama.model');
        $this->timeout = config('services.ollama.timeout');
    }

    /**
     * Check if Ollama service is available and the model is loaded.
     */
    public function isAvailable(): bool
    {
        try {
            $response = Http::timeout(5)
                ->get("{$this->host}/api/tags");

            if (! $response->successful()) {
                return false;
            }

            $models = $response->json('models', []);
            foreach ($models as $model) {
                if (str_starts_with($model['name'] ?? '', $this->model)) {
                    return true;
                }
            }

            return false;
        } catch (ConnectionException $e) {
            Log::warning('Ollama service not reachable', ['error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Recognize a trading card from a base64-encoded image.
     *
     * @return array{success: bool, data?: array{game?: string, card_name?: string, set_code?: string, collector_number?: string, foiling?: string}, error?: string}
     */
    public function recognizeCard(string $base64Image): array
    {
        $prompt = <<<'PROMPT'
You are a Flesh and Blood TCG card identification expert. This is a Flesh and Blood trading card.

Analyze the card image and extract:
1. Card name - the large text at the top of the card
2. Set code - 3 letter code at bottom (e.g., MST, WTR, ELE, UPR, OUT, HVY, DTD, ROS)
3. Collector number - the number at the bottom (just the number, e.g., 131)

Return ONLY this JSON (no other text):
{
    "card_name": "exact card name from top of card",
    "set_code": "3 letter set code from bottom",
    "collector_number": "number from bottom of card"
}

Look carefully at the bottom of the card for the set code and collector number.
PROMPT;

        try {
            // Use /api/chat for vision models (required for qwen2.5vl, etc.)
            $response = Http::timeout($this->timeout)
                ->post("{$this->host}/api/chat", [
                    'model' => $this->model,
                    'messages' => [
                        [
                            'role' => 'user',
                            'content' => $prompt,
                            'images' => [$base64Image],
                        ],
                    ],
                    'stream' => false,
                ]);

            if (! $response->successful()) {
                return [
                    'success' => false,
                    'error' => 'Ollama API request failed: '.$response->status(),
                ];
            }

            $result = $response->json('message.content', '');

            // Parse the JSON response
            $data = json_decode($result, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                // Try to extract JSON from the response
                if (preg_match('/\{[^}]+\}/s', $result, $matches)) {
                    $data = json_decode($matches[0], true);
                }

                if (json_last_error() !== JSON_ERROR_NONE) {
                    return [
                        'success' => false,
                        'error' => 'Failed to parse Ollama response as JSON',
                        'raw_response' => $result,
                    ];
                }
            }

            return [
                'success' => true,
                'data' => [
                    'game' => $data['game'] ?? null,
                    'card_name' => $data['card_name'] ?? null,
                    'set_code' => $data['set_code'] ?? null,
                    'collector_number' => $data['collector_number'] ?? null,
                    'foiling' => $data['foiling'] ?? null,
                ],
            ];
        } catch (ConnectionException $e) {
            Log::error('Ollama connection failed', ['error' => $e->getMessage()]);

            return [
                'success' => false,
                'error' => 'Could not connect to Ollama service',
            ];
        } catch (\Exception $e) {
            Log::error('Ollama recognition failed', ['error' => $e->getMessage()]);

            return [
                'success' => false,
                'error' => 'Card recognition failed: '.$e->getMessage(),
            ];
        }
    }

    /**
     * Get service status information.
     *
     * @return array{available: bool, host: string, model: string}
     */
    public function getStatus(): array
    {
        return [
            'available' => $this->isAvailable(),
            'host' => $this->host,
            'model' => $this->model,
        ];
    }
}
