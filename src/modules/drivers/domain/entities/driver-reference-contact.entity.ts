export class DriverReferenceContactEntity {
  constructor(
    public readonly id: string,
    public readonly driverId: string,
    public readonly name: string,
    public readonly phone: string,
    public readonly relationship: string,
  ) {}
}
