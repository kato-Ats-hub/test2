@extends('layouts.app')

@section('title', 'ログイン | 家族のタスク管理')

@section('content')
<div class="row justify-content-center">
    <div class="col-md-6 col-lg-5">
        <div class="card shadow-sm border-0 rounded-4">
            <div class="card-body p-4 p-md-5">
                <h1 class="h3 text-center mb-4 fw-bold text-secondary">だれですか？</h1>

                <form method="POST" action="{{ route('login') }}" id="loginForm">
                    @csrf
                    
                    <div class="mb-4">
                        <select name="name" class="form-select form-select-lg @error('name') is-invalid @enderror rounded-pill text-center" required id="nameSelect">
                            <option value="">-- なまえをえらんでください --</option>
                            @foreach($users as $user)
                                <option value="{{ $user->name }}" {{ old('name') == $user->name ? 'selected' : '' }}>
                                    {{ $user->name }}
                                </option>
                            @endforeach
                        </select>
                        @error('name')
                            <div class="invalid-feedback text-center">{{ $message }}</div>
                        @enderror
                    </div>

                    <div class="mb-4 px-4 text-center">
                        <input type="password" name="password" id="pinInput" class="form-control form-control-lg text-center fs-2 tracking-widest bg-light rounded-pill border-secondary-subtle @error('password') is-invalid @enderror" readonly required placeholder="••••">
                        @error('password')
                            <div class="invalid-feedback d-block fw-bold">{{ $message }}</div>
                        @enderror
                    </div>

                    <!-- PIN PAD -->
                    <div class="row g-2 justify-content-center mt-3 mx-auto" style="max-width: 250px;">
                        @foreach([7, 8, 9, 4, 5, 6, 1, 2, 3] as $num)
                            <div class="col-4">
                                <button type="button" class="btn btn-light border-0 w-100 fs-2 py-2 rounded-circle pin-btn fw-semibold shadow-sm text-secondary" data-val="{{ $num }}">{{ $num }}</button>
                            </div>
                        @endforeach
                        <div class="col-4 offset-4">
                            <button type="button" class="btn btn-light border-0 w-100 fs-2 py-2 rounded-circle pin-btn fw-semibold shadow-sm text-secondary" data-val="0">0</button>
                        </div>
                        <div class="col-4 d-flex align-items-center">
                            <button type="button" class="btn btn-link text-danger text-decoration-none w-100 fs-5 p-0" id="pinClear">消す</button>
                        </div>
                    </div>

                    <div class="d-grid mt-5">
                        <button type="submit" class="btn btn-primary btn-lg rounded-pill fw-bold shadow-sm" id="submitBtn" disabled>ログイン</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<style>
.tracking-widest { letter-spacing: 0.5em; font-family: monospace; }
.pin-btn:active { background-color: #e2e6ea !important; transform: scale(0.95); transition: transform 0.1s; }
.pin-btn { transition: transform 0.1s; }
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const pinInput = document.getElementById('pinInput');
    const submitBtn = document.getElementById('submitBtn');
    const nameSelect = document.getElementById('nameSelect');
    
    function checkForm() {
        if (pinInput.value.length >= 4 && nameSelect.value !== '') {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }

    document.querySelectorAll('.pin-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (pinInput.value.length < 8) {
                pinInput.value += this.getAttribute('data-val');
                checkForm();
            }
        });
    });

    document.getElementById('pinClear').addEventListener('click', function(e) {
        e.preventDefault();
        pinInput.value = '';
        checkForm();
    });

    nameSelect.addEventListener('change', checkForm);
    checkForm();
});
</script>
@endsection
