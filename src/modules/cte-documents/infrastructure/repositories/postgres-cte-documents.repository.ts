import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CteDocumentOrmEntity } from '@database/typeorm/entities/cte-document.orm-entity';
import { CteDocumentEntity, OrigemLeituraCte } from '@cte-documents/domain/entities/cte-document.entity';
import {
  CteDocumentFilters,
  CteDocumentsRepository,
} from '@cte-documents/domain/repositories/cte-documents.repository';

@Injectable()
export class PostgresCteDocumentsRepository implements CteDocumentsRepository {
  constructor(
    @InjectRepository(CteDocumentOrmEntity)
    private readonly repository: Repository<CteDocumentOrmEntity>,
  ) {}

  private toDomain(row: CteDocumentOrmEntity): CteDocumentEntity {
    return new CteDocumentEntity({
      ...row,
      notasFiscais: row.notasFiscais ? row.notasFiscais.split(',').filter(Boolean) : [],
      origemLeitura: row.origemLeitura as OrigemLeituraCte,
    });
  }

  async save(documento: CteDocumentEntity): Promise<CteDocumentEntity> {
    const row = this.repository.create({
      ...documento,
      notasFiscais: documento.notasFiscais.join(','),
    });

    await this.repository.save(row);
    return this.toDomain(await this.repository.findOneOrFail({ where: { id: documento.id } }));
  }

  async findByChave(chave: string): Promise<CteDocumentEntity | null> {
    const row = await this.repository.findOne({ where: { chave } });
    return row ? this.toDomain(row) : null;
  }

  async list(filtros: CteDocumentFilters): Promise<CteDocumentEntity[]> {
    const query = this.repository.createQueryBuilder('cte');

    if (filtros.truckId) query.andWhere('cte.truckId = :truckId', { truckId: filtros.truckId });
    if (filtros.driverId) query.andWhere('cte.driverId = :driverId', { driverId: filtros.driverId });
    if (filtros.freightId) {
      query.andWhere('cte.freightId = :freightId', { freightId: filtros.freightId });
    }
    if (filtros.situacao) query.andWhere('cte.situacao = :situacao', { situacao: filtros.situacao });
    if (filtros.from) query.andWhere('cte.emitidoEm >= :from', { from: filtros.from });
    if (filtros.to) query.andWhere('cte.emitidoEm <= :to', { to: filtros.to });

    const rows = await query.orderBy('cte.emitidoEm', 'DESC', 'NULLS LAST').getMany();
    return rows.map((row) => this.toDomain(row));
  }

  async remove(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
