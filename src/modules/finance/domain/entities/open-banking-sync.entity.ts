export class OpenBankingSyncEntity {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly provider: string,
    public readonly syncedAvailableBalance: number,
    public readonly syncedAt: Date,
  ) {}
}





