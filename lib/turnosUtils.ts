import { prisma } from "@/lib/prisma";

/**
 * Verifica se o check-in é permitido:
 * Ativa apenas a partir de 10 minutos antes da horaInicio do turno.
 */
export function podeFazerCheckIn(dataTurnoStr: string, horaInicioStr: string, horaFimStr: string): boolean {
  const agora = new Date();

  // Formato esperado: dataTurnoStr = "2026-09-11" ou ISO string, horaInicioStr = "08:00"
  const dataApenas = dataTurnoStr.split("T")[0];
  const inicioTurno = new Date(`${dataApenas}T${horaInicioStr}:00`);
  const fimTurno = new Date(`${dataApenas}T${horaFimStr}:00`);

  // Caso o turno termine no dia seguinte (ex: 22:00 às 06:00)
  if (fimTurno < inicioTurno) {
    fimTurno.setDate(fimTurno.getDate() + 1);
  }

  // Limite inferior: 10 minutos antes do início
  const limiteInicio = new Date(inicioTurno.getTime() - 10 * 60 * 1000);

  return agora >= limiteInicio && agora <= fimTurno;
}

/**
 * Procura turnos cuja hora de fim já passou e marca-os automaticamente como CONCLUIDO.
 */
export async function atualizarTurnosExpirados() {
  try {
    const agora = new Date();

    // Procurar todos os turnos que ainda estão PUBLICADO, ATRIBUIDO ou EM_CURSO
    const turnosAtivos = await prisma.turno.findMany({
      where: {
        estado: { in: ["PUBLICADO", "ATRIBUIDO", "EM_CURSO"] },
      },
      include: {
        atribuicoes: {
          include: {
            enfermeiro: {
              include: { utilizador: { select: { nome: true } } },
            },
          },
        },
        assiduidades: true,
      },
    });

    for (const turno of turnosAtivos) {
      const dataApenas = new Date(turno.data).toISOString().split("T")[0];
      const fimTurno = new Date(`${dataApenas}T${turno.horaFim}:00`);

      // Se o turno terminava no dia seguinte (ex: 22:00 - 06:00)
      const inicioTurno = new Date(`${dataApenas}T${turno.horaInicio}:00`);
      if (fimTurno < inicioTurno) {
        fimTurno.setDate(fimTurno.getDate() + 1);
      }

      // Se a hora atual for maior que a hora de fim do turno -> EXPIRADO
      if (agora > fimTurno) {
        let motivo = "Turno concluído por expiração de tempo.";

        const enfermeiroNome = turno.atribuicoes?.[0]?.enfermeiro?.utilizador?.nome;

        if (turno.estado === "ATRIBUIDO") {
          motivo = `Turno concluído por expiração de tempo (${enfermeiroNome || "Enfermeiro"} não fez check-in).`;
        } else if (turno.estado === "EM_CURSO") {
          motivo = "Concluído por expiração de horário (Check-out não registado).";
        } else if (turno.estado === "PUBLICADO") {
          motivo = "Turno encerrado sem atribuição de enfermeiro.";
        }

        await prisma.turno.update({
          where: { id: turno.id },
          data: {
            estado: "CONCLUIDO",
            motivoConclusao: motivo,
          },
        });
      }
    }
  } catch (error) {
    console.error("Erro ao atualizar turnos expirados:", error);
  }
}

/**
 * Retorna as classes CSS de estilo para cada estado do turno.
 * Cor azul aplicada para turnos CONCLUIDO.
 */
export function getEstiloEstadoTurno(estado?: string): string {
  switch (estado) {
    case "CONCLUIDO":
      return "bg-blue-600 text-white border-blue-700"; // Azul para Concluído
    case "EM_CURSO":
      return "bg-amber-500 text-white border-amber-600";
    case "ATRIBUIDO":
      return "bg-emerald-600 text-white border-emerald-700";
    case "PUBLICADO":
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}