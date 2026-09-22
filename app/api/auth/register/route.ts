import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";
import { ZodError } from "zod";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validação com Zod
    const validatedData = registerSchema.parse(body);

    // Verificar se o e-mail já existe
    const existingUser = await prisma.utilizador.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          error: "Erro de validação",
          fieldErrors: { email: "Este e-mail já está em uso por outro utilizador." },
        },
        { status: 400 }
      );
    }

    // Encriptar a palavra-passe
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Extrair cedulaProfissional se existir no body ou gerar um placeholder temporário
    const cedulaProfissional = body.cedulaProfissional || `CP-${Date.now()}`;

    // Criar Utilizador e o perfil Enfermeiro associado na mesma transação
    const user = await prisma.utilizador.create({
      data: {
        nome: validatedData.nome,
        email: validatedData.email,
        telefone: validatedData.telefone,
        password: hashedPassword,
        tipo: "ENFERMEIRO",
        enfermeiro: {
          create: {
            cedulaProfissional: cedulaProfissional,
            especialidades: [],
          },
        },
      },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        enfermeiro: {
          select: {
            id: true,
            cedulaProfissional: true,
          },
        },
      },
    });

    return NextResponse.json(
      { message: "Conta criada com sucesso!", user },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};

      error.issues.forEach((issue) => {
        if (issue.path.length > 0) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });

      return NextResponse.json(
        { error: "Dados de registo inválidos.", fieldErrors },
        { status: 400 }
      );
    }

    console.error("Erro ao criar utilizador:", error);

    return NextResponse.json(
      { error: "Ocorreu um erro interno no servidor ao criar a conta." },
      { status: 500 }
    );
  }
}