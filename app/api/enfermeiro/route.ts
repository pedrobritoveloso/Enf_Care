// app/api/enfermeiro/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Procura diretamente na tabela Utilizador onde o tipo é ENFERMEIRO
    const utilizadoresEnfermeiros = await prisma.utilizador.findMany({
      where: {
        tipo: "ENFERMEIRO",
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        email: true,
        // Inclui a relação enfermeiro (para obter o ID do Enfermeiro se existir)
        enfermeiro: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        nome: "asc",
      },
    });

    // Mapeia os dados para devolver uma estrutura uniforme
    const resultado = utilizadoresEnfermeiros.map((u) => ({
      // Usa o ID do registo Enfermeiro se existir, caso contrário o ID do Utilizador
      id: u.enfermeiro?.id || u.id,
      utilizadorId: u.id,
      utilizador: {
        nome: u.nome,
        email: u.email,
      },
    }));

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("Erro ao procurar enfermeiros:", error);
    return NextResponse.json(
      { error: "Erro ao carregar lista de enfermeiros" },
      { status: 500 }
    );
  }
}