import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// Função para calcular a distância em metros entre duas coordenadas (Fórmula de Haversine)
function calcularDistanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Raio da Terra em metros
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { qrCode, lat, lon } = await req.json();

    if (!qrCode) {
      return NextResponse.json({ error: "QR Code não fornecido" }, { status: 400 });
    }

    // 1. Encontrar a instituição pelo QR Code
    const instituicao = await prisma.instituicao.findUnique({
      where: { qrCode },
    });

    if (!instituicao) {
      return NextResponse.json({ error: "QR Code de instituição inválido ou não reconhecido." }, { status: 404 });
    }

    // --- VALIDAÇÃO DE SEGURANÇA GPS ---
    // Se a instituição tem coordenadas definidas, validamos se o enfermeiro está no local (ex: raio de 300 metros)
    if (instituicao.latitude !== null && instituicao.longitude !== null) {
      if (lat === null || lat === undefined || lon === null || lon === undefined) {
        return NextResponse.json(
          { error: "A geolocalização é obrigatória para registar o ponto nesta instituição." },
          { status: 400 }
        );
      }

      const distancia = calcularDistanciaMetros(lat, lon, instituicao.latitude, instituicao.longitude);
      const RAIO_MAXIMO_METROS = 300; // Raio de tolerância permitido

      if (distancia > RAIO_MAXIMO_METROS) {
        return NextResponse.json(
          { error: `Validação GPS falhou: Encontra-se a ${Math.round(distancia)}m da instituição (máximo permitido: ${RAIO_MAXIMO_METROS}m).` },
          { status: 400 }
        );
      }
    }
    // ---------------------------------

    // 2. Obter o enfermeiro logado
    const utilizador = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
      include: { enfermeiro: true },
    });

    if (!utilizador?.enfermeiro) {
      return NextResponse.json({ error: "Perfil de enfermeiro não encontrado" }, { status: 404 });
    }

    const enfermeiroId = utilizador.enfermeiro.id;
    const agora = new Date();

    // 3. Encontrar um turno desta instituição atribuído a este enfermeiro (ATRIBUIDO ou EM_CURSO)
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

    // 4. Se o turno está ATRIBUIDO -> Faz CHECK_IN
    if (estadoTurno === "ATRIBUIDO") {
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

      return NextResponse.json({
        success: true,
        message: `Check-in efetuado com sucesso em ${instituicao.nome} (GPS verificado)!`,
      });
    }

    // 5. Se o turno está EM_CURSO -> Faz CHECK_OUT
    if (estadoTurno === "EM_CURSO") {
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
                data: {
                  saidaReal: agora,
                  localizacaoSaidaLat: lat || null,
                  localizacaoSaidaLon: lon || null,
                  horasContabilizadas,
                },
              }),
            ]
          : [
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
            ]),
        prisma.turno.update({
          where: { id: turnoId },
          data: {
            estado: "CONCLUIDO",
            motivoConclusao: "concluído por leitura de QR Code",
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: `Check-out efetuado com sucesso em ${instituicao.nome}!`,
        horasContabilizadas,
      });
    }

    return NextResponse.json({ error: "Estado do turno inválido para picagem." }, { status: 400 });
  } catch (error: any) {
    console.error("Erro no processamento do QR Code:", error);
    return NextResponse.json({ error: error.message || "Erro no servidor." }, { status: 500 });
  }
}