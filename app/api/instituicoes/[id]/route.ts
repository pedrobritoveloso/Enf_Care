import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso reservado a Administradores" }, { status: 403 });
    }

    const { id } = await params;
    const { ativo } = await req.json();

    if (typeof ativo !== "boolean") {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const instituicaoAtualizada = await prisma.instituicao.update({
      where: { id },
      data: { ativo },
    });

    return NextResponse.json(instituicaoAtualizada);
  } catch (error) {
    console.error("Erro ao atualizar instituição:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}