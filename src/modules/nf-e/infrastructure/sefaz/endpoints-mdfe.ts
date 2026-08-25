/**
 * Endpoints do MDF-e no Ambiente Nacional (hospedado pela SVRS): diferente do
 * CT-e/NF-e, o MDF-e não tem autorizador próprio por UF — uma única URL de
 * produção e uma de homologação atendem o país inteiro. Também pode ser
 * sobrescrito por MDFE_RECEPCAO_URL / MDFE_RET_RECEPCAO_URL / MDFE_CONSULTA_URL
 * / MDFE_EVENTO_URL, se a SVRS mudar o domínio.
 */
const RECEPCAO = {
  producao: 'https://mdfe.svrs.rs.gov.br/ws/mdferecepcao/mdferecepcao.asmx',
  homologacao: 'https://mdfe-homologacao.svrs.rs.gov.br/ws/mdferecepcao/mdferecepcao.asmx',
};

const RET_RECEPCAO = {
  producao: 'https://mdfe.svrs.rs.gov.br/ws/mdferetrecepcao/mdferetrecepcao.asmx',
  homologacao: 'https://mdfe-homologacao.svrs.rs.gov.br/ws/mdferetrecepcao/mdferetrecepcao.asmx',
};

const CONSULTA = {
  producao: 'https://mdfe.svrs.rs.gov.br/ws/mdfeconsulta/mdfeconsulta.asmx',
  homologacao: 'https://mdfe-homologacao.svrs.rs.gov.br/ws/mdfeconsulta/mdfeconsulta.asmx',
};

const EVENTO = {
  producao: 'https://mdfe.svrs.rs.gov.br/ws/mdferecepcaoevento/mdferecepcaoevento.asmx',
  homologacao:
    'https://mdfe-homologacao.svrs.rs.gov.br/ws/mdferecepcaoevento/mdferecepcaoevento.asmx',
};

export const endpointRecepcaoMdfe = (ambiente: 1 | 2): string =>
  process.env.MDFE_RECEPCAO_URL || (ambiente === 1 ? RECEPCAO.producao : RECEPCAO.homologacao);

export const endpointRetRecepcaoMdfe = (ambiente: 1 | 2): string =>
  process.env.MDFE_RET_RECEPCAO_URL ||
  (ambiente === 1 ? RET_RECEPCAO.producao : RET_RECEPCAO.homologacao);

export const endpointConsultaMdfe = (ambiente: 1 | 2): string =>
  process.env.MDFE_CONSULTA_URL || (ambiente === 1 ? CONSULTA.producao : CONSULTA.homologacao);

/** Mesmo endpoint recebe eventos de encerramento, cancelamento etc. */
export const endpointEncerramentoMdfe = (ambiente: 1 | 2): string =>
  process.env.MDFE_EVENTO_URL || (ambiente === 1 ? EVENTO.producao : EVENTO.homologacao);
