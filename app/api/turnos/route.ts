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

    const utilizadorAtual = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
      include: { enfermeiro: true },
    });

    if (!utilizadorAtual) {
      return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
    }

    // --- AUTO-CONCLUSÃO / CANCELAMENTO DE TURNOS EXPIRADOS ---
    const agora = new Date();

    const turnosParaVerificar = await prisma.turno.findMany({
      where: {
        estado: { in: ["PUBLICADO", "AGUARDAR_ENFERMEIRO", "ATRIBUIDO", "EM_CURSO"] },
      },
      include: {
        atribuicoes: {
          include: {
            enfermeiro: {
              include: {
                utilizador: { select: { nome: true } },
              },
            },
          },
        },
        assiduidades: true,
      },
    });

    for (const turno of turnosParaVerificar) {
      const dataTurno = new Date(turno.data);
      const [horasInicio, minutosInicio] = turno.horaInicio.split(":").map(Number);
      const [horasFim, minutosFim] = turno.horaFim.split(":").map(Number);

      const dataInicioTurno = new Date(
        dataTurno.getFullYear(),
        dataTurno.getMonth(),
        dataTurno.getDate(),
        horasInicio,
        minutosInicio,
        0
      );

      const dataFimTurno = new Date(
        dataTurno.getFullYear(),
        dataTurno.getMonth(),
        dataTurno.getDate(),
        horasFim,
        minutosFim,
        0
      );

      const enfermeiroNome = turno.atribuicoes[0]?.enfermeiro?.utilizador?.nome || "Enfermeiro";
      const enfermeiroId = turno.atribuicoes[0]?.enfermeiroId;

      // 1. REGRA: Sem enfermeiro até 5 min antes do início do turno -> CANCELADO
      const limite5MinAntes = new Date(dataInicioTurno.getTime() - 5 * 60 * 1000);

      if ((turno.estado === "PUBLICADO" || turno.estado === "AGUARDAR_ENFERMEIRO") && agora >= limite5MinAntes) {
        await prisma.turno.update({
          where: { id: turno.id },
          data: {
            estado: "CANCELADO",
            motivoConclusao: "Turno cancelado por falta de atribuição de enfermeiro.",
          },
        });
        continue;
      }

      // 2. REGRA: Turnos com enfermeiro que ultrapassaram a hora de fim -> CONCLUIDO
      if (agora > dataFimTurno) {
        if (turno.estado === "ATRIBUIDO") {
          await prisma.$transaction(async (tx) => {
            await tx.turno.update({
              where: { id: turno.id },
              data: {
                estado: "CONCLUIDO",
                motivoConclusao: `Turno concluído por expiração de tempo (${enfermeiroNome} não efetuou check-in).`,
              },
            });

            if (enfermeiroId && turno.assiduidades.length === 0) {
              await tx.assiduidade.create({
                data: {
                  turnoId: turno.id,
                  enfermeiroId,
                  saidaReal: dataFimTurno,
                  horasContabilizadas: 0,
                },
              });
            }
          });
        } else if (turno.estado === "EM_CURSO") {
          const assiduidadePendente = turno.assiduidades.find((a) => a.saidaReal === null);

          await prisma.$transaction(async (tx) => {
            if (assiduidadePendente) {
              const entrada = assiduidadePendente.entradaReal
                ? new Date(assiduidadePendente.entradaReal).getTime()
                : dataInicioTurno.getTime();

              const horasContabilizadas = parseFloat(((dataFimTurno.getTime() - entrada) / (1000 * 60 * 60)).toFixed(2));

              await tx.assiduidade.update({
                where: { id: assiduidadePendente.id },
                data: {
                  saidaReal: dataFimTurno,
                  horasContabilizadas,
                },
              });
            }

            await tx.turno.update({
              where: { id: turno.id },
              data: {
                estado: "CONCLUIDO",
                motivoConclusao: `Turno concluído por expiração de tempo (${enfermeiroNome} não efetuou check-out).`,
              },
            });
          });
        }
      }
    }

    const eAdmin = utilizadorAtual.tipo === "ADMIN";
    const enfermeiroIdAtual = utilizadorAtual.enfermeiro?.id;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const estado = searchParams.get("estado") || "";
    const instituicaoId = searchParams.get("instituicaoId") || "";
    const mesAno = searchParams.get("mesAno") || "";

    const whereCondition: any = {};

    if (instituicaoId && instituicaoId !== "TODAS") {
      whereCondition.instituicaoId = instituicaoId;
    }

    if (estado && estado !== "TODOS") {
      whereCondition.estado = estado;
    }

    if (search.trim() !== "") {
      whereCondition.OR = [
        { instituicao: { nome: { contains: search, mode: "insensitive" } } },
        {
          atribuicoes: {
            some: {
              enfermeiro: {
                utilizador: { nome: { contains: search, mode: "insensitive" } },
              },
            },
          },
        },
      ];
    }

    if (mesAno) {
      const [year, month] = mesAno.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      whereCondition.data = {
        gte: startDate,
        lte: endDate,
      };
    }

    const turnos = await prisma.turno.findMany({
      where: whereCondition,
      include: {
        instituicao: { select: { id: true, nome: true, morada: true } },
        atribuicoes: {
          include: {
            enfermeiro: {
              include: { utilizador: { select: { nome: true, email: true } } },
            },
          },
        },
        candidaturas: {
          where: enfermeiroIdAtual ? { enfermeiroId: enfermeiroIdAtual, estado: "PENDENTE" } : undefined,
          select: {
            id: true,
            estado: true,
            enfermeiroId: true,
          },
        },
        assiduidades: true,
      },
      orderBy: { data: "asc" },
    });

    const instituicoes = await prisma.instituicao.findMany({
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    });

    const turnosComPrivacidade = turnos.map((turno) => {
      const enfermeiroAtribuidoId = turno.atribuicoes[0]?.enfermeiroId;
      const eTurnoPublicado = turno.estado === "PUBLICADO";
      const eOProprioEnfermeiro = Boolean(
        enfermeiroIdAtual && enfermeiroAtribuidoId === enfermeiroIdAtual
      );

      const podeVerValor = eAdmin || eTurnoPublicado || eOProprioEnfermeiro;

      return {
        ...turno,
        valorHora: podeVerValor ? turno.valorHora : null,
        atribuidoAMim: eOProprioEnfermeiro,
        temMinhaCandidaturaPendente: Boolean(turno.candidaturas && turno.candidaturas.length > 0),
      };
    });

    return NextResponse.json({
      role: session.user.tipo,
      turnos: turnosComPrivacidade,
      instituicoes,
    });
  } catch (error: any) {
    console.error("Erro ao procurar turnos:", error);
    return NextResponse.json({ error: "Erro ao obter turnos." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const body = await req.json();
    const { instituicaoId, data, horaInicio, horaFim, vagas } = body;

    if (!instituicaoId || !data || !horaInicio || !horaFim) {
      return NextResponse.json(
        { error: "Por favor preencha todos os campos obrigatórios." },
        { status: 400 }
      );
    }

    let configTarifas = await prisma.configuracaoTarifa.findFirst();
    const tarifas = {
      valorDiurno: configTarifas?.valorDiurno ?? 12.0,
      valorNoturno: configTarifas?.valorNoturno ?? 15.0,
      valorEspecial: configTarifas?.valorEspecial ?? 18.0,
    };

    const epocasEspeciais = await prisma.epocaEspecial.findMany();

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

    const novoTurno = await prisma.turno.create({
      data: {
        instituicaoId,
        data: dataTurnoObj,
        horaInicio,
        horaFim,
        vagas: vagas ? Number(vagas) : 1,
        valorHora: valorHoraMedio,
        estado: "PUBLICADO",
      },
    });

    return NextResponse.json(novoTurno, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar turno disponível:", error);
    return NextResponse.json({ error: "Erro interno ao criar turno." }, { status: 500 });
  }
}