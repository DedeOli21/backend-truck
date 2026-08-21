import { CnhCategory, DriverStatus, PixKeyType } from '@database/typeorm/entities/enums';

export class DriverEntity {
  constructor(
    public readonly id: string,
    public readonly fullName: string,
    public readonly cpf: string,
    public readonly pis: string | null,
    public readonly addressStreet: string,
    public readonly addressNumber: string,
    public readonly addressComplement: string | null,
    public readonly addressNeighborhood: string,
    public readonly addressCity: string,
    public readonly addressState: string,
    public readonly addressZip: string,
    public readonly cnhNumber: string,
    public readonly cnhCategory: CnhCategory,
    public readonly cnhExpiresAt: Date,
    public cnhImagePath: string | null,
    public readonly pixKeyType: PixKeyType,
    public readonly pixKey: string,
    public status: DriverStatus,
    public readonly createdAt: Date,
    public updatedAt: Date,
    public userId: string | null = null,
    public approvedByUserId: string | null = null,
  ) {}

  isCnhExpired(): boolean {
    return this.cnhExpiresAt.getTime() < Date.now();
  }
}
