import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { nome, nif, morada, telefone, email, latitude, longitude } = body;

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
        telefone: telefone || null,
        email: email || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        qrCode,
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