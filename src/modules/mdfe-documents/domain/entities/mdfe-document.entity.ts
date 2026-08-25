export class MdfeDocumentEntity {
  id!: string;
  ownerUserId!: string;
  chave!: string;
  numero!: number;
  serie!: number;
  modelo!: number;
  uf!: string;
  cnpjEmitente!: string;
  ambiente!: number;
  emitidoEm!: Date | null;
  ufIni!: string;
  ufFim!: string;
  municipioCarregamento!: string | null;
  municipioDescarga!: string | null;
  /** Chaves dos CT-e reunidos nesta viagem. */
  cteChaves!: string[];
  valorCarga!: number | null;
  pesoBrutoKg!: number | null;
  protocolo!: string | null;
  autorizadoEm!: Date | null;
  situacao!: string | null;
  motivoRejeicao!: string | null;
  truckId!: string | null;
  driverId!: string | null;
  encerradoEm!: Date | null;
  encerramentoProtocolo!: string | null;
  xml!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(props: Partial<MdfeDocumentEntity>) {
    Object.assign(this, props);
  }
}
