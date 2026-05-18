/* =====================================================
   admin.js — SportingZone Admin
   Produtos e Pedidos via Database, Clientes via Auth
   ===================================================== */

/* ==================== SUPABASE CLIENT ==================== */
const sbAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ==================== CONSTANTS ==================== */
const ADMIN_EMAIL = 'admin@sportingzone.com';

const ICONS = [
  'fa-shirt','fa-person-running','fa-futbol','fa-shoe-prints','fa-dumbbell',
  'fa-bottle-water','fa-vest','fa-baseball','fa-basketball','fa-volleyball',
  'fa-bicycle','fa-table-tennis-paddle-ball','fa-helmet-safety','fa-stopwatch',
  'fa-medal','fa-trophy','fa-heart-pulse','fa-fire','fa-box','fa-tag'
];

/* ==================== AUTH GUARD ==================== */
(async function authGuard() {
  try {
    const { data: { session }, error } = await sbAdmin.auth.getSession();
    
    if (error || !session || session.user.email !== ADMIN_EMAIL) {
      window.location.href = 'index.html';
      return; 
    }

    const adminProfile = JSON.parse(localStorage.getItem('sz_admin_profile') || '{}');
    const el = document.getElementById('admin-name-display');
    if (el) el.textContent = adminProfile.nome || 'Administrador Geral';
  } catch (err) {
    console.error('[SportingZone] Erro na autenticação do Admin:', err);
    window.location.href = 'index.html';
  }
})();

/* ==================== UTILS (VIA SUPABASE) ==================== */

async function getOrders() { 
  try {
    const { data, error } = await sbAdmin.from('pedidos').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[SportingZone] Erro ao buscar pedidos:', err);
    return [];
  }
}

async function getUsers() { 
  try {
    const { data: { users }, error } = await sbAdmin.auth.admin.listUsers();
    if (error) throw error;
    return users || [];
  } catch (err) {
    console.error('[SportingZone] Erro ao buscar clientes no Auth:', err);
    return [];
  }
}

function tagFromCategory(cat) {
  const map = { masculino: 'Masculino', feminino: 'Feminino', unissex: 'Unissex', oferta: 'Oferta' };
  return map[cat] || cat;
}

function formatBRL(v) { 
  return 'R$ ' + Number(v).toFixed(2).replace('.', ','); 
}

function mostrarFeedback(msg, tipo = 'success') {
  let el = document.getElementById('admin-feedback');
  if (!el) {
    el = document.createElement('div');
    el.id = 'admin-feedback';
    el.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;padding:14px 22px;border-radius:10px;font-weight:600;font-size:.9rem;box-shadow:0 4px 20px rgba(0,0,0,.15);';
    document.body.appendChild(el);
  }
  el.style.background = tipo === 'success' ? '#96f911' : '#e53e3e';
  el.style.color = tipo === 'success' ? '#000' : '#fff';
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3000);
}

/* ==================== NAVIGATION ==================== */
function showSection(name, btn) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  
  document.getElementById('sec-' + name).classList.add('active');
  if (btn) btn.classList.add('active');
  
  const titles = { dashboard: 'Dashboard', pedidos: 'Pedidos', produtos: 'Produtos', perfil: 'Meu Perfil' };
  document.getElementById('page-title').textContent = titles[name] || name;
  
  if (name === 'dashboard') loadDashboard();
  if (name === 'pedidos')   loadPedidos();
  if (name === 'produtos')  loadProdutosAdmin();
  if (name === 'perfil')    loadPerfilAdmin();
  
  document.getElementById('admin-sidebar').classList.remove('open');
}

function toggleSidebar() { 
  document.getElementById('admin-sidebar').classList.toggle('open'); 
}

async function sairAdmin() { 
  await sbAdmin.auth.signOut();
  localStorage.removeItem('sz_current_user'); 
  window.location.href = 'index.html'; 
}

