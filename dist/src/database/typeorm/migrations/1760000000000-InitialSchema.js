"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialSchema1760000000000 = void 0;
class InitialSchema1760000000000 {
    constructor() {
        this.name = 'InitialSchema1760000000000';
    }
    async up(queryRunner) {
        await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
        await queryRunner.query("CREATE TYPE user_role AS ENUM ('ADMIN', 'DRIVER')");
        await queryRunner.query("CREATE TYPE transaction_direction AS ENUM ('IN', 'OUT')");
        await queryRunner.query("CREATE TYPE transaction_category AS ENUM ('FREIGHT', 'FUEL', 'MAINTENANCE', 'INSURANCE', 'FINANCING')");
        await queryRunner.query("CREATE TYPE payable_category AS ENUM ('INSURANCE', 'MAINTENANCE', 'FINANCING')");
        await queryRunner.query("CREATE TYPE payable_status AS ENUM ('PENDING', 'PAID')");
        await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY,
        name varchar(150) NOT NULL,
        email varchar(255) UNIQUE NOT NULL,
        password_hash varchar(255) NOT NULL,
        role user_role NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
        await queryRunner.query(`
      CREATE TABLE trucks (
        id uuid PRIMARY KEY,
        plate varchar(20) UNIQUE NOT NULL,
        brand_model varchar(120) NOT NULL,
        year int,
        driver_id uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_trucks_driver FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
        await queryRunner.query(`
      CREATE TABLE wallets (
        id uuid PRIMARY KEY,
        user_id uuid UNIQUE NOT NULL,
        balance numeric(14, 2) NOT NULL DEFAULT 0,
        last_sync timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);
        await queryRunner.query(`
      CREATE TABLE transactions (
        id uuid PRIMARY KEY,
        wallet_id uuid NOT NULL,
        truck_id uuid,
        direction transaction_direction NOT NULL,
        category transaction_category NOT NULL,
        amount numeric(14, 2) NOT NULL,
        description varchar(255) NOT NULL,
        transaction_date timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_transaction_amount_positive CHECK (amount > 0),
        CONSTRAINT fk_transaction_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT,
        CONSTRAINT fk_transaction_truck FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE SET NULL
      )
    `);
        await queryRunner.query(`
      CREATE TABLE payables (
        id uuid PRIMARY KEY,
        wallet_id uuid NOT NULL,
        title varchar(255) NOT NULL,
        category payable_category NOT NULL,
        amount numeric(14, 2) NOT NULL,
        due_date date NOT NULL,
        status payable_status NOT NULL DEFAULT 'PENDING',
        paid_at timestamptz,
        transaction_id uuid UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_payables_amount_positive CHECK (amount > 0),
        CONSTRAINT fk_payables_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE RESTRICT,
        CONSTRAINT fk_payables_transaction FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
      )
    `);
        await queryRunner.query(`
      CREATE TABLE open_banking_syncs (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL,
        provider varchar(150) NOT NULL,
        available_balance numeric(14, 2) NOT NULL,
        synced_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_open_banking_balance_non_negative CHECK (available_balance >= 0),
        CONSTRAINT fk_open_banking_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);
        await queryRunner.query('CREATE INDEX idx_trucks_driver_id ON trucks(driver_id)');
        await queryRunner.query('CREATE INDEX idx_transactions_wallet_date ON transactions(wallet_id, transaction_date DESC)');
        await queryRunner.query('CREATE INDEX idx_transactions_wallet_category ON transactions(wallet_id, category)');
        await queryRunner.query('CREATE INDEX idx_payables_wallet_status_due ON payables(wallet_id, status, due_date)');
        await queryRunner.query('CREATE INDEX idx_open_banking_user_synced_at ON open_banking_syncs(user_id, synced_at DESC)');
    }
    async down(queryRunner) {
        await queryRunner.query('DROP INDEX IF EXISTS idx_open_banking_user_synced_at');
        await queryRunner.query('DROP INDEX IF EXISTS idx_payables_wallet_status_due');
        await queryRunner.query('DROP INDEX IF EXISTS idx_transactions_wallet_category');
        await queryRunner.query('DROP INDEX IF EXISTS idx_transactions_wallet_date');
        await queryRunner.query('DROP INDEX IF EXISTS idx_trucks_driver_id');
        await queryRunner.query('DROP TABLE IF EXISTS open_banking_syncs');
        await queryRunner.query('DROP TABLE IF EXISTS payables');
        await queryRunner.query('DROP TABLE IF EXISTS transactions');
        await queryRunner.query('DROP TABLE IF EXISTS wallets');
        await queryRunner.query('DROP TABLE IF EXISTS trucks');
        await queryRunner.query('DROP TABLE IF EXISTS users');
        await queryRunner.query('DROP TYPE IF EXISTS payable_status');
        await queryRunner.query('DROP TYPE IF EXISTS payable_category');
        await queryRunner.query('DROP TYPE IF EXISTS transaction_category');
        await queryRunner.query('DROP TYPE IF EXISTS transaction_direction');
        await queryRunner.query('DROP TYPE IF EXISTS user_role');
    }
}
exports.InitialSchema1760000000000 = InitialSchema1760000000000;
//# sourceMappingURL=1760000000000-InitialSchema.js.map