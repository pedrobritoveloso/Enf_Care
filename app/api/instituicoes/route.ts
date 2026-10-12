import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { instituicaoSchema } from "@/lib/validations/instituiçao";
import { ZodError } from "zod";

// GET: Listar instituições
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const instituicoes = await prisma.instituicao.findMany({
      include: {
        _count: {
          select: { turnos: true },
        },
      },
      orderBy: { nome: "asc" },
    });

    return NextResponse.json(instituicoes);
  } catch (error) {
    console.error("Erro ao listar instituições:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

// POST: Criar nova instituição (com geração automática de QR Code)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.tipo !== "ADMIN") {
      return NextResponse.json({ error: "Acesso reservado a Administradores" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = instituicaoSchema.parse(body);

    const existingNif = await prisma.instituicao.findUnique({
      where: { nif: validatedData.nif },
    });

    if (existingNif) {
      return NextResponse.json(
        { error: "Já existe uma instituição com este NIF." },
        { status: 400 }
      );
    }

    // Gerar o token único para o QR Code de assiduidade
    const qrCode = `ENFCARE-INST-${validatedData.nif}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    const novaInstituicao = await prisma.instituicao.create({
      data: {
        nome: validatedData.nome,
        nif: validatedData.nif,
        morada: validatedData.morada,
        latitude: validatedData.latitude ?? null,
        longitude: validatedData.longitude ?? null,
        qrCode,
      },
    });

    return NextResponse.json(novaInstituicao, { status: 201 });
  } catch (error: any) {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      error.issues.forEach((issue) => {
        if (issue.path.length > 0) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      return NextResponse.json({ error: "Dados inválidos", fieldErrors }, { status: 400 });
    }

    console.error("Erro ao criar instituição:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}