export type OrigemLeituraCte = 'XML' | 'PDF' | 'CHAVE';

export class CteDocumentEntity {
  id!: string;
  chave!: string;
  numero!: number;
  serie!: number;
  modelo!: number;
  uf!: string;
  cnpjEmitente!: string;
  emitidoEm!: Date | null;
  cfop!: string | null;
  naturezaOperacao!: string | null;
  origem!: string | null;
  destino!: string | null;
  remetenteNome!: string | null;
  remetenteDocumento!: string | null;
  destinatarioNome!: string | null;
  destinatarioDocumento!: string | null;
  tomadorNome!: string | null;
  tomadorDocumento!: string | null;
  valorTotalServico!: number | null;
  valorReceber!: number | null;
  valorCarga!: number | null;
  pesoBruto!: number | null;
  produtoPredominante!: string | null;
  notasFiscais!: string[];
  rntrc!: string | null;
  placa!: string | null;
  protocolo!: string | null;
  autorizadoEm!: Date | null;
  situacao!: string | null;
  origemLeitura!: OrigemLeituraCte;
  truckId!: string | null;
  driverId!: string | null;
  freightId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(props: Partial<CteDocumentEntity>) {
    Object.assign(this, props);
  }
}
