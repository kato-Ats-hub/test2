<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class FamilySeeder extends Seeder
{
    public function run(): void
    {
        User::create(['name' => 'お父さん', 'password' => Hash::make('1234')]);
        User::create(['name' => 'お母さん', 'password' => Hash::make('5678')]);
        User::create(['name' => '太郎', 'password' => Hash::make('0000')]);
    }
}
