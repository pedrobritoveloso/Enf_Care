import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.tipo !== "ENFERMEIRO") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { qrCode } = body;

    if (!qrCode) {
      return NextResponse.json({ error: "QR Code não fornecido" }, { status: 400 });
    }

    // 1. Validar a instituição pelo QR Code
    const instituicao = await prisma.instituicao.findUnique({
      where: { qrCode },
    });

    if (!instituicao) {
      return NextResponse.json({ error: "QR Code de instituição inválido ou não reconhecido." }, { status: 404 });
    }

    // 2. Obter o ID do perfil de Enfermeiro associado ao utilizador logado
    const enfermeiroPerfil = await prisma.enfermeiro.findUnique({
      where: { utilizadorId: session.user.id },
    });

    if (!enfermeiroPerfil) {
      return NextResponse.json({ error: "Perfil de enfermeiro não encontrado para este utilizador." }, { status: 404 });
    }

    const enfermeiroId = enfermeiroPerfil.id;

    // 3. Procurar se existe um turno atribuído a este enfermeiro nesta instituição que esteja em curso ou agendado para hoje
    // Vamos buscar um turno da instituição que tenha uma atribuição para este enfermeiro
    const atribuicao = await prisma.atribuicao.findFirst({
      where: {
        enfermeiroId,
        turno: {
          instituicaoId: instituicao.id,
        },
      },
      include: {
        turno: true,
      },
      orderBy: {
        criadoEm: "desc",
      },
    });

    if (!atribuicao) {
      return NextResponse.json({ error: "Não tem nenhum turno atribuído nesta instituição." }, { status: 400 });
    }

    const turnoId = atribuicao.turnoId;

    // 4. Verificar se já existe um registo de assiduidade aberto (sem saidaReal) para este turno
    const assiduidadeAberta = await prisma.assiduidade.findFirst({
      where: {
        turnoId,
        enfermeiroId,
        saidaReal: null,
      },
    });

    let resultado;
    if (assiduidadeAberta) {
      // Já tem entrada registada -> Efetuar Check-out
      resultado = await prisma.assiduidade.update({
        where: { id: assiduidadeAberta.id },
        data: {
          saidaReal: new Date(),
        },
      });
    } else {
      // Não tem entrada -> Efetuar Check-in
      resultado = await prisma.assiduidade.create({
        data: {
          turnoId,
          enfermeiroId,
          entradaReal: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: assiduidadeAberta ? "Check-out efetuado com sucesso!" : "Check-in efetuado com sucesso!",
      instituicao: instituicao.nome,
      assiduidade: resultado,
    });
  } catch (error) {
    console.error("Erro no processamento do QR Code de assiduidade:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}