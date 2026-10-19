import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const params = await context.params;
    const turnoId = params.id;

    if (!turnoId) {
      return NextResponse.json({ error: "ID do turno não fornecido" }, { status: 400 });
    }

    const utilizador = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
      include: { enfermeiro: true },
    });

    if (!utilizador || !utilizador.enfermeiro) {
      return NextResponse.json(
        { error: "Perfil de enfermeiro não encontrado" },
        { status: 404 }
      );
    }

    const enfermeiroId = utilizador.enfermeiro.id;

    const turno = await prisma.turno.findUnique({
      where: { id: turnoId },
      include: { instituicao: true },
    });

    if (!turno) {
      return NextResponse.json({ error: "Turno não encontrado" }, { status: 404 });
    }

    if (turno.estado !== "PUBLICADO" && turno.estado !== "AGUARDAR_ENFERMEIRO") {
      return NextResponse.json(
        { error: "Este turno já não está disponível para candidaturas" },
        { status: 400 }
      );
    }

    // Verificar se já existe candidatura
    const candidaturaExistente = await prisma.candidatura.findUnique({
      where: {
        turnoId_enfermeiroId: {
          turnoId,
          enfermeiroId,
        },
      },
    });

    if (candidaturaExistente) {
      return NextResponse.json(
        { error: "Já se candidatou a este turno" },
        { status: 400 }
      );
    }

    // Criar a candidatura e atualizar estado do turno
    const resultado = await prisma.$transaction(async (tx) => {
      const novaCandidatura = await tx.candidatura.create({
        data: {
          turnoId,
          enfermeiroId,
          estado: "PENDENTE",
        },
      });

      await tx.turno.update({
        where: { id: turnoId },
        data: { estado: "AGUARDAR_ENFERMEIRO" },
      });

      // 1. Notificar todos os administradores sobre a nova candidatura
      const admins = await tx.utilizador.findMany({
        where: { tipo: "ADMIN" },
        select: { id: true },
      });

      if (admins.length > 0) {
        await tx.notificacao.createMany({
          data: admins.map((admin) => ({
            utilizadorId: admin.id,
            titulo: "Nova Candidatura Recebida",
            mensagem: `O enfermeiro ${utilizador.nome} candidatou-se ao turno da instituição ${turno.instituicao.nome}.`,
          })),
        });
      }

      // 2. Notificação de confirmação para o próprio enfermeiro
      await tx.notificacao.create({
        data: {
          utilizadorId: utilizador.id,
          titulo: "Candidatura Submetida",
          mensagem: `A sua candidatura para o turno em ${turno.instituicao.nome} foi registada com sucesso.`,
        },
      });

      return novaCandidatura;
    });

    return NextResponse.json({
      message: "Candidatura submetida com sucesso!",
      candidatura: resultado,
    });
  } catch (error: any) {
    console.error("Erro ao inscrever no turno:", error);
    return NextResponse.json(
      { error: "Erro interno ao submeter candidatura." },
      { status: 500 }
    );
  }
}