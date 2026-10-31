/**
 * Camada de dados (Repository).
 *
 * É a ÚNICA parte do código que sabe COMO os pedidos são guardados.
 * Hoje é um array em memória; se um dia usarmos um banco de dados,
 * só este arquivo precisa mudar — o service continua igual.
 *
 * Atenção: dados em memória são perdidos quando o servidor reinicia.
 *
 * As funções devolvem CÓPIAS dos objetos ({ ...pedido }), para que quem
 * recebe o pedido não consiga alterar o que está guardado sem passar
 * pelas regras do service.
 */
let pedidos = [];
let proximoId = 1;

function salvar(dados) {
  const pedido = { id: proximoId, ...dados };
  proximoId += 1;
  pedidos.push(pedido);
  return { ...pedido };
}

function listarTodos() {
  return pedidos.map((pedido) => ({ ...pedido }));
}

function buscarPorId(id) {
  const pedido = pedidos.find((p) => p.id === id);
  return pedido ? { ...pedido } : null;
}

function atualizar(id, alteracoes) {
  const pedido = pedidos.find((p) => p.id === id);
  if (!pedido) {
    return null;
  }
  Object.assign(pedido, alteracoes);
  return { ...pedido };
}

/** Usado só nos testes: começa cada teste com a "base" vazia e o id em 1. */
function limpar() {
  pedidos = [];
  proximoId = 1;
}

module.exports = { salvar, listarTodos, buscarPorId, atualizar, limpar };
