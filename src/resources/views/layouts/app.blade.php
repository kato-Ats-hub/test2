<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'タスク管理')</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css">
</head>
<body class="bg-light">
    <nav class="navbar navbar-expand navbar-dark bg-dark mb-4">
        <div class="container">
            <a class="navbar-brand" href="{{ route('tasks.index') }}" style="font-size: 1.8rem; font-weight: bold; background: rgba(100, 210, 200, 0.25); padding: 4px 16px; border-radius: 8px; color: #e0f7f5;">タスク管理アプリ</a>
            <ul class="navbar-nav ms-3">
                <li class="nav-item">
                    <a class="nav-link {{ request()->routeIs('tasks.*') ? 'active' : '' }}" href="{{ route('tasks.index') }}">タスク一覧</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link {{ request()->routeIs('api-demo.*') ? 'active' : '' }}" href="{{ route('api-demo.index') }}">API学習</a>
                </li>
            </ul>
            @auth
            <ul class="navbar-nav ms-auto">
                <li class="nav-item d-flex align-items-center me-3">
                    <span class="text-light">こんにちは、{{ auth()->user()->name }}さん</span>
                </li>
                <li class="nav-item">
                    <form action="{{ route('logout') }}" method="POST">
                        @csrf
                        <button type="submit" class="btn btn-outline-light btn-sm mt-1">ログアウト</button>
                    </form>
                </li>
            </ul>
            @endauth
        </div>
    </nav>

    <div class="container">
        @if (session('success'))
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                {{ session('success') }}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        @endif

        @yield('content')
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
