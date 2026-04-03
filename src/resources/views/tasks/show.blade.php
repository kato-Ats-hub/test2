@extends('layouts.app')

@section('title', $task->title)

@section('content')
<div class="row justify-content-center">
    <div class="col-md-8">
        <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
                <span>タスク詳細</span>
                <div class="d-flex gap-2">
                    <a href="{{ route('tasks.edit', $task) }}" class="btn btn-sm btn-outline-secondary">編集</a>
                    <form action="{{ route('tasks.destroy', $task) }}" method="POST"
                          onsubmit="return confirm('削除しますか？')">
                        @csrf
                        @method('DELETE')
                        <button type="submit" class="btn btn-sm btn-outline-danger">削除</button>
                    </form>
                </div>
            </div>
            <div class="card-body">
                <dl class="row mb-0">
                    <dt class="col-sm-3">タイトル</dt>
                    <dd class="col-sm-9">{{ $task->title }}</dd>

                    <dt class="col-sm-3">説明</dt>
                    <dd class="col-sm-9">{{ $task->description ?? '—' }}</dd>

                    <dt class="col-sm-3">ステータス</dt>
                    <dd class="col-sm-9">
                        @php
                            $badges = [
                                'pending'     => ['label' => '未着手', 'class' => 'bg-secondary'],
                                'in_progress' => ['label' => '進行中', 'class' => 'bg-primary'],
                                'completed'   => ['label' => '完了',   'class' => 'bg-success'],
                            ];
                            $badge = $badges[$task->status];
                        @endphp
                        <span class="badge {{ $badge['class'] }}">{{ $badge['label'] }}</span>
                    </dd>

                    <dt class="col-sm-3">期日</dt>
                    <dd class="col-sm-9">{{ $task->due_date?->format('Y/m/d') ?? '—' }}</dd>

                    <dt class="col-sm-3">作成日時</dt>
                    <dd class="col-sm-9">{{ $task->created_at->format('Y/m/d H:i') }}</dd>
                </dl>
            </div>
        </div>

        <div class="mt-3">
            <a href="{{ route('tasks.index') }}" class="btn btn-outline-secondary">← 一覧に戻る</a>
        </div>
    </div>
</div>
@endsection
