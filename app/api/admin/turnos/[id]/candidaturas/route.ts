import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const utilizador = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
    });

    if (utilizador?.tipo !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const params = await context.params;
    const turnoId = params.id;
    const body = await request.json();
    const { candidaturaId, acao } = body; // acao: "APROVAR" ou "REJEITAR"

    if (!candidaturaId || !acao) {
      return NextResponse.json({ error: "Parâmetros em falta" }, { status: 400 });
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const candidatura = await tx.candidatura.findUnique({
        where: { id: candidaturaId },
        include: { 
          turno: { include: { instituicao: true } },
          enfermeiro: { include: { utilizador: true } }
        },
      });

      if (!candidatura || candidatura.turnoId !== turnoId) {
        throw new Error("Candidatura não encontrada.");
      }

      const nomeInstituicao = candidatura.turno.instituicao.nome;

      if (acao === "APROVAR") {
        // 1. Marcar esta candidatura como ACEITE
        await tx.candidatura.update({
          where: { id: candidaturaId },
          data: { estado: "ACEITE" },
        });

        // 2. Procurar outras candidaturas pendentes antes de as rejeitar (para as notificar)
        const outrasCandidaturas = await tx.candidatura.findMany({
          where: {
            turnoId,
            id: { not: candidaturaId },
            estado: "PENDENTE",
          },
          include: { enfermeiro: { include: { utilizador: true } } },
        });

        // Rejeitar todas as outras candidaturas pendentes para este turno
        await tx.candidatura.updateMany({
          where: {
            turnoId,
            id: { not: candidaturaId },
            estado: "PENDENTE",
          },
          data: { estado: "REJEITADA" },
        });

        // 3. Criar a atribuição oficial
        await tx.atribuicao.create({
          data: {
            turnoId,
            enfermeiroId: candidatura.enfermeiroId,
          },
        });

        // 4. Atualizar o estado do turno para ATRIBUIDO
        await tx.turno.update({
          where: { id: turnoId },
          data: { estado: "ATRIBUIDO" },
        });

        // 5. Notificar o enfermeiro APROVADO
        await tx.notificacao.create({
          data: {
            utilizadorId: candidatura.enfermeiro.utilizadorId,
            titulo: "Candidatura Aprovada!",
            mensagem: `A sua candidatura para o turno em ${nomeInstituicao} foi aprovada. O turno já se encontra no seu horário.`,
          },
        });

        // 6. Notificar os enfermeiros cujas candidaturas foram automaticamento REJEITADAS
        if (outrasCandidaturas.length > 0) {
          await tx.notificacao.createMany({
            data: outrasCandidaturas.map((c) => ({
              utilizadorId: c.enfermeiro.utilizadorId,
              titulo: "Candidatura Não Selecionada",
              mensagem: `O turno em ${nomeInstituicao} foi atribuído a outro enfermeiro.`,
            })),
          });
        }

        return { success: true, message: "Candidatura aprovada com sucesso." };
      } else if (acao === "REJEITAR") {
        await tx.candidatura.update({
          where: { id: candidaturaId },
          data: { estado: "REJEITADA" },
        });

        // Notificar o enfermeiro REJEITADO
        await tx.notificacao.create({
          data: {
            utilizadorId: candidatura.enfermeiro.utilizadorId,
            titulo: "Candidatura Não Aceite",
            mensagem: `A sua candidatura para o turno em ${nomeInstituicao} não foi aceite.`,
          },
        });

        // Verificar se ainda existem candidaturas pendentes
        const candidaturasPendentesRestantes = await tx.candidatura.count({
          where: { turnoId, estado: "PENDENTE" },
        });

        if (candidaturasPendentesRestantes === 0) {
          await tx.turno.update({
            where: { id: turnoId },
            data: { estado: "PUBLICADO" },
          });
        }

        return { success: true, message: "Candidatura rejeitada." };
      }

      throw new Error("Ação inválida.");
    });

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error("Erro ao gerir candidatura:", error);
    return NextResponse.json({ error: error.message || "Erro interno." }, { status: 500 });
  }
}