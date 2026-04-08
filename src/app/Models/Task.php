<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Task extends Model
{
    protected $fillable = [
        'title',
        'description',
        'status',
        'due_date',
        'user_id',
    ];

    protected $casts = [
        'due_date' => 'date',
    ];

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
