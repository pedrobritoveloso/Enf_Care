import { z } from "zod";

export const instituicaoSchema = z.object({
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  nif: z.string().length(9, "O NIF deve ter exatamente 9 dígitos").regex(/^[0-9]+$/, "O NIF apenas pode conter números"),
  morada: z.string().min(5, "A morada deve ter pelo menos 5 caracteres"),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

export type InstituicaoInput = z.infer<typeof instituicaoSchema>;