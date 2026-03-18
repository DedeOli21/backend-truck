export declare class OpenBankingSyncEntity {
    readonly id: string;
    readonly userId: string;
    readonly provider: string;
    readonly syncedAvailableBalance: number;
    readonly syncedAt: Date;
    constructor(id: string, userId: string, provider: string, syncedAvailableBalance: number, syncedAt: Date);
}
