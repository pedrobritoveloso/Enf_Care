import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const utilizadores = await prisma.utilizador.findMany({
      include: {
        enfermeiro: true,
      },
    });

    const formatted = utilizadores.map((u) => {
      // Cast temporário para evitar erros enquanto os tipos regeneram
      const enfermeiroData = u.enfermeiro as (typeof u.enfermeiro & { precoHora?: number }) | null;

      return {
        id: u.id,
        nome: u.nome,
        email: u.email,
        role: u.tipo,
        ativo: u.ativo,
        especialidade: enfermeiroData?.especialidades?.[0] || "Generalista",
        precoHora: enfermeiroData?.precoHora ?? 10.0,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Erro ao procurar enfermeiros:", error);
    return NextResponse.json(
      { error: "Erro ao procurar enfermeiros" },
      { status: 500 }
    );
  }
}