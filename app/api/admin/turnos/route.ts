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
    });

    if (!utilizador || utilizador.tipo !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores podem aceder a esta informação." },
        { status: 403 }
      );
    }

    const turnosAtribuidos = await prisma.turno.findMany({
      where: {
        estado: {
          in: ["ATRIBUIDO", "EM_CURSO", "CONCLUIDO", "PUBLICADO"],
        },
      },
      orderBy: {
        data: "desc",
      },
      include: {
        instituicao: {
          select: {
            id: true,
            nome: true,
            morada: true,
          },
        },
        atribuicoes: {
          include: {
            enfermeiro: {
              include: {
                utilizador: {
                  select: {
                    nome: true,
                    email: true,
                    telefone: true,
                  },
                },
              },
            },
          },
        },
        assiduidades: {
          orderBy: {
            entradaReal: "desc",
          },
          take: 1,
        },
      },
    });

    return NextResponse.json(turnosAtribuidos);
  } catch (error: any) {
    console.error("Erro ao procurar turnos para o admin:", error);
    return NextResponse.json(
      { error: error.message || "Erro interno do servidor." },
      { status: 500 }
    );
  }
}

// Endpoint para criar um turno e atribuí-lo diretamente a um enfermeiro
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const utilizador = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
    });

    if (utilizador?.tipo !== "ADMIN") {
      return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
    }

    const body = await req.json();
    const { instituicaoId, enfermeiroId, data, horaInicio, horaFim, valorHora, vagas } = body;

    if (!instituicaoId || !enfermeiroId || !data || !horaInicio || !horaFim) {
      return NextResponse.json({ error: "Campos obrigatórios em falta." }, { status: 400 });
    }

    const novoTurno = await prisma.$transaction(async (tx) => {
      // 1. Resolver o ID real da tabela Enfermeiro
      let enfermeiroExistente = await tx.enfermeiro.findUnique({
        where: { id: enfermeiroId },
      });

      // Se o ID enviado não for da tabela Enfermeiro, procura por utilizadorId
      if (!enfermeiroExistente) {
        enfermeiroExistente = await tx.enfermeiro.findUnique({
          where: { utilizadorId: enfermeiroId },
        });

        // Se o utilizador ainda não tiver registo na tabela Enfermeiro, cria-o
        if (!enfermeiroExistente) {
          enfermeiroExistente = await tx.enfermeiro.create({
            data: {
              utilizadorId: enfermeiroId,
              cedulaProfissional: `TEMP-${Date.now()}`,
            },
          });
        }
      }

      // 2. Criar o turno
      const turno = await tx.turno.create({
        data: {
          instituicaoId,
          data: new Date(data),
          horaInicio,
          horaFim,
          vagas: vagas ? Number(vagas) : 1,
          valorHora: valorHora ? parseFloat(valorHora) : null,
          estado: "ATRIBUIDO",
        },
      });

      // 3. Criar a atribuição garantindo a chave estrangeira correta
      await tx.atribuicao.create({
        data: {
          turnoId: turno.id,
          enfermeiroId: enfermeiroExistente.id,
        },
      });

      return turno;
    });

    return NextResponse.json(novoTurno, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar turno em escala:", error);
    return NextResponse.json({ error: "Erro interno ao criar turno." }, { status: 500 });
  }
}