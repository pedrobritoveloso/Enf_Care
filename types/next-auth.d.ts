import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      tipo?: string; // Adiciona o campo tipo aqui
      role?: string;
    } & DefaultSession["user"];
  }

  interface User {
    tipo?: string;
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tipo?: string;
    role?: string;
  }
}