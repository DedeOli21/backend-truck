import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthService } from '@applications/auth/application/services/auth.service';
import { CteDocumentsService } from '@cte-documents/application/services/cte-documents.service';
import { FreightTimelineEventEntity } from '@applications/freight-expenses/domain/entities/freight-timeline-event.entity';
import {
  FREIGHT_TIMELINE_REPOSITORY,
  FreightTimelineRepository,
} from '@applications/freight-expenses/domain/repositories/freight-timeline.repository';
import { FreightEntity, FreightStatus } from '@freights/domain/entities/freight.entity';
import {
  FREIGHTS_REPOSITORY,
  FreightFilters,
  FreightsRepository,
} from '@freights/domain/repositories/freights.repository';

export interface CriarFreteDoCte {
  driverId?: string | null;
  truckId?: string | null;
  observacoes?: string | null;
}

export interface CriarFrete {
  codigo?: string;
  origem: string;
  destino: string;
  clienteNome?: string | null;
  clienteDocumento?: string | null;
  produto?: string | null;
  peso?: number | null;
  valorFrete: number;
  valorCarga?: number | null;
  truckId?: string | null;
  driverId?: string | null;
  observacoes?: string | null;
}

export type AtualizarFrete = Partial<Omit<CriarFrete, 'codigo'>>;

/** Rótulo de cada transição, para a timeline ficar legível sem consulta extra. */
const TITULO_POR_STATUS: Record<FreightStatus, string> = {
  AGENDADO: 'Frete agendado',
  EM_TRANSITO: 'Frete em trânsito',
  CONCLUIDO: 'Entrega concluída',
  CANCELADO: 'Frete cancelado',
};

