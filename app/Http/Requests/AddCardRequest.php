<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AddCardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('deck'));
    }

    /**
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'printing_id' => ['required', 'exists:unified_printings,id'],
            'zone' => ['required', 'string', 'max:50'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:99'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'printing_id.required' => 'Die Karte ist erforderlich.',
            'printing_id.exists' => 'Die ausgewählte Karte existiert nicht.',
            'zone.required' => 'Die Zone ist erforderlich.',
            'quantity.min' => 'Die Anzahl muss mindestens 1 sein.',
        ];
    }
}
