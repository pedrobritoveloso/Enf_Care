import { z } from "zod";

export const registerSchema = z.object({
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Introduza um e-mail válido"),
  telefone: z
    .string()
    .min(9, "O número de telemóvel deve ter pelo menos 9 dígitos")
    .regex(/^[0-9+ ]+$/, "Introduza um número de telemóvel válido"),
  password: z
    .string()
    .min(8, "A palavra-passe deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Deve conter pelo menos um número")
    .regex(/[^A-Za-z0-9]/, "Deve conter pelo menos um caráter especial"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As palavras-passes não coincidem",
  path: ["confirmPassword"],
});

export type RegisterInput = z.infer<typeof registerSchema>;