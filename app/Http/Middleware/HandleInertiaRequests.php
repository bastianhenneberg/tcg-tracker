<?php

namespace App\Http\Middleware;

use App\Models\Game;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        $user = $request->user();
        $notifications = [];
        $unreadCount = 0;
        $customGames = [];

        if ($user) {
            $notifications = $user->notifications()
                ->latest()
                ->limit(20)
                ->get()
                ->map(fn ($n) => [
                    'id' => $n->id,
                    'action' => $n->data['action'] ?? null,
                    'message' => $n->data['message'] ?? '',
                    'url' => $n->data['url'] ?? null,
                    'meta' => $n->data['meta'] ?? [],
                    'read' => $n->read_at !== null,
                    'created_at' => $n->created_at->diffForHumans(),
                ]);
            $unreadCount = $user->unreadNotifications()->count();

            // Load custom games for sidebar (exclude official games like fab, mtg, riftbound)
            $customGames = Game::where(function ($query) use ($user) {
                $query->where('is_official', false)
                    ->where('user_id', $user->id);
            })
                ->whereNotIn('slug', ['fab', 'mtg', 'riftbound'])
                ->orderBy('name')
                ->get()
                ->map(fn ($game) => [
                    'id' => $game->id,
                    'name' => $game->name,
                    'slug' => $game->slug,
                ]);
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $user,
            ],
            'notifications' => [
                'items' => $notifications,
                'unread_count' => $unreadCount,
            ],
            'customGames' => $customGames,
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash' => [
                'scanner' => $request->session()->get('scanner'),
                'customCard' => $request->session()->get('customCard'),
            ],
        ];
    }
}
