import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { gunzipSync } from 'zlib';
import { lerCertificado } from '@nf-e/infrastructure/assinatura/certificado';
import { EmissorConfig } from '@nf-e/infrastructure/emissao/emissor.config';
import { InMemoryNumeracaoRepository } from '@nf-e/infrastructure/emissao/in-memory-numeracao.repository';
import { EmissaoCteService, TransmissorSefaz } from '@nf-e/application/services/emissao-cte.service';
import { CertificadoPem } from '@nf-e/infrastructure/assinatura/certificado';

const NFE_XML = `<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe31260836547966000271550030000464521319720980" versao="4.00"><ide><natOp>REMESSA</natOp><mod>55</mod><serie>3</serie><nNF>46452</nNF><dhEmi>2026-08-21T08:04:00-03:00</dhEmi></ide><emit><CNPJ>36547966000271</CNPJ><xNome>RAIZES INDUSTRIA</xNome><enderEmit><xLgr>R GRACYRA RESSE DE GOUVEIA</xLgr><nro>1791</nro><xBairro>JARDIM PIEMONT</xBairro><cMun>3106705</cMun><xMun>BETIM</xMun><UF>MG</UF><CEP>32689372</CEP></enderEmit></emit><dest><CNPJ>33000092003850</CNPJ><xNome>COSAN LUBRIFICANTES</xNome><enderDest><xLgr>AV PRAIA DA RIBEIRA</xLgr><nro>1</nro><xBairro>RIBEIRA</xBairro><cMun>3304557</cMun><xMun>RIO DE JANEIRO</xMun><UF>RJ</UF><CEP>21930050</CEP></enderDest></dest><det nItem="1"><prod><xProd>PALLET DE MADEIRA</xProd><qCom>20</qCom><vProd>689.40</vProd></prod></det><total><ICMSTot><vProd>689.40</vProd><vNF>689.40</vNF></ICMSTot></total><transp><vol><qVol>20</qVol><pesoB>500.000</pesoB></vol></transp></infNFe></NFe><protNFe><infProt><chNFe>31260836547966000271550030000464521319720980</chNFe><nProt>131267837206022</nProt><cStat>100</cStat></infProt></protNFe></nfeProc>`;

const emissor = (): EmissorConfig => ({
  ambiente: 2,
  serie: 1,
  codigoMunicipioPadrao: '3534401',
  emitente: {
    cnpjCpf: '08789863000100',
    inscricaoEstadual: '125767078113',
    nome: 'J M DE OLIVEIRA - CARGAS',
    crt: 1,
    rntrc: '56299277',
    endereco: {
      logradouro: 'RUA GILSON NARDONI RODRIGUES',
      numero: '9',
      bairro: 'JARDIM BONANCA',
      codigoMunicipio: '3534401',
      municipio: 'OSASCO',
      cep: '06266180',
      uf: 'SP',
    },
  },
  seguro: { seguradoraNome: '', seguradoraCnpj: '', apolice: '' },
});

/** O envelope leva o CT-e comprimido; para conferir o conteúdo é preciso abrir. */
const cteDoEnvelope = (envelope: string) => {
  const conteudo = /<cteDadosMsg[^>]*>([\s\S]*?)<\/cteDadosMsg>/.exec(envelope)![1];
  return gunzipSync(Buffer.from(conteudo, 'base64')).toString('utf8');
};

const respostaSefaz = (cStat: number, comProtocolo: boolean) =>
  `<soap:Envelope><soap:Body><retCTe xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00"><tpAmb>2</tpAmb><cStat>${cStat}</cStat><xMotivo>${
    comProtocolo ? 'Autorizado o uso do CT-e' : 'Rejeicao: CFOP invalido'
  }</xMotivo>${
    comProtocolo
      ? '<protCTe versao="4.00"><infProt><chCTe>CHAVE</chCTe><dhRecbto>2026-08-22T10:00:00-03:00</dhRecbto><nProt>135260000999888</nProt><cStat>100</cStat><xMotivo>Autorizado o uso do CT-e</xMotivo></infProt></protCTe>'
      : ''
  }</retCTe></soap:Body></soap:Envelope>`;

let certificado: CertificadoPem | null = null;

try {
  certificado = lerCertificado(
    'certs/CERT J M DE OLIVEIRA - CARGAS_08789863000100 (1)CJS177jm.pfx',
    'CJS177jm',
  );
} catch {
  certificado = null;
}

const temCertificado = certificado !== null;
const descreveComCertificado = temCertificado ? describe : describe.skip;

