import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const utilizador = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
    });

    if (!utilizador) {
      return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
    }

    const notificacoes = await prisma.notificacao.findMany({
      where: { utilizadorId: utilizador.id },
      orderBy: { criadoEm: "desc" },
      take: 20,
    });

    return NextResponse.json(notificacoes);
  } catch (error) {
    console.error("Erro ao buscar notificações:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const utilizador = await prisma.utilizador.findUnique({
      where: { email: session.user.email },
    });

    if (!utilizador) {
      return NextResponse.json({ error: "Utilizador não encontrado" }, { status: 404 });
    }

    // Marca todas as notificações do utilizador como lidas
    await prisma.notificacao.updateMany({
      where: { utilizadorId: utilizador.id, lida: false },
      data: { lida: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao atualizar notificações:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}