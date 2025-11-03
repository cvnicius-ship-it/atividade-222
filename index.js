// server.js
// Servidor HTTP simples em Node.js que serve um formulário e processa dados.
// Para rodar: node server.js
const http = require('http');
const url = require('url');
const querystring = require('querystring');

const PORT = 3000;

// Armazenamento em memória (simples, não persistente)
const products = [];

// ========== Helpers ==========
function sendHTML(res, html, status = 200) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderForm(errors = {}, values = {}) {
  // Uma página de formulário humanizada e com placeholders
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Cadastro de Produto — Meu Servidor</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <style>
    body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; background:#f6f8fa; color:#111; padding:24px; }
    .card { background:white; border-radius:10px; box-shadow:0 6px 18px rgba(0,0,0,0.08); padding:20px; max-width:760px; margin:20px auto; }
    h1{ margin-top:0 }
    label{ display:block; margin:12px 0 6px; font-weight:600 }
    input[type="text"], input[type="number"], input[type="email"], input[type="date"], textarea, select {
      width:100%; padding:10px; border:1px solid #ddd; border-radius:6px; box-sizing:border-box;
    }
    .row { display:flex; gap:12px; }
    .col { flex:1; }
    .small { max-width:200px; }
    .btn { background:#0b7cff; color:white; padding:10px 14px; border-radius:8px; border:none; cursor:pointer; font-weight:600; }
    .error { color:#b00020; font-size:0.9em; margin-top:6px; }
    .note { color:#555; font-size:0.9em; margin-top:6px; }
    footer { text-align:center; margin-top:18px; color:#666; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Cadastro de Produto</h1>
    <p class="note">Use esse formulário para registrar produtos no sistema. Campos com * são obrigatórios.</p>

    <form method="POST" action="/submit" autocomplete="off">
      <label>Nome do produto *</label>
      <input name="name" type="text" placeholder="Ex: Sabonete Hidratante 200ml" value="${escapeHtml(values.name || '')}" required />
      ${errors.name ? `<div class="error">${escapeHtml(errors.name)}</div>` : ''}

      <div class="row">
        <div class="col">
          <label>Categoria *</label>
          <select name="category" required>
            <option value="">— selecione —</option>
            <option value="higiene" ${values.category === 'higiene' ? 'selected' : ''}>Higiene</option>
            <option value="alimento" ${values.category === 'alimento' ? 'selected' : ''}>Alimento</option>
            <option value="limpeza" ${values.category === 'limpeza' ? 'selected' : ''}>Limpeza</option>
            <option value="farmacia" ${values.category === 'farmacia' ? 'selected' : ''}>Farmácia</option>
            <option value="outro" ${values.category === 'outro' ? 'selected' : ''}>Outro</option>
          </select>
          ${errors.category ? `<div class="error">${escapeHtml(errors.category)}</div>` : ''}
        </div>

        <div class="col small">
          <label>Quantidade em estoque *</label>
          <input name="quantity" type="number" min="0" step="1" value="${escapeHtml(values.quantity || '')}" required />
          ${errors.quantity ? `<div class="error">${escapeHtml(errors.quantity)}</div>` : ''}
        </div>

        <div class="col small">
          <label>Preço (R$) *</label>
          <input name="price" type="text" placeholder="Ex: 12.90" value="${escapeHtml(values.price || '')}" required />
          ${errors.price ? `<div class="error">${escapeHtml(errors.price)}</div>` : ''}
        </div>
      </div>

      <label>Data de validade</label>
      <input name="expiry" type="date" value="${escapeHtml(values.expiry || '')}" />
      ${errors.expiry ? `<div class="error">${escapeHtml(errors.expiry)}</div>` : ''}

      <label>Fornecedor (e-mail)</label>
      <input name="supplierEmail" type="email" placeholder="fornecedor@exemplo.com" value="${escapeHtml(values.supplierEmail || '')}" />
      ${errors.supplierEmail ? `<div class="error">${escapeHtml(errors.supplierEmail)}</div>` : ''}

      <label>Descrição</label>
      <textarea name="description" rows="4" placeholder="Detalhes adicionais, características, observações...">${escapeHtml(values.description || '')}</textarea>

      <label style="margin-top:12px;">
        <input type="checkbox" name="promotion" value="yes" ${values.promotion ? 'checked' : ''} /> Marcar como em promoção
      </label>

      <div style="margin-top:14px;">
        <button class="btn" type="submit">Cadastrar produto</button>
        <a href="/products" style="margin-left:12px; color:#0b7cff; text-decoration:none;">Ver todos os produtos</a>
      </div>
    </form>

    <footer>
      <small>Servidor simples — dados ficam apenas na memória (reinicie para limpar). Feito com carinho ❤️</small>
    </footer>
  </div>
</body>
</html>`;
}

function renderProductsList() {
  const rows = products.map((p, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.category)}</td>
      <td>${p.quantity}</td>
      <td>R$ ${Number(p.price).toFixed(2)}</td>
      <td>${p.expiry || '-'}</td>
      <td>${p.supplierEmail || '-'}</td>
      <td>${p.promotion ? 'Sim' : 'Não'}</td>
    </tr>`).join('\n');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Produtos cadastrados</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  body{ font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial; padding:20px; background:#f6f8fa }
  .card{ background:white; padding:18px; border-radius:10px; max-width:1000px; margin:18px auto; box-shadow:0 8px 20px rgba(0,0,0,0.06) }
  table{ width:100%; border-collapse:collapse; }
  th, td{ padding:10px 8px; border-bottom:1px solid #eee; text-align:left; font-size:14px }
  th{ background:#fafafa; font-weight:700 }
  a{ color:#0b7cff; text-decoration:none }
</style>
</head>
<body>
  <div class="card">
    <h1>Produtos cadastrados</h1>
    <p>Quantidade total: <strong>${products.length}</strong></p>

    <table>
      <thead>
        <tr><th>#</th><th>Nome</th><th>Categoria</th><th>Qtd</th><th>Preço</th><th>Validade</th><th>Fornecedor</th><th>Promoção</th></tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="8" style="text-align:center; padding:18px;">Nenhum produto cadastrado ainda.</td></tr>'}
      </tbody>
    </table>

    <p style="margin-top:14px;"><a href="/">Voltar ao formulário</a></p>
  </div>
</body>
</html>`;
}

// ========== Server ==========
const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  if (req.method === 'GET' && pathname === '/') {
    // Serve o formulário
    sendHTML(res, renderForm());
    return;
  }

  if (req.method === 'GET' && pathname === '/products') {
    sendHTML(res, renderProductsList());
    return;
  }

  if (req.method === 'POST' && pathname === '/submit') {
    // Recebe body (urlencoded)
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString('utf8');

      // segurança simples: limitar o tamanho do body
      if (body.length > 1e6) {
        // muito grande
        res.writeHead(413, { 'Content-Type': 'text/plain' });
        res.end('Payload muito grande');
        req.connection.destroy();
      }
    });

    req.on('end', () => {
      const data = querystring.parse(body);
      // Validações simples e humanizadas
      const errors = {};
      const clean = {};

      // Nome
      if (!data.name || !data.name.trim()) {
        errors.name = 'O nome do produto é obrigatório.';
      } else {
        clean.name = data.name.trim();
      }

      // Categoria
      if (!data.category || data.category.trim() === '') {
        errors.category = 'Selecione uma categoria.';
      } else {
        clean.category = data.category;
      }

      // Quantity
      const q = Number(data.quantity);
      if (!data.quantity || isNaN(q) || !Number.isInteger(q) || q < 0) {
        errors.quantity = 'Informe uma quantidade válida (número inteiro >= 0).';
      } else {
        clean.quantity = q;
      }

      // Price (aceitar vírgula ou ponto)
      const priceRaw = (data.price || '').replace(',', '.').trim();
      const priceNum = Number(priceRaw);
      if (!priceRaw || isNaN(priceNum) || priceNum < 0) {
        errors.price = 'Informe um preço válido (ex: 12.90).';
      } else {
        clean.price = priceNum;
      }

      // expiry (opcional) - verificar formato YYYY-MM-DD simples
      if (data.expiry && !/^\d{4}-\d{2}-\d{2}$/.test(data.expiry)) {
        errors.expiry = 'Formato de data inválido.';
      } else {
        clean.expiry = data.expiry || '';
      }

      // supplierEmail (opcional) - validação simples
      if (data.supplierEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.supplierEmail)) {
        errors.supplierEmail = 'E-mail do fornecedor inválido.';
      } else {
        clean.supplierEmail = data.supplierEmail || '';
      }

      clean.description = data.description ? data.description.trim() : '';
      clean.promotion = data.promotion === 'yes';

      if (Object.keys(errors).length > 0) {
        // Re-exibir o formulário com valores preenchidos e erros
        sendHTML(res, renderForm(errors, Object.assign({}, data)));
        return;
      }

      // Tudo ok -> salva
      products.push({
        name: clean.name,
        category: clean.category,
        quantity: clean.quantity,
        price: clean.price,
        expiry: clean.expiry,
        supplierEmail: clean.supplierEmail,
        description: clean.description,
        promotion: clean.promotion,
        createdAt: new Date().toISOString()
      });

      // Exibir página de confirmação
      const last = products[products.length - 1];
      sendHTML(res, `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Produto cadastrado</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{ font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial; padding:22px; background:#f6f8fa }
  .card{ background:white; padding:18px; border-radius:10px; max-width:720px; margin:24px auto; box-shadow:0 8px 20px rgba(0,0,0,0.06) }
  .btn{ display:inline-block; margin-top:12px; padding:8px 12px; background:#0b7cff; color:white; border-radius:8px; text-decoration:none }
  dl{ margin:10px 0; }
  dt{ font-weight:700; margin-top:8px }
  dd{ margin:0 0 6px 0 }
</style>
</head>
<body>
  <div class="card">
    <h1>Produto cadastrado com sucesso 🎉</h1>
    <p>Aqui estão os dados que recebemos:</p>

    <dl>
      <dt>Nome</dt><dd>${escapeHtml(last.name)}</dd>
      <dt>Categoria</dt><dd>${escapeHtml(last.category)}</dd>
      <dt>Quantidade</dt><dd>${last.quantity}</dd>
      <dt>Preço</dt><dd>R$ ${last.price.toFixed(2)}</dd>
      <dt>Validade</dt><dd>${last.expiry || '-'}</dd>
      <dt>Fornecedor</dt><dd>${escapeHtml(last.supplierEmail || '-')}</dd>
      <dt>Promoção</dt><dd>${last.promotion ? 'Sim' : 'Não'}</dd>
      <dt>Descrição</dt><dd>${escapeHtml(last.description || '-')}</dd>
    </dl>

    <a class="btn" href="/">Cadastrar outro</a>
    <a style="margin-left:12px; color:#0b7cff" href="/products">Ver todos os produtos</a>
  </div>
</body>
</html>`);
    });

    return;
  }

  // Not found
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Página não encontrada');
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT} — pressione Ctrl+C para parar`);
});
