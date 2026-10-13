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

    const utilizador = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
      include: { enfermeiro: true },
    });

    if (!utilizador?.enfermeiro) {
      return NextResponse.json({ error: "Perfil de enfermeiro não encontrado" }, { status: 404 });
    }

    const historico = await prisma.assiduidade.findMany({
      where: {
        enfermeiroId: utilizador.enfermeiro.id,
        saidaReal: { not: null }, // Apenas turnos terminados
      },
      include: {
        turno: {
          include: {
            instituicao: true,
          },
        },
      },
      orderBy: { entradaReal: "desc" },
    });

    return NextResponse.json({ historico });
  } catch (error: any) {
    console.error("Erro ao obter histórico:", error);
    return NextResponse.json({ error: error.message || "Erro no servidor" }, { status: 500 });
  }
}