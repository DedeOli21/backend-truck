import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CteDocumentEntity, OrigemLeituraCte } from '@cte-documents/domain/entities/cte-document.entity';
import {
  CTE_DOCUMENTS_REPOSITORY,
  CteDocumentFilters,
  CteDocumentsRepository,
} from '@cte-documents/domain/repositories/cte-documents.repository';
import { parseChaveAcesso } from '@nf-e/domain/value-objects/chave-acesso';
import { CteImportado, parseCteXml } from '@nf-e/domain/value-objects/cte-xml';
import { DacteExtraido } from '@nf-e/infrastructure/dacte/dacte-parser';
import { gerarDactePdf, DadosDacte } from '@nf-e/infrastructure/dacte/dacte-pdf.service';
import { logoEmitente } from '@nf-e/infrastructure/dacte/logo';
import { EMISSOR_CONFIG, EmissorConfig } from '@nf-e/infrastructure/emissao/emissor.config';
export interface VinculoCte {
  truckId?: string | null;
  driverId?: string | null;
  freightId?: string | null;
}

const data = (valor: string | null | undefined): Date | null =>
  valor ? new Date(valor) : null;

/** Mantém o valor já gravado quando o novo vem vazio: reimportar não apaga dado. */
/** URL de consulta do QR Code impressa no DACTE, gravada em infCTeSupl. */
const extrairQrCode = (xml: string | null | undefined): string | undefined => {
  if (!xml) return undefined;
  const conteudo = /<qrCodCTe>\s*(?:<!\[CDATA\[)?([^\]<]+)/.exec(xml)?.[1]?.trim();
  return conteudo || undefined;
};

const tagXml = (xml: string, bloco: string, tag: string): string => {
  const conteudo = new RegExp(`<${bloco}>([\\s\\S]*?)</${bloco}>`).exec(xml)?.[1] ?? '';
  return new RegExp(`<${tag}>([^<]*)</${tag}>`).exec(conteudo)?.[1]?.trim() ?? '';
};

/**
 * Endereço, IE e telefone de um participante (emit/rem/dest) ficam dentro do
 * seu próprio bloco, que o parse geral do CT-e (cte-xml.ts) não carrega —
 * só guarda nome e CNPJ/CPF. Sem isso o DACTE sai com o bloco pela metade,
 * mesmo quando o dado está no XML.
 */
const extrairParticipante = (
  xml: string | null | undefined,
  bloco: string,
  enderTag: string,
) => {
  if (!xml) return null;

  const conteudo = new RegExp(`<${bloco}>([\\s\\S]*?)</${bloco}>`).exec(xml)?.[1];
  if (!conteudo) return null;

  const campo = (tag: string) =>
    new RegExp(`<${tag}>([^<]*)</${tag}>`).exec(conteudo)?.[1]?.trim() ?? '';
  const numero = tagXml(conteudo, enderTag, 'nro');
  const logradouro = tagXml(conteudo, enderTag, 'xLgr');
  const cep = tagXml(conteudo, enderTag, 'CEP');

  return {
    ie: campo('IE'),
    telefone: tagXml(conteudo, enderTag, 'fone'),
    logradouro: [logradouro, numero].filter(Boolean).join(' '),
    bairro: tagXml(conteudo, enderTag, 'xBairro'),
    cep: cep.replace(/^(\d{5})(\d{3})$/, '$1-$2'),
    municipio: tagXml(conteudo, enderTag, 'xMun'),
    uf: tagXml(conteudo, enderTag, 'UF'),
    crt: campo('CRT'),
  };
};

const extrairEmitente = (xml: string | null | undefined) =>
  extrairParticipante(xml, 'emit', 'enderEmit');

const preferir = <T>(novo: T | null | undefined, atual: T | null | undefined): T | null =>
  novo === null || novo === undefined || novo === '' ? (atual ?? null) : novo;

/**
 * Dados do emitente para o DACTE. Quando o CT-e é nosso (mesmo CNPJ
 * configurado no emissor) e o XML guardado não trouxe o bloco <emit>
 * completo (import por PDF/chave), os dados reais da empresa vêm da config
 * — nunca de um placeholder genérico nem da cidade da viagem. CT-e de outro
 * emitente (importado de terceiro) mantém o fallback neutro: não temos o
 * endereço dele para inventar.
 */
export const resolverEmitenteDacte = (
  documento: Pick<CteDocumentEntity, 'cnpjEmitente' | 'rntrc' | 'uf'>,
  cteDoXml: CteImportado | null,
  doXml: ReturnType<typeof extrairEmitente>,
  config: EmissorConfig['emitente'],
) => {
  const ehNossoEmitente =
    documento.cnpjEmitente.replace(/\D/g, '') === config.cnpjCpf.replace(/\D/g, '');
  const cepConfig = config.endereco.cep.replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2');
  const logradouroConfig = [config.endereco.logradouro, config.endereco.numero]
    .filter(Boolean)
    .join(' ');
  const crt = doXml?.crt === '3' ? '3' : doXml?.crt === '2' ? '2' : doXml?.crt === '1' ? '1' : null;

  return {
    nome: cteDoXml?.emitente?.nome || (ehNossoEmitente ? config.nome : 'EMITENTE'),
    cnpj: documento.cnpjEmitente,
    ie: doXml?.ie || (ehNossoEmitente ? config.inscricaoEstadual : '') || 'ISENTO',
    rntrc: cteDoXml?.rntrc || documento.rntrc || (ehNossoEmitente ? config.rntrc : '') || '',
    telefone: doXml?.telefone || (ehNossoEmitente ? config.fone : '') || '',
    logradouro: doXml?.logradouro || (ehNossoEmitente ? logradouroConfig : '') || '',
    bairro: doXml?.bairro || (ehNossoEmitente ? config.endereco.bairro : '') || '',
    cep: doXml?.cep || (ehNossoEmitente ? cepConfig : '') || '',
    municipio: doXml?.municipio || (ehNossoEmitente ? config.endereco.municipio : '') || '',
    uf: doXml?.uf || (ehNossoEmitente ? config.endereco.uf : documento.uf),
    crt: (crt ?? (ehNossoEmitente ? String(config.crt) : '1')) as '1' | '2' | '3',
  };
};

/**
 * Endereço, IE e fone de remetente/destinatário/tomador para o DACTE. O XML
 * é a única fonte — sem ele, mostra só nome e CNPJ (nada de endereço
 * inventado). O tomador, quando indicado por código (toma3), é uma das
 * outras partes já presentes no XML; casa pelo CNPJ salvo no documento.
 */
export const resolverParticipanteDacte = (
  nome: string | null,
  cnpjCpf: string | null,
  extraido: ReturnType<typeof extrairParticipante>,
  municipioFallback: string,
  ufFallback: string,
) => ({
  nome: nome ?? '',
  cnpjCpf: cnpjCpf ?? '',
  ie: extraido?.ie ?? '',
  logradouro: extraido?.logradouro ?? '',
  bairro: extraido?.bairro ?? '',
  cep: extraido?.cep ?? '',
  municipio: extraido?.municipio || municipioFallback,
  uf: extraido?.uf || ufFallback,
  fone: extraido?.telefone ?? '',
});

@Injectable()
export class CteDocumentsService {
  constructor(
    @Inject(CTE_DOCUMENTS_REPOSITORY) private readonly repository: CteDocumentsRepository,
    @Inject(EMISSOR_CONFIG) private readonly emissor: EmissorConfig,
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

  /** Guarda o CT-e que nós mesmos emitimos, já autorizado pela SEFAZ.
   * Faz parse do XML (cteProc) para extrair todos os campos ricos
   * (remetente, destinatário, trajeto, carga, etc.) igual a um import de XML.
   */
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
    // Parseia o XML autorizado para extrair dados completos do CT-e
    let extraido: CteImportado | null = null;
    if (dados.xml) {
      try { extraido = parseCteXml(dados.xml); } catch { /* ignora, usa o que tem */ }
    }

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
      // Dados extraídos do XML (sobrescrevem os defaults)
      emitidoEm: extraido?.emitidoEm ? data(extraido.emitidoEm) : undefined,
      cfop: extraido?.cfop ?? undefined,
      naturezaOperacao: extraido?.naturezaOperacao ?? undefined,
      origem: extraido?.origem ? `${extraido.origem.uf} - ${extraido.origem.municipio}` : undefined,
      destino: extraido?.destino ? `${extraido.destino.uf} - ${extraido.destino.municipio}` : undefined,
      remetenteNome: extraido?.remetente?.nome ?? undefined,
      remetenteDocumento: extraido?.remetente?.cnpjCpf ?? undefined,
      destinatarioNome: extraido?.destinatario?.nome ?? undefined,
      destinatarioDocumento: extraido?.destinatario?.cnpjCpf ?? undefined,
      tomadorNome: extraido?.tomador?.nome ?? undefined,
      tomadorDocumento: extraido?.tomador?.cnpjCpf ?? undefined,
      valorCarga: extraido?.valorCarga ?? undefined,
      pesoBruto: extraido?.quantidades?.find(q => q.tipo.toUpperCase().includes('PESO BRUTO'))?.quantidade ?? undefined,
      produtoPredominante: extraido?.produtoPredominante ?? undefined,
      rntrc: extraido?.rntrc ?? undefined,
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
  async obterXml(chave: string, ownerUserId?: string): Promise<{ xml: string; chave: string; numero: number; serie: number }> {
    const documento = await this.buscarPorChave(chave, ownerUserId);
    if (!documento.xml) {
      throw new NotFoundException(`XML do CT-e ${chave} não disponível.`);
    }
    return {
      xml: documento.xml,
      chave: documento.chave,
      numero: documento.numero,
      serie: documento.serie,
    };
  }

async gerarDacte(chave: string, ownerUserId?: string): Promise<Buffer> {
    const documento = await this.buscarPorChave(chave, ownerUserId);

    // Tenta extrair dados ricos do XML se disponível
    let cteDoXml: CteImportado | null = null;
    if (documento.xml) {
      try { cteDoXml = parseCteXml(documento.xml); } catch { /* usa só banco */ }
    }

    const doXml = extrairEmitente(documento.xml);
    const emitente = resolverEmitenteDacte(documento, cteDoXml, doXml, this.emissor.emitente);

    const notasFiscais = (documento.notasFiscais ?? []).map(chaveNf => {
      let cnpj = '00000000000000'; let num = 0; let ser = 0;
      try {
        const p = parseChaveAcesso(chaveNf);
        cnpj = p.cnpjEmitente; num = p.numero; ser = p.serie;
      } catch { /* mantém defaults */ }
      return { chave: chaveNf, cnpj, numero: num, serie: ser };
    });

    const dados: DadosDacte = {
      chave,
      numero: documento.numero,
      serie: documento.serie,
      cfop: documento.cfop ?? '6353',
      naturezaOperacao: documento.naturezaOperacao ?? 'PRESTACAO DE SERVICO DE TRANSPORTE',
      emitidoEm: (documento.emitidoEm ?? new Date()).toISOString(),
      emitente,
      logo: logoEmitente(),
      remetente: resolverParticipanteDacte(
        documento.remetenteNome,
        documento.remetenteDocumento,
        extrairParticipante(documento.xml, 'rem', 'enderReme'),
        documento.origem?.split(' - ')?.[1] ?? '',
        documento.uf,
      ),
      destinatario: resolverParticipanteDacte(
        documento.destinatarioNome,
        documento.destinatarioDocumento,
        extrairParticipante(documento.xml, 'dest', 'enderDest'),
        documento.destino?.split(' - ')?.[1] ?? '',
        '',
      ),
      tomador: resolverParticipanteDacte(
        documento.tomadorNome ?? documento.destinatarioNome,
        documento.tomadorDocumento ?? documento.destinatarioDocumento,
        extrairParticipante(documento.xml, 'toma4', 'enderToma') ??
          (documento.tomadorDocumento === documento.remetenteDocumento
            ? extrairParticipante(documento.xml, 'rem', 'enderReme')
            : extrairParticipante(documento.xml, 'dest', 'enderDest')),
        documento.destino?.split(' - ')?.[1] ?? '',
        '',
      ),
      origem: documento.origem ?? '',
      destino: documento.destino ?? '',
      valorTotalServico: documento.valorTotalServico ?? 0,
      valorReceber: documento.valorReceber ?? 0,
      valorCarga: documento.valorCarga ?? 0,
      pesoBruto: documento.pesoBruto ?? 0,
      produtoPredominante: documento.produtoPredominante ?? '',
      quantidades: cteDoXml?.quantidades?.length
        ? cteDoXml.quantidades
        : [{ tipo: 'PESO BRUTO', quantidade: documento.pesoBruto ?? 0, unidade: 'KG' }],
      componentes: cteDoXml?.componentes?.length
        ? cteDoXml.componentes
        : [{ nome: 'Frete valor', valor: documento.valorTotalServico ?? 0 }],
      notasFiscais,
      qrCode: extrairQrCode(documento.xml),
      protocolo: documento.protocolo ?? '',
      autorizadoEm: (documento.autorizadoEm ?? new Date()).toISOString(),
      observacoes: '',
    };

    return gerarDactePdf(dados);
  }
}
