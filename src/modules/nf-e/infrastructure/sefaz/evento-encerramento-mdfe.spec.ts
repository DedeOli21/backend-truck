import {
  DadosEncerramentoMdfe,
  montarEventoEncerramentoMdfe,
  parseRetornoEventoMdfe,
} from '@nf-e/infrastructure/sefaz/evento-encerramento-mdfe';

const dados = (): DadosEncerramentoMdfe => ({
  chave: '35260808789863000100580010000000151123456781',
  protocolo: '135260000012345',
  ambiente: 2,
  cnpjEmitente: '08789863000100',
  dataEvento: new Date('2026-08-26T14:00:00.000Z'),
  municipioDescarga: { codigoMunicipio: '3106200' },
  ufDescarga: 'MG',
});

describe('montarEventoEncerramentoMdfe', () => {
  it('monta o evento 110112 com o protocolo e o município de descarga', () => {
    const { xml, id } = montarEventoEncerramentoMdfe(dados());

    expect(id).toBe(`ID110112${dados().chave}01`);
    expect(xml).toContain(`Id="${id}"`);
    expect(xml).toContain('<tpEvento>110112</tpEvento>');
    expect(xml).toContain('<chMDFe>35260808789863000100580010000000151123456781</chMDFe>');
    expect(xml).toContain('<nProt>135260000012345</nProt>');
    expect(xml).toContain('<cMun>3106200</cMun>');
    expect(xml).toContain('<cUF>31</cUF>');
    expect(xml).toContain('<tpAmb>2</tpAmb>');
  });
});

const RETORNO_SUCESSO = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <mdfeResultMsg xmlns="http://www.portalfiscal.inf.br/mdfe/wsdl/MDFeRecepcaoEvento">
      <retEventoMDFe xmlns="http://www.portalfiscal.inf.br/mdfe">
        <infEvento>
          <cStat>135</cStat>
          <xMotivo>Evento registrado e vinculado ao MDF-e</xMotivo>
          <nProt>135260000099999</nProt>
        </infEvento>
      </retEventoMDFe>
    </mdfeResultMsg>
  </soap:Body>
</soap:Envelope>`;

const RETORNO_REJEITADO = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <mdfeResultMsg xmlns="http://www.portalfiscal.inf.br/mdfe/wsdl/MDFeRecepcaoEvento">
      <retEventoMDFe xmlns="http://www.portalfiscal.inf.br/mdfe">
        <infEvento>
          <cStat>573</cStat>
          <xMotivo>Duplicidade de evento</xMotivo>
        </infEvento>
      </retEventoMDFe>
    </mdfeResultMsg>
  </soap:Body>
</soap:Envelope>`;

describe('parseRetornoEventoMdfe', () => {
  it('reconhece o encerramento registrado', () => {
    const retorno = parseRetornoEventoMdfe(RETORNO_SUCESSO);

    expect(retorno.sucesso).toBe(true);
    expect(retorno.codigoStatus).toBe(135);
    expect(retorno.protocolo).toBe('135260000099999');
  });

  it('reconhece a rejeição do evento', () => {
    const retorno = parseRetornoEventoMdfe(RETORNO_REJEITADO);

    expect(retorno.sucesso).toBe(false);
    expect(retorno.motivo).toContain('Duplicidade');
  });
});
