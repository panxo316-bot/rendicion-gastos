<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pagos', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('id_familia', 36);
            $table->string('mes', 7); // YYYY-MM
            $table->decimal('monto', 10, 2)->default(0);
            $table->string('fecha_pago');
            $table->string('link_drive')->nullable();
            $table->timestamps();

            $table->foreign('id_familia')->references('id')->on('familias');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pagos');
    }
};
