<?php

namespace App\Http\Controllers;

use App\Models\Task;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index()
    {
        $tasks = auth()->user()->tasks()->orderBy('created_at', 'desc')->get();
        return view('tasks.index', compact('tasks'));
    }

    public function create()
    {
        return view('tasks.create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'status'      => 'required|in:pending,in_progress,completed',
            'due_date'    => 'nullable|date',
        ]);

        auth()->user()->tasks()->create($validated);

        return redirect()->route('tasks.index')->with('success', 'タスクを作成しました。');
    }

    public function show(Task $task)
    {
        if ($task->user_id !== auth()->id()) abort(403);
        return view('tasks.show', compact('task'));
    }

    public function edit(Task $task)
    {
        if ($task->user_id !== auth()->id()) abort(403);
        return view('tasks.edit', compact('task'));
    }

    public function update(Request $request, Task $task)
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'status'      => 'required|in:pending,in_progress,completed',
            'due_date'    => 'nullable|date',
        ]);

        if ($task->user_id !== auth()->id()) abort(403);

        $task->update($validated);

        return redirect()->route('tasks.index')->with('success', 'タスクを更新しました。');
    }

    public function destroy(Task $task)
    {
        if ($task->user_id !== auth()->id()) abort(403);

        $task->delete();

        return redirect()->route('tasks.index')->with('success', 'タスクを削除しました。');
    }
}
