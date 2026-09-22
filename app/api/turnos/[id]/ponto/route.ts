import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id: turnoId } = await context.params;
    const { acao, lat, lon } = await req.json();

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const utilizador = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
      include: { enfermeiro: true },
    });

    if (!utilizador?.enfermeiro) {
      return NextResponse.json({ error: "Perfil de enfermeiro não encontrado" }, { status: 404 });
    }

    const enfermeiroId = utilizador.enfermeiro.id;
    const agora = new Date();

    // Validar se o enfermeiro tem atribuição para este turno
    const atribuicao = await prisma.atribuicao.findFirst({
      where: { turnoId, enfermeiroId },
      include: { turno: true },
    });

    if (!atribuicao) {
      return NextResponse.json({ error: "Não está atribuído a este turno." }, { status: 403 });
    }

    // --- CHECK-IN (INICIAR TURNO) ---
    if (acao === "CHECK_IN") {
      if (atribuicao.turno.estado !== "ATRIBUIDO") {
        return NextResponse.json({ error: "O turno não está pronto para iniciar." }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.assiduidade.create({
          data: {
            turnoId,
            enfermeiroId,
            entradaReal: agora,
            localizacaoEntradaLat: lat || null,
            localizacaoEntradaLon: lon || null,
          },
        }),
        prisma.turno.update({
          where: { id: turnoId },
          data: { estado: "EM_CURSO" },
        }),
      ]);

      return NextResponse.json({ message: "Check-in efetuado com sucesso!" });
    }

    // --- CHECK-OUT (FINALIZAR TURNO - COM OU SEM CHECK-IN PRÉVIO) ---
    if (acao === "CHECK_OUT") {
      if (atribuicao.turno.estado === "CONCLUIDO") {
        return NextResponse.json({ error: "O turno já se encontra concluído." }, { status: 400 });
      }

      const assiduidade = await prisma.assiduidade.findFirst({
        where: { turnoId, enfermeiroId, saidaReal: null },
      });

      if (assiduidade) {
        // Caso já tenha feito CHECK-IN: calcula horas e atualiza o registo existente
        const entrada = assiduidade.entradaReal ? new Date(assiduidade.entradaReal).getTime() : agora.getTime();
        const horasContabilizadas = parseFloat(((agora.getTime() - entrada) / (1000 * 60 * 60)).toFixed(2));

        await prisma.$transaction([
          prisma.assiduidade.update({
            where: { id: assiduidade.id },
            data: {
              saidaReal: agora,
              localizacaoSaidaLat: lat || null,
              localizacaoSaidaLon: lon || null,
              horasContabilizadas,
            },
          }),
          prisma.turno.update({
            where: { id: turnoId },
            data: { 
              estado: "CONCLUIDO",
              motivoConclusao: "concluido por check-out",
            },
          }),
        ]);

        return NextResponse.json({ message: "Check-out efetuado com sucesso!", horasContabilizadas });
      } else {
        // Caso NÃO tenha feito CHECK-IN prévio: cria o registo de assiduidade com a saída e conclui
        await prisma.$transaction([
          prisma.assiduidade.create({
            data: {
              turnoId,
              enfermeiroId,
              saidaReal: agora,
              localizacaoSaidaLat: lat || null,
              localizacaoSaidaLon: lon || null,
              horasContabilizadas: 0,
            },
          }),
          prisma.turno.update({
            where: { id: turnoId },
            data: { 
              estado: "CONCLUIDO",
              motivoConclusao: "concluido por check-out",
            },
          }),
        ]);

        return NextResponse.json({ message: "Turno concluído com sucesso sem registo de entrada.", horasContabilizadas: 0 });
      }
    }

    // --- UNDO CHECK-IN (ANULAR CHECK-IN) ---
    if (acao === "UNDO_CHECK_IN") {
      if (atribuicao.turno.estado !== "EM_CURSO") {
        return NextResponse.json({ error: "Apenas é possível anular o check-in de turnos em curso." }, { status: 400 });
      }

      const assiduidade = await prisma.assiduidade.findFirst({
        where: { turnoId, enfermeiroId, saidaReal: null },
      });

      await prisma.$transaction([
        ...(assiduidade
          ? [prisma.assiduidade.delete({ where: { id: assiduidade.id } })]
          : []),
        prisma.turno.update({
          where: { id: turnoId },
          data: { estado: "ATRIBUIDO" },
        }),
      ]);

      return NextResponse.json({ message: "Check-in anulado com sucesso!" });
    }

    return NextResponse.json({ error: "Ação de ponto inválida." }, { status: 400 });
  } catch (error: any) {
    console.error("Erro na picagem de ponto:", error);
    return NextResponse.json({ error: error.message || "Erro no servidor." }, { status: 500 });
  }
}