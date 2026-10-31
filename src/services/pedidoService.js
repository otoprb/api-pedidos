/**
 * Camada de regras de negócio (Service).
 *
 * Aqui ficam as validações e as regras de transição de status.
 * O service NÃO conhece Express: não recebe req/res e não escolhe códigos
 * HTTP diretamente. Quando algo está errado, ele LANÇA um erro
 * (ValidacaoError → 400, NaoEncontradoError → 404) e o middleware de erros
 * transforma isso em resposta HTTP.
 */
const pedidoRepository = require('../repositories/pedidoRepository');
const { ValidacaoError, NaoEncontradoError } = require('../errors/AppError');

// Valores aceitos (documentados no README)
const TIPOS = ['entrega', 'retirada'];
const PRIORIDADES = ['baixa', 'normal', 'alta'];
const STATUS = ['recebido', 'em_preparacao', 'enviado', 'entregue', 'cancelado'];
const STATUS_INICIAL = 'recebido';

// Para cada status atual, os próximos status permitidos.
const TRANSICOES = {
  recebido: ['em_preparacao', 'cancelado'],
  em_preparacao: ['enviado', 'cancelado'],
  enviado: ['entregue'],
  entregue: [], // status final: não muda mais
  cancelado: [], // status final: não muda mais
};

/**
 * Converte o id da URL (sempre texto) em número.
 * Só aceita inteiros positivos escritos com dígitos ("1", "25").
 * Qualquer outra coisa ("abc", "1.5", "-2") vira null → pedido não encontrado.
 */
function converterId(id) {
  if (typeof id === 'string' && /^[1-9]\d*$/.test(id)) {
    return Number(id);
  }
  if (Number.isInteger(id) && id > 0) {
    return id;
  }
  return null;
}

/** Devolve a lista de mensagens de erro (vazia = dados válidos). */
function validarNovoPedido(dados) {
  const erros = [];

  if (typeof dados.cliente !== 'string' || dados.cliente.trim() === '') {
    erros.push('cliente é obrigatório e deve ser um texto não vazio');
  }

  const valorEhNumero = typeof dados.valor === 'number' && Number.isFinite(dados.valor);
  if (!valorEhNumero || dados.valor <= 0) {
    erros.push('valor deve ser um número maior que zero');
  }

  if (!TIPOS.includes(dados.tipo)) {
    erros.push(`tipo deve ser um destes valores: ${TIPOS.join(', ')}`);
  }

  if (!PRIORIDADES.includes(dados.prioridade)) {
    erros.push(`prioridade deve ser um destes valores: ${PRIORIDADES.join(', ')}`);
  }

  return erros;
}

/** RF01 — cadastrar pedido. */
function criar(dados) {
  const ehObjeto = dados !== null && typeof dados === 'object' && !Array.isArray(dados);
  if (!ehObjeto) {
    throw new ValidacaoError('O corpo da requisição deve ser um objeto JSON');
  }

  const erros = validarNovoPedido(dados);
  if (erros.length > 0) {
    throw new ValidacaoError('Dados do pedido inválidos', erros);
  }

  // Só os campos conhecidos são gravados. Um "status" ou "id" enviado pelo
  // cliente é ignorado: todo pedido nasce como "recebido" e o id é gerado aqui.
  return pedidoRepository.salvar({
    cliente: dados.cliente.trim(),
    tipo: dados.tipo,
    valor: dados.valor,
    prioridade: dados.prioridade,
    status: STATUS_INICIAL,
  });
}

/** RF02 — listar pedidos. */
function listar() {
  return pedidoRepository.listarTodos();
}

/** RF03 — consultar pedido pelo id. Lança 404 se não existir. */
function buscarPorId(id) {
  const idNumerico = converterId(id);
  const pedido = idNumerico === null ? null : pedidoRepository.buscarPorId(idNumerico);

  if (!pedido) {
    throw new NaoEncontradoError(`Pedido com id ${id} não encontrado`);
  }
  return pedido;
}

/**
 * RF04 — atualizar o status.
 * Ordem das verificações:
 *   1) o status enviado é um dos status conhecidos?   não → 400
 *   2) o pedido existe?                               não → 404
 *   3) a transição é permitida a partir do atual?     não → 400
 */
function atualizarStatus(id, novoStatus) {
  if (typeof novoStatus !== 'string' || !STATUS.includes(novoStatus)) {
    throw new ValidacaoError(`status deve ser um destes valores: ${STATUS.join(', ')}`);
  }

  const pedido = buscarPorId(id);
  const permitidos = TRANSICOES[pedido.status];

  if (!permitidos.includes(novoStatus)) {
    const opcoes = permitidos.length > 0 ? permitidos.join(', ') : 'nenhum (status final)';
    throw new ValidacaoError(
      `Transição de status inválida: "${pedido.status}" → "${novoStatus}". ` +
        `A partir de "${pedido.status}" é permitido: ${opcoes}`,
    );
  }

  return pedidoRepository.atualizar(pedido.id, { status: novoStatus });
}

module.exports = {
  criar,
  listar,
  buscarPorId,
  atualizarStatus,
  TIPOS,
  PRIORIDADES,
  STATUS,
  TRANSICOES,
};
