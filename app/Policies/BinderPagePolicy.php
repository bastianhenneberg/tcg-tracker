<?php

namespace App\Policies;

use App\Models\BinderPage;
use App\Models\User;

class BinderPagePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, BinderPage $binderPage): bool
    {
        return $user->id === $binderPage->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, BinderPage $binderPage): bool
    {
        return $user->id === $binderPage->user_id;
    }

    public function delete(User $user, BinderPage $binderPage): bool
    {
        return $user->id === $binderPage->user_id;
    }
}
