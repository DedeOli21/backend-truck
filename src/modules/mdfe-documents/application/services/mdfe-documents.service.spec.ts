import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmissaoMdfeService } from '@mdfe-documents/application/services/emissao-mdfe.service';
import { InMemoryMdfeDocumentsRepository } from '@mdfe-documents/infrastructure/repositories/in-memory-mdfe-documents.repository';
import { MdfeDocumentsService } from '@mdfe-documents/application/services/mdfe-documents.service';
import { EmitirMdfeDto } from '@mdfe-documents/presentation/dtos/emitir-mdfe.dto';

const OWNER = '11111111-1111-4111-8111-111111111111';
const OUTRO_GESTOR = '22222222-2222-4222-8222-222222222222';
const CHAVE = '35260808789863000100580010000000151123456781';

const dto = (): EmitirMdfeDto => ({
  truckId: 'truck-1',
  driverId: 'driver-1',
  cteChaves: ['35260808789863000100570010000011471000000001'],
  municipioCarregamento: { codigoMunicipio: '3550308', municipio: 'SAO PAULO' },
  municipioDescarga: { codigoMunicipio: '3106200', municipio: 'BELO HORIZONTE' },
  ufFim: 'MG',
});

const resultadoAutorizado = () => ({
  autorizado: true,
  chave: CHAVE,
  numero: 15,
  serie: 1,
  ambiente: 2 as const,
  codigoStatus: 100,
  motivo: 'Autorizado o uso do MDF-e',
  protocolo: '135260000012345',
  autorizadoEm: '2026-08-25T10:05:00-03:00',
  xml: '<mdfeProc/>',
  cteChaves: dto().cteChaves,
  truckId: dto().truckId,
  driverId: dto().driverId,
  ufFim: dto().ufFim,
  municipioDescarga: dto().municipioDescarga,
  valorCarga: 39587.01,
  pesoBrutoKg: 1397.55,
});

describe('MdfeDocumentsService', () => {
  let repository: InMemoryMdfeDocumentsRepository;
  let emissao: { emitir: jest.Mock; encerrar: jest.Mock };
  let service: MdfeDocumentsService;

  beforeEach(() => {
    repository = new InMemoryMdfeDocumentsRepository();
    emissao = { emitir: jest.fn(async () => resultadoAutorizado()), encerrar: jest.fn() };
    service = new MdfeDocumentsService(repository, emissao as unknown as EmissaoMdfeService);
  });

  it('grava o documento quando o MDF-e é autorizado', async () => {
    const { documento } = await service.emitir(dto(), OWNER);

    expect(documento).not.toBeNull();
    expect(documento!.chave).toBe(CHAVE);
    expect(documento!.ownerUserId).toBe(OWNER);
    expect(documento!.situacao).toBe('AUTORIZADA');
    expect(documento!.cteChaves).toEqual(dto().cteChaves);
  });

  it('não grava nada quando a SEFAZ rejeita', async () => {
    emissao.emitir.mockResolvedValue({ ...resultadoAutorizado(), autorizado: false, protocolo: null });

    const { documento } = await service.emitir(dto(), OWNER);

    expect(documento).toBeNull();
    expect(await repository.list({ ownerUserId: OWNER })).toHaveLength(0);
  });

  it('não vaza documento entre gestores', async () => {
    await service.emitir(dto(), OWNER);

    await expect(service.buscarPorChave(CHAVE, OUTRO_GESTOR)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('encerra o MDF-e autorizado e grava o protocolo do encerramento', async () => {
    await service.emitir(dto(), OWNER);
    emissao.encerrar.mockResolvedValue({ sucesso: true, codigoStatus: 135, motivo: 'ok', protocolo: '999' });

    const encerrado = await service.encerrar(
      CHAVE,
      { municipioDescarga: { codigoMunicipio: '3106200', municipio: 'BELO HORIZONTE' }, ufDescarga: 'MG' },
      OWNER,
    );

    expect(encerrado.encerradoEm).not.toBeNull();
    expect(encerrado.encerramentoProtocolo).toBe('999');
  });

  it('recusa encerrar de novo um MDF-e já encerrado', async () => {
    await service.emitir(dto(), OWNER);
    emissao.encerrar.mockResolvedValue({ sucesso: true, codigoStatus: 135, motivo: 'ok', protocolo: '999' });

    await service.encerrar(
      CHAVE,
      { municipioDescarga: { codigoMunicipio: '3106200', municipio: 'BELO HORIZONTE' }, ufDescarga: 'MG' },
      OWNER,
    );

    await expect(
      service.encerrar(
        CHAVE,
        { municipioDescarga: { codigoMunicipio: '3106200', municipio: 'BELO HORIZONTE' }, ufDescarga: 'MG' },
        OWNER,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('propaga a rejeição da SEFAZ no encerramento sem gravar nada', async () => {
    await service.emitir(dto(), OWNER);
    emissao.encerrar.mockResolvedValue({ sucesso: false, codigoStatus: 573, motivo: 'Duplicidade', protocolo: null });

    await expect(
      service.encerrar(
        CHAVE,
        { municipioDescarga: { codigoMunicipio: '3106200', municipio: 'BELO HORIZONTE' }, ufDescarga: 'MG' },
        OWNER,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const documento = await service.buscarPorChave(CHAVE, OWNER);
    expect(documento.encerradoEm).toBeNull();
  });
});
