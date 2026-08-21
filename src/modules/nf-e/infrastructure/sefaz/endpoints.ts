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

export const endpointConsulta = (uf: string, ambiente: 1 | 2): string => {
  const config = ENDPOINTS[uf.toUpperCase()] ?? SVRS;
  return ambiente === 1 ? config.producao : config.homologacao;
};

export const ufsComAutorizadorProprio = Object.keys(ENDPOINTS);
