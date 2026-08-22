import { DriversService } from '@applications/drivers/application/services/drivers.service';
import { AuthService } from '@applications/auth/application/services/auth.service';
import { InMemoryFreightTimelineRepository } from '@applications/freight-expenses/infrastructure/repositories/in-memory-freight-timeline.repository';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CteDocumentEntity } from '@cte-documents/domain/entities/cte-document.entity';
import { CteDocumentsService } from '@cte-documents/application/services/cte-documents.service';
import { FreightsService } from '@freights/application/services/freights.service';
import { InMemoryFreightsRepository } from '@freights/infrastructure/repositories/in-memory-freights.repository';

const GESTOR = '99999999-9999-4999-8999-999999999999';

const CHAVE = '35260808789863000100570010000011471000000001';

const cte = (over: Partial<CteDocumentEntity> = {}) =>
  new CteDocumentEntity({
    id: 'cte-1',
    chave: CHAVE,
    numero: 1147,
    serie: 1,
    modelo: 57,
    uf: 'SP',
    cnpjEmitente: '08789863000100',
    emitidoEm: new Date('2026-08-21T18:13:25Z'),
    origem: 'SP - ARUJÁ',
    destino: 'MG - CONTAGEM',
    remetenteNome: 'MEIWA INDUSTRIA',
    destinatarioNome: 'L&M PACK',
    tomadorNome: 'L&M PACK',
    tomadorDocumento: '18442358000130',
    valorTotalServico: 4500,
    valorCarga: 39587.01,
    pesoBruto: 1397.55,
    produtoPredominante: 'RECIPIENTE',
    notasFiscais: [],
    situacao: 'AUTORIZADA',
    origemLeitura: 'XML',
    truckId: null,
    driverId: null,
    freightId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  });

describe('FreightsService', () => {
  let repository: InMemoryFreightsRepository;
  let documentos: { buscarPorChave: jest.Mock; vincular: jest.Mock };
  let timeline: InMemoryFreightTimelineRepository;
  let service: FreightsService;

  beforeEach(() => {
    repository = new InMemoryFreightsRepository();
    timeline = new InMemoryFreightTimelineRepository();
    documentos = {
      buscarPorChave: jest.fn(async () => cte()),
      vincular: jest.fn(async () => cte()),
    };
    service = new FreightsService(
      repository,
      documentos as unknown as CteDocumentsService,
      timeline,
      { nomeDoUsuario: async () => 'Administrador' } as unknown as AuthService,
      { escopoDoUsuario: async () => GESTOR } as unknown as DriversService,
    );
  });

  it('cria frete a partir do CT-e, herdando rota, cliente e valores', async () => {
    const frete = await service.criarDoCte(CHAVE, {}, GESTOR);

    expect(frete.codigo).toBe('CTE-1147');
    expect(frete.origem).toBe('SP - ARUJÁ');
    expect(frete.destino).toBe('MG - CONTAGEM');
    expect(frete.clienteNome).toBe('L&M PACK');
    expect(frete.valorFrete).toBe(4500);
    expect(frete.valorCarga).toBe(39587.01);
    expect(frete.peso).toBe(1397.55);
    expect(frete.status).toBe('AGENDADO');
  });

  it('vincula o CT-e ao frete criado', async () => {
    const frete = await service.criarDoCte(CHAVE, { driverId: 'driver-1', truckId: 'truck-1' }, GESTOR);

    expect(documentos.vincular).toHaveBeenCalledWith(
      CHAVE,
      { freightId: frete.id, driverId: 'driver-1', truckId: 'truck-1' },
      GESTOR,
    );
    expect(frete.driverId).toBe('driver-1');
    expect(frete.truckId).toBe('truck-1');
  });

  it('aproveita o veiculo e motorista ja vinculados ao CT-e', async () => {
    documentos.buscarPorChave.mockResolvedValue(cte({ truckId: 'truck-9', driverId: 'driver-9' }));

    const frete = await service.criarDoCte(CHAVE, {}, GESTOR);

    expect(frete.truckId).toBe('truck-9');
    expect(frete.driverId).toBe('driver-9');
  });

  it('recusa criar dois fretes para o mesmo CT-e', async () => {
    const frete = await service.criarDoCte(CHAVE, {}, GESTOR);
    documentos.buscarPorChave.mockResolvedValue(cte({ freightId: frete.id }));

    await expect(service.criarDoCte(CHAVE, {}, GESTOR)).rejects.toBeInstanceOf(ConflictException);
  });

  it('recusa CT-e cancelado', async () => {
    documentos.buscarPorChave.mockResolvedValue(cte({ situacao: 'CANCELADA' }));

    await expect(service.criarDoCte(CHAVE, {}, GESTOR)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('avanca o status e carimba as datas', async () => {
    const frete = await service.criarDoCte(CHAVE, { driverId: 'driver-1', truckId: 'truck-1' }, GESTOR);

    const emTransito = await service.alterarStatus(frete.id, 'EM_TRANSITO');
    expect(emTransito.iniciadoEm).not.toBeNull();

    const concluido = await service.alterarStatus(frete.id, 'CONCLUIDO');
    expect(concluido.concluidoEm).not.toBeNull();
  });

  it('recusa iniciar frete sem motorista ou veiculo', async () => {
    const frete = await service.criarDoCte(CHAVE, {}, GESTOR);
    await service.atualizar(frete.id, { driverId: null, truckId: null });

    await expect(service.alterarStatus(frete.id, 'EM_TRANSITO')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('recusa concluir frete cancelado', async () => {
    const frete = await service.criarDoCte(CHAVE, { driverId: 'd', truckId: 't' }, GESTOR);
    await service.alterarStatus(frete.id, 'CANCELADO');

    await expect(service.alterarStatus(frete.id, 'CONCLUIDO')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('cria frete avulso, sem CT-e', async () => {
    const frete = await service.criar({
      origem: 'SP - SANTOS',
      destino: 'SP - CAMPINAS',
      valorFrete: 1200,
    }, GESTOR);

    expect(frete.codigo).toMatch(/^FR-/);
    expect(frete.status).toBe('AGENDADO');
  });

  it('filtra por status e motorista', async () => {
    const frete = await service.criarDoCte(CHAVE, { driverId: 'driver-1', truckId: 'truck-1' }, GESTOR);
    await service.alterarStatus(frete.id, 'EM_TRANSITO');
    await service.criar({ origem: 'A', destino: 'B', valorFrete: 10 }, GESTOR);

    expect(await service.listar({ ownerUserId: GESTOR,  status: 'EM_TRANSITO' })).toHaveLength(1);
    expect(await service.listar({ ownerUserId: GESTOR,  driverId: 'driver-1' })).toHaveLength(1);
    expect(await service.listar({ ownerUserId: GESTOR, })).toHaveLength(2);
  });

  it('lanca NotFound para frete inexistente', async () => {
    await expect(service.buscar('nao-existe', GESTOR)).rejects.toBeInstanceOf(NotFoundException);
  });
});
