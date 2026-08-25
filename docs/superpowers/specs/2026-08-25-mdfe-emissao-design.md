# MDF-e: emissão e encerramento vinculados aos CT-e da viagem

## Contexto

Card Trello #37: "🚛 MDF-e + CIOT: emissão e vínculo com CT-es da viagem".
CIOT fica fora desta rodada (decisão em aberto, comentada no card, Viviane
marcada) — falta operadora autorizada pela ANTT e credenciais de API. Esta
spec cobre só o MDF-e.

## Objetivo

Emitir o Manifesto Eletrônico de Documentos Fiscais (MDF-e) reunindo os CT-e
autorizados de uma viagem (mesmo caminhão + motorista), transmitir à SEFAZ
usando o certificado A1 já configurado, e encerrar o manifesto ao fim da
viagem — os dois eventos exigidos por lei (Ajuste SINIEF 21/10 e NT MDF-e
vigente).

## Fora de escopo (v1)

- CIOT (decisão pendente com a operadora).
- DAMDFE em PDF (o card não pede; entra depois, mesmo padrão do DACTE).
- Contingência offline (emissão sem conexão com a SEFAZ).
- Evento de cancelamento (só emissão + encerramento).

## Diferença chave em relação ao CT-e

MDF-e usa o **Ambiente Nacional** único para autorização — não varia por UF
como CT-e/NF-e. Simplifica endpoints: uma única URL de produção e uma de
homologação para recepção, consulta de protocolo e encerramento (com SVRS
como contingência, que hoje só existe para poucas UFs no CT-e).

## Modelo de dados

`MdfeDocumentEntity` (mesmo padrão de `CteDocumentEntity`):

```
id, ownerUserId, chave, numero, serie, modelo (58), uf,
cnpjEmitente, emitidoEm, protocolo, autorizadoEm, situacao,
truckId, driverId, cteChaves (string[]), ufPercurso (string[]),
municipioCarregamento, encerradoEm, encerramentoProtocolo,
xml, motivoRejeicao, createdAt, updatedAt
```

Tabela nova `mdfe_documents`, índice único `(owner_user_id, chave)`.

Não existe entidade "viagem" — a lista de CT-e é montada na hora da emissão,
filtrando CT-e autorizados por truckId/driverId (e opcionalmente período),
igual o filtro que já existe em `CteDocumentsService.listar`.

## Fluxo de emissão

1. `POST /mdfe/emitir` recebe `{ truckId, driverId, cteChaves[], municipioCarregamento, ufPercurso[] }`.
2. Busca os CT-e pelas chaves (via `CteDocumentsService`), valida que todos
   estão `AUTORIZADA` e pertencem ao mesmo `ownerUserId`.
3. Monta `DadosMdfe` (dados do veículo: placa/RNTRC do `TruckEntity`;
   condutor: nome/CPF do `DriverEntity`; totais: soma de `valorCarga`,
   `pesoBruto` dos CT-e, quantidade de CT-e).
4. Gera XML MDF-e 3.00 (`gerarMdfeXml`, análogo a `gerarCteXml`), assina com
   `assinarXml` (já existe, reutilizado), transmite ao Ambiente Nacional.
5. Autorizado → grava `MdfeDocumentEntity` com protocolo e chave.
6. Falha na transmissão não apaga nada; a SEFAZ responde motivo da rejeição.

## Fluxo de encerramento

1. `POST /mdfe/:chave/encerrar` recebe `{ municipioDescarga, ufDescarga }`.
2. Só permite encerrar MDF-e com `situacao = AUTORIZADA` e sem
   `encerradoEm` prévio.
3. Monta e assina o evento de encerramento (evento 110112), transmite ao
   Ambiente Nacional.
4. Sucesso → grava `encerradoEm` e `encerramentoProtocolo`.

## API

- `POST /mdfe/emitir` — emite.
- `POST /mdfe/:chave/encerrar` — encerra.
- `GET /mdfe` — lista (filtros: truckId, driverId, situacao, from/to).
- `GET /mdfe/:chave` — detalha, incluindo lista de CT-e vinculados.

Todas `ADMIN`, mesmo padrão de guards do módulo CT-e.

## Frontend

Nova aba "MDF-e" no módulo Fiscal (`AdminFiscalModule`), com:
- formulário de emissão: seleciona caminhão, motorista, CT-e autorizados
  (checklist dos CT-e do caminhão/motorista sem MDF-e ainda), UF de percurso.
- tabela de MDF-e emitidos com ação "Encerrar" quando autorizado e não
  encerrado.

## Testes

- Unit: `gerar-mdfe-xml` (chave, estrutura do XML, totais).
- Unit: `EmissaoMdfeService` (validação de CT-e não autorizado, CT-e de
  outro gestor, sucesso, encerramento fora de ordem).
- Unit: `MdfeDocumentsService` (persistência, listagem, filtros).
- Integração leve (controller spec) igual ao padrão de `cte.controller.spec.ts`.
- Frontend: serviço + painel novo, mesmo padrão dos specs existentes.
