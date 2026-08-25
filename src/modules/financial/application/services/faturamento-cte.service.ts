import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FinancialTransactionType } from '@database/typeorm/entities/enums';
import { CteDocumentEntity } from '@cte-documents/domain/entities/cte-document.entity';
import { CteDocumentsService } from '@cte-documents/application/services/cte-documents.service';
import { CustomersService } from '@applications/customers/application/services/customers.service';
import { FinancialTransactionEntity } from '@applications/financial/domain/entities/financial-transaction.entity';
import {
  FINANCIAL_TRANSACTIONS_REPOSITORY,
  FinancialTransactionsRepository,
} from '@applications/financial/domain/repositories/financial.repository';

export interface LancamentoCteOptions {
  /** Dias somados à autorização para formar o vencimento. Zero vence no ato. */
  prazoDias?: number;
  /** Vencimento explícito (YYYY-MM-DD); tem precedência sobre o prazo. */
  dueDate?: string;
  /** Cliente informado pelo usuário quando o CNPJ do tomador não bate com o cadastro. */
  customerId?: string;
}

export interface ResumoSincronizacao {
  criados: number;
  atualizados: number;
  ignorados: number;
  /** Chaves que não puderam ser lançadas, com o motivo. */
  falhas: { chave: string; motivo: string }[];
}

export interface FiltroPeriodo {
  from?: string;
  to?: string;
}

export type FaturamentoStatus = 'PENDENTE' | 'PAGO' | 'ATRASADO';

export interface LancamentoCteResponse {
  id: string;
  type: FinancialTransactionType;
  category: string;
  description: string;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  status: FaturamentoStatus;
  customerId: string | null;
  freightId: string | null;
  cteChave: string | null;
  /** Se o lançamento já existia e foi só atualizado com o valor atual do CT-e. */
  jaExistia: boolean;
}

/** SEFAZ e os importadores escrevem a situação de formas diferentes; todas valem. */
const SITUACOES_AUTORIZADAS = new Set(['AUTORIZADA', 'AUTORIZADO', 'AUTORIZACAO DE USO', '100']);

const CATEGORIA_FATURAMENTO = 'FRETE';

const hoje = () => new Date().toISOString().slice(0, 10);

const somenteDigitos = (valor: string | null | undefined): string =>
  (valor ?? '').replace(/\D/g, '');

const isoDia = (valor: Date | string | null | undefined): string | null => {
  if (!valor) return null;
  const data = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data.toISOString().slice(0, 10);
};

