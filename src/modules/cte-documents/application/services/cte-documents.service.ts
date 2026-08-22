import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CteDocumentEntity, OrigemLeituraCte } from '@cte-documents/domain/entities/cte-document.entity';
import {
  CTE_DOCUMENTS_REPOSITORY,
  CteDocumentFilters,
  CteDocumentsRepository,
} from '@cte-documents/domain/repositories/cte-documents.repository';
import { parseChaveAcesso } from '@nf-e/domain/value-objects/chave-acesso';
import { CteImportado } from '@nf-e/domain/value-objects/cte-xml';
import { DacteExtraido } from '@nf-e/infrastructure/dacte/dacte-parser';

export interface VinculoCte {
  truckId?: string | null;
  driverId?: string | null;
  freightId?: string | null;
}

const data = (valor: string | null | undefined): Date | null =>
  valor ? new Date(valor) : null;

/** Mantém o valor já gravado quando o novo vem vazio: reimportar não apaga dado. */
const preferir = <T>(novo: T | null | undefined, atual: T | null | undefined): T | null =>
  novo === null || novo === undefined || novo === '' ? (atual ?? null) : novo;

@Injectable()
export class CteDocumentsService {
  constructor(
    @Inject(CTE_DOCUMENTS_REPOSITORY) private readonly repository: CteDocumentsRepository,
  ) {}

  private async upsert(
    chave: string,
    origemLeitura: OrigemLeituraCte,
    ownerUserId: string,
    campos: Partial<CteDocumentEntity>,
  ): Promise<CteDocumentEntity> {
    const documento = parseChaveAcesso(chave);
    // Documento de outro gestor não é encontrado: a releitura cria o dele.
    const atual = await this.repository.findByChave(chave, ownerUserId);
    const agora = new Date();

    // XML é a fonte exata; PDF é heurístico. Uma leitura de PDF nunca substitui
    // o que veio do XML, só preenche o que estiver vazio.
    const origemFinal: OrigemLeituraCte =
      atual?.origemLeitura === 'XML' && origemLeitura !== 'XML' ? 'XML' : origemLeitura;
    const podeSobrescrever = !atual || origemLeitura === 'XML' || atual.origemLeitura !== 'XML';

    const mesclar = <K extends keyof CteDocumentEntity>(campo: K): CteDocumentEntity[K] => {
      const novo = campos[campo];
      const anterior = atual?.[campo];
      return (podeSobrescrever
        ? preferir(novo as never, anterior as never)
        : preferir(anterior as never, novo as never)) as CteDocumentEntity[K];
    };

    const entidade = new CteDocumentEntity({
      ...atual,
      id: atual?.id ?? randomUUID(),
      chave,
      numero: documento.numero,
      serie: documento.serie,
      modelo: documento.modelo,
      uf: documento.uf,
      cnpjEmitente: documento.cnpjEmitente,
      emitidoEm: mesclar('emitidoEm'),
      cfop: mesclar('cfop'),
      naturezaOperacao: mesclar('naturezaOperacao'),
      origem: mesclar('origem'),
      destino: mesclar('destino'),
      remetenteNome: mesclar('remetenteNome'),
      remetenteDocumento: mesclar('remetenteDocumento'),
      destinatarioNome: mesclar('destinatarioNome'),
      destinatarioDocumento: mesclar('destinatarioDocumento'),
      tomadorNome: mesclar('tomadorNome'),
      tomadorDocumento: mesclar('tomadorDocumento'),
      valorTotalServico: mesclar('valorTotalServico'),
      valorReceber: mesclar('valorReceber'),
      valorCarga: mesclar('valorCarga'),
      pesoBruto: mesclar('pesoBruto'),
      produtoPredominante: mesclar('produtoPredominante'),
      notasFiscais: campos.notasFiscais?.length ? campos.notasFiscais : (atual?.notasFiscais ?? []),
      rntrc: mesclar('rntrc'),
      placa: mesclar('placa'),
      protocolo: mesclar('protocolo'),
      autorizadoEm: mesclar('autorizadoEm'),
      situacao: mesclar('situacao'),
      origemLeitura: origemFinal,
      emitidoPorNos: campos.emitidoPorNos ?? atual?.emitidoPorNos ?? false,
      ambiente: mesclar('ambiente'),
      xml: mesclar('xml'),
      motivoRejeicao: campos.motivoRejeicao ?? atual?.motivoRejeicao ?? null,
      ownerUserId,
      truckId: atual?.truckId ?? null,
      driverId: atual?.driverId ?? null,
      freightId: atual?.freightId ?? null,
      createdAt: atual?.createdAt ?? agora,
      updatedAt: agora,
    });

    return this.repository.save(entidade);
  }

