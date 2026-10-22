import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mes = searchParams.get("mes"); // Formato "YYYY-MM"

    // 1. Obter a configuração de tarifas atual da base de dados (ou usar valores predefinidos)
    const configTarifa = await prisma.configuracaoTarifa.findFirst();
    const valorDiurnoPadrao = configTarifa?.valorDiurno || 12.0;

    // 2. Definir o intervalo de datas com base no mês selecionado
    let startDate: Date;
    let endDate: Date;

    if (mes && /^\d{4}-\d{2}$/.test(mes)) {
      const [ano, mesStr] = mes.split("-");
      startDate = new Date(Date.UTC(Number(ano), Number(mesStr) - 1, 1));
      endDate = new Date(Date.UTC(Number(ano), Number(mesStr), 0, 23, 59, 59));
    } else {
      const agora = new Date();
      startDate = new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), 1));
      endDate = new Date(Date.UTC(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59));
    }

    // 3. Buscar assiduidades com saídas registadas no período (mesma lógica do relatório de assiduidade)
    const assiduidades = await prisma.assiduidade.findMany({
      where: {
        saidaReal: { not: null },
        turno: {
          data: {
            gte: startDate.toISOString(),
            lte: endDate.toISOString(),
          },
        },
      },
      include: {
        enfermeiro: {
          include: {
            utilizador: true,
          },
        },
        turno: {
          include: {
            instituicao: true,
          },
        },
      },
    });

    // 4. Processar e calcular métricas financeiras
    let receitaTotal = 0;
    let totalHoras = 0;

    const mapEnfermeiros = new Map<string, { nome: string; totalHoras: number }>();
    const mapInstituicoes = new Map<string, { nome: string; totalTurnos: number; receitaTotal: number }>();

    for (const item of assiduidades) {
      const horas = item.horasContabilizadas || 0;
      totalHoras += horas;

      // Utiliza o valor/hora específico do turno ou a tarifa diurna padrão configurada
      const valorHoraAplicado = item.turno.valorHora || valorDiurnoPadrao;
      const receitaTurno = horas * valorHoraAplicado;
      receitaTotal += receitaTurno;

      // Agrupar por Enfermeiro
      const enfNome = item.enfermeiro?.utilizador?.nome || "Desconhecido";
      if (!mapEnfermeiros.has(enfNome)) {
        mapEnfermeiros.set(enfNome, { nome: enfNome, totalHoras: 0 });
      }
      mapEnfermeiros.get(enfNome)!.totalHoras += horas;

      // Agrupar por Instituição
      const instId = item.turno.instituicao.id;
      const instNome = item.turno.instituicao.nome;
      if (!mapInstituicoes.has(instId)) {
        mapInstituicoes.set(instId, { nome: instNome, totalTurnos: 0, receitaTotal: 0 });
      }
      const instData = mapInstituicoes.get(instId)!;
      instData.totalTurnos += 1;
      instData.receitaTotal += receitaTurno;
    }

    const horasPorEnfermeiro = Array.from(mapEnfermeiros.values()).sort((a, b) => b.totalHoras - a.totalHoras);
    const porInstituicao = Array.from(mapInstituicoes.values()).sort((a, b) => b.receitaTotal - a.receitaTotal);

    return NextResponse.json({
      receitaTotal,
      totalHoras,
      horasPorEnfermeiro,
      porInstituicao,
    });
  } catch (error: any) {
    console.error("Erro ao calcular resumo financeiro:", error);
    return NextResponse.json({ error: "Erro interno do servidor." }, { status: 500 });
  }
}