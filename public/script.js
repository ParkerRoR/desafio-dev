const API_BASE = '/api';

let products = [];
let categories = [];

document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    loadCategories();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('productFormElement').addEventListener('submit', handleProductSubmit);
    document.getElementById('cnabForm').addEventListener('submit', handleCnabSubmit);
    document.getElementById('cnabFile').addEventListener('change', handleFileSelect);
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    if (tabName === 'relatorios') {
        loadStoreReports();
    }
}

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/produtos`);
        products = await response.json();
        renderProductsTable();
    } catch (error) {
        showNotification('Erro ao carregar produtos', 'error');
        console.error('Error loading products:', error);
    }
}

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/produtos/categorias/lista`);
        categories = await response.json();
        renderCategoryFilter();
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderCategoryFilter() {
    const select = document.getElementById('categoryFilter');
    select.innerHTML = '<option value="">Todas as categorias</option>';
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });
}

function renderProductsTable() {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '';
    
    products.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.nome}</td>
            <td>${product.categoria}</td>
            <td>R$ ${product.preco.toFixed(2)}</td>
            <td>${product.estoque}</td>
            <td>${product.codigo_barras || '-'}</td>
            <td class="actions">
                <button class="btn btn-warning" onclick="editProduct(${product.id})">Editar</button>
                <button class="btn btn-danger" onclick="deleteProduct(${product.id})">Excluir</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    let filteredProducts = products;
    
    if (searchTerm) {
        filteredProducts = filteredProducts.filter(product => 
            product.nome.toLowerCase().includes(searchTerm) ||
            product.descricao?.toLowerCase().includes(searchTerm) ||
            product.codigo_barras?.toLowerCase().includes(searchTerm)
        );
    }
    
    if (categoryFilter) {
        filteredProducts = filteredProducts.filter(product => 
            product.categoria === categoryFilter
        );
    }
    
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '';
    
    filteredProducts.forEach(product => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${product.nome}</td>
            <td>${product.categoria}</td>
            <td>R$ ${product.preco.toFixed(2)}</td>
            <td>${product.estoque}</td>
            <td>${product.codigo_barras || '-'}</td>
            <td class="actions">
                <button class="btn btn-warning" onclick="editProduct(${product.id})">Editar</button>
                <button class="btn btn-danger" onclick="deleteProduct(${product.id})">Excluir</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function showProductForm(product = null) {
    const form = document.getElementById('productForm');
    const title = document.getElementById('formTitle');
    
    if (product) {
        title.textContent = 'Editar Produto';
        document.getElementById('productId').value = product.id;
        document.getElementById('nome').value = product.nome;
        document.getElementById('categoria').value = product.categoria;
        document.getElementById('preco').value = product.preco;
        document.getElementById('estoque').value = product.estoque;
        document.getElementById('codigo_barras').value = product.codigo_barras || '';
        document.getElementById('descricao').value = product.descricao || '';
    } else {
        title.textContent = 'Novo Produto';
        document.getElementById('productFormElement').reset();
        document.getElementById('productId').value = '';
    }
    
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth' });
}

function hideProductForm() {
    document.getElementById('productForm').style.display = 'none';
    document.getElementById('productFormElement').reset();
}

async function handleProductSubmit(event) {
    event.preventDefault();
    
    const formData = {
        nome: document.getElementById('nome').value,
        categoria: document.getElementById('categoria').value,
        preco: parseFloat(document.getElementById('preco').value),
        estoque: parseInt(document.getElementById('estoque').value) || 0,
        codigo_barras: document.getElementById('codigo_barras').value || null,
        descricao: document.getElementById('descricao').value || null
    };
    
    const productId = document.getElementById('productId').value;
    
    try {
        let response;
        if (productId) {
            response = await fetch(`${API_BASE}/produtos/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
        } else {
            response = await fetch(`${API_BASE}/produtos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
        }
        
        if (response.ok) {
            showNotification(productId ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!', 'success');
            hideProductForm();
            loadProducts();
            loadCategories();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Erro ao salvar produto', 'error');
        }
    } catch (error) {
        showNotification('Erro ao salvar produto', 'error');
        console.error('Error saving product:', error);
    }
}

async function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (product) {
        showProductForm(product);
    }
}

async function deleteProduct(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/produtos/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showNotification('Produto excluído com sucesso!', 'success');
            loadProducts();
            loadCategories();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Erro ao excluir produto', 'error');
        }
    } catch (error) {
        showNotification('Erro ao excluir produto', 'error');
        console.error('Error deleting product:', error);
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    const label = document.querySelector('.file-label span');
    
    if (file) {
        label.textContent = file.name;
    } else {
        label.textContent = 'Escolher arquivo CNAB';
    }
}

async function handleCnabSubmit(event) {
    event.preventDefault();
    
    const fileInput = document.getElementById('cnabFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Selecione um arquivo CNAB', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('arquivo', file);
    
    try {
        const response = await fetch(`${API_BASE}/cnab/upload`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showCnabResult(result, 'success');
            loadTransactions();
        } else {
            showCnabResult(result, 'error');
        }
    } catch (error) {
        showNotification('Erro ao processar arquivo CNAB', 'error');
        console.error('Error processing CNAB file:', error);
    }
}

function showCnabResult(result, type) {
    const container = document.getElementById('cnabResult');
    container.className = `result-container ${type}`;
    container.style.display = 'block';
    
    let html = `<h3>${type === 'success' ? 'Sucesso!' : 'Erro!'}</h3>`;
    html += `<p>${result.message}</p>`;
    
    if (result.total_linhas) {
        html += `<p>Total de linhas: ${result.total_linhas}</p>`;
    }
    
    if (result.transacoes_inseridas) {
        html += `<p>Transações inseridas: ${result.transacoes_inseridas}</p>`;
    }
    
    if (result.erros && result.erros.length > 0) {
        html += '<h4>Erros encontrados:</h4><ul>';
        result.erros.forEach(erro => {
            html += `<li>${erro}</li>`;
        });
        html += '</ul>';
    }
    
    container.innerHTML = html;
}

async function loadTransactions() {
    try {
        const response = await fetch(`${API_BASE}/cnab/transacoes`);
        const transactions = await response.json();
        renderTransactionsTable(transactions);
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

function renderTransactionsTable(transactions) {
    const container = document.getElementById('transactionsTable');
    const tbody = document.getElementById('transactionsTableBody');
    
    tbody.innerHTML = '';
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transaction.tipo}</td>
            <td>${formatDate(transaction.data)}</td>
            <td class="currency ${transaction.sinal === '+' ? 'positive' : 'negative'}">
                ${transaction.sinal}R$ ${transaction.valor.toFixed(2)}
            </td>
            <td>${transaction.nome_loja}</td>
            <td>${transaction.dono_loja}</td>
            <td>${transaction.natureza}</td>
        `;
        tbody.appendChild(row);
    });
    
    container.style.display = 'block';
}

async function loadStoreReports() {
    try {
        const response = await fetch(`${API_BASE}/cnab/relatorio-lojas`);
        const reports = await response.json();
        renderStoreReportsTable(reports);
    } catch (error) {
        showNotification('Erro ao carregar relatórios', 'error');
        console.error('Error loading store reports:', error);
    }
}

function renderStoreReportsTable(reports) {
    const tbody = document.getElementById('storeReportsTableBody');
    tbody.innerHTML = '';
    
    reports.forEach(report => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${report.nome_loja}</td>
            <td>${report.dono_loja}</td>
            <td>${report.total_transacoes}</td>
            <td class="currency ${report.saldo_conta >= 0 ? 'positive' : 'negative'}">
                R$ ${report.saldo_conta.toFixed(2)}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function formatDate(dateString) {
    if (dateString.length === 8) {
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        return `${day}/${month}/${year}`;
    }
    return dateString;
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.style.display = 'none';
        }, 300);
    }, 3000);
}
