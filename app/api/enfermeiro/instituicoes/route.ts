import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const instituicoes = await prisma.instituicao.findMany({
      where: {
        ativo: true, // Enfermeiros só veem instituições ativas
      },
      orderBy: {
        nome: "asc",
      },
    });

    return NextResponse.json(instituicoes);
  } catch (error: any) {
    console.error("Erro ao procurar instituições para enfermeiro:", error);
    return NextResponse.json(
      { error: "Erro ao procurar instituições" },
      { status: 500 }
    );
  }
}