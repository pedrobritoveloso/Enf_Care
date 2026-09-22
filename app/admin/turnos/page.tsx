import CriarTurnoEscalaForm from "@/components/CriarTurnosEscalaForm";

export default function AdminEscalaPage() {
  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Agendar Turno em Escala</h1>
        <p className="text-xs text-slate-400 mt-1">Crie um turno já atribuído a um enfermeiro específico</p>
      </div>

      <CriarTurnoEscalaForm />
    </div>
  );
}