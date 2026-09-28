import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ajusta para a rota do teu authOptions se necessário

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // Se não estiver autenticado, redireciona para a rota correta de login
  if (!session) {
    redirect("/login"); // <-- Altera aqui para /login
  }

  // Se for ADMIN, vai para o dashboard do admin
  if (session.user?.role === "ADMIN" || (session.user as any)?.tipo === "ADMIN") {
    redirect("/admin/dashboard");
  } 

  // Caso contrário, vai para a página de turnos/dashboard do enfermeiro
  redirect("/turnos");
}