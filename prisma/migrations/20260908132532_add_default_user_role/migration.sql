-- CreateEnum
CREATE TYPE "TipoUtilizador" AS ENUM ('ADMIN', 'ENFERMEIRO');

-- CreateEnum
CREATE TYPE "EstadoTurno" AS ENUM ('RASCUNHO', 'PUBLICADO', 'AGUARDAR_ENFERMEIRO', 'ATRIBUIDO', 'EM_CURSO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "EstadoCandidatura" AS ENUM ('PENDENTE', 'ACEITE', 'REJEITADA');

-- CreateTable
CREATE TABLE "Utilizador" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "password" TEXT NOT NULL,
    "tipo" "TipoUtilizador" NOT NULL DEFAULT 'ENFERMEIRO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utilizador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enfermeiro" (
    "id" TEXT NOT NULL,
    "utilizadorId" TEXT NOT NULL,
    "cedulaProfissional" TEXT NOT NULL,
    "especialidades" TEXT[],
    "dadosProfissionais" TEXT,

    CONSTRAINT "Enfermeiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instituicao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nif" TEXT NOT NULL,
    "morada" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "qrCodeToken" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Instituicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turno" (
    "id" TEXT NOT NULL,
    "instituicaoId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "vagas" INTEGER NOT NULL DEFAULT 1,
    "valorHora" DOUBLE PRECISION,
    "estado" "EstadoTurno" NOT NULL DEFAULT 'RASCUNHO',

    CONSTRAINT "Turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidatura" (
    "id" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,
    "enfermeiroId" TEXT NOT NULL,
    "estado" "EstadoCandidatura" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Candidatura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atribuicao" (
    "id" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,
    "enfermeiroId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Atribuicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assiduidade" (
    "id" TEXT NOT NULL,
    "turnoId" TEXT NOT NULL,
    "enfermeiroId" TEXT NOT NULL,
    "entradaReal" TIMESTAMP(3),
    "saidaReal" TIMESTAMP(3),
    "localizacaoEntradaLat" DOUBLE PRECISION,
    "localizacaoEntradaLon" DOUBLE PRECISION,
    "localizacaoSaidaLat" DOUBLE PRECISION,
    "localizacaoSaidaLon" DOUBLE PRECISION,
    "horasContabilizadas" DOUBLE PRECISION,

    CONSTRAINT "Assiduidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relatorio" (
    "id" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "instituicaoId" TEXT,
    "enfermeiroId" TEXT,
    "ficheiroUrl" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Relatorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditoriaLog" (
    "id" TEXT NOT NULL,
    "utilizadorId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "dadosAnteriores" TEXT,
    "dadosNovos" TEXT,
    "motivo" TEXT,
    "dataHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditoriaLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilizador_email_key" ON "Utilizador"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Enfermeiro_utilizadorId_key" ON "Enfermeiro"("utilizadorId");

-- CreateIndex
CREATE UNIQUE INDEX "Enfermeiro_cedulaProfissional_key" ON "Enfermeiro"("cedulaProfissional");

-- CreateIndex
CREATE UNIQUE INDEX "Instituicao_nif_key" ON "Instituicao"("nif");

-- CreateIndex
CREATE UNIQUE INDEX "Instituicao_qrCodeToken_key" ON "Instituicao"("qrCodeToken");

-- CreateIndex
CREATE UNIQUE INDEX "Candidatura_turnoId_enfermeiroId_key" ON "Candidatura"("turnoId", "enfermeiroId");

-- AddForeignKey
ALTER TABLE "Enfermeiro" ADD CONSTRAINT "Enfermeiro_utilizadorId_fkey" FOREIGN KEY ("utilizadorId") REFERENCES "Utilizador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "Instituicao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidatura" ADD CONSTRAINT "Candidatura_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidatura" ADD CONSTRAINT "Candidatura_enfermeiroId_fkey" FOREIGN KEY ("enfermeiroId") REFERENCES "Enfermeiro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atribuicao" ADD CONSTRAINT "Atribuicao_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atribuicao" ADD CONSTRAINT "Atribuicao_enfermeiroId_fkey" FOREIGN KEY ("enfermeiroId") REFERENCES "Enfermeiro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assiduidade" ADD CONSTRAINT "Assiduidade_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assiduidade" ADD CONSTRAINT "Assiduidade_enfermeiroId_fkey" FOREIGN KEY ("enfermeiroId") REFERENCES "Enfermeiro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relatorio" ADD CONSTRAINT "Relatorio_instituicaoId_fkey" FOREIGN KEY ("instituicaoId") REFERENCES "Instituicao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relatorio" ADD CONSTRAINT "Relatorio_enfermeiroId_fkey" FOREIGN KEY ("enfermeiroId") REFERENCES "Enfermeiro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditoriaLog" ADD CONSTRAINT "AuditoriaLog_utilizadorId_fkey" FOREIGN KEY ("utilizadorId") REFERENCES "Utilizador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
