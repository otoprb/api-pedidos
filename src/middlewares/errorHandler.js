/**
 * Middlewares de erro.
 *
 * rotaNaoEncontrada: responde 404 para qualquer caminho que não exista.
 * tratarErros: ponto ÚNICO onde erros viram resposta HTTP.
 *   - AppError (erro esperado)      → usa o statusCode do erro (400, 404...)
 *   - JSON malformado no corpo      → 400
 *   - qualquer outro erro           → 500, sem expor detalhes internos
 */
const { AppError } = require('../errors/AppError');

function rotaNaoEncontrada(req, res) {
  res.status(404).json({ erro: `Rota ${req.method} ${req.originalUrl} não encontrada` });
}

// O Express reconhece um middleware de erro pelos 4 parâmetros (err, req, res, next).
// eslint-disable-next-line no-unused-vars
function tratarErros(err, req, res, next) {
  // 1) Erros previstos da aplicação: validação (400), não encontrado (404)...
  if (err instanceof AppError) {
    const corpo = { erro: err.message };
    if (err.detalhes) {
      corpo.detalhes = err.detalhes;
    }
    return res.status(err.statusCode).json(corpo);
  }

  // 2) O cliente mandou um JSON com erro de sintaxe (ex.: vírgula sobrando).
  //    Quem detecta é o express.json(), antes de chegar no controller.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição' });
  }

  // 3) Erro inesperado (bug, falha interna). Não é culpa do usuário, então
  //    NÃO é tratado como validação: vira 500. O detalhe vai só para o log.
  console.error('Erro inesperado:', err);
  return res.status(500).json({ erro: 'Erro interno do servidor' });
}

module.exports = { rotaNaoEncontrada, tratarErros };
