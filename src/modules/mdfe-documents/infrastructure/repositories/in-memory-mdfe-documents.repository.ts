import { Injectable } from '@nestjs/common';
import { MdfeDocumentEntity } from '@mdfe-documents/domain/entities/mdfe-document.entity';
import {
  MdfeDocumentFilters,
  MdfeDocumentsRepository,
} from '@mdfe-documents/domain/repositories/mdfe-documents.repository';

@Injectable()
export class InMemoryMdfeDocumentsRepository implements MdfeDocumentsRepository {
  private readonly documentos = new Map<string, MdfeDocumentEntity>();

  async save(documento: MdfeDocumentEntity): Promise<MdfeDocumentEntity> {
    this.documentos.set(documento.id, documento);
    return documento;
  }

  async findByChave(chave: string, ownerUserId?: string): Promise<MdfeDocumentEntity | null> {
    return (
      [...this.documentos.values()].find(
        (item) => item.chave === chave && (!ownerUserId || item.ownerUserId === ownerUserId),
      ) ?? null
    );
  }

  async list(filtros: MdfeDocumentFilters): Promise<MdfeDocumentEntity[]> {
    return [...this.documentos.values()]
      .filter((item) => !filtros.ownerUserId || item.ownerUserId === filtros.ownerUserId)
      .filter((item) => !filtros.truckId || item.truckId === filtros.truckId)
      .filter((item) => !filtros.driverId || item.driverId === filtros.driverId)
      .filter((item) => !filtros.situacao || item.situacao === filtros.situacao)
      .filter((item) => !filtros.from || (item.emitidoEm ?? item.createdAt) >= filtros.from)
      .filter((item) => !filtros.to || (item.emitidoEm ?? item.createdAt) <= filtros.to)
      .sort(
        (a, b) =>
          (b.emitidoEm ?? b.createdAt).getTime() - (a.emitidoEm ?? a.createdAt).getTime(),
      );
  }

  async remove(id: string): Promise<void> {
    this.documentos.delete(id);
  }
}
