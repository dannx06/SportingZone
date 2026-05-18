/* =====================================================
   main.js — SportingZone
   Integração Supabase (Auth + Produtos) + Lógica original
   ===================================================== */

// Inicializa cliente Supabase (credenciais definidas em js/config.js)
let sbClient = null;
if (typeof window.supabase !== 'undefined') {
  sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

/* ==================== CAROUSEL ==================== */
let slideAtual = 0;
const slides = document.querySelectorAll('.slide');

function mostrarSlide(index) {
  slides.forEach(s => s.classList.remove('active'));
  if (index >= slides.length) slideAtual = 0;
  else if (index < 0) slideAtual = slides.length - 1;
  else slideAtual = index;
  if(slides[slideAtual]) slides[slideAtual].classList.add('active');
}

function mudarSlide(dir) { mostrarSlide(slideAtual + dir); }
if (slides.length > 0) setInterval(() => mudarSlide(1), 5000);

/* ==================== MENU MOBILE ==================== */
function toggleMenu() {
  document.getElementById('mobile-nav').classList.toggle('active');
}

/* ==================== MODAL ==================== */
function abrirModal(id) { document.getElementById(id).classList.add('active'); }
function fecharModal(id) { document.getElementById(id).classList.remove('active'); }

function switchAuth(tipo) {
  const tabs = document.querySelectorAll('.tab');
  const lf = document.getElementById('login-form');
  const cf = document.getElementById('cadastro-form');
  tabs.forEach(t => t.classList.remove('active'));
  if (tipo === 'login') {
    tabs[0].classList.add('active');
    lf.classList.add('active');
    cf.classList.remove('active');
  } else {
    tabs[1].classList.add('active');
    cf.classList.add('active');
    lf.classList.remove('active');
  }
}

/* ==================== LIMPEZA DE FORMULÁRIOS ==================== */
function limparFormulariosAuth() {
  const campos = [
    'login-email', 'login-senha',
    'cad-nome', 'cad-email', 'cad-cpf', 'cad-tel', 'cad-rua', 
    'cad-endereco', 'cad-bairro', 'cad-cidade', 'cad-estado', 'cad-cep', 'cad-senha'
  ];

  campos.forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) elemento.value = '';
  });
}

/* ==================== CARRINHO ==================== */
let carrinho = [];
let categoriaAtual = 'todos';

function toggleCart() {
  document.getElementById('cart-sidebar').classList.toggle('active');
}

function addCart(nome, preco) {
  carrinho.push({ nome, preco });
  atualizarCarrinho();
  if (!window.location.pathname.includes('produto.html')) {
    toggleCart();
  }
}

function removerDoCarrinho(index) {
  carrinho.splice(index, 1);
  atualizarCarrinho();
}

