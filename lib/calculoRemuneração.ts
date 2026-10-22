export interface TarifasConfig {
  valorDiurno: number;
  valorNoturno: number;
  valorEspecial: number;
}

export interface EpocaEspecialItem {
  dataInício: Date;
  dataFim: Date;
}

export function calcularValorTotalTurno(
  dataTurno: Date,
  horaInicioStr: string, // Ex: "08:00"
  horaFimStr: string,    // Ex: "20:00"
  tarifas: TarifasConfig,
  epocasEspeciais: EpocaEspecialItem[] = []
): { valorTotal: number; detalhes: { diurnas: number; noturnas: number; especiais: number } } {
  const diaSemana = dataTurno.getDay(); // 0 = Domingo, 6 = Sábado
  const isFimDeSemana = diaSemana === 0 || diaSemana === 6;

  // Verificar se a data do turno está dentro de uma Época Especial
  const isEpocaEspecial = epocasEspeciais.some(
    (e) => dataTurno >= new Date(e.dataInício) && dataTurno <= new Date(e.dataFim)
  );

  // Converter horaInicio e horaFim em objetos Date para calcular intervalos
  const [hIni, mIni] = horaInicioStr.split(":").map(Number);
  const [hFim, mFim] = horaFimStr.split(":").map(Number);

  let inicio = new Date(dataTurno);
  inicio.setHours(hIni, mIni, 0, 0);

  let fim = new Date(dataTurno);
  fim.setHours(hFim, mFim, 0, 0);

  // Se a hora de fim for menor/igual à de início, assume-se que cruza a meia-noite (ex: 20:00 às 08:00)
  if (fim <= inicio) {
    fim.setDate(fim.getDate() + 1);
  }

  let diurnas = 0;
  let noturnas = 0;
  let especiais = 0;

  // Percorrer hora a hora para contabilizar o escalão correto
  let cursor = new Date(inicio);
  while (cursor < fim) {
    const proximaHora = new Date(cursor.getTime() + 60 * 60 * 1000);
    const horaAtualObj = cursor <= fim ? cursor : fim;
    const hora = horaAtualObj.getHours();

    // Se for Fim de Semana ou Época Especial -> Tarifário Especial
    if (isFimDeSemana || isEpocaEspecial) {
      especiais += 1;
    } else {
      // Dia útil: Diurno entre as 08:00 e as 20:00; Noturno entre as 20:00 e as 08:00
      if (hora >= 8 && hora < 20) {
        diurnas += 1;
      } else {
        noturnas += 1;
      }
    }

    cursor = proximaHora;
  }

  const valorTotal =
    diurnas * tarifas.valorDiurno +
    noturnas * tarifas.valorNoturno +
    especiais * tarifas.valorEspecial;

  return {
    valorTotal,
    detalhes: { diurnas, noturnas, especiais },
  };
}