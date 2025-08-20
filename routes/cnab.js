const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const db = require('../database/db');

const upload = multer({ dest: 'uploads/' });

const tiposTransacao = {
  1: { descricao: 'Débito', natureza: 'Entrada', sinal: '+' },
  2: { descricao: 'Boleto', natureza: 'Saída', sinal: '-' },
  3: { descricao: 'Financiamento', natureza: 'Saída', sinal: '-' },
  4: { descricao: 'Crédito', natureza: 'Entrada', sinal: '+' },
  5: { descricao: 'Recebimento Empréstimo', natureza: 'Entrada', sinal: '+' },
  6: { descricao: 'Vendas', natureza: 'Entrada', sinal: '+' },
  7: { descricao: 'Recebimento TED', natureza: 'Entrada', sinal: '+' },
  8: { descricao: 'Recebimento DOC', natureza: 'Entrada', sinal: '+' },
  9: { descricao: 'Aluguel', natureza: 'Saída', sinal: '-' }
};

function parsearLinhaCNAB(linha) {
  if (linha.length < 81) return null;

  const tipo = parseInt(linha.substring(0, 1));
  const data = linha.substring(1, 9);
  const valor = parseFloat(linha.substring(9, 19)) / 100.00;
  const cpf = linha.substring(19, 30);
  const cartao = linha.substring(30, 42);
  const hora = linha.substring(42, 48);
  const donoLoja = linha.substring(48, 62).trim();
  const nomeLoja = linha.substring(62, 81).trim();

  const tipoInfo = tiposTransacao[tipo];
  if (!tipoInfo) return null;

  return {
    tipo,
    data,
    valor,
    cpf,
    cartao,
    hora,
    dono_loja: donoLoja,
    nome_loja: nomeLoja,
    natureza: tipoInfo.natureza,
    sinal: tipoInfo.sinal
  };
}

router.post('/upload', upload.single('arquivo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  const conteudo = fs.readFileSync(req.file.path, 'utf8');
  const linhas = conteudo.split('\n').filter(linha => linha.trim());
  
  const transacoes = [];
  const erros = [];

  linhas.forEach((linha, index) => {
    const transacao = parsearLinhaCNAB(linha);
    if (transacao) {
      transacoes.push(transacao);
    } else if (linha.trim()) {
      erros.push(`Linha ${index + 1}: formato inválido`);
    }
  });

  if (transacoes.length === 0) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Nenhuma transação válida encontrada', erros });
  }

  const stmt = db.prepare(`INSERT INTO transacoes_cnab 
    (tipo, data, valor, cpf, cartao, hora, dono_loja, nome_loja, natureza, sinal) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  let inseridas = 0;
  transacoes.forEach(t => {
    stmt.run([t.tipo, t.data, t.valor, t.cpf, t.cartao, t.hora, t.dono_loja, t.nome_loja, t.natureza, t.sinal], (err) => {
      if (!err) inseridas++;
    });
  });

  stmt.finalize(() => {
    fs.unlinkSync(req.file.path);
    res.json({
      message: 'Arquivo processado com sucesso',
      total_linhas: linhas.length,
      transacoes_inseridas: inseridas,
      erros: erros.length > 0 ? erros : undefined
    });
  });
});

router.get('/transacoes', (req, res) => {
  const { loja } = req.query;
  let sql = 'SELECT * FROM transacoes_cnab';
  const params = [];

  if (loja) {
    sql += ' WHERE nome_loja LIKE ?';
    params.push(`%${loja}%`);
  }

  sql += ' ORDER BY data DESC, hora DESC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

router.get('/relatorio-lojas', (req, res) => {
  const sql = `
    SELECT 
      nome_loja,
      dono_loja,
      COUNT(*) as total_transacoes,
      SUM(CASE WHEN sinal = '+' THEN valor ELSE -valor END) as saldo_conta
    FROM transacoes_cnab 
    GROUP BY nome_loja, dono_loja
    ORDER BY nome_loja
  `;

  db.all(sql, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

module.exports = router;
