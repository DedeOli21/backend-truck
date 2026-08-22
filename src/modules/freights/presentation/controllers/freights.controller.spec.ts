import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { CteDocumentsService } from '@cte-documents/application/services/cte-documents.service';
import { CTE_DOCUMENTS_REPOSITORY } from '@cte-documents/domain/repositories/cte-documents.repository';
import { InMemoryCteDocumentsRepository } from '@cte-documents/infrastructure/repositories/in-memory-cte-documents.repository';
import { CteDocumentsController } from '@cte-documents/presentation/controllers/cte-documents.controller';
import { FreightsService } from '@freights/application/services/freights.service';
import { FREIGHTS_REPOSITORY } from '@freights/domain/repositories/freights.repository';
import { InMemoryFreightsRepository } from '@freights/infrastructure/repositories/in-memory-freights.repository';
import { FreightsController } from '@freights/presentation/controllers/freights.controller';
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

const XML = `<cteProc xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00"><CTe><infCte versao="4.00" Id="CTe${CHAVE}">
  <ide><cUF>35</cUF><CFOP>6353</CFOP><mod>57</mod><serie>1</serie><nCT>1147</nCT>
  <dhEmi>2026-08-21T15:13:25-03:00</dhEmi>
  <xMunIni>ARUJA</xMunIni><UFIni>SP</UFIni><xMunFim>CONTAGEM</xMunFim><UFFim>MG</UFFim></ide>
  <emit><CNPJ>08789863000100</CNPJ><xNome>J M de Oliveira Cargas</xNome></emit>
  <rem><CNPJ>55078307000105</CNPJ><xNome>MEIWA INDUSTRIA</xNome></rem>
  <dest><CNPJ>18442358000130</CNPJ><xNome>L&amp;M PACK</xNome></dest>
  <vPrest><vTPrest>4500.00</vTPrest><vRec>4500.00</vRec></vPrest>
  <infCTeNorm><infCarga><vCarga>39587.01</vCarga><proPred>RECIPIENTE</proPred>
    <infQ><tpMed>PESO BRUTO</tpMed><qCarga>1397.5500</qCarga></infQ></infCarga></infCTeNorm>
</infCte></CTe></cteProc>`;

describe('Fluxo CT-e → frete (rotas)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FreightsController, CteController, CteDocumentsController],
      providers: [
        FreightsService,
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
        { provide: FREIGHTS_REPOSITORY, useClass: InMemoryFreightsRepository },
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

  const importar = () =>
    request(app.getHttpServer()).post('/cte/importar-xml').send({ xml: XML }).expect(201);

  it('importa o CT-e, cria o frete e devolve a rota e o valor herdados', async () => {
    await importar();

    const { body: frete } = await request(app.getHttpServer())
      .post(`/freights/from-cte/${CHAVE}`)
      .send({ truckId: TRUCK, driverId: DRIVER })
      .expect(201);

    expect(frete.codigo).toBe('CTE-1147');
    expect(frete.origem).toBe('ARUJA - SP');
    expect(frete.destino).toBe('CONTAGEM - MG');
    expect(frete.valorFrete).toBe(4500);
    expect(frete.peso).toBe(1397.55);
    expect(frete.status).toBe('AGENDADO');
    expect(frete.truckId).toBe(TRUCK);
  });

  it('o CT-e fica apontando para o frete criado', async () => {
    await importar();
    const { body: frete } = await request(app.getHttpServer())
      .post(`/freights/from-cte/${CHAVE}`)
      .send({ truckId: TRUCK, driverId: DRIVER })
      .expect(201);

    const { body: cte } = await request(app.getHttpServer())
      .get(`/cte/documentos/${CHAVE}`)
      .expect(200);

    expect(cte.freightId).toBe(frete.id);
    expect(cte.truckId).toBe(TRUCK);
  });

  it('recusa criar dois fretes do mesmo CT-e', async () => {
    await importar();
    await request(app.getHttpServer())
      .post(`/freights/from-cte/${CHAVE}`)
      .send({ truckId: TRUCK, driverId: DRIVER })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/freights/from-cte/${CHAVE}`)
      .send({})
      .expect(409);
  });

  it('404 ao criar frete de CT-e nao importado', async () => {
    await request(app.getHttpServer()).post(`/freights/from-cte/${CHAVE}`).send({}).expect(404);
  });

  it('percorre o ciclo agendado -> em transito -> concluido', async () => {
    await importar();
    const { body: frete } = await request(app.getHttpServer())
      .post(`/freights/from-cte/${CHAVE}`)
      .send({ truckId: TRUCK, driverId: DRIVER })
      .expect(201);

    const { body: transito } = await request(app.getHttpServer())
      .patch(`/freights/${frete.id}/status`)
      .send({ status: 'EM_TRANSITO' })
      .expect(200);
    expect(transito.iniciadoEm).not.toBeNull();

    const { body: concluido } = await request(app.getHttpServer())
      .patch(`/freights/${frete.id}/status`)
      .send({ status: 'CONCLUIDO' })
      .expect(200);
    expect(concluido.concluidoEm).not.toBeNull();
  });

  it('nao coloca em transito sem motorista e veiculo', async () => {
    await importar();
    const { body: frete } = await request(app.getHttpServer())
      .post(`/freights/from-cte/${CHAVE}`)
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/freights/${frete.id}/status`)
      .send({ status: 'EM_TRANSITO' })
      .expect(400);
  });

  it('recusa status desconhecido', async () => {
    await importar();
    const { body: frete } = await request(app.getHttpServer())
      .post(`/freights/from-cte/${CHAVE}`)
      .send({ truckId: TRUCK, driverId: DRIVER })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/freights/${frete.id}/status`)
      .send({ status: 'VOANDO' })
      .expect(400);
  });

  it('lista filtrando por status e por motorista', async () => {
    await importar();
    const { body: frete } = await request(app.getHttpServer())
      .post(`/freights/from-cte/${CHAVE}`)
      .send({ truckId: TRUCK, driverId: DRIVER })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/freights/${frete.id}/status`)
      .send({ status: 'EM_TRANSITO' })
      .expect(200);

    const emTransito = await request(app.getHttpServer())
      .get('/freights?status=EM_TRANSITO')
      .expect(200);
    expect(emTransito.body).toHaveLength(1);

    const doMotorista = await request(app.getHttpServer())
      .get(`/freights?driverId=${DRIVER}`)
      .expect(200);
    expect(doMotorista.body).toHaveLength(1);
  });

  it('cria frete avulso sem CT-e', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/freights')
      .send({ origem: 'SP - SANTOS', destino: 'SP - CAMPINAS', valorFrete: 1200 })
      .expect(201);

    expect(body.codigo).toMatch(/^FR-/);
  });
});
