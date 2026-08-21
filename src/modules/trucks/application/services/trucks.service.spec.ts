import { ConflictException, NotFoundException } from '@nestjs/common';
import { TruckStatus, TruckType } from '@database/typeorm/entities/enums';
import { TrucksService } from '@trucks/application/services/trucks.service';
import { InMemoryTrucksRepository } from '@trucks/infrastructure/repositories/in-memory-trucks.repository';

const baseDto = {
  plate: 'ABC1D23',
  brandModel: 'Volvo FH 540',
  year: 2021,
  type: TruckType.TRUCK,
  capacity: 14,
};

describe('TrucksService', () => {
  let repository: InMemoryTrucksRepository;
  let service: TrucksService;

  beforeEach(() => {
    repository = new InMemoryTrucksRepository();
    service = new TrucksService(repository);
  });

  it('cria veiculo com status ATIVO por padrao', async () => {
    const truck = await service.create({ ...baseDto });

    expect(truck.id).toBeDefined();
    expect(truck.plate).toBe('ABC1D23');
    expect(truck.status).toBe(TruckStatus.ATIVO);
    expect(truck.capacity).toBe(14);
  });

  it('normaliza a placa para maiusculas sem espacos', async () => {
    const truck = await service.create({ ...baseDto, plate: ' abc1d23 ' });
    expect(truck.plate).toBe('ABC1D23');
  });

  it('rejeita placa duplicada com ConflictException', async () => {
    await service.create({ ...baseDto });
    await expect(service.create({ ...baseDto })).rejects.toBeInstanceOf(ConflictException);
  });

  it('lista todos os veiculos e filtra por status', async () => {
    await service.create({ ...baseDto });
    await service.create({ ...baseDto, plate: 'XYZ4E56', status: TruckStatus.MANUTENCAO });

    expect(await service.list()).toHaveLength(2);
    const emManutencao = await service.list(TruckStatus.MANUTENCAO);
    expect(emManutencao).toHaveLength(1);
    expect(emManutencao[0].plate).toBe('XYZ4E56');
  });

  it('atualiza apenas os campos enviados', async () => {
    const created = await service.create({ ...baseDto });
    const updated = await service.update(created.id, { status: TruckStatus.INATIVO });

    expect(updated.status).toBe(TruckStatus.INATIVO);
    expect(updated.plate).toBe('ABC1D23');
    expect(updated.brandModel).toBe('Volvo FH 540');
  });

  it('rejeita atualizacao para placa ja usada por outro veiculo', async () => {
    await service.create({ ...baseDto });
    const outro = await service.create({ ...baseDto, plate: 'XYZ4E56' });

    await expect(service.update(outro.id, { plate: 'ABC1D23' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('permite atualizacao mantendo a propria placa', async () => {
    const created = await service.create({ ...baseDto });
    const updated = await service.update(created.id, { plate: 'ABC1D23', capacity: 20 });
    expect(updated.capacity).toBe(20);
  });

  it('lanca NotFoundException ao buscar, atualizar ou remover id inexistente', async () => {
    const id = '00000000-0000-0000-0000-000000000000';
    await expect(service.findById(id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.update(id, { capacity: 10 })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('remove o veiculo', async () => {
    const created = await service.create({ ...baseDto });
    await service.remove(created.id);
    expect(await service.list()).toHaveLength(0);
  });
});
