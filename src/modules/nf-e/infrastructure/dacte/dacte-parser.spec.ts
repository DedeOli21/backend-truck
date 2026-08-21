import { DACTE_TEXTO_EXEMPLO } from '@nf-e/infrastructure/dacte/dacte-exemplo.fixture';
import { extrairChaves, parseDacteTexto } from '@nf-e/infrastructure/dacte/dacte-parser';

describe('extrairChaves', () => {
  it('le a chave impressa em grupos de quatro', () => {
    expect(extrairChaves('3526.0808.7898.6300.0100.5700.1000.0011.4710.0000.0001')).toEqual([
      '35260808789863000100570010000011471000000001',
    ]);
  });

  it('le a chave em bloco unico', () => {
    expect(extrairChaves('chave 35260808789863000100570010000011471000000001 fim')).toHaveLength(1);
  });

  it('nao inventa chave concatenando numeros vizinhos', () => {
    // Dígitos soltos que somados passariam de 44 se fossem concatenados.
    const texto = '1147 1 21/08/2026 15:13:25 135264179761055 07400-000 188012385116 4.500,00';
    expect(extrairChaves(texto)).toEqual([]);
  });

  it('descarta sequencia de 44 digitos com DV invalido', () => {
    expect(extrairChaves('35260808789863000100570010000011471000000009')).toEqual([]);
  });
});

describe('parseDacteTexto', () => {
  const dacte = parseDacteTexto(DACTE_TEXTO_EXEMPLO);

  it('identifica o CT-e pela chave, com os campos que a chave garante', () => {
    expect(dacte.chave).toBe('35260808789863000100570010000011471000000001');
    expect(dacte.numero).toBe(1147);
    expect(dacte.serie).toBe(1);
    expect(dacte.uf).toBe('SP');
    expect(dacte.cnpjEmitente).toBe('08789863000100');
  });

  it('extrai trajeto pelo padrao UF - codigo IBGE - municipio', () => {
    expect(dacte.origem).toBe('SP - ARUJÁ');
    expect(dacte.destino).toBe('MG - CONTAGEM');
  });

  it('extrai remetente e destinatario', () => {
    expect(dacte.remetente.nome).toBe('MEIWA INDUSTRIA E COMERCIO LTDA');
    expect(dacte.remetente.cnpjCpf).toBe('55.078.307/0001-05');
    expect(dacte.destinatario.nome).toBe('L&M PACK DISTRIBUIDORA LTDA');
    expect(dacte.destinatario.municipio).toBe('CONTAGEM');
  });

  it('extrai valores e carga', () => {
    expect(dacte.valorTotalServico).toBe(4500);
    expect(dacte.valorCarga).toBe(39587.01);
    expect(dacte.pesoBruto).toBe(1397.55);
  });

  it('extrai a NF-e transportada, sem confundir com a chave do CT-e', () => {
    expect(dacte.notasFiscais).toEqual(['35260855078307000105550010013284551000107765']);
    expect(dacte.notasFiscais).not.toContain(dacte.chave);
  });

  it('extrai protocolo, CFOP, placa e RNTRC', () => {
    expect(dacte.rntrc).toBe('56299277');
    expect(dacte.protocolo).toBe('135264179761055');
    expect(dacte.cfop).toBe('6353');
    expect(dacte.placa).toBe('MJA4B09');
  });

  it('nao reporta campos faltando para este layout', () => {
    expect(dacte.camposNaoEncontrados).toEqual([]);
  });

  it('lista os campos que faltaram quando o layout e diferente', () => {
    const minimo = 'CT-e 3526.0808.7898.6300.0100.5700.1000.0011.4710.0000.0001 apenas a chave';
    const resultado = parseDacteTexto(minimo);

    expect(resultado.numero).toBe(1147);
    expect(resultado.camposNaoEncontrados.length).toBeGreaterThan(0);
    expect(resultado.remetente.nome).toBeNull();
  });

  it('falha de forma clara quando nao ha chave de CT-e no texto', () => {
    expect(() => parseDacteTexto('documento digitalizado sem texto util')).toThrow(
      'imagem digitalizada',
    );
  });
});
