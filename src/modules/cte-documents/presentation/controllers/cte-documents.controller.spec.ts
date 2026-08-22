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
import { EMISSOR_CONFIG, lerEmissorConfig } from '@nf-e/infrastructure/emissao/emissor.config';
import { InMemoryNumeracaoRepository } from '@nf-e/infrastructure/emissao/in-memory-numeracao.repository';
import { NUMERACAO_REPOSITORY } from '@nf-e/infrastructure/emissao/numeracao.repository';
import { NfeService } from '@nf-e/application/services/nf-e.service';
import { NFE_PROVIDER } from '@nf-e/domain/providers/nfe.provider';
import { NotConfiguredNfeProvider } from '@nf-e/infrastructure/providers/not-configured-nfe.provider';
import { CteController } from '@nf-e/presentation/controllers/cte.controller';

const CHAVE = '35260808789863000100570010000011471000000001';
const TRUCK = '11111111-1111-4111-8111-111111111111';
const DRIVER = '22222222-2222-4222-8222-222222222222';
const FRETE = '33333333-3333-4333-8333-333333333333';

describe('Persistência de CT-e (rotas)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CteDocumentsController, CteController],
      providers: [
        CteDocumentsService,
        NfeService,
        EmissaoCteService,
        { provide: EMISSOR_CONFIG, useFactory: () => lerEmissorConfig({}) },
        { provide: NUMERACAO_REPOSITORY, useClass: InMemoryNumeracaoRepository },
        { provide: TRANSMISSOR_SEFAZ, useValue: { enviar: jest.fn() } },
        // Sem certificado nos testes de rota: a emissão em si tem spec própria.
        { provide: CERTIFICADO_EMISSAO, useValue: null },
        { provide: NFE_PROVIDER, useClass: NotConfiguredNfeProvider },
        { provide: CTE_DOCUMENTS_REPOSITORY, useClass: InMemoryCteDocumentsRepository },
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
  });

  afterEach(async () => {
    await app.close();
  });

  // A importação é exercitada pela rota de XML: a de PDF depende do pdfjs, que
  // no Jest exigiria --experimental-vm-modules. O parser do DACTE é coberto por
  // dacte-parser.spec.ts, sobre o texto extraído de um PDF real.
  const XML = `<cteProc xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00"><CTe><infCte versao="4.00" Id="CTe${CHAVE}">
    <ide><cUF>35</cUF><CFOP>6353</CFOP><mod>57</mod><serie>1</serie><nCT>1147</nCT>
    <dhEmi>2026-08-21T15:13:25-03:00</dhEmi>
    <xMunIni>ARUJA</xMunIni><UFIni>SP</UFIni><xMunFim>CONTAGEM</xMunFim><UFFim>MG</UFFim></ide>
    <emit><CNPJ>08789863000100</CNPJ><xNome>J M de Oliveira Cargas</xNome></emit>
    <rem><CNPJ>55078307000105</CNPJ><xNome>MEIWA INDUSTRIA</xNome></rem>
    <dest><CNPJ>18442358000130</CNPJ><xNome>L&amp;M PACK</xNome></dest>
    <vPrest><vTPrest>4500.00</vTPrest><vRec>4500.00</vRec></vPrest>
    <infCTeNorm><infCarga><vCarga>39587.01</vCarga></infCarga></infCTeNorm>
  </infCte></CTe></cteProc>`;

  const importar = () =>
    request(app.getHttpServer()).post('/cte/importar-xml').send({ xml: XML });

  it('importar guarda o CT-e e ele aparece na listagem', async () => {
    const { body: importado } = await importar().expect(201);
    expect(importado.chave).toBe(CHAVE);

    const { body: lista } = await request(app.getHttpServer()).get('/cte/documentos').expect(200);
    expect(lista).toHaveLength(1);
    expect(lista[0].numero).toBe(1147);
    expect(lista[0].origemLeitura).toBe('XML');
  });

  it('importar duas vezes nao duplica', async () => {
    await importar().expect(201);
    await importar().expect(201);

    const { body: lista } = await request(app.getHttpServer()).get('/cte/documentos').expect(200);
    expect(lista).toHaveLength(1);
  });

  it('vincula veiculo, motorista e frete', async () => {
    await importar().expect(201);

    const { body } = await request(app.getHttpServer())
      .patch(`/cte/documentos/${CHAVE}/vinculos`)
      .send({ truckId: TRUCK, driverId: DRIVER, freightId: FRETE })
      .expect(200);

    expect(body.truckId).toBe(TRUCK);
    expect(body.driverId).toBe(DRIVER);
    expect(body.freightId).toBe(FRETE);
  });

  it('filtra a listagem por veiculo e por frete', async () => {
    await importar().expect(201);
    await request(app.getHttpServer())
      .patch(`/cte/documentos/${CHAVE}/vinculos`)
      .send({ truckId: TRUCK, freightId: FRETE })
      .expect(200);

    const porVeiculo = await request(app.getHttpServer())
      .get(`/cte/documentos?truckId=${TRUCK}`)
      .expect(200);
    expect(porVeiculo.body).toHaveLength(1);

    const porFrete = await request(app.getHttpServer())
      .get(`/cte/documentos?freightId=${FRETE}`)
      .expect(200);
    expect(porFrete.body).toHaveLength(1);

    const outroVeiculo = await request(app.getHttpServer())
      .get(`/cte/documentos?truckId=${DRIVER}`)
      .expect(200);
    expect(outroVeiculo.body).toHaveLength(0);
  });

  it('desvincula enviando null', async () => {
    await importar().expect(201);
    await request(app.getHttpServer())
      .patch(`/cte/documentos/${CHAVE}/vinculos`)
      .send({ truckId: TRUCK })
      .expect(200);

    const { body } = await request(app.getHttpServer())
      .patch(`/cte/documentos/${CHAVE}/vinculos`)
      .send({ truckId: null })
      .expect(200);

    expect(body.truckId).toBeNull();
  });

  it('recusa identificador que nao e uuid', async () => {
    await importar().expect(201);
    await request(app.getHttpServer())
      .patch(`/cte/documentos/${CHAVE}/vinculos`)
      .send({ truckId: 'abc' })
      .expect(400);
  });

  it('404 para CT-e ainda nao importado', async () => {
    await request(app.getHttpServer()).get(`/cte/documentos/${CHAVE}`).expect(404);
    await request(app.getHttpServer())
      .patch(`/cte/documentos/${CHAVE}/vinculos`)
      .send({ truckId: TRUCK })
      .expect(404);
  });

  it('registra o CT-e a partir da chave lida pelo scanner', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/cte/importar-chave')
      .send({ conteudo: CHAVE })
      .expect(201);

    expect(body.chave).toBe(CHAVE);
    expect(body.numero).toBe(1147);
    expect(body.origemLeitura).toBe('CHAVE');
  });

  it('a leitura por chave nao apaga o conteudo ja vindo do XML', async () => {
    await importar().expect(201);
    const { body } = await request(app.getHttpServer())
      .post('/cte/importar-chave')
      .send({ conteudo: CHAVE })
      .expect(201);

    expect(body.origemLeitura).toBe('XML');
    expect(body.valorTotalServico).toBe(4500);
  });

  it('recusa conteudo sem chave de CT-e', async () => {
    await request(app.getHttpServer())
      .post('/cte/importar-chave')
      .send({ conteudo: 'https://exemplo.com/sem-chave' })
      .expect(400);
  });

  it('remove o CT-e guardado', async () => {
    await importar().expect(201);
    await request(app.getHttpServer()).delete(`/cte/documentos/${CHAVE}`).expect(204);

    const { body: lista } = await request(app.getHttpServer()).get('/cte/documentos').expect(200);
    expect(lista).toHaveLength(0);
  });
});
