import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { role, precoHora } = body;

    // 1. Atualizar o tipo de utilizador (ADMIN ou ENFERMEIRO)
    if (role) {
      await prisma.utilizador.update({
        where: { id },
        data: {
          tipo: role === "ADMIN" ? "ADMIN" : "ENFERMEIRO",
        },
      });
    }

    // 2. Atualizar ou criar o perfil de Enfermeiro com o precoHora
    if (precoHora !== undefined) {
      const valorHora = parseFloat(precoHora);

      await prisma.enfermeiro.upsert({
        where: { utilizadorId: id },
        update: {
          precoHora: valorHora,
        },
        create: {
          utilizadorId: id,
          cedulaProfissional: `CP-${Date.now()}`,
          precoHora: valorHora,
          especialidades: [],
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao atualizar enfermeiro:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao atualizar dados na base de dados" },
      { status: 500 }
    );
  }
}