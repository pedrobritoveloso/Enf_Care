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

    // Procura o utilizador atual para obter o tipo e o ID de enfermeiro (se aplicável)
    const utilizadorAtual = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
      include: { enfermeiro: true },
    });

    if (!utilizadorAtual) {
      return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
    }

    // --- AUTO-CONCLUSÃO DE TURNOS EXPIRADOS ---
    const agora = new Date();

    // Procura turnos ativos que ainda não estejam concluídos/cancelados
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

      // 1. REGRA: Sem enfermeiro até 5 min antes do início do turno
      const limite5MinAntes = new Date(dataInicioTurno.getTime() - 5 * 60 * 1000);

      if ((turno.estado === "PUBLICADO" || turno.estado === "AGUARDAR_ENFERMEIRO") && agora >= limite5MinAntes) {
        await prisma.turno.update({
          where: { id: turno.id },
          data: {
            estado: "CONCLUIDO",
            motivoConclusao: "Turno concluído por não haver enfermeiro",
          },
        });
        continue;
      }

      // 2. REGRA: Turnos com enfermeiro que ultrapassaram a hora de fim
      if (agora > dataFimTurno) {
        if (turno.estado === "ATRIBUIDO") {
          // Enfermeiro não fez check-in
          await prisma.$transaction(async (tx) => {
            await tx.turno.update({
              where: { id: turno.id },
              data: {
                estado: "CONCLUIDO",
                motivoConclusao: `Turno concluído por expiração de tempo (${enfermeiroNome} nao fez check-in)`,
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
          // Enfermeiro fez check-in mas não fez check-out
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
                motivoConclusao: `Turno concluído por expiração de tempo (${enfermeiroNome} nao fez check-out)`,
              },
            });
          });
        }
      }
    }
    // ------------------------------------------

    const eAdmin = utilizadorAtual.tipo === "ADMIN";
    const enfermeiroIdAtual = utilizadorAtual.enfermeiro?.id;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const estado = searchParams.get("estado") || "";
    const instituicaoId = searchParams.get("instituicaoId") || "";
    const mesAno = searchParams.get("mesAno") || ""; // formato "YYYY-MM"

    // Filtros dinâmicos para a query do Prisma
    const whereCondition: any = {};

    // Filtro por instituição específica
    if (instituicaoId && instituicaoId !== "TODAS") {
      whereCondition.instituicaoId = instituicaoId;
    }

    // Filtro por Estado (ex: PUBLICADO, ATRIBUIDO)
    if (estado && estado !== "TODOS") {
      whereCondition.estado = estado;
    }

    // Filtro por Pesquisa Global (Nome da Instituição ou Nome do Enfermeiro)
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

    // Filtro por Mês/Ano
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
        assiduidades: true,
      },
      orderBy: { data: "asc" },
    });

    const instituicoes = await prisma.instituicao.findMany({
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    });

    // --- Mapeamento para mascarar valorHora consoante as permissões ---
    const turnosComPrivacidade = turnos.map((turno) => {
      const enfermeiroAtribuidoId = turno.atribuicoes[0]?.enfermeiroId;

      const eTurnoPublicado = turno.estado === "PUBLICADO";
      const eOProprioEnfermeiro = Boolean(
        enfermeiroIdAtual && enfermeiroAtribuidoId === enfermeiroIdAtual
      );

      // Só pode ver o valor se for Admin, se o turno estiver Publicado, ou se for o enfermeiro atribuído a este turno
      const podeVerValor = eAdmin || eTurnoPublicado || eOProprioEnfermeiro;

      return {
        ...turno,
        valorHora: podeVerValor ? turno.valorHora : null,
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
      valorHora,
      enfermeiroId, // Opcional: Se enviado (na Escala), cria o turno já ATRIBUIDO
    } = body;

    if (!instituicaoId || !data || !horaInicio || !horaFim) {
      return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
    }

    const estadoInicial = enfermeiroId ? "ATRIBUIDO" : "PUBLICADO";

    const novoTurno = await prisma.$transaction(async (tx) => {
      const turno = await tx.turno.create({
        data: {
          instituicaoId,
          data: new Date(data),
          horaInicio,
          horaFim,
          vagas: vagas ? Number(vagas) : 1,
          valorHora: valorHora ? parseFloat(valorHora) : null,
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

      return turno;
    });

    return NextResponse.json(novoTurno, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar turno:", error);
    return NextResponse.json({ error: "Erro ao criar turno." }, { status: 500 });
  }
}