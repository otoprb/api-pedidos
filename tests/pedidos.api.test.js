/**
 * Testes de integração: fazem requisições HTTP de verdade contra o app
 * (com supertest) e passam por todas as camadas: rota → controller →
 * service → repository → middleware de erros.
 */
const request = require('supertest');
const app = require('../src/app');
const pedidoRepository = require('../src/repositories/pedidoRepository');
const pedidoService = require('../src/services/pedidoService');

const pedidoValido = {
  cliente: 'Carlos Silva',
  tipo: 'entrega',
  valor: 350,
  prioridade: 'normal',
};

// Cria um pedido válido pela API e devolve o corpo da resposta.
async function criarPedido(dados = pedidoValido) {
  const resposta = await request(app).post('/pedidos').send(dados);
  return resposta.body;
}

beforeEach(() => {
  pedidoRepository.limpar();
});

describe('POST /pedidos', () => {
  test('cria pedido válido e responde 201 com status "recebido"', async () => {
    const resposta = await request(app).post('/pedidos').send(pedidoValido);

    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual({
      id: 1,
      cliente: 'Carlos Silva',
      tipo: 'entrega',
      valor: 350,
      prioridade: 'normal',
      status: 'recebido',
    });
    expect(resposta.headers.location).toBe('/pedidos/1');
  });

  test('gera ids sequenciais', async () => {
    const primeiro = await criarPedido();
    const segundo = await criarPedido();
    expect(primeiro.id).toBe(1);
    expect(segundo.id).toBe(2);
  });

  test('remove espaços nas extremidades do nome do cliente', async () => {
    const pedido = await criarPedido({ ...pedidoValido, cliente: '   Ana Souza  ' });
    expect(pedido.cliente).toBe('Ana Souza');
  });

  test('ignora status e id enviados pelo cliente', async () => {
    const pedido = await criarPedido({ ...pedidoValido, id: 99, status: 'entregue' });
    expect(pedido.id).toBe(1);
    expect(pedido.status).toBe('recebido');
  });

  test.each([
    ['cliente ausente', { ...pedidoValido, cliente: undefined }],
    ['cliente vazio', { ...pedidoValido, cliente: '' }],
    ['cliente só com espaços', { ...pedidoValido, cliente: '    ' }],
    ['cliente que não é texto', { ...pedidoValido, cliente: 123 }],
    ['valor ausente', { ...pedidoValido, valor: undefined }],
    ['valor zero', { ...pedidoValido, valor: 0 }],
    ['valor negativo', { ...pedidoValido, valor: -10 }],
    ['valor como texto', { ...pedidoValido, valor: '350' }],
    ['valor booleano', { ...pedidoValido, valor: true }],
    ['tipo desconhecido', { ...pedidoValido, tipo: 'drone' }],
    ['tipo ausente', { ...pedidoValido, tipo: undefined }],
    ['tipo com letra maiúscula', { ...pedidoValido, tipo: 'Entrega' }],
    ['prioridade desconhecida', { ...pedidoValido, prioridade: 'urgentissima' }],
    ['prioridade ausente', { ...pedidoValido, prioridade: undefined }],
  ])('responde 400 com %s', async (_descricao, dados) => {
    const resposta = await request(app).post('/pedidos').send(dados);

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toBe('Dados do pedido inválidos');
    expect(resposta.body.detalhes).toHaveLength(1);
  });

  test('lista todos os problemas de uma vez quando há vários', async () => {
    const resposta = await request(app).post('/pedidos').send({});

    expect(resposta.status).toBe(400);
    expect(resposta.body.detalhes).toHaveLength(4);
  });

  test('não cadastra nada quando os dados são inválidos', async () => {
    await request(app).post('/pedidos').send({ ...pedidoValido, valor: -1 });
    const lista = await request(app).get('/pedidos');
    expect(lista.body).toEqual([]);
  });

  test('responde 400 quando nenhum corpo é enviado', async () => {
    const resposta = await request(app).post('/pedidos');
    expect(resposta.status).toBe(400);
    expect(resposta.body).toHaveProperty('erro');
  });

  test('responde 400 quando o corpo é uma lista', async () => {
    const resposta = await request(app).post('/pedidos').send([pedidoValido]);
    expect(resposta.status).toBe(400);
  });

  test('responde 400 com JSON malformado', async () => {
    const resposta = await request(app)
      .post('/pedidos')
      .set('Content-Type', 'application/json')
      .send('{"cliente": "Carlos",}');

    expect(resposta.status).toBe(400);
    expect(resposta.body).toEqual({ erro: 'JSON inválido no corpo da requisição' });
  });
});

