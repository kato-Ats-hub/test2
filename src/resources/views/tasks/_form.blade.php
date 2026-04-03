<div class="mb-3">
    <label for="title" class="form-label">タイトル <span class="text-danger">*</span></label>
    <input type="text" id="title" name="title" class="form-control @error('title') is-invalid @enderror"
           value="{{ old('title', $task->title ?? '') }}" required>
    @error('title')
        <div class="invalid-feedback">{{ $message }}</div>
    @enderror
</div>

<div class="mb-3">
    <label for="description" class="form-label">説明</label>
    <textarea id="description" name="description" rows="4"
              class="form-control @error('description') is-invalid @enderror">{{ old('description', $task->description ?? '') }}</textarea>
    @error('description')
        <div class="invalid-feedback">{{ $message }}</div>
    @enderror
</div>

<div class="mb-3">
    <label for="status" class="form-label">ステータス <span class="text-danger">*</span></label>
    <select id="status" name="status" class="form-select @error('status') is-invalid @enderror">
        <option value="pending"     {{ old('status', $task->status ?? 'pending') === 'pending'     ? 'selected' : '' }}>未着手</option>
        <option value="in_progress" {{ old('status', $task->status ?? '')        === 'in_progress' ? 'selected' : '' }}>進行中</option>
        <option value="completed"   {{ old('status', $task->status ?? '')        === 'completed'   ? 'selected' : '' }}>完了</option>
    </select>
    @error('status')
        <div class="invalid-feedback">{{ $message }}</div>
    @enderror
</div>

<div class="mb-3">
    <label for="due_date" class="form-label">期日</label>
    <input type="date" id="due_date" name="due_date"
           class="form-control @error('due_date') is-invalid @enderror"
           value="{{ old('due_date', isset($task->due_date) ? $task->due_date->format('Y-m-d') : '') }}">
    @error('due_date')
        <div class="invalid-feedback">{{ $message }}</div>
    @enderror
</div>
