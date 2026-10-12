"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-md transition flex items-center gap-2"
    >
      🖨️ Imprimir Cartaz
    </button>
  );
}