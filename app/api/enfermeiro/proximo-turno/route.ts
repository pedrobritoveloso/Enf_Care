import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const utilizador = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
      include: { enfermeiro: true },
    });

    if (!utilizador?.enfermeiro) {
      return NextResponse.json({ error: "Enfermeiro não encontrado" }, { status: 404 });
    }

    const enfermeiroId = utilizador.enfermeiro.id;

    // Procurar o próximo turno atribuído ou em curso do enfermeiro
    const proximoTurno = await prisma.turno.findFirst({
      where: {
        atribuicoes: {
          some: { enfermeiroId },
        },
        estado: {
          in: ["ATRIBUIDO", "EM_CURSO"],
        },
      },
      orderBy: {
        data: "asc",
      },
      include: {
        instituicao: true,
        assiduidades: {
          where: { enfermeiroId },
          orderBy: { entradaReal: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json(proximoTurno || null);
  } catch (error: any) {
    console.error("Erro ao procurar próximo turno:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}