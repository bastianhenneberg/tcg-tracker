<?php

use App\Models\User;
use App\Services\OllamaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->user = User::factory()->create();
});

it('renders the folder scanner page without resolving the deferred ollama status', function () {
    // getStatus() must not be called on the initial (non-partial) request.
    $this->mock(OllamaService::class, function ($mock) {
        $mock->shouldNotReceive('getStatus');
    });

    $this->actingAs($this->user)
        ->get(route('scanner.folder'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('scanner/folder')
            ->has('games')
            ->has('lots')
            ->missing('ollamaStatus')
        );
});

it('resolves the ollama status on a partial reload', function () {
    $this->mock(OllamaService::class, function ($mock) {
        $mock->shouldReceive('getStatus')->andReturn([
            'available' => true,
            'host' => 'http://ki-server:11434',
            'model' => 'qwen2.5vl:7b',
        ]);
    });

    // The asset version must match, otherwise Inertia answers a partial GET with a 409.
    $version = $this->actingAs($this->user)
        ->get(route('scanner.folder'))
        ->viewData('page')['version'];

    // A partial reload returns a JSON Inertia response (no root view), so assert on the body directly.
    $this->actingAs($this->user)
        ->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => $version,
            'X-Inertia-Partial-Component' => 'scanner/folder',
            'X-Inertia-Partial-Data' => 'ollamaStatus',
        ])
        ->get(route('scanner.folder'))
        ->assertOk()
        ->assertJsonPath('props.ollamaStatus.available', true)
        ->assertJsonPath('props.ollamaStatus.model', 'qwen2.5vl:7b');
});
