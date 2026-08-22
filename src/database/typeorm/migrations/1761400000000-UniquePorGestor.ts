import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Placa, código de frete, chave de CT-e e CPF eram únicos no banco inteiro.
 * Com mais de um gestor na base isso vazava: o cadastro de um impedia o do
 * outro, e a violação subia como erro 500. Passam a ser únicos por gestor.
 */
const CHAVES: Array<[tabela: string, coluna: string, constraintAntiga: string]> = [
  ['trucks', 'plate', 'trucks_plate_key'],
  ['freights', 'codigo', 'freights_codigo_key'],
  ['cte_documents', 'chave', 'cte_documents_chave_key'],
  ['drivers', 'cpf', 'drivers_cpf_key'],
];

export class UniquePorGestor1761400000000 implements MigrationInterface {
  name = 'UniquePorGestor1761400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [tabela, coluna, constraintAntiga] of CHAVES) {
      await queryRunner.query(
        `ALTER TABLE "${tabela}" DROP CONSTRAINT IF EXISTS "${constraintAntiga}"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${tabela}" DROP CONSTRAINT IF EXISTS "uq_${tabela}_owner_${coluna}"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${tabela}"
         ADD CONSTRAINT "uq_${tabela}_owner_${coluna}" UNIQUE ("owner_user_id", "${coluna}")`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [tabela, coluna, constraintAntiga] of CHAVES) {
      await queryRunner.query(
        `ALTER TABLE "${tabela}" DROP CONSTRAINT IF EXISTS "uq_${tabela}_owner_${coluna}"`,
      );
      await queryRunner.query(
        `ALTER TABLE "${tabela}" ADD CONSTRAINT "${constraintAntiga}" UNIQUE ("${coluna}")`,
      );
    }
  }
}
