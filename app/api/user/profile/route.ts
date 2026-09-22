import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import { updateProfileSchema } from "@/lib/validations/profile";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

// --- GET: Carregar dados do perfil ---
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        tipo: true,
        enfermeiro: {
          select: {
            cedulaProfissional: true,
            precoHora: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("Erro ao obter perfil:", error);
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
}

// --- PATCH: Atualizar perfil e palavra-passe ---
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = updateProfileSchema.parse(body);

    const user = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
      include: { enfermeiro: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilizador não encontrado" },
        { status: 404 }
      );
    }

    const updateData: { nome: string; email: string; telefone: string; password?: string } = {
      nome: validatedData.nome,
      email: validatedData.email,
      telefone: validatedData.telefone,
    };

    // Se o utilizador pediu para alterar a palavra-passe
    if (validatedData.newPassword && validatedData.currentPassword) {
      const isPasswordValid = await bcrypt.compare(
        validatedData.currentPassword,
        user.password
      );

      if (!isPasswordValid) {
        return NextResponse.json(
          {
            error: "Erro de validação",
            fieldErrors: { currentPassword: "A palavra-passe atual está incorreta." },
          },
          { status: 400 }
        );
      }

      updateData.password = await bcrypt.hash(validatedData.newPassword, 10);
    }

    // Atualiza os dados base do utilizador
    await prisma.utilizador.update({
      where: { id: user.id },
      data: updateData,
    });

    // Se o corpo incluir cédula e o perfil for de Enfermeiro ou Admin
    if (validatedData.cedula !== undefined && (user.tipo === "ENFERMEIRO" || user.tipo === "ADMIN" || user.enfermeiro)) {
      await prisma.enfermeiro.upsert({
        where: { utilizadorId: user.id },
        update: { cedulaProfissional: validatedData.cedula },
        create: {
          utilizadorId: user.id,
          cedulaProfissional: validatedData.cedula,
        },
      });
    }

    return NextResponse.json(
      { message: "Perfil atualizado com sucesso!" },
      { status: 200 }
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
        { error: "Dados inválidos.", fieldErrors },
        { status: 400 }
      );
    }

    console.error("Erro ao atualizar perfil:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 }
    );
  }
}