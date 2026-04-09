<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function showLogin()
    {
        $users = User::all();
        return view('auth.login', compact('users'));
    }

    public function login(Request $request)
    {
        $request->validate([
            'name' => 'required|string',
            'password' => 'required|string',
        ]);

        if (Auth::attempt(['name' => $request->name, 'password' => $request->password], true)) {
            $request->session()->regenerate();
            return redirect()->intended('tasks');
        }

        return back()->withErrors([
            'password' => 'PINコードが間違っています。',
        ])->onlyInput('name');
    }

    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/login');
    }
}
