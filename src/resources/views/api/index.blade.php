@extends('layouts.app')

@section('title', 'API学習')

@section('content')
<h1 class="h3 mb-4">API学習 — JSからデータ取得</h1>

<div class="alert alert-info">
    <strong>叩くAPI：</strong>
    <code>GET /api-demo/tasks</code>
</div>

<button id="fetchBtn" class="btn btn-primary mb-3">タスクを取得する</button>
<button id="clearBtn" class="btn btn-secondary mb-3">クリア</button>

<p id="count" class="fw-bold"></p>
<div id="result"></div>

<pre id="rawJson" class="bg-dark text-success p-3 rounded mt-3" style="display:none; font-size: 0.85rem;"></pre>

<script>
document.getElementById('fetchBtn').addEventListener('click', async () => {
    const result = document.getElementById('result');
    result.innerHTML = '<p class="text-muted">取得中...</p>';

    const response = await fetch('/api-demo/tasks');
    const tasks = await response.json();

    document.getElementById('count').textContent = `取得したタスク一覧（${tasks.length}件）`;

    if (tasks.length === 0) {
        result.innerHTML = '<p class="text-muted">タスクがありません。</p>';
        return;
    }

    result.innerHTML = tasks.map(task => `
        <div class="card mb-2">
            <div class="card-body py-2">
                <strong>${task.title}</strong>
                <span class="badge bg-secondary ms-2">${task.status}</span>
                <p class="mb-0 text-muted small">${task.description ?? ''}</p>
            </div>
        </div>
    `).join('');

    // 生のJSONを整形して表示
    const rawJson = document.getElementById('rawJson');
    rawJson.textContent = JSON.stringify(tasks, null, 2);
    rawJson.style.display = 'block';
});

document.getElementById('clearBtn').addEventListener('click', () => {
    document.getElementById('count').textContent = '';
    document.getElementById('result').innerHTML = '';
    const rawJson = document.getElementById('rawJson');
    rawJson.textContent = '';
    rawJson.style.display = 'none';
});
</script>
@endsection
