/**
 * Endpoints do serviço NFeConsultaProtocolo4 por UF.
 *
 * A maioria dos estados é atendida pela Sefaz Virtual do RS (SVRS); os demais
 * têm autorizador próprio. Se algum estado mudar de autorizador, é aqui que se
 * ajusta — a URL também pode ser sobrescrita por NFE_CONSULTA_URL.
 */
const SVRS = {
  producao: 'https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
  homologacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
};

const ENDPOINTS: Record<string, { producao: string; homologacao: string }> = {
  AM: {
    producao: 'https://nfe.sefaz.am.gov.br/services2/services/NfeConsulta4',
    homologacao: 'https://homnfe.sefaz.am.gov.br/services2/services/NfeConsulta4',
  },
  BA: {
    producao: 'https://nfe.sefaz.ba.gov.br/webservices/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx',
    homologacao: 'https://hnfe.sefaz.ba.gov.br/webservices/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx',
  },
  GO: {
    producao: 'https://nfe.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4',
    homologacao: 'https://homolog.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4',
  },
  MG: {
    producao: 'https://nfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4',
    homologacao: 'https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4',
  },
  MS: {
    producao: 'https://nfe.sefaz.ms.gov.br/ws/NFeConsultaProtocolo4',
    homologacao: 'https://hom.nfe.sefaz.ms.gov.br/ws/NFeConsultaProtocolo4',
  },
  MT: {
    producao: 'https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeConsulta4',
    homologacao: 'https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeConsulta4',
  },
  PE: {
    producao: 'https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeConsultaProtocolo4',
    homologacao: 'https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeConsultaProtocolo4',
  },
  PR: {
    producao: 'https://nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4',
    homologacao: 'https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4',
  },
  RS: {
    producao: 'https://nfe.sefazrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
    homologacao: 'https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx',
  },
  SP: {
    producao: 'https://nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx',
    homologacao: 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx',
  },
};

/** Autorizadores do CT-e (serviço CTeConsultaV4). */
const SVRS_CTE = {
  producao: 'https://cte.svrs.rs.gov.br/ws/cteconsulta/CTeConsultaV4.asmx',
  homologacao: 'https://cte-homologacao.svrs.rs.gov.br/ws/cteconsulta/CTeConsultaV4.asmx',
};

const ENDPOINTS_CTE: Record<string, { producao: string; homologacao: string }> = {
  SP: {
    producao: 'https://nfe.fazenda.sp.gov.br/CTeWS/WS/CTeConsultaV4.asmx',
    homologacao: 'https://homologacao.nfe.fazenda.sp.gov.br/CTeWS/WS/CTeConsultaV4.asmx',
  },
  MG: {
    producao: 'https://cte.fazenda.mg.gov.br/cte/services/CTeConsultaV4',
    homologacao: 'https://hcte.fazenda.mg.gov.br/cte/services/CTeConsultaV4',
  },
  MS: {
    producao: 'https://producao.cte.ms.gov.br/ws/CTeConsultaV4',
    homologacao: 'https://homologacao.cte.ms.gov.br/ws/CTeConsultaV4',
  },
  MT: {
    producao: 'https://cte.sefaz.mt.gov.br/ctews2/services/CTeConsultaV4',
    homologacao: 'https://homologacao.sefaz.mt.gov.br/ctews2/services/CTeConsultaV4',
  },
  PR: {
    producao: 'https://cte.fazenda.pr.gov.br/cte4/CTeConsultaV4',
    homologacao: 'https://homologacao.cte.fazenda.pr.gov.br/cte4/CTeConsultaV4',
  },
};

export const endpointConsulta = (
  uf: string,
  ambiente: 1 | 2,
  familia: 'NFE' | 'CTE' = 'NFE',
): string => {
  const mapa = familia === 'CTE' ? ENDPOINTS_CTE : ENDPOINTS;
  const padrao = familia === 'CTE' ? SVRS_CTE : SVRS;
  const config = mapa[uf.toUpperCase()] ?? padrao;

  return ambiente === 1 ? config.producao : config.homologacao;
};

/** Recepção síncrona do CT-e 4.00 (CTeRecepcaoSincV4). */
const SVRS_RECEPCAO = {
  producao: 'https://cte.svrs.rs.gov.br/ws/cterecepcaosinc/cterecepcaosinc.asmx',
  homologacao: 'https://cte-homologacao.svrs.rs.gov.br/ws/cterecepcaosinc/cterecepcaosinc.asmx',
};

const RECEPCAO_CTE: Record<string, { producao: string; homologacao: string }> = {
  SP: {
    producao: 'https://nfe.fazenda.sp.gov.br/CTeWS/WS/CTeRecepcaoSinc.asmx',
    homologacao: 'https://homologacao.nfe.fazenda.sp.gov.br/CTeWS/WS/CTeRecepcaoSinc.asmx',
  },
  MG: {
    producao: 'https://cte.fazenda.mg.gov.br/cte/services/CTeRecepcaoSincV4',
    homologacao: 'https://hcte.fazenda.mg.gov.br/cte/services/CTeRecepcaoSincV4',
  },
  MS: {
    producao: 'https://producao.cte.ms.gov.br/ws/CTeRecepcaoSincV4',
    homologacao: 'https://homologacao.cte.ms.gov.br/ws/CTeRecepcaoSincV4',
  },
  MT: {
    producao: 'https://cte.sefaz.mt.gov.br/ctews2/services/CTeRecepcaoSincV4',
    homologacao: 'https://homologacao.sefaz.mt.gov.br/ctews2/services/CTeRecepcaoSincV4',
  },
  PR: {
    producao: 'https://cte.fazenda.pr.gov.br/cte4/CTeRecepcaoSincV4',
    homologacao: 'https://homologacao.cte.fazenda.pr.gov.br/cte4/CTeRecepcaoSincV4',
  },
};

export const endpointRecepcaoCte = (uf: string, ambiente: 1 | 2): string => {
  const config = RECEPCAO_CTE[uf.toUpperCase()] ?? SVRS_RECEPCAO;
  return ambiente === 1 ? config.producao : config.homologacao;
};

export const ufsComAutorizadorProprio = Object.keys(ENDPOINTS);
