import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { CteDocumentEntity } from '@cte-documents/domain/entities/cte-document.entity';
import { CertificadoPem, lerCertificado } from '@nf-e/infrastructure/assinatura/certificado';
import { EmissaoMdfeService } from '@mdfe-documents/application/services/emissao-mdfe.service';
import { EmitirMdfeDto } from '@mdfe-documents/presentation/dtos/emitir-mdfe.dto';

let CERTIFICADO: CertificadoPem | null = null;

try {
  CERTIFICADO = lerCertificado(
    'certs/CERT J M DE OLIVEIRA - CARGAS_08789863000100 (1)CJS177jm.pfx',
    'CJS177jm',
  );
} catch {
  CERTIFICADO = null;
}

const descreveComCertificado = CERTIFICADO !== null ? describe : describe.skip;

const CHAVE1 = '35260808789863000100570010000011471000000001';
const CHAVE2 = '35260808789863000100570010000011481000000002';
const OWNER = '11111111-1111-4111-8111-111111111111';

const cte = (chave: string, campos: Partial<CteDocumentEntity> = {}) =>
  new CteDocumentEntity({
    id: chave,
    ownerUserId: OWNER,
    chave,
    numero: 1147,
    serie: 1,
    modelo: 57,
    uf: 'SP',
    cnpjEmitente: '08789863000100',
    situacao: 'AUTORIZADA',
    valorCarga: 10000,
    pesoBruto: 500,
    notasFiscais: [],
    origemLeitura: 'XML',
    emitidoPorNos: true,
    freightId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...campos,
  });

const emissor = () => ({
  ambiente: 2 as const,
  serie: 1,
  codigoMunicipioPadrao: '3550308',
  emitente: {
    cnpjCpf: '08789863000100',
    inscricaoEstadual: '123456789',
    nome: 'J M de Oliveira Cargas',
    crt: 1 as const,
    rntrc: '12345678',
    endereco: {
      logradouro: 'RUA DAS FLORES',
      numero: '100',
      bairro: 'CENTRO',
      codigoMunicipio: '3550308',
      municipio: 'SAO PAULO',
      cep: '01000000',
      uf: 'SP',
    },
  },
});

const dto = (): EmitirMdfeDto => ({
  truckId: 'truck-1',
  driverId: 'driver-1',
  cteChaves: [CHAVE1, CHAVE2],
  municipioCarregamento: { codigoMunicipio: '3550308', municipio: 'SAO PAULO' },
  municipioDescarga: { codigoMunicipio: '3106200', municipio: 'BELO HORIZONTE' },
  ufFim: 'MG',
});

describe('EmissaoMdfeService (validações, sem depender de certificado)', () => {
  let cteDocumentos: { buscarPorChave: jest.Mock };
  let trucks: { findById: jest.Mock };
  let drivers: { findById: jest.Mock };
  let numeracao: { proximoNumero: jest.Mock };
  let transmissor: { enviar: jest.Mock };
  let service: EmissaoMdfeService;

  beforeEach(() => {
    cteDocumentos = { buscarPorChave: jest.fn(async (chave: string) => cte(chave)) };
    trucks = {
      findById: jest.fn(async () => ({ id: 'truck-1', plate: 'ABC1D23', rntrc: '12345678', capacity: 14 })),
    };
    drivers = {
      findById: jest.fn(async () => ({ id: 'driver-1', fullName: 'Jose da Silva', cpf: '12345678909' })),
    };
    numeracao = { proximoNumero: jest.fn(async () => 15) };
    transmissor = { enviar: jest.fn() };

    service = new EmissaoMdfeService(
      numeracao as never,
      transmissor as never,
      emissor(),
      null,
      cteDocumentos as never,
      trucks as never,
      drivers as never,
    );
  });

  it('recusa quando falta certificado configurado', async () => {
    await expect(service.emitir(dto(), OWNER)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

descreveComCertificado('EmissaoMdfeService (com certificado real)', () => {
  let cteDocumentos: { buscarPorChave: jest.Mock };
  let trucks: { findById: jest.Mock };
  let drivers: { findById: jest.Mock };
  let numeracao: { proximoNumero: jest.Mock };
  let transmissor: { enviar: jest.Mock };
  let service: EmissaoMdfeService;

  const RESPOSTA_AUTORIZADA = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
    <soap:Body><mdfeResultMsg xmlns="http://www.portalfiscal.inf.br/mdfe/wsdl/MDFeRecepcaoSinc">
      <mdfeProc xmlns="http://www.portalfiscal.inf.br/mdfe">
        <protMDFe><infProt>
          <cStat>100</cStat><xMotivo>Autorizado o uso do MDF-e</xMotivo>
          <nProt>135260000012345</nProt><dhRecbto>2026-08-25T10:05:00-03:00</dhRecbto>
        </infProt></protMDFe>
      </mdfeProc>
    </mdfeResultMsg></soap:Body></soap:Envelope>`;

  beforeEach(() => {
    cteDocumentos = { buscarPorChave: jest.fn(async (chave: string) => cte(chave)) };
    trucks = {
      findById: jest.fn(async () => ({ id: 'truck-1', plate: 'ABC1D23', rntrc: '12345678', capacity: 14 })),
    };
    drivers = {
      findById: jest.fn(async () => ({ id: 'driver-1', fullName: 'Jose da Silva', cpf: '12345678909' })),
    };
    numeracao = { proximoNumero: jest.fn(async () => 15) };
    transmissor = { enviar: jest.fn(async () => RESPOSTA_AUTORIZADA) };

    service = new EmissaoMdfeService(
      numeracao as never,
      transmissor as never,
      emissor(),
      CERTIFICADO,
      cteDocumentos as never,
      trucks as never,
      drivers as never,
    );
  });

  it('reúne os CT-e, monta e transmite o MDF-e', async () => {
    const resultado = await service.emitir(dto(), OWNER);

    expect(resultado.autorizado).toBe(true);
    expect(resultado.protocolo).toBe('135260000012345');
    expect(resultado.numero).toBe(15);
    expect(resultado.cteChaves).toEqual([CHAVE1, CHAVE2]);
    expect(transmissor.enviar).toHaveBeenCalledTimes(1);
    const [, envelope] = transmissor.enviar.mock.calls[0];
    expect(envelope).toContain('MDFeRecepcaoSinc');
  });

  it('soma o valor e o peso da carga de todos os CT-e', async () => {
    cteDocumentos.buscarPorChave.mockImplementation(async (chave: string) =>
      cte(chave, { valorCarga: 1000, pesoBruto: 200 }),
    );

    const resultado = await service.emitir(dto(), OWNER);
    const xml = resultado.xml ?? '';

    expect(xml).toContain('<vCarga>2000.00</vCarga>');
    expect(xml).toContain('<qCarga>400.0000</qCarga>');
  });

  it('recusa sem nenhum CT-e selecionado', async () => {
    await expect(service.emitir({ ...dto(), cteChaves: [] }, OWNER)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('recusa quando algum CT-e não está autorizado', async () => {
    cteDocumentos.buscarPorChave.mockImplementation(async (chave: string) =>
      chave === CHAVE2 ? cte(chave, { situacao: 'REJEITADA' }) : cte(chave),
    );

    await expect(service.emitir(dto(), OWNER)).rejects.toBeInstanceOf(BadRequestException);
    expect(transmissor.enviar).not.toHaveBeenCalled();
  });
});
