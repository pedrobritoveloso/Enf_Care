import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { ativo } = body;

    const updated = await prisma.instituicao.update({
      where: { id },
      data: {
        ...(ativo !== undefined && { ativo }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Erro ao atualizar instituição" },
      { status: 500 }
    );
  }
}