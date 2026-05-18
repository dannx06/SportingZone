/* =====================================================
   produto.js — Lógica da Página de Detalhes do Produto
   SportingZone | Integração Supabase
   ===================================================== */

/* ===== ESTADO GLOBAL ===== */
let produtoAtual   = null;   // Produto carregado
let qtdSelecionada = 1;      // Quantidade
let tamanhoAtual   = null;   // Tamanho selecionado (se aplicável)

/* ===== CATEGORIAS QUE EXIBEM SELETOR DE TAMANHO ===== */
const categoriasComTamanho = ['masculino', 'feminino', 'unissex'];

/* TABELA_PRODUTOS é definida em js/config.js */

/* =====================================================
   INICIALIZAÇÃO
   ===================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  const id = obterIdDaURL();
  if (!id) {
    mostrarErroEstado();
    return;
  }
  await carregarProduto(id);
});

/* Pega o parâmetro ?id= da URL */
function obterIdDaURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

/* =====================================================
   CARREGAR PRODUTO DO SUPABASE
   ===================================================== */
async function carregarProduto(id) {
  try {
    const { data, error } = await sbClient
      .from(TABELA_PRODUTOS)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      mostrarErroEstado();
      return;
    }

    produtoAtual = data;
    renderizarProduto(data);
    await carregarRelacionados(data.categoria, data.id);

  } catch (err) {
    console.error('[SportingZone] Erro ao carregar produto:', err);
    mostrarErroEstado();
  }
}

/* =====================================================
   RENDERIZAR PRODUTO NA TELA
   ===================================================== */
function renderizarProduto(p) {
  // Ocultar loading, mostrar produto
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('produto-container').style.display = 'grid';
  document.getElementById('produto-abas').style.display  = 'block';

  // Título da página
  document.title = `SportingZone | ${p.nome}`;

  // Breadcrumb
  document.getElementById('breadcrumb-nome').textContent = p.nome;

  // Badge oferta
  if (p.categoria === 'oferta') {
    document.getElementById('produto-badge-oferta').style.display = 'flex';
  }

  // ---- Imagem / Ícone principal ----
  const imgPrincipal = document.getElementById('produto-img-principal');
  const iconeCategoria = { masculino:'fa-shirt', feminino:'fa-person-running', unissex:'fa-dumbbell', oferta:'fa-tag' }[p.categoria] || 'fa-box';
  
  if (p.imagem_url) {
    imgPrincipal.innerHTML = `<img src="${p.imagem_url}" alt="${p.nome}" onerror="this.parentElement.innerHTML='<i class=\\'fas ${iconeCategoria}\\'></i>'">`;
  } else {
    imgPrincipal.innerHTML = `<i class="fas ${iconeCategoria}"></i>`;
  }

  // Imagens extras / thumbnails (campo imagens_extras esperado como array JSON)
  if (p.imagens_extras && Array.isArray(p.imagens_extras) && p.imagens_extras.length > 0) {
    const thumbsDiv = document.getElementById('produto-thumbs');
    thumbsDiv.style.display = 'flex';
    p.imagens_extras.forEach((url, i) => {
      const div = document.createElement('div');
      div.className = 'thumb-item' + (i === 0 ? ' active' : '');
      div.innerHTML = `<img src="${url}" alt="Imagem ${i+1}">`;
      div.onclick = () => {
        document.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
        div.classList.add('active');
        imgPrincipal.innerHTML = `<img src="${url}" alt="${p.nome}">`;
      };
      thumbsDiv.appendChild(div);
    });
  }

  // ---- Tag ----
  const tagEl = document.getElementById('produto-tag');
  tagEl.textContent = categoriaNome(p.categoria);
  if (p.categoria === 'oferta') tagEl.classList.add('oferta');

  // ---- SKU ----
  document.getElementById('produto-sku').textContent = `SKU: SZ-${String(p.id).padStart(5, '0')}`;

  // ---- Nome ----
  document.getElementById('produto-nome').textContent = p.nome;

  // ---- Descrição ----
  const descricao = p.descricao || 'Sem descrição disponível.';
  document.getElementById('produto-desc').textContent = descricao;
  document.getElementById('aba-desc-texto').textContent = descricao;

  // ---- Preço ----
  const preco = Number(p.preco) || 0;
  document.getElementById('produto-preco').textContent = formatarBRL(preco);

  const parcelas = calcularParcelas(preco);
  document.getElementById('produto-parcelamento').innerHTML =
    `ou <strong>${parcelas}x de ${formatarBRL(preco / parcelas)}</strong> sem juros`;

  // ---- Estoque ----
  if (p.estoque !== undefined && p.estoque !== null) {
    const estoqueEl = document.getElementById('estoque-status');
    if (Number(p.estoque) <= 0) {
      estoqueEl.innerHTML = '<i class="fas fa-circle-xmark" style="color:#e53e3e"></i> Esgotado';
      estoqueEl.style.color = '#e53e3e';
      document.getElementById('btn-add-cart').disabled = true;
      document.getElementById('btn-comprar-agora').disabled = true;
    } else if (Number(p.estoque) <= 5) {
      estoqueEl.innerHTML = `<i class="fas fa-circle-exclamation" style="color:#dd6b20"></i> Últimas ${p.estoque} unidades`;
      estoqueEl.style.color = '#dd6b20';
    }
  }

  // ---- Tamanhos ----
  if (categoriasComTamanho.includes(p.categoria)) {
    document.getElementById('bloco-tamanhos').style.display = 'block';
    tamanhoAtual = 'PP';
  }

  // ---- Tabela de Especificações ----
  preencherEspecificacoes(p);
}

