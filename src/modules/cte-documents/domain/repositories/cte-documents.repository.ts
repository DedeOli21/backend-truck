import { CteDocumentEntity } from '@cte-documents/domain/entities/cte-document.entity';

export const CTE_DOCUMENTS_REPOSITORY = 'CTE_DOCUMENTS_REPOSITORY';

export interface CteDocumentFilters {
  truckId?: string;
  driverId?: string;
  freightId?: string;
  situacao?: string;
  from?: Date;
  to?: Date;
}

export interface CteDocumentsRepository {
  save(documento: CteDocumentEntity): Promise<CteDocumentEntity>;
  findByChave(chave: string): Promise<CteDocumentEntity | null>;
  list(filtros: CteDocumentFilters): Promise<CteDocumentEntity[]>;
  remove(id: string): Promise<void>;
}
