import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const turnoId = resolvedParams?.id;

    if (!turnoId || typeof turnoId !== "string") {
      return NextResponse.json(
        { error: "ID de turno inválido ou não fornecido." },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const utilizador = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
      include: { enfermeiro: true },
    });

    const turno = await prisma.turno.findUnique({
      where: { id: turnoId },
      include: { atribuicoes: true },
    });

    if (!turno) {
      return NextResponse.json(
        { error: "Turno não encontrado." },
        { status: 404 }
      );
    }

    // Se for o próprio enfermeiro a desistir, podemos identificar o enfermeiroId pelas atribuições
    const enfermeiroId = utilizador?.tipo === "ENFERMEIRO" ? utilizador.enfermeiro?.id : null;

    // 2. Executar a remoção das atribuições, candidaturas e alteração de estado numa transação atómica
    const turnoAtualizado = await prisma.$transaction(async (tx) => {
      // Se for o enfermeiro, remove apenas a sua atribuição e candidatura. Se for admin, pode remover todas.
      if (enfermeiroId) {
        await tx.atribuicao.deleteMany({
          where: { turnoId, enfermeiroId },
        });
        await tx.candidatura.deleteMany({
          where: { turnoId, enfermeiroId },
        });
      } else {
        await tx.atribuicao.deleteMany({
          where: { turnoId },
        });
        await tx.candidatura.deleteMany({
          where: { turnoId },
        });
      }

      // Atualiza o estado do turno para PUBLICADO (ficando novamente na bolsa)
      return await tx.turno.update({
        where: { id: turnoId },
        data: { estado: "PUBLICADO" },
      });
    });

    return NextResponse.json({
      message: "Turno disponibilizado novamente com sucesso!",
      turno: turnoAtualizado,
    });
  } catch (error) {
    console.error("Erro ao desassociar turno:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar a desistência do turno." },
      { status: 500 }
    );
  }
}