<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCustomCardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'game_id' => ['required', 'exists:games,id'],
            'linked_fab_card_id' => ['nullable', 'exists:fab_cards,id'],
            'name' => ['required', 'string', 'max:255'],
            'types' => ['nullable', 'array'],
            'traits' => ['nullable', 'array'],
            'functional_text' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'attributes' => ['nullable', 'array'],

            // Printing info
            'set_name' => ['nullable', 'string', 'max:255'],
            'collector_number' => ['nullable', 'string', 'max:50'],
            'rarity' => ['nullable', 'string', 'max:20'],
            'foiling' => ['nullable', 'string', 'max:20'],
            'language' => ['nullable', 'string', 'max:10'],
            'edition' => ['nullable', 'string', 'max:20'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'game_id.required' => 'Bitte wähle ein Spiel aus.',
            'game_id.exists' => 'Das ausgewählte Spiel existiert nicht.',
            'name.required' => 'Der Kartenname ist erforderlich.',
            'name.max' => 'Der Kartenname darf maximal 255 Zeichen lang sein.',
        ];
    }
}
