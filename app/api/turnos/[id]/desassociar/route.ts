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

    if (!utilizador) {
      return NextResponse.json({ error: "Utilizador não encontrado." }, { status: 404 });
    }

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

    const isAdmin = utilizador.tipo === "ADMIN";
    const enfermeiroId = utilizador.enfermeiro?.id;

    // Se for enfermeiro, validamos estritamente se o turno está atribuído a ele próprio
    if (!isAdmin) {
      if (!enfermeiroId) {
        return NextResponse.json({ error: "Perfil de enfermeiro não encontrado." }, { status: 403 });
      }

      const temAtribuicao = turno.atribuicoes.some(
        (atrib) => atrib.enfermeiroId === enfermeiroId
      );

      if (!temAtribuicao) {
        return NextResponse.json(
          { error: "Não tem permissão para desistir deste turno pois não lhe está atribuído." },
          { status: 403 }
        );
      }
    }

    // Executar a remoção das atribuições, candidaturas e alteração de estado numa transação atómica
    const turnoAtualizado = await prisma.$transaction(async (tx) => {
      if (!isAdmin && enfermeiroId) {
        await tx.atribuicao.deleteMany({
          where: { turnoId, enfermeiroId },
        });
        await tx.candidatura.deleteMany({
          where: { turnoId, enfermeiroId },
        });
      } else {
        // Se for admin, remove todas as atribuições e candidaturas do turno
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