/* ==================== DASHBOARD ==================== */
async function loadDashboard() {
  const orders  = await getOrders();
  const allUsers = await getUsers();
  
  const users = allUsers.filter(u => u.email !== ADMIN_EMAIL);

  const receita = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  let totalProdutos = 0;
  
  try {
    const { count } = await sbAdmin.from('produtos').select('id', { count: 'exact', head: true });
    totalProdutos = count || 0;
  } catch (err) {
    console.error('[SportingZone] Erro ao carregar contagem de produtos:', err);
  }

  document.getElementById('stat-pedidos').textContent  = orders.length;
  document.getElementById('stat-receita').textContent  = formatBRL(receita);
  document.getElementById('stat-clientes').textContent = users.length;
  document.getElementById('stat-produtos').textContent = totalProdutos;
  
  const recentOrdersEl = document.getElementById('recent-orders-list');
  const lastOrders = [...orders].slice(0, 5); 
  
  recentOrdersEl.innerHTML = lastOrders.length === 0
    ? '<p class="empty-state">Nenhum pedido ainda.</p>'
    : lastOrders.map(o => {
        const listaItens = Array.isArray(o.itens) ? o.itens : (JSON.parse(o.itens || '[]'));
        const dataFormatada = new Date(o.created_at).toLocaleDateString('pt-BR');
        
        // Nova proteção para o Dashboard
        const fallbackEmail = o.user_email ? "Cliente (" + o.user_email.split('@')[0] + ")" : "Não informado";
        const nomeCliente = o.user_name || o.user_nome || fallbackEmail;

        return `
        <div class="recent-item">
          <div class="recent-item-icon"><i class="fas fa-bag-shopping"></i></div>
          <div class="recent-item-info">
            <strong>${nomeCliente}</strong>
            <span>${listaItens.length} item(s) — ${formatBRL(o.total)}</span>
          </div>
          <div class="recent-item-date">${dataFormatada}</div>
        </div>`
      }).join('');
        
  const recentUsersEl = document.getElementById('recent-users-list');
  const sortedUsers = [...users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const lastUsers = sortedUsers.slice(0, 5);
  
  recentUsersEl.innerHTML = lastUsers.length === 0
    ? '<p class="empty-state">Nenhum cliente cadastrado ainda.</p>'
    : lastUsers.map(u => {
        const userName = u.raw_user_meta_data?.nome || u.raw_user_meta_data?.name || u.user_metadata?.nome || u.user_metadata?.name || 'Nome não informado';

        return `
        <div class="recent-item">
          <div class="recent-item-icon"><i class="fas fa-user"></i></div>
          <div class="recent-item-info"><strong>${userName}</strong><span>${u.email}</span></div>
        </div>`
      }).join('');
}

/* ==================== PEDIDOS ==================== */
let allOrders = [];

async function loadPedidos() { 
  allOrders = await getOrders(); 
  renderPedidos(allOrders); 
}

function filtrarPedidos() {
  const q = document.getElementById('pedido-search').value.toLowerCase();
  renderPedidos(allOrders.filter(o => {
    const nome = (o.user_name || o.user_nome || '').toLowerCase();
    const email = (o.user_email || '').toLowerCase();
    return nome.includes(q) || email.includes(q);
  }));
}

function renderPedidos(orders) {
  const tbody = document.getElementById('pedidos-tbody');
  const emptyEl = document.getElementById('pedidos-empty');
  
  if (orders.length === 0) { 
    tbody.innerHTML = ''; 
    emptyEl.style.display = 'flex'; 
    return; 
  }
  
  emptyEl.style.display = 'none';
  tbody.innerHTML = [...orders].map(o => {
    const listaItens = Array.isArray(o.itens) ? o.itens : (JSON.parse(o.itens || '[]'));
    const itensStr = listaItens.map(i => i.nome || i.name || 'Produto').join(', ');
    const dataPedido = new Date(o.created_at).toLocaleDateString('pt-BR');
    
    // Nova proteção: tenta pegar o nome do banco, se não tiver, tenta a versão "nome", se não, pega a primeira parte do email
    const fallbackEmail = o.user_email ? "Cliente (" + o.user_email.split('@')[0] + ")" : "Não informado";
    const nomeExibicao = o.user_name || o.user_nome || fallbackEmail;
    
    return `<tr>
      <td><span class="order-id">#${String(o.id).slice(-6)}</span></td>
      <td><strong>${nomeExibicao}</strong></td>
      <td>${o.user_email || 'Não informado'}</td>
      <td class="items-cell" title="${itensStr}">${itensStr.length > 35 ? itensStr.slice(0,35)+'…' : (itensStr || 'Sem itens')}</td>
      <td><strong style="color:var(--lime)">${formatBRL(o.total)}</strong></td>
      <td>${dataPedido}</td>
      <td><span class="status-badge">${o.status || 'Pendente'}</span></td>
    </tr>`;
  }).join('');
}

/* ==================== PRODUTOS ==================== */
let deleteTargetId = null;
let selectedIcon   = 'fa-box';

async function loadProdutosAdmin() {
  const grid = document.getElementById('products-admin-grid');
  grid.innerHTML = '<p>Carregando produtos...</p>';
  
  try {
    const { data, error } = await sbAdmin.from('produtos').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    
    const products = data || [];
    if (products.length === 0) {
      grid.innerHTML = '<p class="empty-state" style="grid-column:1/-1">Nenhum produto cadastrado no banco de dados.</p>';
      return;
    }
    
    grid.innerHTML = products.map(p => {
      const icone = p.icone || 'fa-box';
      const desc  = p.descricao || p.desc || '';
      const tag   = p.tag || tagFromCategory(p.categoria);
      const imgHTML = p.imagem_url
        ? `<img src="${p.imagem_url}" alt="${p.nome}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`
        : `<i class="fas ${icone}"></i>`;
        
      return `
        <div class="product-admin-card">
          <div class="product-admin-icon">${imgHTML}</div>
          <div class="product-admin-info">
            <span class="product-admin-tag ${p.oferta ? 'oferta' : ''}">${tag}</span>
            <h4>${p.nome}</h4>
            <p>${desc.substring(0,60)}${desc.length > 60 ? '…' : ''}</p>
            <strong>${formatBRL(p.preco)}</strong>
          </div>
          <div class="product-admin-actions">
            <button class="btn-edit" onclick="editarProduto('${p.id}')"><i class="fas fa-pen"></i></button>
            <button class="btn-delete" onclick="abrirDeleteModal('${p.id}', '${p.nome.replace(/'/g,"\\'")}')"><i class="fas fa-trash-can"></i></button>
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    console.error('[SportingZone] Erro ao carregar produtos:', err);
    grid.innerHTML = `<p class="empty-state" style="grid-column:1/-1;color:#e53e3e;">
      <i class="fas fa-circle-exclamation"></i> Erro ao conectar ao banco de dados.<br>
      <small>Verifique as credenciais no painel</small>
    </p>`;
  }
}

/* ==================== FORMULÁRIO DE PRODUTO ==================== */
function buildIconGrid() {
  const grid = document.getElementById('icon-grid');
  if(!grid) return;
  
  grid.innerHTML = ICONS.map(ic => `
    <button type="button" class="icon-btn ${ic === selectedIcon ? 'selected' : ''}" onclick="selectIcon('${ic}')">
      <i class="fas ${ic}"></i>
    </button>`).join('');
}

function selectIcon(ic) {
  selectedIcon = ic;
  const iconeInput = document.getElementById('produto-icone');
  if (iconeInput) iconeInput.value = ic;
  
  document.querySelectorAll('.icon-btn').forEach(b => b.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
}

function abrirModalProduto() {
  document.getElementById('produto-id').value        = '';
  document.getElementById('produto-nome').value      = '';
  document.getElementById('produto-preco').value     = '';
  document.getElementById('produto-categoria').value = 'Bermuda Masculina';
  document.getElementById('produto-modal-title').textContent = 'Novo Produto';
  
  selectIcon('fa-box'); 
  document.getElementById('produto-modal').classList.add('active');
}

async function editarProduto(id) {
  try {
    const { data, error } = await sbAdmin.from('produtos').select('*').eq('id', id).single();
    if (error || !data) { 
      mostrarFeedback('Produto não encontrado.', 'error'); 
      return; 
    }
    
    document.getElementById('produto-id').value        = data.id;
    document.getElementById('produto-nome').value      = data.nome || '';
    document.getElementById('produto-preco').value     = data.preco || '';
    document.getElementById('produto-categoria').value = data.categoria || 'unissex';
    document.getElementById('produto-modal-title').textContent = 'Editar Produto';
    
    selectIcon(data.icone || 'fa-box');
    document.getElementById('produto-modal').classList.add('active');
  } catch (err) {
    console.error('[SportingZone] Erro ao carregar produto para edição:', err);
    mostrarFeedback('Erro ao carregar produto.', 'error');
  }
}

function fecharModalProduto() { 
  document.getElementById('produto-modal').classList.remove('active'); 
}

async function salvarProduto() {
  const nome      = document.getElementById('produto-nome').value.trim();
  const preco     = parseFloat(document.getElementById('produto-preco').value);
  const categoria = document.getElementById('produto-categoria').value;
  const idExist   = document.getElementById('produto-id').value;
  
  if (!nome || isNaN(preco) || preco < 0) { 
    mostrarFeedback('Preencha nome e preço válidos.', 'error'); 
    return; 
  }
  
  const payload = { 
    nome, 
    preco, 
    categoria, 
    icone: selectedIcon 
  };

  const btnSalvar = document.querySelector('#produto-modal .btn-login');
  if (btnSalvar) { 
    btnSalvar.disabled = true; 
    btnSalvar.textContent = 'Salvando…'; 
  }
  
  try {
    let error;
    if (idExist) {
      ({ error } = await sbAdmin.from('produtos').update(payload).eq('id', idExist));
    } else {
      ({ error } = await sbAdmin.from('produtos').insert([payload]));
    }
    
    if (error) throw error;
    
    fecharModalProduto();
    mostrarFeedback(idExist ? 'Produto atualizado!' : 'Produto cadastrado!');
    loadProdutosAdmin();
  } catch (err) {
    console.error('[SportingZone] Erro ao salvar produto:', err);
    mostrarFeedback('Erro ao salvar produto.', 'error');
  } finally {
    if (btnSalvar) { 
      btnSalvar.disabled = false; 
      btnSalvar.textContent = 'Salvar Produto'; 
    }
  }
}

/* ==================== DELETE ==================== */
function abrirDeleteModal(id, nome) {
  deleteTargetId = id;
  document.getElementById('delete-product-name').textContent = nome;
  document.getElementById('delete-modal').classList.add('active');
}

function fecharDeleteModal() { 
  deleteTargetId = null; 
  document.getElementById('delete-modal').classList.remove('active'); 
}

async function confirmarDelete() {
  if (!deleteTargetId) return;
  
  const btnConfirm = document.querySelector('#delete-modal .btn-delete-confirm');
  if (btnConfirm) { 
    btnConfirm.disabled = true; 
    btnConfirm.textContent = 'Excluindo…'; 
  }
  
  try {
    const { error } = await sbAdmin.from('produtos').delete().eq('id', deleteTargetId);
    if (error) throw error;
    
    fecharDeleteModal();
    mostrarFeedback('Produto excluído com sucesso!');
    loadProdutosAdmin();
  } catch (err) {
    console.error('[SportingZone] Erro ao excluir produto:', err);
    mostrarFeedback('Erro ao excluir produto.', 'error');
  } finally {
    if (btnConfirm) { 
      btnConfirm.disabled = false; 
      btnConfirm.textContent = 'Excluir'; 
    }
  }
}

/* ==================== PERFIL ADMIN ==================== */
function loadPerfilAdmin() {
  const profile = JSON.parse(localStorage.getItem('sz_admin_profile') || '{}');
  document.getElementById('admin-nome').value  = profile.nome || 'Administrador';
  document.getElementById('admin-email').value = ADMIN_EMAIL;
  document.getElementById('admin-tel').value   = profile.tel || '';
  document.getElementById('admin-senha').value  = '';
  document.getElementById('admin-senha2').value = '';
  document.getElementById('perfil-admin-success').style.display = 'none';
}

function salvarPerfilAdmin() {
  const nome   = document.getElementById('admin-nome').value.trim();
  const tel    = document.getElementById('admin-tel').value.trim();
  const senha  = document.getElementById('admin-senha').value;
  const senha2 = document.getElementById('admin-senha2').value;
  
  if (senha && senha !== senha2) { 
    mostrarFeedback('As senhas não coincidem.', 'error'); 
    return; 
  }
  
  localStorage.setItem('sz_admin_profile', JSON.stringify({ nome, tel }));
  document.getElementById('admin-name-display').textContent = nome;
  document.getElementById('perfil-admin-success').style.display = 'flex';
  
  setTimeout(() => document.getElementById('perfil-admin-success').style.display = 'none', 3000);
}

/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  buildIconGrid();
  
  const modalProduto = document.getElementById('produto-modal');
  if(modalProduto) {
      modalProduto.addEventListener('click', (e) => { 
        if (e.target === e.currentTarget) fecharModalProduto(); 
      });
  }
  
  const modalDelete = document.getElementById('delete-modal');
  if(modalDelete){
      modalDelete.addEventListener('click', (e) => { 
        if (e.target === e.currentTarget) fecharDeleteModal(); 
      });
  }
});