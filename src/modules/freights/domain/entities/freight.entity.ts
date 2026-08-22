export type FreightStatus = 'AGENDADO' | 'EM_TRANSITO' | 'CONCLUIDO' | 'CANCELADO';

export const FREIGHT_STATUS: FreightStatus[] = [
  'AGENDADO',
  'EM_TRANSITO',
  'CONCLUIDO',
  'CANCELADO',
];

export class FreightEntity {
  id!: string;
  ownerUserId!: string;
  codigo!: string;
  origem!: string;
  destino!: string;
  clienteNome!: string | null;
  clienteDocumento!: string | null;
  remetenteNome!: string | null;
  destinatarioNome!: string | null;
  produto!: string | null;
  peso!: number | null;
  valorFrete!: number;
  valorCarga!: number | null;
  status!: FreightStatus;
  truckId!: string | null;
  driverId!: string | null;
  iniciadoEm!: Date | null;
  concluidoEm!: Date | null;
  observacoes!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(props: Partial<FreightEntity>) {
    Object.assign(this, props);
  }
}
