<?php

use App\Models\Task;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

// 家族メンバー一覧（名前のみ、ログイン画面用）
Route::get('/users', function () {
    return response()->json(
        User::orderBy('id')->get()->map(fn ($u) => ['id' => $u->id, 'name' => $u->name])
    );
});

// 新規登録
Route::post('/register', function (Request $request) {
    $request->validate([
        'name'             => 'required|string|max:255|unique:users,name',
        'pin'              => 'required|digits:4',
        'pin_confirmation' => 'required|same:pin',
    ], [
        'name.unique'          => 'この名前はすでに使われています',
        'pin.digits'           => 'PINは4桁の数字にしてください',
        'pin_confirmation.same' => 'PINが一致しません',
    ]);

    $user = User::create([
        'name'     => $request->name,
        'password' => Hash::make($request->pin),
    ]);

    $token = Str::random(60);
    $user->update(['api_token' => $token]);

    return response()->json(['token' => $token, 'user' => ['id' => $user->id, 'name' => $user->name]], 201);
});

// PINログイン
Route::post('/login', function (Request $request) {
    $request->validate([
        'user_id' => 'required|integer',
        'pin'     => 'required|string',
    ]);

    $user = User::find($request->user_id);

    if (!$user || !Hash::check($request->pin, $user->password)) {
        return response()->json(['message' => 'PINが違います'], 401);
    }

    $token = Str::random(60);
    $user->update(['api_token' => $token]);

    return response()->json(['token' => $token, 'user' => ['id' => $user->id, 'name' => $user->name]]);
});

// ログアウト（トークン削除）
Route::post('/logout', function (Request $request) {
    $token = $request->bearerToken();
    if ($token) {
        User::where('api_token', $token)->update(['api_token' => null]);
    }
    return response()->json(null, 204);
});

// 認証が必要なルート
Route::middleware('auth.token')->group(function () {

    Route::get('/me', function (Request $request) {
        $user = $request->user();
        return response()->json(['id' => $user->id, 'name' => $user->name]);
    });

    Route::get('/tasks', function (Request $request) {
        $tasks = $request->user()->tasks()->orderBy('created_at', 'desc')->get();
        return response()->json($tasks);
    });

    Route::post('/tasks', function (Request $request) {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'status'      => 'required|in:pending,in_progress,completed',
            'due_date'    => 'nullable|date',
        ]);

        $task = $request->user()->tasks()->create($validated);
        return response()->json($task, 201);
    });

    Route::put('/tasks/{task}', function (Request $request, Task $task) {
        if ($task->user_id !== $request->user()->id) {
            return response()->json(['message' => '権限がありません'], 403);
        }

        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'status'      => 'required|in:pending,in_progress,completed',
            'due_date'    => 'nullable|date',
        ]);

        $task->update($validated);
        return response()->json($task);
    });

    Route::delete('/tasks/{task}', function (Request $request, Task $task) {
        if ($task->user_id !== $request->user()->id) {
            return response()->json(['message' => '権限がありません'], 403);
        }

        $task->delete();
        return response()->json(null, 204);
    });
});