/* Preenche a tabela de especificações com campos disponíveis */
function preencherEspecificacoes(p) {
  const table = document.getElementById('specs-table');
  const specs = [];

  if (p.categoria)  specs.push(['Categoria',   categoriaNome(p.categoria)]);
  if (p.marca)      specs.push(['Marca',        p.marca]);
  if (p.material)   specs.push(['Material',     p.material]);
  if (p.peso)       specs.push(['Peso',         p.peso]);
  if (p.dimensoes)  specs.push(['Dimensões',    p.dimensoes]);
  if (p.cor)        specs.push(['Cor',          p.cor]);
  if (p.genero)     specs.push(['Gênero',       p.genero]);
  if (p.estoque)    specs.push(['Disponibilidade', `${p.estoque} unidades`]);

  // Campos padrão sempre exibidos
  specs.push(['Garantia', '30 dias']);
  specs.push(['Frete', 'Grátis acima de R$ 299,00']);

  table.innerHTML = specs.map(([k, v]) =>
    `<tr><td>${k}</td><td>${v}</td></tr>`
  ).join('');
}

/* =====================================================
   PRODUTOS RELACIONADOS
   ===================================================== */
async function carregarRelacionados(categoria, idAtual) {
  try {
    const { data, error } = await sbClient
      .from(TABELA_PRODUTOS)
      .select('*')
      .eq('categoria', categoria)
      .neq('id', idAtual)
      .limit(4);

    if (error || !data || data.length === 0) return;

    const grid = document.getElementById('relacionados-grid');
    const section = document.getElementById('relacionados-section');
    section.style.display = 'block';

    grid.innerHTML = '';
    data.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.style.cursor = 'pointer';
      card.onclick = () => window.location.href = `produto.html?id=${p.id}`;

      const icone = p.icone || 'fa-box';
      const imgHTML = p.imagem_url
        ? `<img src="${p.imagem_url}" alt="${p.nome}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.innerHTML='<i class=\\'fas ${icone}\\'></i>'">`
        : `<i class="fas ${icone}"></i>`;

      card.innerHTML = `
        <div class="product-img">${imgHTML}</div>
        <div class="product-info">
          <span class="tag${p.oferta ? ' oferta' : ''}">${p.tag || categoriaNome(p.categoria)}</span>
          <h3>${p.nome}</h3>
          <p>${(p.descricao || p.desc || '').substring(0, 60)}${(p.descricao || p.desc || '').length > 60 ? '...' : ''}</p>
          <strong>${formatarBRL(Number(p.preco) || 0)}</strong>
          <button onclick="event.stopPropagation(); adicionarRelacionado('${p.nome.replace(/'/g, "\\'")}', ${p.preco})">
            <i class="fas fa-cart-plus"></i> Adicionar
          </button>
        </div>`;
      grid.appendChild(card);
    });

  } catch (err) {
    console.error('[SportingZone] Erro ao carregar relacionados:', err);
  }
}

function adicionarRelacionado(nome, preco) {
  addCart(nome, Number(preco));
  mostrarToast(`${nome} adicionado ao carrinho!`);
}

/* =====================================================
   AÇÕES DO PRODUTO
   ===================================================== */
function alterarQty(delta) {
  qtdSelecionada = Math.max(1, Math.min(99, qtdSelecionada + delta));
  document.getElementById('qty-display').textContent = qtdSelecionada;
}