  async salvarDoXml(cte: CteImportado, ownerUserId: string): Promise<CteDocumentEntity> {
    return this.upsert(cte.chave, 'XML', ownerUserId, {
      emitidoEm: data(cte.emitidoEm),
      cfop: cte.cfop,
      naturezaOperacao: cte.naturezaOperacao,
      origem: cte.origem ? `${cte.origem.municipio} - ${cte.origem.uf}` : null,
      destino: cte.destino ? `${cte.destino.municipio} - ${cte.destino.uf}` : null,
      remetenteNome: cte.remetente?.nome ?? null,
      remetenteDocumento: cte.remetente?.cnpjCpf ?? null,
      destinatarioNome: cte.destinatario?.nome ?? null,
      destinatarioDocumento: cte.destinatario?.cnpjCpf ?? null,
      tomadorNome: cte.tomador?.nome ?? null,
      tomadorDocumento: cte.tomador?.cnpjCpf ?? null,
      valorTotalServico: cte.valorTotal,
      valorReceber: cte.valorReceber,
      valorCarga: cte.valorCarga,
      pesoBruto: cte.quantidades.find((q) => /PESO BRUTO/i.test(q.tipo))?.quantidade ?? null,
      produtoPredominante: cte.produtoPredominante,
      notasFiscais: cte.notasFiscais,
      rntrc: cte.rntrc,
      protocolo: cte.protocolo,
      autorizadoEm: data(cte.autorizadoEm),
      situacao: cte.situacao,
    });
  }

  async salvarDoPdf(
    dacte: DacteExtraido,
    ownerUserId: string,
    situacao?: string | null,
  ): Promise<CteDocumentEntity> {
    return this.upsert(dacte.chave, 'PDF', ownerUserId, {
      emitidoEm: null,
      cfop: dacte.cfop,
      naturezaOperacao: dacte.naturezaOperacao,
      origem: dacte.origem,
      destino: dacte.destino,
      remetenteNome: dacte.remetente.nome,
      remetenteDocumento: dacte.remetente.cnpjCpf,
      destinatarioNome: dacte.destinatario.nome,
      destinatarioDocumento: dacte.destinatario.cnpjCpf,
      tomadorNome: dacte.tomador.nome,
      tomadorDocumento: dacte.tomador.cnpjCpf,
      valorTotalServico: dacte.valorTotalServico,
      valorReceber: dacte.valorReceber,
      valorCarga: dacte.valorCarga,
      pesoBruto: dacte.pesoBruto,
      produtoPredominante: dacte.produtoPredominante,
      notasFiscais: dacte.notasFiscais,
      rntrc: dacte.rntrc,
      placa: dacte.placa,
      protocolo: dacte.protocolo,
      situacao: situacao ?? null,
    });
  }

  /**
   * Grava o CT-e a partir apenas da chave lida do QR Code ou do código de
   * barras. Só há o que a chave carrega; o conteúdo chega depois, quando o XML
   * ou o PDF forem importados — e aí não sobrescreve o que já existe.
   */
  async salvarDaChave(
    chave: string,
    ownerUserId: string,
    situacao?: string | null,
  ): Promise<CteDocumentEntity> {
    return this.upsert(chave, 'CHAVE', ownerUserId, { situacao: situacao ?? null });
  }

  /** Guarda o CT-e que nós mesmos emitimos, já autorizado pela SEFAZ. */
  async salvarEmitido(dados: {
    chave: string;
    ownerUserId: string;
    ambiente: number;
    protocolo: string | null;
    autorizadoEm: string | null;
    xml: string | null;
    notasFiscais: string[];
    truckId: string | null;
    driverId: string | null;
    valorTotalServico: number;
  }): Promise<CteDocumentEntity> {
    const salvo = await this.upsert(dados.chave, 'XML', dados.ownerUserId, {
      protocolo: dados.protocolo,
      autorizadoEm: data(dados.autorizadoEm),
      situacao: 'AUTORIZADA',
      notasFiscais: dados.notasFiscais,
      valorTotalServico: dados.valorTotalServico,
      valorReceber: dados.valorTotalServico,
      emitidoPorNos: true,
      ambiente: dados.ambiente,
      xml: dados.xml,
      motivoRejeicao: null,
    });

    if (dados.truckId || dados.driverId) {
      return this.vincular(
        dados.chave,
        { truckId: dados.truckId, driverId: dados.driverId },
        dados.ownerUserId,
      );
    }

    return salvo;
  }

  async buscarPorChave(chave: string, ownerUserId?: string): Promise<CteDocumentEntity> {
    const documento = await this.repository.findByChave(chave, ownerUserId);

    if (!documento) {
      throw new NotFoundException('CT-e não encontrado. Importe o XML ou o PDF primeiro.');
    }

    return documento;
  }

  async listar(filtros: CteDocumentFilters): Promise<CteDocumentEntity[]> {
    return this.repository.list(filtros);
  }

  async vincular(
    chave: string,
    vinculo: VinculoCte,
    ownerUserId?: string,
  ): Promise<CteDocumentEntity> {
    const documento = await this.buscarPorChave(chave, ownerUserId);

    return this.repository.save(
      new CteDocumentEntity({
        ...documento,
        truckId: vinculo.truckId === undefined ? documento.truckId : vinculo.truckId,
        driverId: vinculo.driverId === undefined ? documento.driverId : vinculo.driverId,
        freightId: vinculo.freightId === undefined ? documento.freightId : vinculo.freightId,
        updatedAt: new Date(),
      }),
    );
  }

  async remover(chave: string, ownerUserId?: string): Promise<void> {
    const documento = await this.buscarPorChave(chave, ownerUserId);
    await this.repository.remove(documento.id);
  }
}
