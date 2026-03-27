<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('usuarios', function (Blueprint $table) {
            $table->string('id', 36)->primary();
            $table->string('usuario', 120)->unique();
            $table->string('password_hash');
            $table->string('nombre_completo');
            $table->string('perfil_id', 36);
            $table->string('activo', 2)->default('SI');
            $table->timestamps();

            $table->foreign('perfil_id')->references('id')->on('perfiles');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('usuarios');
    }
};
