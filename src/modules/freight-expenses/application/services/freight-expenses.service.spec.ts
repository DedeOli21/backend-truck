import { NotFoundException } from '@nestjs/common';
import { FreightExpenseType } from '@database/typeorm/entities/enums';
import { FreightEntity } from '@freights/domain/entities/freight.entity';
import { FreightsService } from '@freights/application/services/freights.service';
import { FreightExpensesService } from '@applications/freight-expenses/application/services/freight-expenses.service';
import { InMemoryFreightExpensesRepository } from '@applications/freight-expenses/infrastructure/repositories/in-memory-freight-expenses.repository';
import { InMemoryFreightTimelineRepository } from '@applications/freight-expenses/infrastructure/repositories/in-memory-freight-timeline.repository';

const FRETE = '11111111-1111-4111-8111-111111111111';
const OUTRO_FRETE = '22222222-2222-4222-8222-222222222222';

const frete = (over: Partial<FreightEntity> = {}) =>
  new FreightEntity({
    id: FRETE,
    codigo: 'CTE-1147',
    origem: 'SP - ARUJÁ',
    destino: 'MG - CONTAGEM',
    valorFrete: 10000,
    status: 'AGENDADO',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  });

describe('FreightExpensesService', () => {
  let expenses: InMemoryFreightExpensesRepository;
  let timeline: InMemoryFreightTimelineRepository;
  let freights: { buscar: jest.Mock };
  let service: FreightExpensesService;

  beforeEach(() => {
    expenses = new InMemoryFreightExpensesRepository();
    timeline = new InMemoryFreightTimelineRepository();
    freights = {
      buscar: jest.fn(async (id: string) => {
        if (id !== FRETE) {
          throw new NotFoundException('Frete não encontrado.');
        }

        return frete();
      }),
    };
    service = new FreightExpensesService(
      expenses,
      timeline,
      freights as unknown as FreightsService,
    );
  });

  const lancar = (amount: number, type = FreightExpenseType.PEDAGIO) =>
    service.create(FRETE, { type, amount });

  it('lança despesa e devolve na listagem do frete', async () => {
    await lancar(180.5);

    const lista = await service.listByFreight(FRETE);

    expect(lista).toHaveLength(1);
    expect(lista[0].amount).toBe(180.5);
  });

  it('recusa lançar despesa em frete inexistente', async () => {
    await expect(
      service.create(OUTRO_FRETE, { type: FreightExpenseType.PEDAGIO, amount: 10 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('calcula lucro e margem descontando as despesas do valor do frete', async () => {
    await lancar(2000);
    await lancar(500, FreightExpenseType.COMBUSTIVEL);

    const resumo = await service.summary(FRETE);

    expect(resumo).toEqual({
      totalValue: 10000,
      totalExpenses: 2500,
      netProfit: 7500,
      marginPercentage: 75,
    });
  });

  it('não divide por zero quando o frete não tem valor lançado', async () => {
    freights.buscar.mockResolvedValueOnce(frete({ valorFrete: 0 }));

    expect((await service.summary(FRETE)).marginPercentage).toBe(0);
  });

  it('não remove despesa que pertence a outro frete', async () => {
    const despesa = await lancar(100);

    await expect(service.remove(OUTRO_FRETE, despesa.id)).rejects.toBeInstanceOf(NotFoundException);
    expect(await service.listByFreight(FRETE)).toHaveLength(1);
  });

  it('devolve a timeline do frete em ordem cronológica', async () => {
    await service.registrarEvento(FRETE, 'AGENDADO', 'Administrador');
    await service.registrarEvento(FRETE, 'EM_TRANSITO', 'Administrador');

    const eventos = await service.timeline(FRETE);

    expect(eventos.map((evento) => evento.status)).toEqual(['AGENDADO', 'EM_TRANSITO']);
    expect(eventos[1].title).toBe('Frete em trânsito');
  });
});
