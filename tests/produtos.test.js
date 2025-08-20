const request = require('supertest');
const app = require('../server');
const db = require('../database/db');

describe('Produtos API', () => {
  beforeEach((done) => {
    db.run('DELETE FROM produtos WHERE nome LIKE "Test%"', done);
  });

  afterAll((done) => {
    db.run('DELETE FROM produtos WHERE nome LIKE "Test%"', () => {
      db.close(done);
    });
  });

  describe('GET /api/produtos', () => {
    test('deve retornar lista de produtos', async () => {
      const response = await request(app)
        .get('/api/produtos')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('deve filtrar produtos por categoria', async () => {
      const response = await request(app)
        .get('/api/produtos?categoria=Grãos')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(produto => {
        expect(produto.categoria).toBe('Grãos');
      });
    });

    test('deve buscar produtos por nome', async () => {
      const response = await request(app)
        .get('/api/produtos?busca=Arroz')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(produto => {
        expect(produto.nome.toLowerCase()).toContain('arroz');
      });
    });
  });

  describe('POST /api/produtos', () => {
    test('deve criar um novo produto', async () => {
      const novoProduto = {
        nome: 'Test Produto',
        categoria: 'Test Categoria',
        preco: 10.50,
        estoque: 100,
        codigo_barras: '1234567890123',
        descricao: 'Produto de teste'
      };

      const response = await request(app)
        .post('/api/produtos')
        .send(novoProduto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('message', 'Produto criado com sucesso');
    });

    test('deve retornar erro para dados obrigatórios ausentes', async () => {
      const produtoIncompleto = {
        nome: 'Test Produto'
      };

      const response = await request(app)
        .post('/api/produtos')
        .send(produtoIncompleto)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('deve retornar erro para código de barras duplicado', async () => {
      const produto1 = {
        nome: 'Test Produto 1',
        categoria: 'Test',
        preco: 10.00,
        codigo_barras: 'DUPLICATE123'
      };

      const produto2 = {
        nome: 'Test Produto 2',
        categoria: 'Test',
        preco: 20.00,
        codigo_barras: 'DUPLICATE123'
      };

      await request(app)
        .post('/api/produtos')
        .send(produto1)
        .expect(201);

      const response = await request(app)
        .post('/api/produtos')
        .send(produto2)
        .expect(400);

      expect(response.body.error).toContain('Código de barras já existe');
    });
  });

  describe('GET /api/produtos/:id', () => {
    test('deve retornar produto específico', async () => {
      const novoProduto = {
        nome: 'Test Produto Específico',
        categoria: 'Test',
        preco: 15.00
      };

      const createResponse = await request(app)
        .post('/api/produtos')
        .send(novoProduto)
        .expect(201);

      const produtoId = createResponse.body.id;

      const response = await request(app)
        .get(`/api/produtos/${produtoId}`)
        .expect(200);

      expect(response.body.id).toBe(produtoId);
      expect(response.body.nome).toBe(novoProduto.nome);
    });

    test('deve retornar 404 para produto inexistente', async () => {
      const response = await request(app)
        .get('/api/produtos/99999')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Produto não encontrado');
    });
  });

  describe('PUT /api/produtos/:id', () => {
    test('deve atualizar produto existente', async () => {
      const novoProduto = {
        nome: 'Test Produto Original',
        categoria: 'Test',
        preco: 10.00
      };

      const createResponse = await request(app)
        .post('/api/produtos')
        .send(novoProduto)
        .expect(201);

      const produtoId = createResponse.body.id;

      const produtoAtualizado = {
        nome: 'Test Produto Atualizado',
        categoria: 'Test Atualizado',
        preco: 20.00,
        estoque: 50
      };

      const response = await request(app)
        .put(`/api/produtos/${produtoId}`)
        .send(produtoAtualizado)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Produto atualizado com sucesso');

      const getResponse = await request(app)
        .get(`/api/produtos/${produtoId}`)
        .expect(200);

      expect(getResponse.body.nome).toBe(produtoAtualizado.nome);
      expect(getResponse.body.preco).toBe(produtoAtualizado.preco);
    });

    test('deve retornar 404 para produto inexistente', async () => {
      const produtoAtualizado = {
        nome: 'Test Produto',
        categoria: 'Test',
        preco: 10.00
      };

      const response = await request(app)
        .put('/api/produtos/99999')
        .send(produtoAtualizado)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Produto não encontrado');
    });
  });

  describe('DELETE /api/produtos/:id', () => {
    test('deve excluir produto existente', async () => {
      const novoProduto = {
        nome: 'Test Produto Para Excluir',
        categoria: 'Test',
        preco: 10.00
      };

      const createResponse = await request(app)
        .post('/api/produtos')
        .send(novoProduto)
        .expect(201);

      const produtoId = createResponse.body.id;

      const response = await request(app)
        .delete(`/api/produtos/${produtoId}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Produto excluído com sucesso');

      await request(app)
        .get(`/api/produtos/${produtoId}`)
        .expect(404);
    });

    test('deve retornar 404 para produto inexistente', async () => {
      const response = await request(app)
        .delete('/api/produtos/99999')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Produto não encontrado');
    });
  });

  describe('GET /api/produtos/categorias/lista', () => {
    test('deve retornar lista de categorias', async () => {
      const response = await request(app)
        .get('/api/produtos/categorias/lista')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });
});
