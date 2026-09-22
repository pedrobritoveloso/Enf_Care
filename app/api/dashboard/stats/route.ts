import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const utilizador = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
      include: { enfermeiro: true },
    });

    if (!utilizador) {
      return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
    }

    const role = utilizador.tipo;

    // --- LÓGICA PARA ADMIN ---
    if (role === "ADMIN") {
      const [
        enfermeirosCount,
        instituicoesCount,
        turnosAtribuidosCount,
        turnosPublicadosCount,
        turnosAtribuidosLista,
        turnosPublicadosLista,
      ] = await Promise.all([
        prisma.enfermeiro.count(),
        prisma.instituicao.count(),
        prisma.turno.count({ where: { estado: { in: ["ATRIBUIDO", "EM_CURSO"] } } }),
        prisma.turno.count({ where: { estado: "PUBLICADO" } }),
        prisma.turno.findMany({
          where: { estado: { in: ["ATRIBUIDO", "EM_CURSO", "CONCLUIDO"] } },
          take: 10,
          orderBy: { data: "desc" },
          include: {
            instituicao: { select: { nome: true } },
            atribuicoes: {
              include: {
                enfermeiro: {
                  include: { utilizador: { select: { nome: true, email: true } } },
                },
              },
            },
            assiduidades: true,
          },
        }),
        prisma.turno.findMany({
          where: { estado: "PUBLICADO" },
          take: 10,
          orderBy: { data: "asc" },
          include: {
            instituicao: { select: { nome: true } },
          },
        }),
      ]);

      return NextResponse.json({
        role: "ADMIN",
        enfermeirosCount,
        instituicoesCount,
        turnosAtribuidosCount,
        turnosPublicadosCount,
        turnosAtribuidosLista,
        turnosPublicadosLista,
      });
    }

    // --- LÓGICA PARA ENFERMEIRO ---
    let enfermeiro = utilizador.enfermeiro;

    // Fallback/Self-healing: se for ENFERMEIRO mas não tiver registo criado, cria um automaticamente
    if (!enfermeiro) {
      enfermeiro = await prisma.enfermeiro.create({
        data: {
          utilizadorId: utilizador.id,
          cedulaProfissional: `CP-${Date.now()}`,
          especialidades: [],
        },
      });
    }

    const enfermeiroId = enfermeiro.id;

    // 1. Procurar o turno ativo (EM_CURSO) ou o próximo (ATRIBUIDO)
    const proximoTurno = await prisma.turno.findFirst({
      where: {
        atribuicoes: {
          some: { enfermeiroId },
        },
        estado: {
          in: ["ATRIBUIDO", "EM_CURSO"],
        },
      },
      orderBy: [
        { estado: "desc" }, // Prioridade a turnos "EM_CURSO"
        { data: "asc" },
      ],
      include: {
        instituicao: {
          select: { nome: true, morada: true },
        },
        assiduidades: {
          where: { enfermeiroId },
          orderBy: { entradaReal: "desc" },
          take: 1,
        },
      },
    });

    // 2. Total de turnos aceites/efetuados
    const totalTurnosAceites = await prisma.atribuicao.count({
      where: { enfermeiroId },
    });

    return NextResponse.json({
      role: "ENFERMEIRO",
      proximoTurno: proximoTurno || null,
      totalTurnosAceites: totalTurnosAceites || 0,
    });
  } catch (error: any) {
    console.error("Erro na API stats:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}