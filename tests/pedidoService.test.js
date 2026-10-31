/**
 * Testes unitários do service: verificam as regras de negócio
 * diretamente, sem HTTP.
 */
const pedidoService = require('../src/services/pedidoService');
const pedidoRepository = require('../src/repositories/pedidoRepository');
const { ValidacaoError, NaoEncontradoError } = require('../src/errors/AppError');

const pedidoValido = {
  cliente: 'Carlos Silva',
  tipo: 'entrega',
  valor: 350,
  prioridade: 'normal',
};

beforeEach(() => {
  pedidoRepository.limpar();
});

// Cria um pedido e o leva até o status desejado seguindo caminhos permitidos.
function pedidoNoStatus(status) {
  const caminhos = {
    recebido: [],
    em_preparacao: ['em_preparacao'],
    enviado: ['em_preparacao', 'enviado'],
    entregue: ['em_preparacao', 'enviado', 'entregue'],
    cancelado: ['cancelado'],
  };
  const pedido = pedidoService.criar(pedidoValido);
  caminhos[status].forEach((proximo) => pedidoService.atualizarStatus(String(pedido.id), proximo));
  return pedido.id;
}

describe('criar', () => {
  test('aceita valor decimal', () => {
    const pedido = pedidoService.criar({ ...pedidoValido, valor: 19.9 });
    expect(pedido.valor).toBe(19.9);
  });

  test('aceita todos os tipos e prioridades documentados', () => {
    for (const tipo of pedidoService.TIPOS) {
      for (const prioridade of pedidoService.PRIORIDADES) {
        expect(() => pedidoService.criar({ ...pedidoValido, tipo, prioridade })).not.toThrow();
      }
    }
  });

  test('lança ValidacaoError (400) para dados inválidos', () => {
    expect(() => pedidoService.criar({ ...pedidoValido, valor: 0 })).toThrow(ValidacaoError);
  });

  test('lança ValidacaoError quando os dados não são um objeto', () => {
    expect(() => pedidoService.criar(undefined)).toThrow(ValidacaoError);
    expect(() => pedidoService.criar(null)).toThrow(ValidacaoError);
    expect(() => pedidoService.criar('texto')).toThrow(ValidacaoError);
  });
});

describe('buscarPorId', () => {
  test('lança NaoEncontradoError (404) para id inexistente', () => {
    expect(() => pedidoService.buscarPorId('42')).toThrow(NaoEncontradoError);
  });

  test('o objeto devolvido é uma cópia: alterá-lo não muda o pedido guardado', () => {
    pedidoService.criar(pedidoValido);
    const copia = pedidoService.buscarPorId('1');
    copia.status = 'entregue';
    expect(pedidoService.buscarPorId('1').status).toBe('recebido');
  });
});

describe('regras de transição de status', () => {
  const permitidas = [];
  const proibidas = [];
  for (const atual of pedidoService.STATUS) {
    for (const proximo of pedidoService.STATUS) {
      const lista = pedidoService.TRANSICOES[atual].includes(proximo) ? permitidas : proibidas;
      lista.push([atual, proximo]);
    }
  }

  test.each(permitidas)('permite %s → %s', (atual, proximo) => {
    const id = pedidoNoStatus(atual);
    const atualizado = pedidoService.atualizarStatus(String(id), proximo);
    expect(atualizado.status).toBe(proximo);
  });

  test.each(proibidas)('bloqueia %s → %s', (atual, proximo) => {
    const id = pedidoNoStatus(atual);
    expect(() => pedidoService.atualizarStatus(String(id), proximo)).toThrow(ValidacaoError);
  });

  test('valida o status antes de procurar o pedido (status inválido + id inexistente → 400)', () => {
    expect(() => pedidoService.atualizarStatus('999', 'xyz')).toThrow(ValidacaoError);
  });
});
