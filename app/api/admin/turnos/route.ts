import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { calcularValorTotalTurno } from "@/lib/calculoRemuneração";

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
          in: ["ATRIBUIDO", "EM_CURSO", "CONCLUIDO", "PUBLICADO", "AGUARDAR_ENFERMEIRO"],
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
        candidaturas: {
          include: {
            enfermeiro: {
              include: {
                utilizador: {
                  select: {
                    nome: true,
                    email: true,
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
      return NextResponse.json({ error: "Apenas administradores podem criar turnos." }, { status: 403 });
    }

    const body = await req.json();
    const {
      instituicaoId,
      data,
      horaInicio,
      horaFim,
      vagas,
      enfermeiroId,
    } = body;

    if (!instituicaoId || !data || !horaInicio || !horaFim) {
      return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
    }

    // 1. Obter as tarifas configuradas
    let configTarifas = await prisma.configuracaoTarifa.findFirst();
    const tarifas = {
      valorDiurno: configTarifas?.valorDiurno ?? 12.0,
      valorNoturno: configTarifas?.valorNoturno ?? 15.0,
      valorEspecial: configTarifas?.valorEspecial ?? 18.0,
    };

    // 2. Obter épocas especiais
    const epocasEspeciais = await prisma.epocaEspecial.findMany();

    // 3. Calcular a remuneração automática
    const dataTurnoObj = new Date(data);
    const resultado = calcularValorTotalTurno(
      dataTurnoObj,
      horaInicio,
      horaFim,
      tarifas,
      epocasEspeciais.map((e) => ({
        dataInício: e.dataInicio,
        dataFim: e.dataFim,
      }))
    );

    const totalHoras = resultado.detalhes.diurnas + resultado.detalhes.noturnas + resultado.detalhes.especiais;
    const valorHoraMedio = totalHoras > 0 ? Number((resultado.valorTotal / totalHoras).toFixed(2)) : tarifas.valorDiurno;

    const estadoInicial = enfermeiroId ? "ATRIBUIDO" : "PUBLICADO";

    const novoTurno = await prisma.$transaction(async (tx) => {
      const turno = await tx.turno.create({
        data: {
          instituicaoId,
          data: dataTurnoObj,
          horaInicio,
          horaFim,
          vagas: vagas ? Number(vagas) : 1,
          valorHora: valorHoraMedio,
          estado: estadoInicial,
        },
      });

      if (enfermeiroId) {
        await tx.atribuicao.create({
          data: {
            turnoId: turno.id,
            enfermeiroId,
          },
        });
      }

      // Notificações automáticas
      const instituicao = await tx.instituicao.findUnique({
        where: { id: instituicaoId },
      });
      const nomeInst = instituicao?.nome || "Instituição";
      const dataFormatada = dataTurnoObj.toLocaleDateString("pt-PT");

      if (enfermeiroId) {
        let utilizadorIdAlvo = null;
        const enfermeiroReg = await tx.enfermeiro.findUnique({
          where: { id: enfermeiroId },
          select: { utilizadorId: true },
        });

        if (enfermeiroReg) {
          utilizadorIdAlvo = enfermeiroReg.utilizadorId;
        } else {
          const utilizadorReg = await tx.utilizador.findUnique({
            where: { id: enfermeiroId },
            select: { id: true },
          });
          if (utilizadorReg) utilizadorIdAlvo = utilizadorReg.id;
        }

        if (utilizadorIdAlvo) {
          await tx.notificacao.create({
            data: {
              utilizadorId: utilizadorIdAlvo,
              titulo: "Novo Turno Atribuído",
              mensagem: `Um turno na instituição ${nomeInst} no dia ${dataFormatada} às ${horaInicio} foi-lhe atribuído.`,
            },
          });
        }
      } else {
        const enfermeiros = await tx.enfermeiro.findMany({
          select: { utilizadorId: true },
        });

        if (enfermeiros.length > 0) {
          await tx.notificacao.createMany({
            data: enfermeiros.map((enf) => ({
              utilizadorId: enf.utilizadorId,
              titulo: "Novo Turno Disponível",
              mensagem: `Um turno na instituição ${nomeInst} foi aberto para o dia ${dataFormatada} às ${horaInicio}.`,
            })),
          });
        }
      }

      return turno;
    });

    return NextResponse.json(novoTurno, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar turno em escala:", error);
    return NextResponse.json({ error: "Erro ao criar turno." }, { status: 500 });
  }
}