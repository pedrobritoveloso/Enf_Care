import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const params = await context.params;
    const turnoId = params.id;

    const body = await req.json();
    const { novoEnfermeiroId } = body; // ID do Enfermeiro Y (destino)

    if (!turnoId || !novoEnfermeiroId) {
      return NextResponse.json(
        { error: "Identificadores de turno ou enfermeiro em falta." },
        { status: 400 }
      );
    }

    // Obter o utilizador atual (Enfermeiro X - Origem)
    const utilizadorOrigem = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
      include: { enfermeiro: true },
    });

    if (!utilizadorOrigem || !utilizadorOrigem.enfermeiro) {
      return NextResponse.json(
        { error: "Perfil de enfermeiro de origem não encontrado." },
        { status: 403 }
      );
    }

    const enfermeiroOrigemId = utilizadorOrigem.enfermeiro.id;

    // Verificar se o Enfermeiro Y (destino) existe
    const enfermeiroDestino = await prisma.enfermeiro.findUnique({
      where: { id: novoEnfermeiroId },
      include: { utilizador: true },
    });

    if (!enfermeiroDestino) {
      return NextResponse.json(
        { error: "Enfermeiro selecionado para a troca não foi encontrado." },
        { status: 404 }
      );
    }

    // Buscar o turno e validar se pertence ao Enfermeiro X
    const turno = await prisma.turno.findUnique({
      where: { id: turnoId },
      include: {
        atribuicoes: true,
        instituicao: true,
      },
    });

    if (!turno) {
      return NextResponse.json({ error: "Turno não encontrado." }, { status: 404 });
    }

    const estaAtribuidoAoOrigem = turno.atribuicoes.some(
      (a) => a.enfermeiroId === enfermeiroOrigemId
    );

    if (!estaAtribuidoAoOrigem) {
      return NextResponse.json(
        { error: "Não tem permissão para trocar este turno, pois não lhe está atribuído." },
        { status: 403 }
      );
    }

    const nomeInstituicao = turno.instituicao.nome;
    const dataFormatada = new Date(turno.data).toLocaleDateString("pt-PT");

    // Executar a troca e as notificações numa transação atómica
    await prisma.$transaction(async (tx) => {
      // 1. Remover a atribuição antiga (Enfermeiro X)
      await tx.atribuicao.deleteMany({
        where: { turnoId, enfermeiroId: enfermeiroOrigemId },
      });

      // 2. Remover candidaturas pendentes do enfermeiro antigo se existirem
      await tx.candidatura.deleteMany({
        where: { turnoId, enfermeiroId: enfermeiroOrigemId },
      });

      // 3. Criar a nova atribuição (Enfermeiro Y)
      await tx.atribuicao.create({
        data: {
          turnoId,
          enfermeiroId: enfermeiroDestino.id,
        },
      });

      // 4. Manter estado como ATRIBUIDO
      await tx.turno.update({
        where: { id: turnoId },
        data: { estado: "ATRIBUIDO" },
      });

      // 5. Notificar o Enfermeiro Y (Destino)
      await tx.notificacao.create({
        data: {
          utilizadorId: enfermeiroDestino.utilizadorId,
          titulo: "Troca de Turno Efetuada",
          mensagem: `O enfermeiro ${utilizadorOrigem.nome} trocou um turno da instituição ${nomeInstituicao} do dia ${dataFormatada} consigo.`,
        },
      });

      // 6. Notificar todos os Administradores
      const admins = await tx.utilizador.findMany({
        where: { tipo: "ADMIN" },
        select: { id: true },
      });

      if (admins.length > 0) {
        await tx.notificacao.createMany({
          data: admins.map((admin) => ({
            utilizadorId: admin.id,
            titulo: "Troca de Turno Realizada",
            mensagem: `O enfermeiro ${utilizadorOrigem.nome} trocou o turno da instituição ${nomeInstituicao} do dia ${dataFormatada} com o enfermeiro ${enfermeiroDestino.utilizador.nome}.`,
          })),
        });
      }
    });

    return NextResponse.json({
      message: "Troca de turno efetuada com sucesso!",
    });
  } catch (error: any) {
    console.error("Erro ao efetuar troca de turno:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar a troca de turno." },
      { status: 500 }
    );
  }
}