import { z } from "zod";

export const updateProfileSchema = z
  .object({
    nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Introduza um e-mail válido"),
    telefone: z
      .string()
      .min(9, "O número de telemóvel deve ter pelo menos 9 dígitos")
      .regex(/^[0-9+ ]+$/, "Introduza um número de telemóvel válido"),
    cedula: z.string().optional().or(z.literal("")), // <-- Campo adicionado
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .optional()
      .refine((val) => !val || val.length >= 8, {
        message: "A nova palavra-passe deve ter pelo menos 8 caracteres",
      })
      .refine((val) => !val || /[A-Z]/.test(val), {
        message: "Deve conter pelo menos uma letra maiúscula",
      })
      .refine((val) => !val || /[a-z]/.test(val), {
        message: "Deve conter pelo menos uma letra minúscula",
      })
      .refine((val) => !val || /[0-9]/.test(val), {
        message: "Deve conter pelo menos um número",
      })
      .refine((val) => !val || /[^A-Za-z0-9]/.test(val), {
        message: "Deve conter pelo menos um caráter especial",
      }),
    confirmNewPassword: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.newPassword && !data.currentPassword) {
        return false;
      }
      return true;
    },
    {
      message: "Introduza a palavra-passe atual para definir uma nova",
      path: ["currentPassword"],
    }
  )
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "As novas palavras-passes não coincidem",
    path: ["confirmNewPassword"],
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;