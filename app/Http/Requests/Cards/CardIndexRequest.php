<?php

namespace App\Http\Requests\Cards;

use Illuminate\Foundation\Http\FormRequest;

class CardIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<mixed>>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'game' => ['nullable', 'integer', 'exists:card_games,id'],
            'set' => ['nullable', 'integer', 'exists:card_sets,id'],
            'color' => ['nullable', 'string', 'max:50'],
            'type' => ['nullable', 'string', 'max:50'],
            'rarity' => ['nullable', 'string', 'max:50'],
            'foiling' => ['nullable', 'string', 'max:50'],
        ];
    }
}