describe('EmissaoCteService', () => {
  it('recusa emitir sem certificado configurado', async () => {
    const service = new EmissaoCteService(
      new InMemoryNumeracaoRepository(),
      { enviar: jest.fn() },
      emissor(),
      null,
    );

    await expect(
      service.emitir({ nfeXml: NFE_XML, valorFrete: 4500 }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

descreveComCertificado('EmissaoCteService (com certificado real)', () => {
  const criar = (transmissor: TransmissorSefaz) =>
    new EmissaoCteService(
      new InMemoryNumeracaoRepository(),
      transmissor,
      emissor(),
      certificado,
    );

  it('gera, assina e envia o CT-e, devolvendo o protocolo quando autorizado', async () => {
    const enviar = jest.fn<Promise<string>, [string, string]>(async () =>
      respostaSefaz(100, true),
    );
    const resultado = await criar({ enviar }).emitir({ nfeXml: NFE_XML, valorFrete: 4500 });

    expect(resultado.autorizado).toBe(true);
    expect(resultado.protocolo).toBe('135260000999888');
    expect(resultado.numero).toBe(1);
    expect(resultado.ambiente).toBe(2);
    expect(resultado.nfeTransportada).toBe('31260836547966000271550030000464521319720980');
    expect(resultado.xml).toContain('<cteProc');
  });

  it('envia o XML assinado, com a NF-e referenciada', async () => {
    const enviar = jest.fn<Promise<string>, [string, string]>(async () =>
      respostaSefaz(100, true),
    );
    await criar({ enviar }).emitir({ nfeXml: NFE_XML, valorFrete: 4500 });

    const envelope = enviar.mock.calls[0][1];
    expect(envelope).toContain('CTeRecepcaoSincV4');

    const cte = cteDoEnvelope(envelope);
    expect(cte).toContain('<Signature');
    expect(cte).toContain('<X509Certificate>');
    expect(cte).toContain('<chave>31260836547966000271550030000464521319720980</chave>');
  });

  it('usa 6932 quando a prestacao comeca fora da UF do emitente', async () => {
    const enviar = jest.fn<Promise<string>, [string, string]>(async () =>
      respostaSefaz(100, true),
    );
    await criar({ enviar }).emitir({ nfeXml: NFE_XML, valorFrete: 4500 });

    // Emitente em SP, prestação de MG para RJ: a SEFAZ rejeita 6353 (cStat 524).
    expect(cteDoEnvelope(enviar.mock.calls[0][1])).toContain('<CFOP>6932</CFOP>');
  });

  it('devolve a rejeicao com o motivo, sem inventar autorizacao', async () => {
    const enviar = jest.fn<Promise<string>, [string, string]>(async () =>
      respostaSefaz(410, false),
    );
    const resultado = await criar({ enviar }).emitir({ nfeXml: NFE_XML, valorFrete: 4500 });

    expect(resultado.autorizado).toBe(false);
    expect(resultado.codigoStatus).toBe(410);
    expect(resultado.motivo).toContain('Rejeicao');
    expect(resultado.protocolo).toBeNull();
    expect(resultado.xml).toBeNull();
  });

  it('numera em sequencia, sem repetir', async () => {
    const service = criar({ enviar: jest.fn(async () => respostaSefaz(100, true)) });

    const primeiro = await service.emitir({ nfeXml: NFE_XML, valorFrete: 100 });
    const segundo = await service.emitir({ nfeXml: NFE_XML, valorFrete: 100 });

    expect(segundo.numero).toBe(primeiro.numero + 1);
    expect(segundo.chave).not.toBe(primeiro.chave);
  });

  it('recusa NF-e cancelada', async () => {
    const cancelada = NFE_XML.replace('<cStat>100</cStat>', '<cStat>101</cStat>');
    const service = criar({ enviar: jest.fn() });

    await expect(
      service.emitir({ nfeXml: cancelada, valorFrete: 4500 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('recusa XML que nao e NF-e', async () => {
    const service = criar({ enviar: jest.fn() });

    await expect(
      service.emitir({ nfeXml: '<cteProc><CTe><infCte/></CTe></cteProc>', valorFrete: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('respeita os componentes de valor informados', async () => {
    const enviar = jest.fn<Promise<string>, [string, string]>(async () =>
      respostaSefaz(100, true),
    );
    await criar({ enviar }).emitir({
      nfeXml: NFE_XML,
      valorFrete: 4500,
      componentes: [
        { nome: 'Frete peso', valor: 3000 },
        { nome: 'Pedagio', valor: 1500 },
      ],
    });

    const cte = cteDoEnvelope(enviar.mock.calls[0][1]);
    expect(cte).toContain('<xNome>Frete peso</xNome><vComp>3000.00</vComp>');
    expect(cte).toContain('<xNome>Pedagio</xNome><vComp>1500.00</vComp>');
  });
});
