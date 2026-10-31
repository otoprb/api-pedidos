/**
 * Camada de rotas.
 *
 * Só liga "método HTTP + caminho" à função do controller que atende.
 * Este router é montado em /pedidos no app.js, então '/' aqui = /pedidos.
 */
const { Router } = require('express');
const pedidoController = require('../controllers/pedidoController');

const router = Router();

router.post('/', pedidoController.criar); // RF01
router.get('/', pedidoController.listar); // RF02
router.get('/:id', pedidoController.buscarPorId); // RF03
router.patch('/:id/status', pedidoController.atualizarStatus); // RF04

module.exports = router;
