import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { instituicaoSchema } from "@/lib/validations/instituiçao";
import { ZodError } from "zod";

// GET: Listar instituições (Acessível a ADMIN e ENFERMEIRO)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Admins veem todas as instituições; Enfermeiros apenas as ativas
    const whereClause = session.user.role === "ADMIN" ? {} : { ativo: true };

    const instituicoes = await prisma.instituicao.findMany({
      where: whereClause,
      select: {
        id: true,
        nome: true,
        nif: true,
        morada: true,
        latitude: true,
        longitude: true,
        qrCodeToken: true,
        ativo: true,
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

// POST: Criar nova instituição (Apenas ADMIN)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso reservado a Administradores" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = instituicaoSchema.parse(body);

    // Verificar se o NIF já existe
    const existingNif = await prisma.instituicao.findUnique({
      where: { nif: validatedData.nif },
    });

    if (existingNif) {
      return NextResponse.json(
        { error: "Já existe uma instituição com este NIF." },
        { status: 400 }
      );
    }

    const novaInstituicao = await prisma.instituicao.create({
      data: {
        nome: validatedData.nome,
        nif: validatedData.nif,
        morada: validatedData.morada,
        latitude: validatedData.latitude ?? null,
        longitude: validatedData.longitude ?? null,
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