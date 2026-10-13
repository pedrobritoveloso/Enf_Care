import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = await context.params;
    const turnoId = params.id;

    if (!turnoId) {
      return NextResponse.json({ error: "ID do turno não fornecido" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 1. Obter utilizador e o respetivo perfil de enfermeiro
    const utilizador = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
      include: { enfermeiro: true },
    });

    if (!utilizador) {
      return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
    }

    let enfermeiro = utilizador.enfermeiro;

    // 2. Se o perfil de enfermeiro ainda não existir, cria um
    if (!enfermeiro) {
      enfermeiro = await prisma.enfermeiro.create({
        data: {
          utilizadorId: utilizador.id,
          cedulaProfissional: `TEMP-${Date.now()}`,
        },
      });
    }

    // 3. Executa a transação para submeter a candidatura
    const resultado = await prisma.$transaction(async (tx) => {
      const turno = await tx.turno.findUnique({
        where: { id: turnoId },
      });

      if (!turno || (turno.estado !== "PUBLICADO" && turno.estado !== "AGUARDAR_ENFERMEIRO")) {
        throw new Error("Este turno já não se encontra disponível para candidaturas.");
      }

      // Verificar se o enfermeiro já submeteu candidatura a este turno
      const candidaturaExistente = await tx.candidatura.findUnique({
        where: {
          turnoId_enfermeiroId: {
            turnoId: turno.id,
            enfermeiroId: enfermeiro.id,
          },
        },
      });

      if (candidaturaExistente) {
        throw new Error("Já submeteu uma candidatura para este turno.");
      }

      // Criar a candidatura com estado PENDENTE (em vez de atribuição direta)
      const candidatura = await tx.candidatura.create({
        data: {
          turnoId: turno.id,
          enfermeiroId: enfermeiro.id,
          estado: "PENDENTE", //[cite: 10]
        },
      });

      // Atualizar o estado do turno para indicar que tem candidaturas a aguardar validação
      await tx.turno.update({
        where: { id: turno.id },
        data: { estado: "AGUARDAR_ENFERMEIRO" }, //[cite: 10]
      });

      return candidatura;
    });

    return NextResponse.json({
      message: "Candidatura submetida com sucesso! Aguarde aprovação do administrador.",
      resultado,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao submeter candidatura." },
      { status: 400 }
    );
  }
}