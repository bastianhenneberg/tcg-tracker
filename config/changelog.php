<?php

use App\Models\User;

return [

    /*
    |--------------------------------------------------------------------------
    | Changelog Path
    |--------------------------------------------------------------------------
    |
    | The directory where changelog markdown files are stored.
    |
    */
    'path' => base_path('changelogs'),

    /*
    |--------------------------------------------------------------------------
    | User Model
    |--------------------------------------------------------------------------
    |
    | The fully qualified class name of your User model.
    |
    */
    'user_model' => User::class,

    /*
    |--------------------------------------------------------------------------
    | Route Configuration
    |--------------------------------------------------------------------------
    |
    | Configure the routes registered by the changelog package.
    |
    */
    'routes' => [
        'enabled' => true,

        // Public changelog routes
        'public' => [
            'prefix' => 'changelogs',
            'middleware' => ['web', 'auth', 'verified'],
            'name_prefix' => 'changelogs.',
        ],

        // Admin changelog routes
        'admin' => [
            'prefix' => 'admin/changelogs',
            'middleware' => ['web', 'auth', 'verified'],
            'name_prefix' => 'admin.changelogs.',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Inertia Page Paths
    |--------------------------------------------------------------------------
    |
    | The Inertia page component paths for rendering changelog views.
    | Adjust these to match your frontend stack and directory structure.
    |
    */
    'pages' => [
        'public' => [
            'index' => 'changelogs/index',
            'show' => 'changelogs/show',
        ],
        'admin' => [
            'index' => 'admin/changelogs/index',
            'create' => 'admin/changelogs/create',
            'show' => 'admin/changelogs/show',
            'edit' => 'admin/changelogs/edit',
        ],
    ],

];
