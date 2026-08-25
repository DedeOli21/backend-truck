import { BadRequestException } from '@nestjs/common';
import { FinancialTransactionType } from '@database/typeorm/entities/enums';
import { CteDocumentEntity } from '@cte-documents/domain/entities/cte-document.entity';
import { CteDocumentsService } from '@cte-documents/application/services/cte-documents.service';
import { CustomersService } from '@applications/customers/application/services/customers.service';
import { FaturamentoCteService } from '@applications/financial/application/services/faturamento-cte.service';
import { InMemoryFinancialTransactionsRepository } from '@applications/financial/infrastructure/repositories/in-memory-financial.repository';

const GESTOR = '11111111-1111-4111-8111-111111111111';
const OUTRO_GESTOR = '22222222-2222-4222-8222-222222222222';
const CLIENTE = '33333333-3333-4333-8333-333333333333';
const CHAVE = '35260808789863000100570010000011471000000001';

const cte = (campos: Partial<CteDocumentEntity> = {}) =>
  new CteDocumentEntity({
    id: 'cte-1',
    ownerUserId: GESTOR,
    chave: CHAVE,
    numero: 1147,
    serie: 1,
    modelo: 57,
    uf: '35',
    cnpjEmitente: '08789863000100',
    emitidoEm: new Date('2026-08-20T12:00:00.000Z'),
    tomadorNome: 'CLIENTE LTDA',
    tomadorDocumento: '12345678000199',
    destinatarioNome: 'DESTINO LTDA',
    valorTotalServico: 1234.56,
    valorReceber: 1234.56,
    notasFiscais: [],
    situacao: 'AUTORIZADA',
    origemLeitura: 'XML',
    emitidoPorNos: true,
    freightId: null,
    autorizadoEm: new Date('2026-08-20T13:00:00.000Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...campos,
  });

describe('FaturamentoCteService', () => {
  let transactions: InMemoryFinancialTransactionsRepository;
  let documentos: { buscarPorChave: jest.Mock; listar: jest.Mock };
  let customers: { list: jest.Mock };
  let service: FaturamentoCteService;

  beforeEach(() => {
    transactions = new InMemoryFinancialTransactionsRepository();
    documentos = {
      buscarPorChave: jest.fn(async () => cte()),
      listar: jest.fn(async () => [cte()]),
    };
    customers = { list: jest.fn(async () => []) };
    service = new FaturamentoCteService(
      transactions,
      documentos as unknown as CteDocumentsService,
      customers as unknown as CustomersService,
    );
  });

  it('lança o valor do CT-e autorizado em contas a receber', async () => {
    const lancamento = await service.lancarDoCte(CHAVE, GESTOR);

    expect(lancamento.type).toBe(FinancialTransactionType.RECEITA);
    expect(lancamento.amount).toBe(1234.56);
    expect(lancamento.category).toBe('FRETE');
    expect(lancamento.cteChave).toBe(CHAVE);
    expect(lancamento.description).toContain('1147');
    expect(lancamento.dueDate).toBe('2026-08-20');
  });

  it('recusa CT-e que não está autorizado', async () => {
    documentos.buscarPorChave.mockResolvedValue(cte({ situacao: 'REJEITADA' }));

    await expect(service.lancarDoCte(CHAVE, GESTOR)).rejects.toBeInstanceOf(BadRequestException);
    expect(await transactions.list({ ownerUserId: GESTOR })).toHaveLength(0);
  });

  it('recusa CT-e sem valor de prestação', async () => {
    documentos.buscarPorChave.mockResolvedValue(
      cte({ valorReceber: null, valorTotalServico: null }),
    );

    await expect(service.lancarDoCte(CHAVE, GESTOR)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('não duplica o lançamento quando o mesmo CT-e é processado de novo', async () => {
    const primeiro = await service.lancarDoCte(CHAVE, GESTOR);
    const segundo = await service.lancarDoCte(CHAVE, GESTOR);

    expect(segundo.id).toBe(primeiro.id);
    expect(await transactions.list({ ownerUserId: GESTOR })).toHaveLength(1);
  });

  it('atualiza o valor quando o CT-e é reimportado com valor diferente', async () => {
    await service.lancarDoCte(CHAVE, GESTOR);
    documentos.buscarPorChave.mockResolvedValue(cte({ valorReceber: 2000 }));

    const atualizado = await service.lancarDoCte(CHAVE, GESTOR);

    expect(atualizado.amount).toBe(2000);
    expect(await transactions.list({ ownerUserId: GESTOR })).toHaveLength(1);
  });

  it('mantém o valor exato, sem arredondar', async () => {
    documentos.buscarPorChave.mockResolvedValue(cte({ valorReceber: 1234.57 }));

    const lancamento = await service.lancarDoCte(CHAVE, GESTOR);

    expect(lancamento.amount).toBe(1234.57);
  });

  it('vincula o cliente cadastrado com o mesmo CNPJ do tomador', async () => {
    customers.list.mockResolvedValue([
      { id: CLIENTE, name: 'CLIENTE LTDA', taxId: '12.345.678/0001-99' },
    ]);

    const lancamento = await service.lancarDoCte(CHAVE, GESTOR);

    expect(lancamento.customerId).toBe(CLIENTE);
  });

  it('aplica o prazo de pagamento sobre a data de autorização', async () => {
    const lancamento = await service.lancarDoCte(CHAVE, GESTOR, { prazoDias: 30 });

    expect(lancamento.dueDate).toBe('2026-09-19');
  });

  it('não vaza lançamento entre gestores', async () => {
    await service.lancarDoCte(CHAVE, GESTOR);
    documentos.buscarPorChave.mockResolvedValue(cte({ ownerUserId: OUTRO_GESTOR }));

    await service.lancarDoCte(CHAVE, OUTRO_GESTOR);

    expect(await transactions.list({ ownerUserId: GESTOR })).toHaveLength(1);
    expect(await transactions.list({ ownerUserId: OUTRO_GESTOR })).toHaveLength(1);
  });

  it('sincroniza em lote apenas os CT-e autorizados', async () => {
    documentos.listar.mockResolvedValue([
      cte(),
      cte({ id: 'cte-2', chave: `${CHAVE.slice(0, 43)}2`, situacao: 'REJEITADA' }),
      cte({ id: 'cte-3', chave: `${CHAVE.slice(0, 43)}3`, valorReceber: 500 }),
    ]);
    documentos.buscarPorChave.mockImplementation(async (chave: string) =>
      (await documentos.listar()).find((doc: CteDocumentEntity) => doc.chave === chave),
    );

    const resumo = await service.sincronizar(GESTOR, {});

    expect(resumo.criados).toBe(2);
    expect(resumo.ignorados).toBe(1);
    expect(await transactions.list({ ownerUserId: GESTOR })).toHaveLength(2);
  });

  it('na segunda sincronização nada é criado de novo', async () => {
    await service.sincronizar(GESTOR, {});
    const resumo = await service.sincronizar(GESTOR, {});

    expect(resumo.criados).toBe(0);
    expect(resumo.atualizados).toBe(1);
  });

  it('exporta as contas a receber em CSV para a planilha', async () => {
    await service.lancarDoCte(CHAVE, GESTOR);

    const csv = await service.exportarCsv(GESTOR, {});
    const linhas = csv.trim().split('\n');

    expect(linhas[0]).toBe(
      'CTe;Numero;Serie;Data;Vencimento;Cliente;Descricao;Valor;Status;Pagamento',
    );
    expect(linhas[1]).toContain(CHAVE);
    expect(linhas[1]).toContain('1234,56');
  });
});
