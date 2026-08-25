import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MdfeDocumentOrmEntity } from '@database/typeorm/entities/mdfe-document.orm-entity';
import { MdfeDocumentEntity } from '@mdfe-documents/domain/entities/mdfe-document.entity';
import {
  MdfeDocumentFilters,
  MdfeDocumentsRepository,
} from '@mdfe-documents/domain/repositories/mdfe-documents.repository';

@Injectable()
export class PostgresMdfeDocumentsRepository implements MdfeDocumentsRepository {
  constructor(
    @InjectRepository(MdfeDocumentOrmEntity)
    private readonly repository: Repository<MdfeDocumentOrmEntity>,
  ) {}

  private toDomain(row: MdfeDocumentOrmEntity): MdfeDocumentEntity {
    return new MdfeDocumentEntity({
      ...row,
      cteChaves: row.cteChaves ? row.cteChaves.split(',').filter(Boolean) : [],
    });
  }

  async save(documento: MdfeDocumentEntity): Promise<MdfeDocumentEntity> {
    const row = this.repository.create({
      ...documento,
      cteChaves: documento.cteChaves.join(','),
    });

    await this.repository.save(row);
    return this.toDomain(await this.repository.findOneOrFail({ where: { id: documento.id } }));
  }

  async findByChave(chave: string, ownerUserId?: string): Promise<MdfeDocumentEntity | null> {
    const row = await this.repository.findOne({
      where: ownerUserId ? { chave, ownerUserId } : { chave },
    });
    return row ? this.toDomain(row) : null;
  }

  async list(filtros: MdfeDocumentFilters): Promise<MdfeDocumentEntity[]> {
    const query = this.repository.createQueryBuilder('mdfe');

    if (filtros.ownerUserId) {
      query.andWhere('mdfe.owner_user_id = :ownerUserId', { ownerUserId: filtros.ownerUserId });
    }

    if (filtros.truckId) query.andWhere('mdfe.truckId = :truckId', { truckId: filtros.truckId });
    if (filtros.driverId) {
      query.andWhere('mdfe.driverId = :driverId', { driverId: filtros.driverId });
    }
    if (filtros.situacao) {
      query.andWhere('mdfe.situacao = :situacao', { situacao: filtros.situacao });
    }
    if (filtros.from) query.andWhere('mdfe.emitidoEm >= :from', { from: filtros.from });
    if (filtros.to) query.andWhere('mdfe.emitidoEm <= :to', { to: filtros.to });

    const rows = await query.orderBy('mdfe.emitidoEm', 'DESC', 'NULLS LAST').getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
