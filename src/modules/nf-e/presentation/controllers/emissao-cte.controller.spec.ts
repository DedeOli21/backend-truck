import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CteDocumentsService } from '@cte-documents/application/services/cte-documents.service';
import { CTE_DOCUMENTS_REPOSITORY } from '@cte-documents/domain/repositories/cte-documents.repository';
import { InMemoryCteDocumentsRepository } from '@cte-documents/infrastructure/repositories/in-memory-cte-documents.repository';
import { CteDocumentsController } from '@cte-documents/presentation/controllers/cte-documents.controller';
import {
  CERTIFICADO_EMISSAO,
  EmissaoCteService,
  TRANSMISSOR_SEFAZ,
} from '@nf-e/application/services/emissao-cte.service';
import { NfeService } from '@nf-e/application/services/nf-e.service';
import { NFE_PROVIDER } from '@nf-e/domain/providers/nfe.provider';
import { lerCertificado } from '@nf-e/infrastructure/assinatura/certificado';
import { EMISSOR_CONFIG } from '@nf-e/infrastructure/emissao/emissor.config';
import { InMemoryNumeracaoRepository } from '@nf-e/infrastructure/emissao/in-memory-numeracao.repository';
import { NUMERACAO_REPOSITORY } from '@nf-e/infrastructure/emissao/numeracao.repository';
import { NotConfiguredNfeProvider } from '@nf-e/infrastructure/providers/not-configured-nfe.provider';
import { CteController } from '@nf-e/presentation/controllers/cte.controller';

const NFE_XML = `<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe31260836547966000271550030000464521319720980" versao="4.00"><ide><natOp>REMESSA</natOp><mod>55</mod><serie>3</serie><nNF>46452</nNF><dhEmi>2026-08-21T08:04:00-03:00</dhEmi></ide><emit><CNPJ>36547966000271</CNPJ><xNome>RAIZES INDUSTRIA</xNome><enderEmit><xLgr>R GRACYRA RESSE DE GOUVEIA</xLgr><nro>1791</nro><xBairro>JARDIM PIEMONT</xBairro><cMun>3106705</cMun><xMun>BETIM</xMun><UF>MG</UF><CEP>32689372</CEP></enderEmit></emit><dest><CNPJ>33000092003850</CNPJ><xNome>COSAN LUBRIFICANTES</xNome><enderDest><xLgr>AV PRAIA DA RIBEIRA</xLgr><nro>1</nro><xBairro>RIBEIRA</xBairro><cMun>3304557</cMun><xMun>RIO DE JANEIRO</xMun><UF>RJ</UF><CEP>21930050</CEP></enderDest></dest><det nItem="1"><prod><xProd>PALLET DE MADEIRA</xProd><qCom>20</qCom><vProd>689.40</vProd></prod></det><total><ICMSTot><vProd>689.40</vProd><vNF>689.40</vNF></ICMSTot></total><transp><vol><qVol>20</qVol><pesoB>500.000</pesoB></vol></transp></infNFe></NFe><protNFe><infProt><chNFe>31260836547966000271550030000464521319720980</chNFe><nProt>131267837206022</nProt><cStat>100</cStat></infProt></protNFe></nfeProc>`;

const TRUCK = '11111111-1111-4111-8111-111111111111';

