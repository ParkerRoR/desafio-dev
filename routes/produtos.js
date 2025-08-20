const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', (req, res) => {
  const { categoria, busca } = req.query;
  let sql = 'SELECT * FROM produtos WHERE 1=1';
  const params = [];

  if (categoria) {
    sql += ' AND categoria = ?';
    params.push(categoria);
  }

  if (busca) {
    sql += ' AND (nome LIKE ? OR descricao LIKE ? OR codigo_barras LIKE ?)';
    params.push(`%${busca}%`, `%${busca}%`, `%${busca}%`);
  }

  sql += ' ORDER BY nome';

  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM produtos WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }
    res.json(row);
  });
});

router.post('/', (req, res) => {
  const { nome, categoria, preco, estoque, codigo_barras, descricao } = req.body;

  if (!nome || !categoria || preco === undefined) {
    res.status(400).json({ error: 'Nome, categoria e preço são obrigatórios' });
    return;
  }

  const sql = `INSERT INTO produtos (nome, categoria, preco, estoque, codigo_barras, descricao) 
               VALUES (?, ?, ?, ?, ?, ?)`;
  
  db.run(sql, [nome, categoria, preco, estoque || 0, codigo_barras, descricao], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Código de barras já existe' });
      } else {
        res.status(500).json({ error: err.message });
      }
      return;
    }
    res.status(201).json({ 
      id: this.lastID,
      message: 'Produto criado com sucesso'
    });
  });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nome, categoria, preco, estoque, codigo_barras, descricao } = req.body;

  if (!nome || !categoria || preco === undefined) {
    res.status(400).json({ error: 'Nome, categoria e preço são obrigatórios' });
    return;
  }

  const sql = `UPDATE produtos 
               SET nome = ?, categoria = ?, preco = ?, estoque = ?, 
                   codigo_barras = ?, descricao = ?, data_atualizacao = CURRENT_TIMESTAMP
               WHERE id = ?`;
  
  db.run(sql, [nome, categoria, preco, estoque || 0, codigo_barras, descricao, id], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        res.status(400).json({ error: 'Código de barras já existe' });
      } else {
        res.status(500).json({ error: err.message });
      }
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }
    res.json({ message: 'Produto atualizado com sucesso' });
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM produtos WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }
    res.json({ message: 'Produto excluído com sucesso' });
  });
});

router.get('/categorias/lista', (req, res) => {
  db.all('SELECT DISTINCT categoria FROM produtos ORDER BY categoria', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows.map(row => row.categoria));
  });
});

module.exports = router;