describe('GET /pedidos', () => {
  test('responde 200 com lista vazia quando não há pedidos', async () => {
    const resposta = await request(app).get('/pedidos');
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual([]);
  });

  test('responde 200 com todos os pedidos cadastrados', async () => {
    await criarPedido();
    await criarPedido({ ...pedidoValido, cliente: 'Maria', tipo: 'retirada', prioridade: 'alta' });

    const resposta = await request(app).get('/pedidos');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveLength(2);
    expect(resposta.body[1]).toMatchObject({ id: 2, cliente: 'Maria', tipo: 'retirada' });
  });
});

describe('GET /pedidos/:id', () => {
  test('responde 200 com o pedido existente', async () => {
    await criarPedido();
    const resposta = await request(app).get('/pedidos/1');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ id: 1, cliente: 'Carlos Silva' });
  });

  test.each(['999', 'abc', '0', '-1', '1.5'])('responde 404 para o id "%s"', async (id) => {
    await criarPedido();
    const resposta = await request(app).get(`/pedidos/${id}`);

    expect(resposta.status).toBe(404);
    expect(resposta.body.erro).toMatch(/não encontrado/);
  });
});

describe('PATCH /pedidos/:id/status', () => {
  test('atualiza para um status permitido e responde 200', async () => {
    await criarPedido();
    const resposta = await request(app)
      .patch('/pedidos/1/status')
      .send({ status: 'em_preparacao' });

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({ id: 1, status: 'em_preparacao' });
  });

  test('a alteração fica salva (aparece na consulta seguinte)', async () => {
    await criarPedido();
    await request(app).patch('/pedidos/1/status').send({ status: 'cancelado' });

    const consulta = await request(app).get('/pedidos/1');
    expect(consulta.body.status).toBe('cancelado');
  });

  test('percorre o fluxo completo até "entregue"', async () => {
    await criarPedido();
    for (const status of ['em_preparacao', 'enviado', 'entregue']) {
      const resposta = await request(app).patch('/pedidos/1/status').send({ status });
      expect(resposta.status).toBe(200);
      expect(resposta.body.status).toBe(status);
    }
  });

  test.each([
    ['status desconhecido', { status: 'perdido' }],
    ['status ausente', {}],
    ['status que não é texto', { status: 1 }],
  ])('responde 400 com %s', async (_descricao, corpo) => {
    await criarPedido();
    const resposta = await request(app).patch('/pedidos/1/status').send(corpo);

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/status deve ser um destes valores/);
  });

  test('responde 400 quando nenhum corpo é enviado', async () => {
    await criarPedido();
    const resposta = await request(app).patch('/pedidos/1/status');
    expect(resposta.status).toBe(400);
  });

  test('responde 400 para transição não permitida (recebido → entregue)', async () => {
    await criarPedido();
    const resposta = await request(app).patch('/pedidos/1/status').send({ status: 'entregue' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/Transição de status inválida/);

    // o status não pode ter mudado
    const consulta = await request(app).get('/pedidos/1');
    expect(consulta.body.status).toBe('recebido');
  });

  test('responde 400 ao tentar mudar um pedido cancelado', async () => {
    await criarPedido();
    await request(app).patch('/pedidos/1/status').send({ status: 'cancelado' });

    const resposta = await request(app)
      .patch('/pedidos/1/status')
      .send({ status: 'em_preparacao' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toMatch(/nenhum \(status final\)/);
  });

  test('responde 404 para id inexistente', async () => {
    const resposta = await request(app)
      .patch('/pedidos/999/status')
      .send({ status: 'cancelado' });

    expect(resposta.status).toBe(404);
    expect(resposta.body.erro).toMatch(/não encontrado/);
  });
});

describe('Tratamento de erros gerais', () => {
  test('responde 404 em JSON para rota inexistente', async () => {
    const resposta = await request(app).get('/produtos');
    expect(resposta.status).toBe(404);
    expect(resposta.body.erro).toMatch(/Rota GET \/produtos não encontrada/);
  });

  test('erro inesperado vira 500 sem expor detalhes internos', async () => {
    // Simula um bug dentro do service.
    const espiaoService = jest
      .spyOn(pedidoService, 'listar')
      .mockImplementation(() => {
        throw new Error('falha secreta no banco');
      });
    // Silencia o console.error esperado durante este teste.
    const espiaoConsole = jest.spyOn(console, 'error').mockImplementation(() => {});

    const resposta = await request(app).get('/pedidos');

    expect(resposta.status).toBe(500);
    expect(resposta.body).toEqual({ erro: 'Erro interno do servidor' });
    expect(JSON.stringify(resposta.body)).not.toMatch(/falha secreta/);

    espiaoService.mockRestore();
    espiaoConsole.mockRestore();
  });
});
