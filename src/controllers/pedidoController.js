/**
 * Camada HTTP (Controller).
 *
 * Traduz a requisição HTTP em uma chamada ao service e o resultado do
 * service em uma resposta HTTP (código + JSON). Não tem regra de negócio.
 *
 * Se o service lançar um erro, o Express o encaminha automaticamente para
 * o middleware de erros (src/middlewares/errorHandler.js), que monta a
 * resposta 400, 404 ou 500. Por isso não há try/catch aqui.
 */
const pedidoService = require('../services/pedidoService');

// POST /pedidos
function criar(req, res) {
  const pedido = pedidoService.criar(req.body);
  res.status(201).location(`/pedidos/${pedido.id}`).json(pedido);
}

// GET /pedidos
function listar(req, res) {
  const pedidos = pedidoService.listar();
  res.status(200).json(pedidos);
}

// GET /pedidos/:id
function buscarPorId(req, res) {
  const pedido = pedidoService.buscarPorId(req.params.id);
  res.status(200).json(pedido);
}

// PATCH /pedidos/:id/status   corpo: { "status": "..." }
function atualizarStatus(req, res) {
  // req.body pode ser undefined se nenhum JSON foi enviado; o "?." evita erro.
  const pedido = pedidoService.atualizarStatus(req.params.id, req.body?.status);
  res.status(200).json(pedido);
}

module.exports = { criar, listar, buscarPorId, atualizarStatus };
