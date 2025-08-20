const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar com o banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL,
    preco REAL NOT NULL,
    estoque INTEGER NOT NULL DEFAULT 0,
    codigo_barras TEXT UNIQUE,
    descricao TEXT,
    data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS transacoes_cnab (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo INTEGER NOT NULL,
    data TEXT NOT NULL,
    valor REAL NOT NULL,
    cpf TEXT NOT NULL,
    cartao TEXT NOT NULL,
    hora TEXT NOT NULL,
    dono_loja TEXT NOT NULL,
    nome_loja TEXT NOT NULL,
    natureza TEXT NOT NULL,
    sinal TEXT NOT NULL,
    data_importacao DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const produtosIniciais = [
    ['Arroz Branco 5kg', 'Grãos', 15.99, 50, '7891234567890', 'Arroz branco tipo 1, pacote de 5kg'],
    ['Feijão Preto 1kg', 'Grãos', 8.50, 30, '7891234567891', 'Feijão preto selecionado, pacote de 1kg'],
    ['Açúcar Cristal 1kg', 'Açúcar', 4.25, 40, '7891234567892', 'Açúcar cristal refinado, pacote de 1kg'],
    ['Óleo de Soja 900ml', 'Óleos', 6.80, 25, '7891234567893', 'Óleo de soja refinado, garrafa de 900ml'],
    ['Leite Integral 1L', 'Laticínios', 4.50, 60, '7891234567894', 'Leite integral UHT, caixa de 1 litro']
  ];

  const stmt = db.prepare(`INSERT OR IGNORE INTO produtos (nome, categoria, preco, estoque, codigo_barras, descricao) VALUES (?, ?, ?, ?, ?, ?)`);
  
  produtosIniciais.forEach(produto => {
    stmt.run(produto);
  });
  
  stmt.finalize();
});

module.exports = db;
