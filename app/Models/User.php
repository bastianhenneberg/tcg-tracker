<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'scanner_settings',
        'mtg_scanner_settings',
        'riftbound_scanner_settings',
        'op_scanner_settings',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'scanner_settings' => 'array',
            'mtg_scanner_settings' => 'array',
            'riftbound_scanner_settings' => 'array',
            'op_scanner_settings' => 'array',
        ];
    }

    public function boxes(): HasMany
    {
        return $this->hasMany(Box::class);
    }

    public function lots(): HasMany
    {
        return $this->hasMany(Lot::class);
    }

    public function unifiedInventory(): HasMany
    {
        return $this->hasMany(UnifiedInventory::class);
    }

    public function inventory(): HasMany
    {
        return $this->hasMany(UnifiedInventory::class)->where('in_collection', false);
    }

    public function collection(): HasMany
    {
        return $this->hasMany(UnifiedInventory::class)->where('in_collection', true);
    }
}
