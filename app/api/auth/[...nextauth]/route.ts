import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma"; // Reutiliza a instância global
import bcrypt from "bcryptjs";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Por favor introduza o e-mail e a palavra-passe.");
        }

        // 1. Procurar utilizador no PostgreSQL
        const user = await prisma.utilizador.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("Credenciais inválidas.");
        }

        // 2. Validar palavra-passe encriptada
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Credenciais inválidas.");
        }

        // 3. Retornar os dados do utilizador
        return {
          id: user.id,
          name: user.nome,
          email: user.email,
          role: user.tipo, // ADMIN ou ENFERMEIRO
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };