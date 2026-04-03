@extends('layouts.app')

@section('title', 'タスク一覧')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-3">
    <h1 class="h3">タスク一覧</h1>
    <a href="{{ route('tasks.create') }}" class="btn btn-primary">+ 新規作成</a>
</div>

@if ($tasks->isEmpty())
    <div class="card">
        <div class="card-body text-center text-muted py-5">
            タスクがありません。新規作成してください。
        </div>
    </div>
@else
    <div class="card">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead class="table-light">
                    <tr>
                        <th>タイトル</th>
                        <th>ステータス</th>
                        <th>期日</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($tasks as $task)
                    <tr>
                        <td>
                            <a href="{{ route('tasks.show', $task) }}" class="text-decoration-none fw-semibold">
                                {{ $task->title }}
                            </a>
                        </td>
                        <td>
                            @php
                                $badges = [
                                    'pending'     => ['label' => '未着手', 'class' => 'bg-secondary'],
                                    'in_progress' => ['label' => '進行中', 'class' => 'bg-primary'],
                                    'completed'   => ['label' => '完了',   'class' => 'bg-success'],
                                ];
                                $badge = $badges[$task->status];
                            @endphp
                            <span class="badge {{ $badge['class'] }}">{{ $badge['label'] }}</span>
                        </td>
                        <td>{{ $task->due_date?->format('Y/m/d') ?? '—' }}</td>
                        <td class="text-end">
                            <a href="{{ route('tasks.show', $task) }}" class="btn btn-sm btn-outline-info">詳細</a>
                            <a href="{{ route('tasks.edit', $task) }}" class="btn btn-sm btn-outline-secondary">編集</a>
                            <form action="{{ route('tasks.destroy', $task) }}" method="POST" class="d-inline"
                                  onsubmit="return confirm('削除しますか？')">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="btn btn-sm btn-outline-danger">削除</button>
                            </form>
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>
@endif
@endsection
