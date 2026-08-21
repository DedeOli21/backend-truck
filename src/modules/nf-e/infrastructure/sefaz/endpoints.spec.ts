import { endpointConsulta } from '@nf-e/infrastructure/sefaz/endpoints';

describe('endpointConsulta', () => {
  it('usa o autorizador proprio quando a UF tem um', () => {
    expect(endpointConsulta('SP', 1)).toContain('fazenda.sp.gov.br');
    expect(endpointConsulta('MG', 1)).toContain('fazenda.mg.gov.br');
  });

  it('cai na SVRS para UF sem autorizador proprio', () => {
    expect(endpointConsulta('AC', 1)).toContain('svrs.rs.gov.br');
    expect(endpointConsulta('SE', 1)).toContain('svrs.rs.gov.br');
  });

  it('separa producao de homologacao', () => {
    expect(endpointConsulta('SP', 2)).toContain('homologacao');
    expect(endpointConsulta('AC', 2)).toContain('homologacao');
  });

  it('aceita UF em minusculas', () => {
    expect(endpointConsulta('sp', 1)).toBe(endpointConsulta('SP', 1));
  });
});
