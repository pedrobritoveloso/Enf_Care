import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Obter a configuração de tarifas atual
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    let config = await prisma.configuracaoTarifa.findFirst();

    // Se ainda não existir nenhuma configuração, cria uma com valores padrão
    if (!config) {
      config = await prisma.configuracaoTarifa.create({
        data: {
          valorDiurno: 12.0,
          valorNoturno: 15.0,
          valorEspecial: 18.0,
        },
      });
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error("Erro ao obter configuração de tarifas:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}

// Atualizar ou criar as tarifas
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { valorDiurno, valorNoturno, valorEspecial } = body;

    if (
      valorDiurno === undefined ||
      valorNoturno === undefined ||
      valorEspecial === undefined
    ) {
      return NextResponse.json({ error: "Todos os valores de tarifa são obrigatórios." }, { status: 400 });
    }

    let config = await prisma.configuracaoTarifa.findFirst();

    if (config) {
      config = await prisma.configuracaoTarifa.update({
        where: { id: config.id },
        data: {
          valorDiurno: parseFloat(valorDiurno),
          valorNoturno: parseFloat(valorNoturno),
          valorEspecial: parseFloat(valorEspecial),
        },
      });
    } else {
      config = await prisma.configuracaoTarifa.create({
        data: {
          valorDiurno: parseFloat(valorDiurno),
          valorNoturno: parseFloat(valorNoturno),
          valorEspecial: parseFloat(valorEspecial),
        },
      });
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error("Erro ao guardar tarifas:", error);
    return NextResponse.json({ error: "Erro ao guardar alterações." }, { status: 500 });
  }
}