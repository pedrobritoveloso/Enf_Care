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
    });

    // Correção: utilizar "tipo" em vez de "role" conforme o modelo da base de dados
    if (!utilizador || String(utilizador.tipo).toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Acesso não autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const mes = searchParams.get("mes"); // Exemplo: "2026-10"

    let dataInicio: Date;
    let dataFim: Date;

    if (mes && mes.includes("-")) {
      const [anoStr, mesStr] = mes.split("-");
      const ano = parseInt(anoStr, 10);
      const mesNum = parseInt(mesStr, 10);

      dataInicio = new Date(Date.UTC(ano, mesNum - 1, 1, 0, 0, 0, 0));
      dataFim = new Date(Date.UTC(ano, mesNum, 0, 23, 59, 59, 999));
    } else {
      const agora = new Date();
      dataInicio = new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0, 0));
      dataFim = new Date(Date.UTC(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59, 999));
    }

    const assiduidades = await prisma.assiduidade.findMany({
      where: {
        entradaReal: {
          gte: dataInicio,
          lte: dataFim,
        },
        saidaReal: { not: null },
      },
      include: {
        enfermeiro: {
          include: { utilizador: true },
        },
        turno: {
          include: { instituicao: true },
        },
      },
      orderBy: { entradaReal: "desc" },
    });

    return NextResponse.json({
      assiduidades,
      periodo: { inicio: dataInicio, fim: dataFim },
    });
  } catch (error: any) {
    console.error("Erro no relatório de assiduidade:", error);
    return NextResponse.json({ error: error.message || "Erro no servidor" }, { status: 500 });
  }
}