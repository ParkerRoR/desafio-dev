const request = require('supertest');
const app = require('../server');
const db = require('../database/db');
const fs = require('fs');
const path = require('path');

describe('CNAB API', () => {
  beforeEach((done) => {
    db.run('DELETE FROM transacoes_cnab WHERE dono_loja LIKE "Test%"', done);
  });

  afterAll((done) => {
    db.run('DELETE FROM transacoes_cnab WHERE dono_loja LIKE "Test%"', () => {
      db.close(done);
    });
  });

  describe('POST /api/cnab/upload', () => {
    test('deve processar arquivo CNAB válido', async () => {
      const cnabContent = '3201903010000014200096206760174753****1313172712MARCOS PEREIRAMERCADO DA AVENIDA\n';
      const tempFile = path.join(__dirname, 'temp_cnab.txt');
      fs.writeFileSync(tempFile, cnabContent);

      const response = await request(app)
        .post('/api/cnab/upload')
        .attach('arquivo', tempFile)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Arquivo processado com sucesso');
      expect(response.body).toHaveProperty('total_linhas', 1);
      expect(response.body).toHaveProperty('transacoes_inseridas', 1);

      fs.unlinkSync(tempFile);
    });

    test('deve retornar erro para arquivo vazio', async () => {
      const tempFile = path.join(__dirname, 'temp_empty.txt');
      fs.writeFileSync(tempFile, '');

      const response = await request(app)
        .post('/api/cnab/upload')
        .attach('arquivo', tempFile)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Nenhuma transação válida encontrada');

      fs.unlinkSync(tempFile);
    });

    test('deve retornar erro quando nenhum arquivo é enviado', async () => {
      const response = await request(app)
        .post('/api/cnab/upload')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Nenhum arquivo enviado');
    });

    test('deve processar múltiplas transações', async () => {
      const cnabContent = `3201903010000014200096206760174753****1313172712MARCOS PEREIRAMERCADO DA AVENIDA
1201903010000013200556418150633123****7687145607Test Owner   Test Store     
4201903010000012300445566778899001****1234567890Test Owner 2 Test Store 2   `;
      
      const tempFile = path.join(__dirname, 'temp_multi_cnab.txt');
      fs.writeFileSync(tempFile, cnabContent);

      const response = await request(app)
        .post('/api/cnab/upload')
        .attach('arquivo', tempFile)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Arquivo processado com sucesso');
      expect(response.body).toHaveProperty('total_linhas', 3);
      expect(response.body).toHaveProperty('transacoes_inseridas', 3);

      fs.unlinkSync(tempFile);
    });
  });

  describe('GET /api/cnab/transacoes', () => {
    beforeEach(async () => {
      const cnabContent = '1201903010000013200556418150633123****7687145607Test Owner   Test Store     \n';
      const tempFile = path.join(__dirname, 'temp_setup_cnab.txt');
      fs.writeFileSync(tempFile, cnabContent);

      await request(app)
        .post('/api/cnab/upload')
        .attach('arquivo', tempFile);

      fs.unlinkSync(tempFile);
    });

    test('deve retornar lista de transações', async () => {
      const response = await request(app)
        .get('/api/cnab/transacoes')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('deve filtrar transações por loja', async () => {
      const response = await request(app)
        .get('/api/cnab/transacoes?loja=Test Store')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach(transacao => {
        expect(transacao.nome_loja).toContain('Test Store');
      });
    });
  });

  describe('GET /api/cnab/relatorio-lojas', () => {
    beforeEach(async () => {
      const cnabContent = `1201903010000013200556418150633123****7687145607Test Owner   Test Store     
2201903010000010000556418150633123****7687145607Test Owner   Test Store     `;
      
      const tempFile = path.join(__dirname, 'temp_report_cnab.txt');
      fs.writeFileSync(tempFile, cnabContent);

      await request(app)
        .post('/api/cnab/upload')
        .attach('arquivo', tempFile);

      fs.unlinkSync(tempFile);
    });

    test('deve retornar relatório por lojas', async () => {
      const response = await request(app)
        .get('/api/cnab/relatorio-lojas')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const testStore = response.body.find(loja => loja.nome_loja.includes('Test Store'));
      expect(testStore).toBeDefined();
      expect(testStore).toHaveProperty('total_transacoes');
      expect(testStore).toHaveProperty('saldo_conta');
    });

    test('deve calcular saldo corretamente', async () => {
      const response = await request(app)
        .get('/api/cnab/relatorio-lojas')
        .expect(200);

      const testStore = response.body.find(loja => loja.nome_loja.includes('Test Store'));
      expect(testStore.saldo_conta).toBe(32.00);
    });
  });

  describe('Parsing CNAB', () => {
    test('deve parsear linha CNAB corretamente', async () => {
      const cnabContent = '3201903010000014200096206760174753****1313172712MARCOS PEREIRAMERCADO DA AVENIDA\n';
      const tempFile = path.join(__dirname, 'temp_parse_cnab.txt');
      fs.writeFileSync(tempFile, cnabContent);

      await request(app)
        .post('/api/cnab/upload')
        .attach('arquivo', tempFile);

      const response = await request(app)
        .get('/api/cnab/transacoes?loja=MERCADO DA AVENIDA')
        .expect(200);

      expect(response.body.length).toBe(1);
      const transacao = response.body[0];
      
      expect(transacao.tipo).toBe(3);
      expect(transacao.data).toBe('20190301');
      expect(transacao.valor).toBe(142.00);
      expect(transacao.cpf).toBe('09620676017');
      expect(transacao.cartao).toBe('4753****1313');
      expect(transacao.hora).toBe('172712');
      expect(transacao.dono_loja).toBe('MARCOS PEREIRA');
      expect(transacao.nome_loja).toBe('MERCADO DA AVENIDA');
      expect(transacao.natureza).toBe('Saída');
      expect(transacao.sinal).toBe('-');

      fs.unlinkSync(tempFile);
    });

    test('deve classificar tipos de transação corretamente', async () => {
      const cnabContent = `1201903010000010000556418150633123****7687145607Test Owner   Test Store     
2201903010000020000556418150633123****7687145607Test Owner   Test Store     
3201903010000030000556418150633123****7687145607Test Owner   Test Store     
4201903010000040000556418150633123****7687145607Test Owner   Test Store     
5201903010000050000556418150633123****7687145607Test Owner   Test Store     
6201903010000060000556418150633123****7687145607Test Owner   Test Store     
7201903010000070000556418150633123****7687145607Test Owner   Test Store     
8201903010000080000556418150633123****7687145607Test Owner   Test Store     
9201903010000090000556418150633123****7687145607Test Owner   Test Store     `;
      
      const tempFile = path.join(__dirname, 'temp_types_cnab.txt');
      fs.writeFileSync(tempFile, cnabContent);

      await request(app)
        .post('/api/cnab/upload')
        .attach('arquivo', tempFile);

      const response = await request(app)
        .get('/api/cnab/transacoes?loja=Test Store')
        .expect(200);

      expect(response.body.length).toBe(9);

      const entradas = response.body.filter(t => t.natureza === 'Entrada');
      const saidas = response.body.filter(t => t.natureza === 'Saída');

      expect(entradas.length).toBe(6);
      expect(saidas.length).toBe(3);

      fs.unlinkSync(tempFile);
    });
  });
});
