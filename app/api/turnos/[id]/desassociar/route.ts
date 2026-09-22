import { NextResponse } from "next/server";
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

    // 1. Verificar se o turno existe e se tem enfermeiro associado
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

    if (turno.atribuicoes.length === 0) {
      return NextResponse.json(
        { error: "Este turno não tem nenhum enfermeiro associado para remover." },
        { status: 400 }
      );
    }

    // 2. Executar a remoção e alteração de estado numa única transação atómica
    const turnoAtualizado = await prisma.$transaction(async (tx) => {
      // Elimina apenas a atribuição associada a ESTE turno especificamente
      await tx.atribuicao.deleteMany({
        where: { turnoId },
      });

      // Atualiza o estado do turno para PUBLICADO (ficando novamente na bolsa)
      return await tx.turno.update({
        where: { id: turnoId },
        data: { estado: "PUBLICADO" },
      });
    });

    return NextResponse.json({
      message: "Enfermeiro removido do turno com sucesso!",
      turno: turnoAtualizado,
    });
  } catch (error) {
    console.error("Erro ao desassociar enfermeiro:", error);
    return NextResponse.json(
      { error: "Erro interno ao desassociar enfermeiro do turno." },
      { status: 500 }
    );
  }
}