const emissor = {
  ambiente: 2 as const,
  serie: 1,
  codigoMunicipioPadrao: '3534401',
  emitente: {
    cnpjCpf: '08789863000100',
    inscricaoEstadual: '125767078113',
    nome: 'J M DE OLIVEIRA - CARGAS',
    crt: 1 as const,
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
};

const respostaAutorizada = `<soap:Envelope><soap:Body><retCTe xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00"><cStat>100</cStat><xMotivo>Autorizado o uso do CT-e</xMotivo><protCTe versao="4.00"><infProt><dhRecbto>2026-08-22T10:00:00-03:00</dhRecbto><nProt>135260000999888</nProt><cStat>100</cStat><xMotivo>Autorizado o uso do CT-e</xMotivo></infProt></protCTe></retCTe></soap:Body></soap:Envelope>`;
const respostaRejeitada = `<soap:Envelope><soap:Body><retCTe xmlns="http://www.portalfiscal.inf.br/cte"><cStat>410</cStat><xMotivo>Rejeicao: UF do emitente diverge</xMotivo></retCTe></soap:Body></soap:Envelope>`;

let certificado: unknown = null;
try {
  certificado = lerCertificado(
    'certs/CERT J M DE OLIVEIRA - CARGAS_08789863000100 (1)CJS177jm.pfx',
    'CJS177jm',
  );
} catch {
  certificado = null;
}

const comCertificado = certificado ? describe : describe.skip;

comCertificado('POST /cte/emitir', () => {
  let app: INestApplication;
  let enviar: jest.Mock;

  const montar = async (resposta: string) => {
    enviar = jest.fn(async () => resposta);

    const moduleRef = await Test.createTestingModule({
      controllers: [CteController, CteDocumentsController],
      providers: [
        NfeService,
        CteDocumentsService,
        EmissaoCteService,
        { provide: NFE_PROVIDER, useClass: NotConfiguredNfeProvider },
        { provide: CTE_DOCUMENTS_REPOSITORY, useClass: InMemoryCteDocumentsRepository },
        { provide: NUMERACAO_REPOSITORY, useClass: InMemoryNumeracaoRepository },
        { provide: EMISSOR_CONFIG, useValue: emissor },
        { provide: TRANSMISSOR_SEFAZ, useValue: { enviar } },
        { provide: CERTIFICADO_EMISSAO, useValue: certificado },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  };

  afterEach(async () => {
    await app?.close();
  });

  it('emite, autoriza e guarda o CT-e vinculado ao veiculo', async () => {
    await montar(respostaAutorizada);

    const { body } = await request(app.getHttpServer())
      .post('/cte/emitir')
      .send({ nfeXml: NFE_XML, valorFrete: 4500, truckId: TRUCK })
      .expect(201);

    expect(body.autorizado).toBe(true);
    expect(body.protocolo).toBe('135260000999888');
    expect(body.ambiente).toBe(2);
    expect(body.documento.truckId).toBe(TRUCK);
    expect(body.documento.emitidoPorNos).toBe(true);
    expect(body.documento.notasFiscais).toEqual([
      '31260836547966000271550030000464521319720980',
    ]);
  });

  it('o CT-e emitido aparece na listagem', async () => {
    await montar(respostaAutorizada);
    await request(app.getHttpServer())
      .post('/cte/emitir')
      .send({ nfeXml: NFE_XML, valorFrete: 4500 })
      .expect(201);

    const { body: lista } = await request(app.getHttpServer())
      .get('/cte/documentos')
      .expect(200);

    expect(lista).toHaveLength(1);
    expect(lista[0].situacao).toBe('AUTORIZADA');
  });

  it('rejeicao nao vira documento guardado', async () => {
    await montar(respostaRejeitada);

    const { body } = await request(app.getHttpServer())
      .post('/cte/emitir')
      .send({ nfeXml: NFE_XML, valorFrete: 4500 })
      .expect(201);

    expect(body.autorizado).toBe(false);
    expect(body.codigoStatus).toBe(410);
    expect(body.motivo).toContain('Rejeicao');

    const { body: lista } = await request(app.getHttpServer())
      .get('/cte/documentos')
      .expect(200);
    expect(lista).toHaveLength(0);
  });

  it('recusa valor de frete zerado', async () => {
    await montar(respostaAutorizada);

    await request(app.getHttpServer())
      .post('/cte/emitir')
      .send({ nfeXml: NFE_XML, valorFrete: 0 })
      .expect(400);
  });

  it('recusa XML que nao e NF-e', async () => {
    await montar(respostaAutorizada);

    await request(app.getHttpServer())
      .post('/cte/emitir')
      .send({ nfeXml: '<cteProc><CTe><infCte/></CTe></cteProc>', valorFrete: 100 })
      .expect(400);
  });
});
