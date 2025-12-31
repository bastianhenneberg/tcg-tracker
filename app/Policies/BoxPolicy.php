<?php

namespace App\Policies;

use App\Models\Box;
use App\Models\User;

class BoxPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Box $box): bool
    {
        return $user->id === $box->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Box $box): bool
    {
        return $user->id === $box->user_id;
    }

    public function delete(User $user, Box $box): bool
    {
        return $user->id === $box->user_id;
    }
}
