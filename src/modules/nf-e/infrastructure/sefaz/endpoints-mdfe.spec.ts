import {
  endpointConsultaMdfe,
  endpointEncerramentoMdfe,
  endpointRecepcaoMdfe,
} from '@nf-e/infrastructure/sefaz/endpoints-mdfe';

describe('endpoints MDF-e (Ambiente Nacional)', () => {
  it('não varia por UF: recepção sempre no Ambiente Nacional', () => {
    expect(endpointRecepcaoMdfe(1)).toBe(endpointRecepcaoMdfe(1));
    expect(endpointRecepcaoMdfe(1)).toContain('mdfe.svrs.rs.gov.br');
    expect(endpointRecepcaoMdfe(2)).toContain('mdfe-homologacao.svrs.rs.gov.br');
  });

  it('consulta e encerramento também usam o Ambiente Nacional', () => {
    expect(endpointConsultaMdfe(1)).toContain('mdfe.svrs.rs.gov.br');
    expect(endpointEncerramentoMdfe(2)).toContain('mdfe-homologacao.svrs.rs.gov.br');
  });
});
