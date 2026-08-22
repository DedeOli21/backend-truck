import { CteDocumentEntity } from '@cte-documents/domain/entities/cte-document.entity';

export const CTE_DOCUMENTS_REPOSITORY = 'CTE_DOCUMENTS_REPOSITORY';

export interface CteDocumentFilters {
  /** Gestor dono dos documentos. Obrigatório: ninguém lista fora do próprio escopo. */
  ownerUserId?: string;
  truckId?: string;
  driverId?: string;
  freightId?: string;
  situacao?: string;
  from?: Date;
  to?: Date;
}

export interface CteDocumentsRepository {
  save(documento: CteDocumentEntity): Promise<CteDocumentEntity>;
  findByChave(chave: string, ownerUserId?: string): Promise<CteDocumentEntity | null>;
  list(filtros: CteDocumentFilters): Promise<CteDocumentEntity[]>;
  remove(id: string): Promise<void>;
}
