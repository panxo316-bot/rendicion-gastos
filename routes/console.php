<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Respaldo diario a Google Sheets (cada día a las 02:00 AM)
Schedule::command('app:backup-to-sheets')
    ->dailyAt('02:00')
    ->appendOutputTo(storage_path('logs/backup-sheets.log'));