@Injectable()
export class FreightsService {
  constructor(
    @Inject(FREIGHTS_REPOSITORY) private readonly repository: FreightsRepository,
    @Inject(CteDocumentsService) private readonly documentos: CteDocumentsService,
    @Inject(FREIGHT_TIMELINE_REPOSITORY)
    private readonly timeline: FreightTimelineRepository,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  /**
   * A timeline é histórico: uma falha ao registrar o evento não pode desfazer
   * a mudança de status que já foi gravada.
   */
  private async registrarEvento(
    frete: FreightEntity,
    status: FreightStatus,
    autorUserId: string | null,
    description: string | null,
  ): Promise<void> {
    try {
      await this.timeline.create(
        new FreightTimelineEventEntity({
          id: randomUUID(),
          freightId: frete.id,
          title: TITULO_POR_STATUS[status] ?? 'Frete atualizado',
          description,
          status,
          updatedBy: autorUserId ? await this.auth.nomeDoUsuario(autorUserId) : 'Sistema',
          createdAt: new Date(),
        }),
      );
    } catch {
      // Silencioso de propósito: perder um evento é melhor que perder a operação.
    }
  }

  private async codigoLivre(base: string): Promise<string> {
    if (!(await this.repository.findByCodigo(base))) {
      return base;
    }

    for (let sufixo = 2; sufixo < 100; sufixo += 1) {
      const tentativa = `${base}-${sufixo}`;
      if (!(await this.repository.findByCodigo(tentativa))) {
        return tentativa;
      }
    }

    throw new ConflictException(`Não foi possível gerar um código livre a partir de ${base}.`);
  }

  /**
   * Cria o frete a partir do CT-e: rota, cliente, carga e valor vêm do
   * documento fiscal, que é a fonte de verdade da operação. O CT-e fica
   * vinculado ao frete criado.
   */
  async criarDoCte(chave: string, dados: CriarFreteDoCte): Promise<FreightEntity> {
    const cte = await this.documentos.buscarPorChave(chave);

    if (cte.freightId) {
      throw new ConflictException(
        `Este CT-e já pertence ao frete ${cte.freightId}. Desvincule antes de criar outro.`,
      );
    }

    if (cte.situacao === 'CANCELADA' || cte.situacao === 'DENEGADA') {
      throw new BadRequestException(
        `CT-e ${cte.situacao.toLowerCase()} não pode virar frete.`,
      );
    }

    const truckId = dados.truckId ?? cte.truckId ?? null;
    const driverId = dados.driverId ?? cte.driverId ?? null;
    const agora = new Date();

    const frete = new FreightEntity({
      id: randomUUID(),
      codigo: await this.codigoLivre(`CTE-${cte.numero}`),
      origem: cte.origem ?? 'Não informado',
      destino: cte.destino ?? 'Não informado',
      clienteNome: cte.tomadorNome ?? cte.destinatarioNome,
      clienteDocumento: cte.tomadorDocumento ?? cte.destinatarioDocumento,
      remetenteNome: cte.remetenteNome,
      destinatarioNome: cte.destinatarioNome,
      produto: cte.produtoPredominante,
      peso: cte.pesoBruto,
      valorFrete: cte.valorTotalServico ?? 0,
      valorCarga: cte.valorCarga,
      status: 'AGENDADO',
      truckId,
      driverId,
      iniciadoEm: null,
      concluidoEm: null,
      observacoes: dados.observacoes ?? null,
      createdAt: agora,
      updatedAt: agora,
    });

    const salvo = await this.repository.save(frete);
    await this.documentos.vincular(chave, { freightId: salvo.id, driverId, truckId });

    return salvo;
  }

  async criar(dados: CriarFrete): Promise<FreightEntity> {
    const agora = new Date();
    const codigo = dados.codigo
      ? await this.codigoLivre(dados.codigo)
      : await this.codigoLivre(`FR-${agora.getTime().toString().slice(-6)}`);

    return this.repository.save(
      new FreightEntity({
        id: randomUUID(),
        codigo,
        origem: dados.origem,
        destino: dados.destino,
        clienteNome: dados.clienteNome ?? null,
        clienteDocumento: dados.clienteDocumento ?? null,
        remetenteNome: null,
        destinatarioNome: null,
        produto: dados.produto ?? null,
        peso: dados.peso ?? null,
        valorFrete: dados.valorFrete,
        valorCarga: dados.valorCarga ?? null,
        status: 'AGENDADO',
        truckId: dados.truckId ?? null,
        driverId: dados.driverId ?? null,
        iniciadoEm: null,
        concluidoEm: null,
        observacoes: dados.observacoes ?? null,
        createdAt: agora,
        updatedAt: agora,
      }),
    );
  }

  async buscar(id: string): Promise<FreightEntity> {
    const frete = await this.repository.findById(id);

    if (!frete) {
      throw new NotFoundException('Frete não encontrado.');
    }

    return frete;
  }

  async listar(filtros: FreightFilters): Promise<FreightEntity[]> {
    return this.repository.list(filtros);
  }

  async atualizar(id: string, dados: AtualizarFrete): Promise<FreightEntity> {
    const frete = await this.buscar(id);

    return this.repository.save(
      new FreightEntity({
        ...frete,
        origem: dados.origem ?? frete.origem,
        destino: dados.destino ?? frete.destino,
        clienteNome: dados.clienteNome === undefined ? frete.clienteNome : dados.clienteNome,
        clienteDocumento:
          dados.clienteDocumento === undefined ? frete.clienteDocumento : dados.clienteDocumento,
        produto: dados.produto === undefined ? frete.produto : dados.produto,
        peso: dados.peso === undefined ? frete.peso : dados.peso,
        valorFrete: dados.valorFrete ?? frete.valorFrete,
        valorCarga: dados.valorCarga === undefined ? frete.valorCarga : dados.valorCarga,
        truckId: dados.truckId === undefined ? frete.truckId : dados.truckId,
        driverId: dados.driverId === undefined ? frete.driverId : dados.driverId,
        observacoes: dados.observacoes === undefined ? frete.observacoes : dados.observacoes,
        updatedAt: new Date(),
      }),
    );
  }

  /**
   * Regras do ciclo: só sai de AGENDADO com motorista e veículo definidos, e
   * frete cancelado não volta atrás.
   */
  async alterarStatus(
    id: string,
    status: FreightStatus,
    autorUserId?: string,
  ): Promise<FreightEntity> {
    const frete = await this.buscar(id);

    if (frete.status === 'CANCELADO' && status !== 'CANCELADO') {
      throw new BadRequestException('Frete cancelado não pode mudar de status.');
    }

    if (status === 'EM_TRANSITO' && (!frete.driverId || !frete.truckId)) {
      throw new BadRequestException(
        'Defina motorista e veículo antes de colocar o frete em trânsito.',
      );
    }

    const agora = new Date();

    const atualizado = await this.repository.save(
      new FreightEntity({
        ...frete,
        status,
        iniciadoEm: status === 'EM_TRANSITO' ? (frete.iniciadoEm ?? agora) : frete.iniciadoEm,
        concluidoEm: status === 'CONCLUIDO' ? agora : frete.concluidoEm,
        updatedAt: agora,
      }),
    );

    await this.registrarEvento(
      atualizado,
      status,
      autorUserId ?? null,
      `Status alterado de ${frete.status} para ${status}.`,
    );

    return atualizado;
  }

  async remover(id: string): Promise<void> {
    const frete = await this.buscar(id);
    await this.repository.remove(frete.id);
  }
}
