import { NotFoundException } from '@nestjs/common';
import { CteDocumentsService } from '@cte-documents/application/services/cte-documents.service';
import { InMemoryCteDocumentsRepository } from '@cte-documents/infrastructure/repositories/in-memory-cte-documents.repository';
import { CteImportado } from '@nf-e/domain/value-objects/cte-xml';

const CHAVE = '35260808789863000100570010000011471000000001';

const importado = (over: Partial<CteImportado> = {}): CteImportado => ({
  chave: CHAVE,
  numero: 1147,
  serie: 1,
  cfop: '6353',
  naturezaOperacao: 'PRESTACAO DE SERVICO DE TRANSPORTE',
  emitidoEm: '2026-08-21T15:13:25-03:00',
  origem: { municipio: 'ARUJA', uf: 'SP' },
  destino: { municipio: 'CONTAGEM', uf: 'MG' },
  emitente: { cnpjCpf: '08789863000100', nome: 'J M de Oliveira Cargas' },
  remetente: { cnpjCpf: '55078307000105', nome: 'MEIWA INDUSTRIA' },
  destinatario: { cnpjCpf: '18442358000130', nome: 'L&M PACK' },
  tomador: null,
  valorTotal: 4500,
  valorReceber: 4500,
  componentes: [],
  valorCarga: 39587.01,
  produtoPredominante: 'RECIPIENTE',
  quantidades: [],
  notasFiscais: ['35260855078307000105550010013284551000107765'],
  rntrc: '56299277',
  protocolo: '135264179761055',
  autorizadoEm: '2026-08-21T15:13:30-03:00',
  situacao: 'AUTORIZADA',
  ...over,
});

describe('CteDocumentsService', () => {
  let repository: InMemoryCteDocumentsRepository;
  let service: CteDocumentsService;

  beforeEach(() => {
    repository = new InMemoryCteDocumentsRepository();
    service = new CteDocumentsService(repository);
  });

  it('salva o CT-e lido do XML', async () => {
    const salvo = await service.salvarDoXml(importado());

    expect(salvo.chave).toBe(CHAVE);
    expect(salvo.numero).toBe(1147);
    expect(salvo.valorTotalServico).toBe(4500);
    expect(salvo.notasFiscais).toEqual(['35260855078307000105550010013284551000107765']);
    expect(salvo.origemLeitura).toBe('XML');
    expect(salvo.origem).toBe('ARUJA - SP');
  });

  it('reimportar a mesma chave atualiza em vez de duplicar', async () => {
    const primeiro = await service.salvarDoXml(importado());
    const segundo = await service.salvarDoXml(importado({ valorTotal: 5000 }));

    expect(segundo.id).toBe(primeiro.id);
    expect(segundo.valorTotalServico).toBe(5000);
    expect(await service.listar({})).toHaveLength(1);
  });

  it('preserva os vinculos ao reimportar', async () => {
    const salvo = await service.salvarDoXml(importado());
    await service.vincular(CHAVE, { truckId: 'truck-1', driverId: 'driver-1' });

    const reimportado = await service.salvarDoXml(importado({ valorTotal: 5000 }));

    expect(reimportado.truckId).toBe('truck-1');
    expect(reimportado.driverId).toBe('driver-1');
    expect(reimportado.id).toBe(salvo.id);
  });

  it('nao rebaixa dado de XML para dado de PDF', async () => {
    await service.salvarDoXml(importado());
    const depois = await service.salvarDoPdf({
      chave: CHAVE,
      numero: 1147,
      serie: 1,
      uf: 'SP',
      cnpjEmitente: '08789863000100',
      emitidoEm: null,
      cfop: null,
      naturezaOperacao: null,
      origem: null,
      destino: null,
      remetente: { nome: null, cnpjCpf: null, municipio: null, uf: null },
      destinatario: { nome: null, cnpjCpf: null, municipio: null, uf: null },
      tomador: { nome: null, cnpjCpf: null, municipio: null, uf: null },
      valorTotalServico: null,
      valorReceber: null,
      valorCarga: null,
      pesoBruto: null,
      produtoPredominante: null,
      notasFiscais: [],
      rntrc: null,
      placa: 'MJA4B09',
      protocolo: null,
      autorizadoEm: null,
      observacoes: null,
      camposNaoEncontrados: [],
    });

    // O XML continua mandando nos campos que ele preencheu; o PDF só acrescenta.
    expect(depois.origemLeitura).toBe('XML');
    expect(depois.valorTotalServico).toBe(4500);
    expect(depois.placa).toBe('MJA4B09');
  });

  it('busca por chave', async () => {
    await service.salvarDoXml(importado());
    expect((await service.buscarPorChave(CHAVE)).numero).toBe(1147);
  });

  it('lanca NotFound para chave desconhecida', async () => {
    await expect(service.buscarPorChave(CHAVE)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.vincular(CHAVE, { truckId: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('filtra por veiculo, motorista e situacao', async () => {
    await service.salvarDoXml(importado());
    await service.vincular(CHAVE, { truckId: 'truck-1', driverId: 'driver-1' });
    await service.salvarDoXml(
      importado({ chave: '35260808789863000100570010000011481000000009', numero: 1148 }),
    );

    expect(await service.listar({ truckId: 'truck-1' })).toHaveLength(1);
    expect(await service.listar({ driverId: 'driver-9' })).toHaveLength(0);
    expect(await service.listar({ situacao: 'AUTORIZADA' })).toHaveLength(2);
  });

  it('vincula e desvincula frete', async () => {
    await service.salvarDoXml(importado());

    const vinculado = await service.vincular(CHAVE, { freightId: 'frete-1' });
    expect(vinculado.freightId).toBe('frete-1');

    const desvinculado = await service.vincular(CHAVE, { freightId: null });
    expect(desvinculado.freightId).toBeNull();
  });

  it('remove o documento', async () => {
    await service.salvarDoXml(importado());
    await service.remover(CHAVE);

    expect(await service.listar({})).toHaveLength(0);
  });
});
