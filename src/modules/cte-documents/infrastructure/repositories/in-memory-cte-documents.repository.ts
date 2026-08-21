import { Injectable } from '@nestjs/common';
import { CteDocumentEntity } from '@cte-documents/domain/entities/cte-document.entity';
import {
  CteDocumentFilters,
  CteDocumentsRepository,
} from '@cte-documents/domain/repositories/cte-documents.repository';

@Injectable()
export class InMemoryCteDocumentsRepository implements CteDocumentsRepository {
  private readonly documentos = new Map<string, CteDocumentEntity>();

  async save(documento: CteDocumentEntity): Promise<CteDocumentEntity> {
    this.documentos.set(documento.id, documento);
    return documento;
  }

  async findByChave(chave: string): Promise<CteDocumentEntity | null> {
    return [...this.documentos.values()].find((item) => item.chave === chave) ?? null;
  }

  async list(filtros: CteDocumentFilters): Promise<CteDocumentEntity[]> {
    return [...this.documentos.values()]
      .filter((item) => !filtros.truckId || item.truckId === filtros.truckId)
      .filter((item) => !filtros.driverId || item.driverId === filtros.driverId)
      .filter((item) => !filtros.freightId || item.freightId === filtros.freightId)
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
