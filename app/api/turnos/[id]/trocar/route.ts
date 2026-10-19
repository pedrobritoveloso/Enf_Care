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
    const { novoEnfermeiroId } = body; // Pode ser o ID do enfermeiro ou o utilizadorId

    if (!turnoId || !novoEnfermeiroId) {
      return NextResponse.json({ error: "Parâmetros em falta." }, { status: 400 });
    }

    // Obter o utilizador de origem (quem está logado)
    const utilizadorOrigem = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
      include: { enfermeiro: true },
    });

    if (!utilizadorOrigem || !utilizadorOrigem.enfermeiro) {
      return NextResponse.json({ error: "Perfil de enfermeiro de origem não encontrado." }, { status: 403 });
    }

    const enfermeiroOrigemId = utilizadorOrigem.enfermeiro.id;

    // --- ENCONTRAR O ENFERMEIRO DE DESTINO DE FORMA ROBUSTA ---
    let enfermeiroDestino = await prisma.enfermeiro.findUnique({
      where: { id: novoEnfermeiroId },
      include: { utilizador: true },
    });

    if (!enfermeiroDestino) {
      // Tentar procurar por utilizadorId caso o ID enviado venha da tabela Utilizador
      enfermeiroDestino = await prisma.enfermeiro.findUnique({
        where: { utilizadorId: novoEnfermeiroId },
        include: { utilizador: true },
      });
    }

    if (!enfermeiroDestino) {
      return NextResponse.json({ error: "Enfermeiro de destino não encontrado." }, { status: 404 });
    }

    if (enfermeiroOrigemId === enfermeiroDestino.id) {
      return NextResponse.json({ error: "Não pode trocar um turno consigo mesmo." }, { status: 400 });
    }

    // Verificar se o turno pertence ao enfermeiro de origem
    const turno = await prisma.turno.findUnique({
      where: { id: turnoId },
      include: { atribuicoes: true, instituicao: true },
    });

    if (!turno) {
      return NextResponse.json({ error: "Turno não encontrado." }, { status: 404 });
    }

    const estaAtribuidoAoOrigem = turno.atribuicoes.some(
      (a) => a.enfermeiroId === enfermeiroOrigemId
    );

    if (!estaAtribuidoAoOrigem) {
      return NextResponse.json({ error: "Não tem permissão para trocar este turno." }, { status: 403 });
    }

    const nomeInstituicao = turno.instituicao.nome;
    const dataFormatada = new Date(turno.data).toLocaleDateString("pt-PT");

    // Executar a transação de troca
    await prisma.$transaction(async (tx) => {
      // 1. Remover atribuição antiga
      await tx.atribuicao.deleteMany({
        where: { turnoId, enfermeiroId: enfermeiroOrigemId },
      });

      // 2. Criar nova atribuição para o colega
      await tx.atribuicao.create({
        data: {
          turnoId,
          enfermeiroId: enfermeiroDestino.id,
        },
      });

      await tx.turno.update({
        where: { id: turnoId },
        data: { estado: "ATRIBUIDO" },
      });

      // 3. Notificar o Enfermeiro Y (Destino)
      await tx.notificacao.create({
        data: {
          utilizadorId: enfermeiroDestino.utilizadorId,
          titulo: "Troca de Turno Efetuada",
          mensagem: `O enfermeiro ${utilizadorOrigem.nome} trocou um turno da instituição ${nomeInstituicao} do dia ${dataFormatada} consigo.`,
        },
      });

      // 4. Notificar os Admins
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

    return NextResponse.json({ message: "Troca de turno efetuada com sucesso!" });
  } catch (error: any) {
    console.error("Erro ao efetuar troca:", error);
    return NextResponse.json({ error: "Erro interno ao processar a troca." }, { status: 500 });
  }
}