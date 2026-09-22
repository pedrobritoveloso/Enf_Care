import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const turnoId = resolvedParams?.id;

    if (!turnoId || typeof turnoId !== "string") {
      return NextResponse.json(
        { error: "ID de turno inválido ou não fornecido." },
        { status: 400 }
      );
    }

    // 1. Apagar todas as relações dependentes do turno em cascata
    await prisma.assiduidade.deleteMany({
      where: { turnoId },
    });

    await prisma.candidatura.deleteMany({
      where: { turnoId },
    });

    await prisma.atribuicao.deleteMany({
      where: { turnoId },
    });

    // 2. Eliminar o turno especificamente
    await prisma.turno.delete({
      where: { id: turnoId },
    });

    return NextResponse.json({
      message: "Turno eliminado com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao eliminar turno:", error);
    return NextResponse.json(
      { error: "Erro ao eliminar o turno devido a dependências associadas." },
      { status: 500 }
    );
  }
}