function selecionarTamanho(tam, btn) {
  document.querySelectorAll('.tamanho-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  tamanhoAtual = tam;
  document.getElementById('tamanho-selecionado').textContent = tam;
}

function adicionarAoCarrinhoDetalhe() {
  if (!produtoAtual) return;

  const nome = tamanhoAtual
    ? `${produtoAtual.nome} (${tamanhoAtual})`
    : produtoAtual.nome;

  for (let i = 0; i < qtdSelecionada; i++) {
    addCart(nome, Number(produtoAtual.preco));
  }

  mostrarToast(`${qtdSelecionada}x ${produtoAtual.nome} adicionado ao carrinho!`);
}

function comprarAgora() {
  adicionarAoCarrinhoDetalhe();
  // Abre o carrinho automaticamente
  setTimeout(() => {
    document.getElementById('cart-sidebar').classList.add('active');
  }, 300);
}

/* =====================================================
   CALCULADORA DE FRETE (ViaCEP + simulação por estado)
   ===================================================== */
const FRETE_POR_REGIAO = {
  // Nordeste
  AL: { pac: 12.90, sedex: 22.90, pacDias: '5-7',  sedexDias: '2-3' },
  BA: { pac: 14.90, sedex: 24.90, pacDias: '5-7',  sedexDias: '2-3' },
  CE: { pac: 12.90, sedex: 22.90, pacDias: '5-7',  sedexDias: '2-3' },
  MA: { pac: 15.90, sedex: 26.90, pacDias: '6-8',  sedexDias: '3-4' },
  PB: { pac: 12.90, sedex: 22.90, pacDias: '4-6',  sedexDias: '2-3' },
  PE: { pac: 11.90, sedex: 19.90, pacDias: '4-6',  sedexDias: '1-2' }, // Sede da loja
  PI: { pac: 14.90, sedex: 24.90, pacDias: '5-7',  sedexDias: '2-3' },
  RN: { pac: 13.90, sedex: 23.90, pacDias: '5-7',  sedexDias: '2-3' },
  SE: { pac: 13.90, sedex: 23.90, pacDias: '5-7',  sedexDias: '2-3' },
  // Sudeste
  ES: { pac: 17.90, sedex: 29.90, pacDias: '6-8',  sedexDias: '3-4' },
  MG: { pac: 17.90, sedex: 27.90, pacDias: '5-7',  sedexDias: '2-3' },
  RJ: { pac: 18.90, sedex: 29.90, pacDias: '6-8',  sedexDias: '2-3' },
  SP: { pac: 18.90, sedex: 28.90, pacDias: '6-8',  sedexDias: '2-3' },
  // Sul
  PR: { pac: 19.90, sedex: 31.90, pacDias: '7-9',  sedexDias: '3-4' },
  RS: { pac: 21.90, sedex: 33.90, pacDias: '8-10', sedexDias: '3-5' },
  SC: { pac: 20.90, sedex: 32.90, pacDias: '7-9',  sedexDias: '3-4' },
  // Centro-Oeste
  DF: { pac: 19.90, sedex: 30.90, pacDias: '6-8',  sedexDias: '2-3' },
  GO: { pac: 18.90, sedex: 29.90, pacDias: '6-8',  sedexDias: '2-3' },
  MS: { pac: 20.90, sedex: 31.90, pacDias: '7-9',  sedexDias: '3-4' },
  MT: { pac: 21.90, sedex: 32.90, pacDias: '7-9',  sedexDias: '3-4' },
  // Norte
  AC: { pac: 28.90, sedex: 42.90, pacDias: '10-14', sedexDias: '5-7' },
  AM: { pac: 26.90, sedex: 39.90, pacDias: '9-12',  sedexDias: '4-6' },
  AP: { pac: 27.90, sedex: 40.90, pacDias: '10-13', sedexDias: '5-7' },
  PA: { pac: 23.90, sedex: 35.90, pacDias: '8-11',  sedexDias: '4-5' },
  RO: { pac: 25.90, sedex: 38.90, pacDias: '9-12',  sedexDias: '4-6' },
  RR: { pac: 28.90, sedex: 42.90, pacDias: '11-14', sedexDias: '5-7' },
  TO: { pac: 22.90, sedex: 34.90, pacDias: '8-10',  sedexDias: '3-5' },
};

const FRETE_GRATIS_ACIMA = 299.00;

async function calcularFrete() {
  const cepInput = document.getElementById('frete-cep');
  const cep = cepInput.value.replace(/\D/g, '');
  const btn = document.querySelector('.btn-calcular-frete');
  const resultadoDiv = document.getElementById('frete-resultado');
  const erroDiv = document.getElementById('frete-erro');

  // Reset
  resultadoDiv.style.display = 'none';
  erroDiv.style.display = 'none';
  resultadoDiv.innerHTML = '';

  if (cep.length !== 8) {
    erroDiv.style.display = 'flex';
    erroDiv.querySelector('span').textContent = 'Digite um CEP válido com 8 dígitos.';
    return;
  }

  // Loading no botão
  btn.classList.add('loading');
  btn.innerHTML = '<i class="fas fa-spinner"></i> Calculando...';
  btn.disabled = true;

  try {
    const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const dados = await resp.json();

    if (dados.erro) {
      throw new Error('CEP não encontrado.');
    }

    const uf = dados.uf.toUpperCase();
    const frete = FRETE_POR_REGIAO[uf];

    if (!frete) {
      throw new Error('Estado não reconhecido. Verifique o CEP.');
    }

    const preco = Number(produtoAtual?.preco) || 0;
    const freteGratis = preco >= FRETE_GRATIS_ACIMA;

    resultadoDiv.style.display = 'flex';
    resultadoDiv.innerHTML = `
      <div class="frete-endereco">
        <i class="fas fa-map-marker-alt"></i>
        Entregando para: <strong>${dados.localidade} - ${uf}</strong>
        ${dados.bairro ? `(${dados.bairro})` : ''}
      </div>

      <div class="frete-opcao" onclick="selecionarFrete(this, '${freteGratis ? '0,00' : formatarBRL(frete.pac)}')">
        <div class="frete-opcao-left">
          <i class="fas fa-box"></i>
          <div>
            <div class="frete-opcao-nome">PAC (Correios)</div>
            <div class="frete-opcao-prazo">Prazo: ${frete.pacDias} dias úteis</div>
          </div>
        </div>
        <div class="frete-opcao-preco ${freteGratis ? 'gratis' : ''}">
          ${freteGratis ? 'GRÁTIS' : formatarBRL(frete.pac)}
        </div>
      </div>

      <div class="frete-opcao" onclick="selecionarFrete(this, '${formatarBRL(frete.sedex)}')">
        <div class="frete-opcao-left">
          <i class="fas fa-truck-fast"></i>
          <div>
            <div class="frete-opcao-nome">SEDEX (Correios)</div>
            <div class="frete-opcao-prazo">Prazo: ${frete.sedexDias} dias úteis</div>
          </div>
        </div>
        <div class="frete-opcao-preco">${formatarBRL(frete.sedex)}</div>
      </div>

      ${freteGratis ? '<div style="font-size:0.82rem;color:#38a169;font-weight:600;"><i class="fas fa-gift"></i> Frete grátis PAC para compras acima de R$ 299,00!</div>' : ''}
    `;

  } catch (err) {
    erroDiv.style.display = 'flex';
    erroDiv.querySelector('span').textContent = err.message || 'Erro ao consultar CEP. Tente novamente.';
  } finally {
    btn.classList.remove('loading');
    btn.innerHTML = '<i class="fas fa-search"></i> Calcular';
    btn.disabled = false;
  }
}

function selecionarFrete(el, valor) {
  document.querySelectorAll('.frete-opcao').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

/* Máscara de CEP: 00000-000 */
function mascaraCEP(input) {
  let v = input.value.replace(/\D/g, '').substring(0, 8);
  if (v.length > 5) v = v.substring(0, 5) + '-' + v.substring(5);
  input.value = v;
}

/* =====================================================
   ABAS
   ===================================================== */
function trocarAba(aba, btn) {
  document.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.aba-conteudo').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('aba-' + aba).classList.add('active');
}

/* =====================================================
   COMPARTILHAR
   ===================================================== */
function compartilhar(rede) {
  const url = encodeURIComponent(window.location.href);
  const titulo = encodeURIComponent(produtoAtual?.nome || 'SportingZone');
  const urls = {
    whatsapp: `https://wa.me/?text=${titulo}%20${url}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    twitter:  `https://twitter.com/intent/tweet?url=${url}&text=${titulo}`,
  };
  window.open(urls[rede], '_blank');
}

function copiarLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    mostrarToast('Link copiado!');
  });
}

/* =====================================================
   TOAST
   ===================================================== */
let toastTimer = null;

function mostrarToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  toast.style.display = 'flex';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

/* =====================================================
   ESTADOS DE ERRO / LOADING
   ===================================================== */
function mostrarErroEstado() {
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('error-state').style.display  = 'flex';
}

/* =====================================================
   HELPERS
   ===================================================== */
function formatarBRL(valor) {
  return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
}

function calcularParcelas(preco) {
  if (preco >= 500) return 10;
  if (preco >= 300) return 6;
  if (preco >= 150) return 4;
  if (preco >= 50)  return 3;
  return 1;
}

function categoriaNome(cat) {
  const m = { masculino: 'Masculino', feminino: 'Feminino', unissex: 'Unissex', oferta: 'Oferta' };
  return m[cat] || cat;
}