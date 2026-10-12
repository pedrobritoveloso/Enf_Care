import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { qrCode } = await req.json();

    if (!qrCode) {
      return NextResponse.json({ error: "QR Code não fornecido" }, { status: 400 });
    }

    // 1. Encontrar a instituição através do QR Code lido
    const instituicao = await prisma.instituicao.findUnique({
      where: { qrCode },
    });

    if (!instituicao) {
      return NextResponse.json({ error: "QR Code de instituição inválido." }, { status: 404 });
    }

    // 2. Obter o enfermeiro logado
    const utilizador = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
      include: { enfermeiro: true },
    });

    if (!utilizador?.enfermeiro) {
      return NextResponse.json({ error: "Perfil de enfermeiro não encontrado" }, { status: 404 });
    }

    const enfermeiroId = utilizador.enfermeiro.id;

    // 3. Procurar um turno desta instituição atribuído a este enfermeiro que esteja pronto para Check-in ou em curso para Check-out
    const atribuicao = await prisma.atribuicao.findFirst({
      where: {
        enfermeiroId,
        turno: {
          instituicaoId: instituicao.id,
          estado: { in: ["ATRIBUIDO", "EM_CURSO"] },
        },
      },
      include: { turno: true },
      orderBy: { turno: { data: "asc" } },
    });

    if (!atribuicao) {
      return NextResponse.json(
        { error: "Não tem nenhum turno elegível (Atribuído ou Em Curso) nesta instituição." },
        { status: 400 }
      );
    }

    const turnoId = atribuicao.turno.id;
    const estadoTurno = atribuicao.turno.estado;

    // 4. Decidir automaticamente se faz CHECK_IN ou CHECK_OUT com base no estado do turno
    let acao = "CHECK_IN";
    if (estadoTurno === "EM_CURSO") {
      acao = "CHECK_OUT";
    }

    // Opcional: podes invocar diretamente a lógica ou reutilizar a transação da outra rota
    const agora = new Date();

    if (acao === "CHECK_IN") {
      await prisma.$transaction([
        prisma.assiduidade.create({
          data: {
            turnoId,
            enfermeiroId,
            entradaReal: agora,
          },
        }),
        prisma.turno.update({
          where: { id: turnoId },
          data: { estado: "EM_CURSO" },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: `Check-in efetuado com sucesso em ${instituicao.nome}!`,
      });
    } else {
      // CHECK_OUT
      const assiduidade = await prisma.assiduidade.findFirst({
        where: { turnoId, enfermeiroId, saidaReal: null },
      });

      const entrada = assiduidade?.entradaReal ? new Date(assiduidade.entradaReal).getTime() : agora.getTime();
      const horasContabilizadas = parseFloat(((agora.getTime() - entrada) / (1000 * 60 * 60)).toFixed(2));

      await prisma.$transaction([
        ...(assiduidade
          ? [
              prisma.assiduidade.update({
                where: { id: assiduidade.id },
                data: { saidaReal: agora, horasContabilizadas },
              }),
            ]
          : [
              prisma.assiduidade.create({
                data: { turnoId, enfermeiroId, saidaReal: agora, horasContabilizadas: 0 },
              }),
            ]),
        prisma.turno.update({
          where: { id: turnoId },
          data: { estado: "CONCLUIDO", motivoConclusao: "concluído por QR code" },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: `Check-out efetuado com sucesso em ${instituicao.nome}!`,
      });
    }
  } catch (error: any) {
    console.error("Erro no processamento do scanner:", error);
    return NextResponse.json({ error: error.message || "Erro interno no servidor" }, { status: 500 });
  }
}