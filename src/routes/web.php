<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\TaskController;
use App\Models\Task;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect()->route('tasks.index'));

// 認証ルート
Route::get('/login', [AuthController::class, 'showLogin'])->name('login')->middleware('guest');
Route::post('/login', [AuthController::class, 'login'])->middleware('guest');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout')->middleware('auth');

// 認証が必要なルート
Route::middleware('auth')->group(function () {
    Route::resource('tasks', TaskController::class);
});

// APIデモ用（一旦そのまま）
Route::get('/api-demo', fn () => view('api.index'))->name('api-demo.index');
Route::get('/api-demo/tasks', fn () => response()->json(Task::orderBy('created_at', 'desc')->get()))->name('api-demo.tasks');
