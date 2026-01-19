<?php

namespace App\Http\Requests;

use App\Models\Deck;
use Illuminate\Foundation\Http\FormRequest;

class StoreDeckRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Deck::class);
    }

    /**
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'game_format_id' => ['required', 'exists:game_formats,id'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_public' => ['nullable', 'boolean'],
            'use_collection_only' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Der Deckname ist erforderlich.',
            'name.max' => 'Der Deckname darf maximal 255 Zeichen lang sein.',
            'game_format_id.required' => 'Bitte wähle ein Format aus.',
            'game_format_id.exists' => 'Das ausgewählte Format existiert nicht.',
        ];
    }
}
