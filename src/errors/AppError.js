/**
 * Erros "esperados" da aplicação.
 *
 * São situações causadas por quem chama a API (dados inválidos, pedido que
 * não existe...). Cada erro carrega o código HTTP adequado, e o middleware
 * de erros usa esse código na resposta.
 *
 * Qualquer erro que NÃO seja um AppError é tratado como erro inesperado
 * (bug, falha interna) e vira HTTP 500.
 */
class AppError extends Error {
  constructor(mensagem, statusCode, detalhes) {
    super(mensagem);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.detalhes = detalhes;
  }
}

/** Dados enviados pelo cliente são inválidos → HTTP 400. */
class ValidacaoError extends AppError {
  constructor(mensagem, detalhes) {
    super(mensagem, 400, detalhes);
    this.name = 'ValidacaoError';
  }
}

/** O recurso pedido não existe → HTTP 404. */
class NaoEncontradoError extends AppError {
  constructor(mensagem) {
    super(mensagem, 404);
    this.name = 'NaoEncontradoError';
  }
}

module.exports = { AppError, ValidacaoError, NaoEncontradoError };
