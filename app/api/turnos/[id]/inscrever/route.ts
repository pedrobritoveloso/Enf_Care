import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Resolve os params quer venham como Promise (Next.js 15) ou objeto simples
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

    // 2. Se por alguma razão o perfil de enfermeiro ainda não existir, cria um
    if (!enfermeiro) {
      enfermeiro = await prisma.enfermeiro.create({
        data: {
          utilizadorId: utilizador.id,
          cedulaProfissional: `TEMP-${Date.now()}`,
        },
      });
    }

    // 3. Executa a transação com o turnoId já validado
    const resultado = await prisma.$transaction(async (tx) => {
      const turno = await tx.turno.findUnique({
        where: { id: turnoId },
      });

      if (!turno || (turno.estado !== "PUBLICADO" && turno.estado !== "AGUARDAR_ENFERMEIRO")) {
        throw new Error("Este turno já não se encontra disponível.");
      }

      const atribuicao = await tx.atribuicao.create({
        data: {
          turnoId: turno.id,
          enfermeiroId: enfermeiro.id,
        },
      });

      await tx.turno.update({
        where: { id: turno.id },
        data: { estado: "ATRIBUIDO" },
      });

      return atribuicao;
    });

    return NextResponse.json({ message: "Turno reservado com sucesso!", resultado });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao aceitar o turno." },
      { status: 400 }
    );
  }
}