function atualizarCarrinho() {
  const cartItems = document.getElementById('cart-items');
  const cartCount = document.getElementById('cart-count');
  const cartTotal = document.getElementById('cart-total');
  const total = carrinho.reduce((s, i) => s + i.preco, 0);

  if(!cartItems) return;

  cartItems.innerHTML = '';
  if (carrinho.length === 0) {
    cartItems.innerHTML = '<p class="empty-cart">Seu carrinho está vazio.</p>';
  } else {
    carrinho.forEach((item, i) => {
      const div = document.createElement('div');
      div.classList.add('cart-item');
      div.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <strong>${item.nome}</strong>
            <p>R$ ${item.preco.toFixed(2).replace('.', ',')}</p>
          </div>
          <button onclick="removerDoCarrinho(${i})" style="background:none;border:none;cursor:pointer;color:#e53e3e;font-size:1.1rem;">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>`;
      cartItems.appendChild(div);
    });
  }

  cartCount.innerText = carrinho.length;
  cartTotal.innerText = total.toFixed(2).replace('.', ',');
}

function finalizarCompra() {
  if (!usuarioLogado) {
    toggleCart();
    abrirModal('login-modal');
    return;
  }
  if (carrinho.length === 0) return;

  // Fecha sidebar e abre modal de pagamento
  document.getElementById('cart-sidebar').classList.remove('active');
  _atualizarResumoModal();
  abrirModal('pagamento-modal');
}

function _atualizarResumoModal() {
  const total = carrinho.reduce((s, i) => s + i.preco, 0);
  const el = document.getElementById('pagamento-total-valor');
  if (el) el.textContent = total.toFixed(2).replace('.', ',');
  const lista = document.getElementById('pagamento-itens-lista');
  if (lista) {
    lista.innerHTML = carrinho.map(i =>
      `<div class="pgto-item"><span>${i.nome}</span><span>R$ ${i.preco.toFixed(2).replace('.', ',')}</span></div>`
    ).join('');
  }
  const pixValor = document.getElementById('pix-valor');
  if (pixValor) pixValor.textContent = total.toFixed(2).replace('.', ',');
  const boletoValor = document.getElementById('boleto-valor');
  if (boletoValor) boletoValor.textContent = total.toFixed(2).replace('.', ',');
  _atualizarParcelasCartao(total);
}

function _atualizarParcelasCartao(total) {
  const sel = document.getElementById('cartao-parcelas');
  if (!sel) return;
  sel.innerHTML = '';
  const maxParcelas = total >= 500 ? 12 : total >= 300 ? 10 : total >= 150 ? 6 : total >= 50 ? 3 : 1;
  for (let i = 1; i <= maxParcelas; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${i}x de R$ ${(total / i).toFixed(2).replace('.', ',')} sem juros`;
    sel.appendChild(opt);
  }
}

function trocarAbaPagamento(aba) {
  document.querySelectorAll('.pgto-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.pgto-aba-conteudo').forEach(c => c.classList.remove('active'));
  document.querySelector(`.pgto-tab-btn[data-aba="${aba}"]`).classList.add('active');
  document.getElementById(`pgto-aba-${aba}`).classList.add('active');
}

function _mascaraCartao(input) {
  let v = input.value.replace(/\D/g, '').substring(0, 16);
  v = v.replace(/(\d{4})(?=\d)/g, '$1 ');
  input.value = v;
}

function _mascaraValidade(input) {
  let v = input.value.replace(/\D/g, '').substring(0, 4);
  if (v.length > 2) v = v.substring(0, 2) + '/' + v.substring(2);
  input.value = v;
}

function _mascaraCVV(input) {
  input.value = input.value.replace(/\D/g, '').substring(0, 4);
}

async function confirmarPagamento() {
  const abaAtiva = document.querySelector('.pgto-tab-btn.active')?.dataset.aba || 'cartao';

  if (abaAtiva === 'cartao') {
    const num = document.getElementById('cartao-numero')?.value.replace(/\s/g, '') || '';
    const nome = document.getElementById('cartao-nome')?.value.trim() || '';
    const val = document.getElementById('cartao-validade')?.value || '';
    const cvv = document.getElementById('cartao-cvv')?.value || '';
    if (num.length < 16 || !nome || val.length < 5 || cvv.length < 3) {
      _mostrarErroPagamento('Preencha todos os dados do cartão corretamente.');
      return;
    }
  }

  if (!sbClient || !usuarioLogado) {
    _mostrarErroPagamento('Sessão expirada. Por favor, faça login novamente.');
    return;
  }

  const pedido = {
    userName: usuarioLogado.user_metadata?.nome || usuarioLogado.email,
    userEmail: usuarioLogado.email,
    items: [...carrinho],
    total: carrinho.reduce((s, i) => s + i.preco, 0),
    metodoPagamento: abaAtiva,
    status: abaAtiva === 'boleto' ? 'Aguardando pagamento' : 'Confirmado'
  };

  try {
    const { error } = await sbClient.from('pedidos').insert([{
      user_id: usuarioLogado.id,
      user_name: pedido.userName,
      user_email: pedido.userEmail,
      itens: JSON.stringify(pedido.items),
      total: pedido.total,
      metodo_pagamento: pedido.metodoPagamento,
      status: pedido.status
    }]);

    if (error) throw error;

    carrinho = [];
    atualizarCarrinho();
    fecharModal('pagamento-modal');

    if (abaAtiva === 'pix') {
      const pixCodigo = document.getElementById('pix-copia-cola');
      if (pixCodigo) pixCodigo.value = gerarCodigoPix();
      abrirModal('pix-confirmacao-modal');
    } else if (abaAtiva === 'boleto') {
      abrirModal('boleto-confirmacao-modal');
    } else {
      abrirModal('pedido-modal');
    }

  } catch (dbErr) {
    console.error('[SportingZone] Erro ao salvar pedido no banco de dados:', dbErr);
    _mostrarErroPagamento('Ocorreu um erro ao processar seu pedido. Tente novamente.');
  }
}

function _mostrarErroPagamento(msg) {
  const el = document.getElementById('pagamento-erro');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 4000);
}

function gerarCodigoPix() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function copiarChavePix() {
  const chave = document.getElementById('pix-copia-cola')?.value;
  if (!chave) return;
  navigator.clipboard.writeText(chave).then(() => {
    const btn = document.getElementById('btn-copiar-pix');
    if (btn) {
      btn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
      setTimeout(() => btn.innerHTML = '<i class="fas fa-copy"></i> Copiar código', 2500);
    }
  });
}

/* ==================== PRODUTOS (SUPABASE) ==================== */
async function fetchProdutos() {
  try {
    const { data, error } = await sbClient
      .from(TABELA_PRODUTOS)
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[SportingZone] Erro ao buscar produtos:', err);
    return [];
  }
}

let produtosCache = [];

async function renderizarProdutos() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  grid.innerHTML = [1,2,3,4,5,6].map(() => `
    <div class="product-card" style="opacity:.4;pointer-events:none;">
      <div class="product-img" style="background:#ddd;"></div>
      <div class="product-info" style="display:flex;flex-direction:column;gap:10px;">
        <div style="height:14px;background:#eee;border-radius:4px;width:40%;"></div>
        <div style="height:18px;background:#eee;border-radius:4px;width:80%;"></div>
        <div style="height:12px;background:#eee;border-radius:4px;width:60%;"></div>
        <div style="height:24px;background:#eee;border-radius:4px;width:50%;"></div>
        <div style="height:42px;background:#eee;border-radius:8px;"></div>
      </div>
    </div>`).join('');

  produtosCache = await fetchProdutos();
  aplicarFiltros();
}