const somarDias = (isoDate: string, dias: number): string => {
  const data = new Date(`${isoDate}T00:00:00.000Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
};

/** Ponto-e-vírgula e vírgula decimal: é o que o Excel e o Sheets em pt-BR entendem. */
const csvCampo = (valor: string | number | null | undefined): string => {
  const texto = String(valor ?? '');
  return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
};

const csvValor = (valor: number): string => valor.toFixed(2).replace('.', ',');

/**
 * Faturamento a partir do CT-e: o valor da prestação vira uma conta a receber,
 * sem redigitação. O CT-e é a fonte do valor; aqui nada é recalculado.
 */
@Injectable()
export class FaturamentoCteService {
  private readonly logger = new Logger(FaturamentoCteService.name);

  constructor(
    @Inject(FINANCIAL_TRANSACTIONS_REPOSITORY)
    private readonly transactions: FinancialTransactionsRepository,
    @Inject(CteDocumentsService) private readonly documentos: CteDocumentsService,
    @Inject(CustomersService) private readonly customers: CustomersService,
  ) {}

  private statusDe(transaction: FinancialTransactionEntity): FaturamentoStatus {
    if (transaction.paidAt) return 'PAGO';
    return transaction.dueDate < hoje() ? 'ATRASADO' : 'PENDENTE';
  }

  private toResponse(
    transaction: FinancialTransactionEntity,
    jaExistia: boolean,
  ): LancamentoCteResponse {
    return {
      id: transaction.id,
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      amount: Number(transaction.amount),
      dueDate: transaction.dueDate,
      paidAt: transaction.paidAt,
      status: this.statusDe(transaction),
      customerId: transaction.customerId,
      freightId: transaction.freightId,
      cteChave: transaction.cteChave,
      jaExistia,
    };
  }

  private autorizado(documento: CteDocumentEntity): boolean {
    const situacao = (documento.situacao ?? '').trim().toUpperCase();
    return SITUACOES_AUTORIZADAS.has(situacao);
  }

  /** O valor a receber é o que o CT-e manda; o total do serviço só entra na falta dele. */
  private valorDoCte(documento: CteDocumentEntity): number {
    const valor = Number(documento.valorReceber ?? documento.valorTotalServico ?? 0);
    return Number.isFinite(valor) ? valor : 0;
  }

  private descricaoDo(documento: CteDocumentEntity): string {
    const tomador = documento.tomadorNome ?? documento.destinatarioNome ?? '';
    const trajeto =
      documento.origem && documento.destino ? ` ${documento.origem} → ${documento.destino}` : '';
    const base = `CT-e ${documento.numero}/${documento.serie}${trajeto}`;
    return (tomador ? `${base} - ${tomador}` : base).slice(0, 255);
  }

  /** Casa o tomador do CT-e com o cadastro de clientes pelo CNPJ/CPF. */
  private async clienteDo(
    documento: CteDocumentEntity,
    ownerUserId: string,
  ): Promise<string | null> {
    const documentoTomador = somenteDigitos(
      documento.tomadorDocumento ?? documento.destinatarioDocumento,
    );

    if (!documentoTomador) return null;

    const clientes = await this.customers.list({}, ownerUserId);
    const encontrado = clientes.find(
      (cliente) => somenteDigitos(cliente.taxId) === documentoTomador,
    );

    return encontrado?.id ?? null;
  }

  private vencimentoDe(documento: CteDocumentEntity, options: LancamentoCteOptions): string {
    if (options.dueDate) return options.dueDate;

    const base = isoDia(documento.autorizadoEm) ?? isoDia(documento.emitidoEm) ?? hoje();
    return somarDias(base, options.prazoDias ?? 0);
  }

  /**
   * Lança (ou atualiza) a conta a receber do CT-e. Só CT-e autorizado entra:
   * documento pendente ou rejeitado não vira faturamento.
   */
  async lancarDoCte(
    chave: string,
    ownerUserId: string,
    options: LancamentoCteOptions = {},
  ): Promise<LancamentoCteResponse> {
    const documento = await this.documentos.buscarPorChave(chave, ownerUserId);

    if (!this.autorizado(documento)) {
      throw new BadRequestException(
        `CT-e ${chave} não está autorizado (situação: ${documento.situacao ?? 'desconhecida'}). Só CT-e autorizado gera faturamento.`,
      );
    }

    const amount = this.valorDoCte(documento);

    if (amount <= 0) {
      throw new BadRequestException(
        `CT-e ${chave} não tem valor de prestação para lançar em contas a receber.`,
      );
    }

    const existente = await this.transactions.findByCteChave(chave, ownerUserId);
    const customerId =
      options.customerId ??
      existente?.customerId ??
      (await this.clienteDo(documento, ownerUserId));
    const agora = new Date();

    if (existente) {
      // Reimportar o mesmo CT-e corrige o valor; a baixa e o vencimento já
      // ajustados à mão continuam de pé.
      const atualizado = new FinancialTransactionEntity({
        ...existente,
        amount,
        description: this.descricaoDo(documento),
        customerId,
        freightId: documento.freightId ?? existente.freightId,
        updatedAt: agora,
      });

      return this.toResponse(await this.transactions.update(existente.id, atualizado), true);
    }

    const lancamento = new FinancialTransactionEntity({
      id: randomUUID(),
      ownerUserId,
      type: FinancialTransactionType.RECEITA,
      category: CATEGORIA_FATURAMENTO,
      description: this.descricaoDo(documento),
      amount,
      dueDate: this.vencimentoDe(documento, options),
      paidAt: null,
      bankAccount: null,
      customerId,
      supplierId: null,
      freightId: documento.freightId ?? null,
      cteChave: chave,
      createdAt: agora,
      updatedAt: agora,
    });

    return this.toResponse(await this.transactions.create(lancamento), false);
  }

  /**
   * Lançamento automático no momento da emissão. Falha aqui não pode derrubar a
   * emissão do CT-e: o documento já foi autorizado na SEFAZ.
   */
  async lancarAposEmissao(
    chave: string,
    ownerUserId: string,
    options: LancamentoCteOptions = {},
  ): Promise<LancamentoCteResponse | null> {
    try {
      return await this.lancarDoCte(chave, ownerUserId, options);
    } catch (erro) {
      this.logger.warn(
        `Faturamento automático do CT-e ${chave} não realizado: ${(erro as Error).message}`,
      );
      return null;
    }
  }

  /** Backfill: lança todos os CT-e autorizados que ainda não estão no contas a receber. */
  async sincronizar(
    ownerUserId: string,
    filtros: FiltroPeriodo & { prazoDias?: number },
  ): Promise<ResumoSincronizacao> {
    const documentos = await this.documentos.listar({
      ownerUserId,
      from: filtros.from ? new Date(`${filtros.from}T00:00:00.000Z`) : undefined,
      to: filtros.to ? new Date(`${filtros.to}T23:59:59.999Z`) : undefined,
    });

    const resumo: ResumoSincronizacao = { criados: 0, atualizados: 0, ignorados: 0, falhas: [] };

    for (const documento of documentos) {
      if (!this.autorizado(documento) || this.valorDoCte(documento) <= 0) {
        resumo.ignorados += 1;
        continue;
      }

      try {
        const lancamento = await this.lancarDoCte(documento.chave, ownerUserId, {
          prazoDias: filtros.prazoDias,
        });

        if (lancamento.jaExistia) {
          resumo.atualizados += 1;
        } else {
          resumo.criados += 1;
        }
      } catch (erro) {
        resumo.falhas.push({ chave: documento.chave, motivo: (erro as Error).message });
      }
    }

    return resumo;
  }

  /**
   * Contas a receber em CSV, pronto para colar na planilha de faturamento
   * (Excel ou Google Sheets em pt-BR).
   */
  async exportarCsv(
    ownerUserId: string,
    filtros: FiltroPeriodo & { somenteCte?: boolean },
  ): Promise<string> {
    const lancamentos = await this.transactions.list({
      ownerUserId,
      type: FinancialTransactionType.RECEITA,
      somenteCte: filtros.somenteCte,
      from: filtros.from,
      to: filtros.to,
    });

    const documentos = await this.documentos.listar({ ownerUserId });
    const porChave = new Map(documentos.map((documento) => [documento.chave, documento]));

    const linhas = lancamentos.map((lancamento) => {
      const documento = lancamento.cteChave ? porChave.get(lancamento.cteChave) : undefined;
      const emissao =
        isoDia(documento?.autorizadoEm) ?? isoDia(documento?.emitidoEm) ?? lancamento.dueDate;

      return [
        csvCampo(lancamento.cteChave ?? ''),
        csvCampo(documento?.numero ?? ''),
        csvCampo(documento?.serie ?? ''),
        csvCampo(emissao),
        csvCampo(lancamento.dueDate),
        csvCampo(documento?.tomadorNome ?? documento?.destinatarioNome ?? ''),
        csvCampo(lancamento.description),
        csvValor(Number(lancamento.amount)),
        csvCampo(this.statusDe(lancamento)),
        csvCampo(lancamento.paidAt ?? ''),
      ].join(';');
    });

    return [
      'CTe;Numero;Serie;Data;Vencimento;Cliente;Descricao;Valor;Status;Pagamento',
      ...linhas,
    ].join('\n');
  }
}
