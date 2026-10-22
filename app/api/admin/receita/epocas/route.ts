import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Listar todas as épocas especiais
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const epocas = await prisma.epocaEspecial.findMany({
      orderBy: { dataInicio: "asc" },
    });

    return NextResponse.json(epocas);
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao procurar épocas especiais." }, { status: 500 });
  }
}

// Criar nova época especial
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { nome, dataInicio, dataFim } = body;

    if (!nome || !dataInicio || !dataFim) {
      return NextResponse.json({ error: "Preencha todos os campos da época especial." }, { status: 400 });
    }

    const novaEpoca = await prisma.epocaEspecial.create({
      data: {
        nome,
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim),
      },
    });

    return NextResponse.json(novaEpoca, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao criar época especial." }, { status: 500 });
  }
}

// Eliminar época especial
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID em falta." }, { status: 400 });
    }

    await prisma.epocaEspecial.delete({ where: { id } });

    return NextResponse.json({ message: "Época especial removida." });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro ao eliminar época especial." }, { status: 500 });
  }
}