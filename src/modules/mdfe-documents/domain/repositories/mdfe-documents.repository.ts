import { MdfeDocumentEntity } from '@mdfe-documents/domain/entities/mdfe-document.entity';

export const MDFE_DOCUMENTS_REPOSITORY = 'MDFE_DOCUMENTS_REPOSITORY';

export interface MdfeDocumentFilters {
  /** Gestor dono dos documentos. Obrigatório: ninguém lista fora do próprio escopo. */
  ownerUserId?: string;
  truckId?: string;
  driverId?: string;
  situacao?: string;
  from?: Date;
  to?: Date;
}

export interface MdfeDocumentsRepository {
  save(documento: MdfeDocumentEntity): Promise<MdfeDocumentEntity>;
  findByChave(chave: string, ownerUserId?: string): Promise<MdfeDocumentEntity | null>;
  list(filtros: MdfeDocumentFilters): Promise<MdfeDocumentEntity[]>;
  remove(id: string): Promise<void>;
}
