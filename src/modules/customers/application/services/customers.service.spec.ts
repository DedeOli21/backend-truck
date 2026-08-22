import { NotFoundException } from '@nestjs/common';
import { CustomersService } from '@applications/customers/application/services/customers.service';
import { InMemoryCustomersRepository } from '@applications/customers/infrastructure/repositories/in-memory-customers.repository';

const GESTOR_A = '11111111-1111-4111-8111-111111111111';
const GESTOR_B = '22222222-2222-4222-8222-222222222222';

const dados = (name: string) => ({
  name,
  taxId: '33.000.167/0001-01',
  phone: '(11) 3555-1000',
  address: 'Av. Paulista, 1000 - Sao Paulo/SP',
});

describe('CustomersService', () => {
  let service: CustomersService;

  beforeEach(() => {
    service = new CustomersService(new InMemoryCustomersRepository());
  });

  it('cadastra e lista o cliente do proprio gestor', async () => {
    await service.create(dados('Cosan'), GESTOR_A);

    const lista = await service.list({}, GESTOR_A);

    expect(lista).toHaveLength(1);
    expect(lista[0].name).toBe('Cosan');
  });

  it('nao devolve cliente de outro gestor na listagem', async () => {
    await service.create(dados('Cosan'), GESTOR_A);

    expect(await service.list({}, GESTOR_B)).toEqual([]);
  });

  it('nao deixa outro gestor abrir o cliente pelo id', async () => {
    const cliente = await service.create(dados('Cosan'), GESTOR_A);

    await expect(service.findById(cliente.id, GESTOR_B)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('nao deixa outro gestor editar nem remover', async () => {
    const cliente = await service.create(dados('Cosan'), GESTOR_A);

    await expect(service.update(cliente.id, { name: 'Invadido' }, GESTOR_B)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.remove(cliente.id, GESTOR_B)).rejects.toBeInstanceOf(NotFoundException);

    expect((await service.findById(cliente.id, GESTOR_A)).name).toBe('Cosan');
  });

  it('filtra por busca livre no nome', async () => {
    await service.create(dados('Cosan Lubrificantes'), GESTOR_A);
    await service.create(dados('Raizes Transportes'), GESTOR_A);

    const lista = await service.list({ search: 'cosan' }, GESTOR_A);

    expect(lista.map((item) => item.name)).toEqual(['Cosan Lubrificantes']);
  });
});
