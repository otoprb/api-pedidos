/**
 * Monta a aplicação Express: middlewares, rotas e tratamento de erros.
 *
 * O app é exportado SEM chamar listen(). Assim os testes (supertest)
 * conseguem usar a API sem abrir uma porta de verdade.
 * Quem sobe o servidor é o src/server.js.
 */
const express = require('express');
const pedidoRoutes = require('./routes/pedidoRoutes');
const { rotaNaoEncontrada, tratarErros } = require('./middlewares/errorHandler');

const app = express();

// Converte o corpo JSON da requisição em objeto (req.body).
app.use(express.json());

// Rota simples para conferir se a API está no ar.
app.get('/', (req, res) => {
  res.json({ api: 'Gerenciamento de Pedidos', status: 'online' });
});

app.use('/pedidos', pedidoRoutes);

// A ordem importa: estes dois ficam DEPOIS das rotas.
app.use(rotaNaoEncontrada);
app.use(tratarErros);

module.exports = app;
