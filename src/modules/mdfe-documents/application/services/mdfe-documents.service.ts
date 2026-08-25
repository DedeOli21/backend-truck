import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { MdfeDocumentEntity } from '@mdfe-documents/domain/entities/mdfe-document.entity';
import {
  MDFE_DOCUMENTS_REPOSITORY,
  MdfeDocumentFilters,
  MdfeDocumentsRepository,
} from '@mdfe-documents/domain/repositories/mdfe-documents.repository';
import { EmissaoMdfeService, ResultadoEmissaoMdfe } from '@mdfe-documents/application/services/emissao-mdfe.service';
import { EmitirMdfeDto } from '@mdfe-documents/presentation/dtos/emitir-mdfe.dto';
import { EncerrarMdfeDto } from '@mdfe-documents/presentation/dtos/encerrar-mdfe.dto';
import { codeToUf } from '@nf-e/domain/validators/uf.validator';

/**
 * A chave do MDF-e (modelo 58) não passa pelo parseChaveAcesso comum: aquele
 * só reconhece NF-e/CT-e. Aqui só interessa UF e CNPJ do emitente, que estão
 * nas mesmas posições em qualquer chave de 44 dígitos.
 */
const ufECnpjDaChave = (chave: string): { uf: string; cnpjEmitente: string } => ({
  uf: codeToUf(Number(chave.slice(0, 2))) ?? '',
  cnpjEmitente: chave.slice(6, 20),
});

@Injectable()
export class MdfeDocumentsService {
  constructor(
    @Inject(MDFE_DOCUMENTS_REPOSITORY) private readonly repository: MdfeDocumentsRepository,
    @Inject(EmissaoMdfeService) private readonly emissao: EmissaoMdfeService,
  ) {}

  /** Emite o MDF-e na SEFAZ e, autorizado, grava o documento. */
  async emitir(dto: EmitirMdfeDto, ownerUserId: string): Promise<{ resultado: ResultadoEmissaoMdfe; documento: MdfeDocumentEntity | null }> {
    const resultado = await this.emissao.emitir(dto, ownerUserId);

    if (!resultado.autorizado) {
      return { resultado, documento: null };
    }

    const partesChave = ufECnpjDaChave(resultado.chave);
    const agora = new Date();

    const documento = new MdfeDocumentEntity({
      id: randomUUID(),
      ownerUserId,
      chave: resultado.chave,
      numero: resultado.numero,
      serie: resultado.serie,
      modelo: 58,
      uf: partesChave.uf,
      cnpjEmitente: partesChave.cnpjEmitente,
      ambiente: resultado.ambiente,
      emitidoEm: agora,
      ufIni: partesChave.uf,
      ufFim: resultado.ufFim,
      municipioCarregamento: dto.municipioCarregamento.municipio,
      municipioDescarga: resultado.municipioDescarga.municipio,
      cteChaves: resultado.cteChaves,
      valorCarga: resultado.valorCarga,
      pesoBrutoKg: resultado.pesoBrutoKg,
      protocolo: resultado.protocolo,
      autorizadoEm: resultado.autorizadoEm ? new Date(resultado.autorizadoEm) : agora,
      situacao: 'AUTORIZADA',
      motivoRejeicao: null,
      truckId: resultado.truckId,
      driverId: resultado.driverId,
      encerradoEm: null,
      encerramentoProtocolo: null,
      xml: resultado.xml,
      createdAt: agora,
      updatedAt: agora,
    });

    await this.repository.save(documento);

    return { resultado, documento };
  }

  async buscarPorChave(chave: string, ownerUserId?: string): Promise<MdfeDocumentEntity> {
    const documento = await this.repository.findByChave(chave, ownerUserId);

    if (!documento) {
      throw new NotFoundException('MDF-e não encontrado.');
    }

    return documento;
  }

  async listar(filtros: MdfeDocumentFilters): Promise<MdfeDocumentEntity[]> {
    return this.repository.list(filtros);
  }

  /** Encerra o MDF-e na SEFAZ e grava o resultado; a viagem só encerra uma vez. */
  async encerrar(
    chave: string,
    dto: EncerrarMdfeDto,
    ownerUserId: string,
  ): Promise<MdfeDocumentEntity> {
    const documento = await this.buscarPorChave(chave, ownerUserId);

    if (documento.situacao !== 'AUTORIZADA') {
      throw new BadRequestException(
        `MDF-e ${chave} não está autorizado (situação: ${documento.situacao ?? 'desconhecida'}).`,
      );
    }

    if (documento.encerradoEm) {
      throw new BadRequestException(`MDF-e ${chave} já foi encerrado.`);
    }

    const retorno = await this.emissao.encerrar({
      chave: documento.chave,
      protocolo: documento.protocolo ?? '',
      ambiente: documento.ambiente as 1 | 2,
      cnpjEmitente: documento.cnpjEmitente,
      dataEvento: new Date(),
      municipioDescarga: { codigoMunicipio: dto.municipioDescarga.codigoMunicipio },
      ufDescarga: dto.ufDescarga,
    });

    if (!retorno.sucesso) {
      throw new BadRequestException(
        `SEFAZ recusou o encerramento do MDF-e ${chave}: ${retorno.motivo}`,
      );
    }

    const atualizado = new MdfeDocumentEntity({
      ...documento,
      encerradoEm: new Date(),
      encerramentoProtocolo: retorno.protocolo,
      updatedAt: new Date(),
    });

    await this.repository.save(atualizado);
    return atualizado;
  }

  async remover(chave: string, ownerUserId?: string): Promise<void> {
    const documento = await this.buscarPorChave(chave, ownerUserId);
    await this.repository.remove(documento.id);
  }
}
