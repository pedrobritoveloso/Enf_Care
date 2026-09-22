import { PrismaClient, TipoUtilizador, EstadoTurno } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('123456', 10);

  // 1. Criar Administrador
  const adminUtilizador = await prisma.utilizador.upsert({
    where: { email: 'admin@myenfcare.pt' },
    update: {},
    create: {
      nome: 'Elisabete Gestora',
      email: 'admin@myenfcare.pt',
      password: passwordHash,
      tipo: TipoUtilizador.ADMIN,
      telefone: '910000000',
    },
  });

  // 2. Criar Instituição
  const hospitalX = await prisma.instituicao.upsert({
    where: { nif: '500123456' },
    update: {},
    create: {
      nome: 'Hospital X',
      nif: '500123456',
      morada: 'Rua Central, Porto',
      latitude: 41.1579,
      longitude: -8.6291,
    },
  });

  // 3. Criar Enfermeiro
  const enfermeiroUtilizador = await prisma.utilizador.upsert({
    where: { email: 'joao.silva@enfermeiros.pt' },
    update: {},
    create: {
      nome: 'João Silva',
      email: 'joao.silva@enfermeiros.pt',
      password: passwordHash,
      tipo: TipoUtilizador.ENFERMEIRO,
      telefone: '920000000',
      enfermeiro: {
        create: {
          cedulaProfissional: 'E-12345',
          especialidades: ['Enfermagem Geral', 'Pediatria'],
        },
      },
    },
  });

  console.log('✅ Base de dados populada com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });