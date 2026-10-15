import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // 1. Obter o utilizador e o id do enfermeiro
    const utilizador = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
      include: { enfermeiro: true },
    });

    if (!utilizador?.enfermeiro) {
      return NextResponse.json({ error: "Perfil de enfermeiro não encontrado" }, { status: 404 });
    }

    const enfermeiroId = utilizador.enfermeiro.id;

    // 2. Procurar todas as atribuições do enfermeiro com os respetivos turnos
    const atribuicoes = await prisma.atribuicao.findMany({
      where: {
        enfermeiroId,
      },
      include: {
        turno: {
          include: {
            instituicao: {
              select: {
                nome: true,
                morada: true,
              },
            },
            assiduidades: {
              where: { enfermeiroId },
            },
          },
        },
      },
    });

    // Extrai e formata a lista de turnos
    const turnos = atribuicoes.map((a) => a.turno);

    return NextResponse.json(turnos);
  } catch (error: any) {
    console.error("Erro ao obter horário do enfermeiro:", error);
    return NextResponse.json({ error: "Erro ao procurar horário." }, { status: 500 });
  }
}