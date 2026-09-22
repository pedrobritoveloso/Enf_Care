import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET: Buscar todas as instituições
export async function GET() {
  try {
    const instituicoes = await prisma.instituicao.findMany({
      orderBy: {
        nome: "asc", // Ordena por nome em ordem alfabética
      },
    });

    return NextResponse.json(instituicoes);
  } catch (error) {
    console.error("Erro ao procurar instituições:", error);
    return NextResponse.json(
      { error: "Erro ao procurar instituições" },
      { status: 500 }
    );
  }
}

// POST: Criar uma nova instituição
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nome, nif, morada, latitude, longitude } = body;

    if (!nome || !nif || !morada) {
      return NextResponse.json(
        { error: "Campos obrigatórios em falta (nome, nif, morada)" },
        { status: 400 }
      );
    }

    const novaInstituicao = await prisma.instituicao.create({
      data: {
        nome,
        nif,
        morada,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        ativo: true,
      },
    });

    return NextResponse.json(novaInstituicao, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar instituição:", error);
    return NextResponse.json(
      { error: "Erro ao criar instituição" },
      { status: 500 }
    );
  }
}