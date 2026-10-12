import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET: Buscar todas as instituições para o painel de admin
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const instituicoes = await prisma.instituicao.findMany({
      orderBy: {
        nome: "asc",
      },
    });

    return NextResponse.json(instituicoes);
  } catch (error) {
    console.error("Erro ao procurar instituições (Admin):", error);
    return NextResponse.json(
      { error: "Erro ao procurar instituições" },
      { status: 500 }
    );
  }
}

// POST: Criar nova instituição no painel de admin
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { nome, nif, morada, latitude, longitude } = body;

    if (!nome || !nif || !morada) {
      return NextResponse.json(
        { error: "Campos obrigatórios em falta (nome, nif, morada)" },
        { status: 400 }
      );
    }

    const qrCode = `ENFCARE-INST-${nif}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    const novaInstituicao = await prisma.instituicao.create({
      data: {
        nome,
        nif,
        morada,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        qrCode,
        // Removido o campo 'ativo' para evitar o erro do Prisma
      },
    });

    return NextResponse.json(novaInstituicao, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar instituição (Admin):", error);
    return NextResponse.json(
      { error: "Erro ao criar instituição (NIF duplicado?)" },
      { status: 500 }
    );
  }
}