function iconeParaCategoria(cat) {
  const m = { masculino: 'fa-shirt', feminino: 'fa-person-running', unissex: 'fa-dumbbell', oferta: 'fa-tag' };
  return m[cat] || 'fa-box';
}

function aplicarFiltros() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const search = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
  grid.innerHTML = '';

  const filtrados = produtosCache.filter(p => {
    const combinaCategoria = categoriaAtual === 'todos' || p.categoria === categoriaAtual;
    const combinaPesquisa  = !search || (p.nome && p.nome.toLowerCase().includes(search));
    return combinaCategoria && combinaPesquisa;
  });

  if (filtrados.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#888;">
        <i class="fas fa-search" style="font-size:2.5rem;margin-bottom:14px;display:block;color:#ccc;"></i>
        <p style="font-size:1.05rem;">Nenhum produto encontrado.</p>
      </div>`;
    return;
  }

  filtrados.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.style.cursor = 'pointer';

    card.addEventListener('click', (e) => {
      if (!e.target.closest('button')) {
        window.location.href = `produto.html?id=${p.id}`;
      }
    });

    const icone   = iconeParaCategoria(p.categoria);
    const tagCls  = p.categoria === 'oferta' ? 'tag oferta' : 'tag';
    const tagTxt  = categoriaNomeLocal(p.categoria);
    const esgotado = Number(p.estoque) <= 0;

    const imgHTML = p.imagem_url
      ? `<img src="${p.imagem_url}" alt="${p.nome}" style="width:100%;height:100%;object-fit:cover;"
            onerror="this.parentElement.innerHTML='<i class=\\'fas ${icone}\\'></i>'">`
      : `<i class="fas ${icone}"></i>`;

    card.innerHTML = `
      <div class="product-img">${imgHTML}</div>
      <div class="product-info">
        <span class="${tagCls}">${tagTxt}</span>
        <h3>${p.nome}</h3>
        <p style="font-size:0.82rem;color:${esgotado ? '#e53e3e' : '#38a169'};font-weight:600;">
          ${esgotado ? '<i class="fas fa-circle-xmark"></i> Esgotado' : `<i class="fas fa-circle-check"></i> ${p.estoque} em estoque`}
        </p>
        <strong>R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</strong>
        <button ${esgotado ? 'disabled style="opacity:.5;cursor:not-allowed;"' : `onclick="addCart('${p.nome.replace(/'/g,"\\'")}', ${p.preco}); mostrarToastMain('Adicionado ao carrinho!')"`}>
          <i class="fas fa-cart-plus"></i> ${esgotado ? 'Esgotado' : 'Adicionar ao carrinho'}
        </button>
      </div>`;

    grid.appendChild(card);
  });
}

function filtrarCategoria(categoria, botaoClicado) {
  categoriaAtual = categoria;
  document.querySelectorAll('.category-card').forEach(b => b.classList.remove('active'));
  botaoClicado.classList.add('active');
  aplicarFiltros();
}

function pesquisarProduto() { aplicarFiltros(); }

function categoriaNomeLocal(cat) {
  const m = { masculino: 'Masculino', feminino: 'Feminino', unissex: 'Unissex', oferta: 'Oferta' };
  return m[cat] || cat;
}

let toastMainTimer = null;
function mostrarToastMain(msg) {
  let t = document.getElementById('toast-main');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast-main';
    t.style.cssText = `position:fixed;bottom:30px;left:50%;transform:translateX(-50%) translateY(20px);
      background:#000;color:#96f911;padding:14px 26px;border-radius:50px;font-weight:600;
      font-size:.92rem;z-index:9999;display:flex;align-items:center;gap:10px;
      box-shadow:0 8px 30px rgba(0,0,0,.3);`;
    document.body.appendChild(t);
  }
  t.innerHTML = `<i class="fas fa-check-circle"></i> ${msg}`;
  t.style.display = 'flex';
  clearTimeout(toastMainTimer);
  toastMainTimer = setTimeout(() => { t.style.display = 'none'; }, 3000);
}

/* ==================== AUTH SUPABASE ==================== */
const ADMIN_EMAIL = 'admin@sportingzone.com';
let usuarioLogado = null; 

// Escuta mudanças de sessão em tempo real
if (sbClient) {
  sbClient.auth.onAuthStateChange((event, session) => {
    usuarioLogado = session ? session.user : null;
    atualizarHeaderUser();
  });
}

async function fazerLogin() {
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  const errEl = document.getElementById('login-error');
  
  if (!email || !senha) { mostrarErro(errEl, 'Preencha todos os campos.'); return; }

  const btn = document.querySelector('#login-form .btn-login');
  btn.textContent = 'Entrando...';
  btn.disabled = true;

  try {
    const { data, error } = await sbClient.auth.signInWithPassword({ email, password: senha });
    if (error) {
      if (error.message.includes('Invalid login credentials') || error.message.includes('invalid_credentials')) {
        throw new Error('E-mail ou senha incorretos.');
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.');
      } else {
        throw new Error(error.message);
      }
    }
    
    fecharModal('login-modal');
    limparFormulariosAuth(); // Limpa os campos após login com sucesso
    
    // Se for o admin, joga para o painel
    if (email === ADMIN_EMAIL) {
      window.location.href = 'admin.html';
    } else {
      mostrarToastMain('Login realizado com sucesso!');
    }
  } catch (err) {
    mostrarErro(errEl, err.message || 'Erro ao fazer login.');
  } finally {
    btn.textContent = 'Entrar';
    btn.disabled = false;
  }
}

async function fazerCadastro() {
  const nome     = document.getElementById('cad-nome').value.trim();
  const email    = document.getElementById('cad-email').value.trim();
  const cpf      = document.getElementById('cad-cpf').value.trim();
  const tel      = document.getElementById('cad-tel').value.trim();
  const rua      = document.getElementById('cad-rua').value.trim();
  const endereco = document.getElementById('cad-endereco').value.trim();
  const bairro   = document.getElementById('cad-bairro').value.trim();
  const cidade   = document.getElementById('cad-cidade').value.trim();
  const estado   = document.getElementById('cad-estado').value.trim();
  const cep      = document.getElementById('cad-cep').value.trim();
  const senha    = document.getElementById('cad-senha').value;
  const errEl    = document.getElementById('cad-error');

  if (!nome || !email || !senha) { 
    mostrarErro(errEl, 'Preencha nome, e-mail e senha.'); 
    return; 
  }
  
  if (senha.length < 6) {
    mostrarErro(errEl, 'A senha deve ter no mínimo 6 caracteres.');
    return;
  }

  const btn = document.querySelector('#cadastro-form .btn-login');
  btn.textContent = 'Cadastrando...';
  btn.disabled = true;

  try {
    const { data: authData, error: authError } = await sbClient.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome, cpf, tel, rua, endereco, bairro, cidade, estado, cep }
      }
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
        throw new Error('Este e-mail já está cadastrado. Faça login.');
      } else if (authError.message.includes('Password should be')) {
        throw new Error('A senha deve ter no mínimo 6 caracteres.');
      } else {
        throw new Error(authError.message);
      }
    }

    if (authData.user) {
      try {
        await sbClient.from('usuarios').insert([{
          id: authData.user.id,
          nome, email, cpf, tel, rua, endereco, bairro, cidade, estado, cep
        }]);
      } catch (dbErr) {
        console.warn('[SportingZone] Tabela usuarios não acessível (RLS?). Dados salvos no Auth metadata.', dbErr);
      }
    }

    if (authData.user && authData.session) {
      fecharModal('login-modal');
      limparFormulariosAuth(); // Limpa após cadastro aprovado e logado automaticamente
      mostrarToastMain('Conta criada com sucesso! Bem-vindo(a), ' + nome.split(' ')[0] + '!');
    } else {
      fecharModal('login-modal');
      limparFormulariosAuth(); // Limpa após cadastro quando pede confirmação de e-mail
      mostrarToastMain('Cadastro realizado! Verifique seu e-mail para confirmar a conta.');
    }

  } catch (err) {
    console.error('[SportingZone] Erro no cadastro:', err);
    mostrarErro(errEl, err.message || 'Erro interno. Verifique o console.');
  } finally {
    btn.textContent = 'Criar Conta';
    btn.disabled = false;
  }
}

async function fazerLogout() {
  await sbClient.auth.signOut();
  const dd = document.getElementById('user-dropdown');
  if (dd) dd.classList.remove('active');
  limparFormulariosAuth(); // Limpa ao sair da conta
  mostrarToastMain('Você saiu da sua conta.');
}

function atualizarHeaderUser() {
  const btn  = document.getElementById('user-nav-btn');
  if (!btn) return;
  const adminNavLink     = document.getElementById('admin-nav-link');
  const adminMobileLink = document.getElementById('admin-mobile-link');
  const dropAdminLink   = document.getElementById('dropdown-admin-link');
  const dropName        = document.getElementById('dropdown-name');
  
  if (usuarioLogado) {
    const nomeCompleto = usuarioLogado.user_metadata?.nome || usuarioLogado.email;
    const primeiroNome = nomeCompleto.split(' ')[0];
    
    btn.innerHTML = `<i class="fas fa-user-circle"></i><span>${primeiroNome}</span>`;
    btn.onclick   = toggleUserDropdown;
    if (dropName) dropName.textContent = nomeCompleto;
    
    const isAdmin = (usuarioLogado.email === ADMIN_EMAIL);
    if (adminNavLink)    adminNavLink.style.display    = isAdmin ? 'inline-flex' : 'none';
    if (adminMobileLink) adminMobileLink.style.display = isAdmin ? 'block'       : 'none';
    if (dropAdminLink)   dropAdminLink.style.display   = isAdmin ? 'flex'        : 'none';
  } else {
    btn.innerHTML = `<i class="fas fa-user-circle"></i><span>Entrar</span>`;
    btn.onclick   = () => abrirModal('login-modal');
    if (adminNavLink)    adminNavLink.style.display    = 'none';
    if (adminMobileLink) adminMobileLink.style.display = 'none';
    if (dropAdminLink)   dropAdminLink.style.display   = 'none';
  }
}

function toggleUserDropdown() {
  document.getElementById('user-dropdown').classList.toggle('active');
}

document.addEventListener('click', (e) => {
  const wrapper  = document.querySelector('.user-nav-wrapper');
  const dropdown = document.getElementById('user-dropdown');
  if (wrapper && dropdown && !wrapper.contains(e.target)) {
    dropdown.classList.remove('active');
  }
});

/* ==================== PERFIL ==================== */
function abrirPerfilModal() {
  const dd = document.getElementById('user-dropdown');
  if (dd) dd.classList.remove('active');
  
  if (!usuarioLogado || usuarioLogado.email === ADMIN_EMAIL) { 
    window.location.href = 'admin.html'; 
    return; 
  }
  
  const meta = usuarioLogado.user_metadata || {};
  
  document.getElementById('perfil-nome').value  = meta.nome  || '';
  document.getElementById('perfil-email').value = usuarioLogado.email || '';
  document.getElementById('perfil-cpf').value   = meta.cpf   || '';
  document.getElementById('perfil-tel').value   = meta.tel   || '';
  document.getElementById('perfil-end').value   = meta.endereco || '';
  
  const nasc = document.getElementById('perfil-nasc'); if(nasc) nasc.value = meta.nasc || '';
  document.getElementById('perfil-senha').value = '';
  
  const ps = document.getElementById('perfil-success');
  if (ps) ps.style.display = 'none';
  
  abrirModal('perfil-modal');
}

async function salvarPerfil() {
  if (!usuarioLogado) return;
  
  const nome = document.getElementById('perfil-nome').value.trim();
  const cpf = document.getElementById('perfil-cpf').value.trim();
  const tel = document.getElementById('perfil-tel').value.trim();
  const end = document.getElementById('perfil-end').value.trim();
  const novaSenha = document.getElementById('perfil-senha').value;
  
  const nascEl = document.getElementById('perfil-nasc');
  const nasc = nascEl ? nascEl.value : '';

  try {
    const updates = { data: { nome, cpf, tel, endereco: end, nasc } };
    if (novaSenha) updates.password = novaSenha;

    const { error } = await sbClient.auth.updateUser(updates);
    if (error) throw error;

    await sbClient.from('usuarios').update({ nome, cpf, tel, endereco: end }).eq('id', usuarioLogado.id);

    const ps = document.getElementById('perfil-success');
    if (ps) ps.style.display = 'block';
    setTimeout(() => { if (ps) ps.style.display = 'none'; }, 3000);
    
    atualizarHeaderUser();
  } catch (err) {
    console.error('Erro ao salvar perfil', err);
    alert('Não foi possível atualizar o perfil.');
  }
}

/* ==================== HISTÓRICO DE COMPRAS ==================== */
async function abrirHistorico() {
  const dd = document.getElementById('user-dropdown');
  if (dd) dd.classList.remove('active');

  if (!usuarioLogado) {
    abrirModal('login-modal');
    return;
  }

  abrirModal('historico-modal');
  const lista = document.getElementById('historico-lista');
  if (!lista) return;

  lista.innerHTML = '<p style="text-align:center;color:#888;padding:20px;">Carregando pedidos...</p>';

  let pedidos = [];

  if (sbClient) {
    try {
      const { data, error } = await sbClient
        .from('pedidos')
        .select('*')
        .eq('user_id', usuarioLogado.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        pedidos = data.map(p => ({
          id: p.id,
          data: p.created_at,
          status: p.status,
          metodoPagamento: p.metodo_pagamento,
          total: p.total,
          items: (() => { try { return JSON.parse(p.itens); } catch(e) { return []; } })()
        }));
      }
    } catch (e) {
      console.error('[SportingZone] Erro ao buscar pedidos do Supabase:', e);
      lista.innerHTML = '<p style="text-align:center;color:#e53e3e;padding:20px;">Ocorreu um erro ao carregar os pedidos. Tente novamente mais tarde.</p>';
      return; 
    }
  } else {
    lista.innerHTML = '<p style="text-align:center;color:#e53e3e;padding:20px;">Sem conexão com o banco de dados.</p>';
    return;
  }

  if (pedidos.length === 0) {
    lista.innerHTML = `
      <div style="text-align:center;padding:40px 20px;color:#888;">
        <i class="fas fa-box-open" style="font-size:2.5rem;margin-bottom:14px;display:block;color:#ccc;"></i>
        <p>Você ainda não realizou nenhuma compra.</p>
      </div>`;
    return;
  }

  const metodoBadge = { cartao: '💳 Cartão', pix: '⚡ Pix', boleto: '🔖 Boleto' };
  const statusColor = { 'Confirmado': '#38a169', 'Aguardando pagamento': '#d69e2e' };

  lista.innerHTML = pedidos.map(p => {
    const dataFmt = p.data
      ? new Date(p.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '—';
    const itensHTML = (p.items || []).map(i =>
      `<div style="display:flex;justify-content:space-between;font-size:0.85rem;padding:4px 0;border-bottom:1px dashed #eee;">
        <span>${i.nome}</span>
        <span style="color:#555;">R$ ${Number(i.preco).toFixed(2).replace('.', ',')}</span>
      </div>`
    ).join('');

    return `
      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:16px;background:#fafafa;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
          <div>
            <span style="font-size:0.78rem;color:#888;">${dataFmt}</span><br>
            <span style="font-size:0.82rem;font-weight:600;color:#555;">${metodoBadge[p.metodoPagamento] || p.metodoPagamento || '—'}</span>
          </div>
          <span style="background:${statusColor[p.status] || '#718096'};color:#fff;padding:3px 10px;border-radius:20px;font-size:0.78rem;font-weight:700;">
            ${p.status || 'Confirmado'}
          </span>
        </div>
        <div style="margin-bottom:10px;">${itensHTML}</div>
        <div style="display:flex;justify-content:flex-end;">
          <strong style="font-size:1rem;color:#1a1a1a;">Total: R$ ${Number(p.total).toFixed(2).replace('.', ',')}</strong>
        </div>
      </div>`;
  }).join('');
}

/* ==================== UTILS ==================== */
function mostrarErro(el, msg) {
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3000);
}

/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded', async () => {
  if (sbClient) {
    const { data: { session } } = await sbClient.auth.getSession();
    usuarioLogado = session ? session.user : null;
    atualizarHeaderUser();
  }

  if (document.getElementById('products-grid')) {
    renderizarProdutos();
  }
});