<?php

namespace App\Policies;

use App\Models\Game;
use App\Models\User;

class GamePolicy
{
    public function view(User $user, Game $game): bool
    {
        return $game->is_official || $game->user_id === $user->id;
    }

    public function update(User $user, Game $game): bool
    {
        // Only custom games can be updated by their owner
        return ! $game->is_official && $game->user_id === $user->id;
    }

    public function delete(User $user, Game $game): bool
    {
        // Only custom games can be deleted by their owner
        return ! $game->is_official && $game->user_id === $user->id;
    }
}
