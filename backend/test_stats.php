<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$user = App\Models\User::whereNotNull('tenant_id')->first();
$request = Illuminate\Http\Request::create('/dashboard/stats', 'GET');
$request->setUserResolver(function () use ($user) { return $user; });
$controller = new App\Domain\Dashboard\Controllers\DashboardStatsController();
echo $controller->index($request)->getContent();
