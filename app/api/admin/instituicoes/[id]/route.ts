import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { nome, nif, morada, telefone, email, latitude, longitude, ativo, gerarQrCode } = body;

    let qrCodeUpdate = {};
    if (gerarQrCode) {
      const instituicaoAtual = await prisma.instituicao.findUnique({ where: { id } });
      const nifParaUso = nif || instituicaoAtual?.nif || "000000000";
      const novoQr = `ENFCARE-INST-${nifParaUso}-${Math.random().toString(36).substring(7).toUpperCase()}`;
      qrCodeUpdate = { qrCode: novoQr };
    }

    const updated = await prisma.instituicao.update({
      where: { id },
      data: {
        ...(nome !== undefined && { nome }),
        ...(nif !== undefined && { nif }),
        ...(morada !== undefined && { morada }),
        ...(telefone !== undefined && { telefone: telefone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
        ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
        ...(ativo !== undefined && { ativo }),
        ...qrCodeUpdate,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Erro ao atualizar instituição:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar instituição" },
      { status: 500 }
    );
  }
}