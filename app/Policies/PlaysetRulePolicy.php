<?php

namespace App\Policies;

use App\Models\PlaysetRule;
use App\Models\User;

class PlaysetRulePolicy
{
    public function update(User $user, PlaysetRule $playsetRule): bool
    {
        return $user->id === $playsetRule->user_id;
    }

    public function delete(User $user, PlaysetRule $playsetRule): bool
    {
        return $user->id === $playsetRule->user_id;
    }
}
