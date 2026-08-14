import {
  DriverPaymentStatus,
  PixKeyType,
  TollStatus,
} from '@database/typeorm/entities/enums';

export class DriverPaymentEntity {
  constructor(
    public readonly id: string,
    public readonly driverId: string,
    public readonly driverName: string,
    public readonly vehiclePlate: string | null,
    public readonly rntrc: string | null,
    public readonly pixKeyType: PixKeyType | null,
    public readonly pixKey: string,
    public readonly baseAmount: number,
    public readonly inssAmount: number,
    public readonly sestSenatAmount: number,
    public readonly tollAmount: number,
    public readonly totalAmount: number,
    public readonly tollStatus: TollStatus,
    public paymentStatus: DriverPaymentStatus,
    public paidAt: Date | null,
    public readonly loadingDate: Date,
    public readonly deliveryDate: Date,
    public readonly clientName: string,
    public readonly createdByUserId: string,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}
}
