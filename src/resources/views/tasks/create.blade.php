@extends('layouts.app')

@section('title', 'タスク作成')

@section('content')
<div class="row justify-content-center">
    <div class="col-md-8">
        <div class="card">
            <div class="card-header">タスク作成</div>
            <div class="card-body">
                <form action="{{ route('tasks.store') }}" method="POST">
                    @csrf
                    @include('tasks._form')
                    <div class="d-flex gap-2 mt-3">
                        <button type="submit" class="btn btn-primary">作成</button>
                        <a href="{{ route('tasks.index') }}" class="btn btn-outline-secondary">キャンセル</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
@endsection
