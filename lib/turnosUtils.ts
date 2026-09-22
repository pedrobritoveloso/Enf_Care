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