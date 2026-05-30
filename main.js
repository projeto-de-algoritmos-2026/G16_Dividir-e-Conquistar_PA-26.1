/**
 * Radar ATS — Par de Pontos Mais Próximos
 * Proximidade instantânea + trajetórias ilustrativas + zoom
 */

const CONFIG = {
  MARGEM: 24,
  RAIO_PONTO: 2.5,
  LIMITE_TRAFEGO: 3500,
  ZOOM_MIN: 0.35,
  ZOOM_MAX: 12,
  VELOCIDADE_MIN: 0.28,
  VELOCIDADE_MAX: 0.55,
  MARGEM_SAIDA: 40,
};

const estado = {
  pontos: [],
  largura: 0,
  altura: 0,
  metaQuantidade: 100,
  linhaCorteX: null,
  parDestaque: null,
  regiaoEsq: false,
  regiaoDir: false,
  mostrarFaixa: false,
  faixaDelta: null,
  dcPasso: null,
  analiseFinalizada: false,
  trafegoAtivo: true,
};

let proximoIdAeronave = 0;

const camera = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

const viz = {
  tempo: 0,
  ultimoTick: 0,
  sweep: 0,
  pulse: 0,
  cutProgress: 0,
  spawnProgress: 1,
  modoVarredura: false,
  animando: false,
  congelado: false,
  rafId: null,
};

const pan = {
  ativo: false,
  ultimoX: 0,
  ultimoY: 0,
};

const canvas = document.getElementById("radar");
const ctx = canvas.getContext("2d", { alpha: false });
const canvasWrap = document.getElementById("canvas-wrap");

const slider = document.getElementById("qtd-aviões");
const saidaQtd = document.getElementById("qtd-valor");
const btnAnalise = document.getElementById("btn-analise");
const btnRegenerar = document.getElementById("btn-regenerar");
const btnZoomIn = document.getElementById("btn-zoom-in");
const btnZoomOut = document.getElementById("btn-zoom-out");
const btnZoomReset = document.getElementById("btn-zoom-reset");
const elZoomValor = document.getElementById("zoom-valor");

const elDistMin = document.getElementById("dist-min");
const elTempoBruta = document.getElementById("tempo-bruta");
const elTempoDc = document.getElementById("tempo-dc");
const elCompBruta = document.getElementById("comparacao-bruta");
const elCompDc = document.getElementById("comparacao-dc");
const elRatioBox = document.getElementById("ratio-box");
const elRatioValor = document.getElementById("ratio-valor");

const elBadge = document.getElementById("status-badge");
const elStatusTitulo = document.getElementById("status-titulo");
const elStatusTexto = document.getElementById("status-texto");
const elProgressWrap = document.getElementById("progress-wrap");
const elProgressBar = document.getElementById("progress-bar");
const elProgressLabel = document.getElementById("progress-label");
const passosEl = document.querySelectorAll(".passo");

function posExibicao(p) {
  return { x: p.x, y: p.y };
}

function posAlgoritmo(p) {
  return { x: p.ax, y: p.ay };
}

function distanciaQuadradoCoords(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function distanciaEntre(p, q) {
  const a = posAlgoritmo(p);
  const b = posAlgoritmo(q);
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function limitesRadar() {
  return {
    minX: CONFIG.MARGEM,
    minY: CONFIG.MARGEM,
    maxX: estado.largura - CONFIG.MARGEM,
    maxY: estado.altura - CONFIG.MARGEM,
  };
}

function velocidadeAleatoria() {
  const ang = Math.random() * Math.PI * 2;
  const vel =
    CONFIG.VELOCIDADE_MIN +
    Math.random() * (CONFIG.VELOCIDADE_MAX - CONFIG.VELOCIDADE_MIN);
  return { vx: Math.cos(ang) * vel, vy: Math.sin(ang) * vel };
}

function criarAeronaveDentro() {
  const b = limitesRadar();
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  const { vx, vy } = velocidadeAleatoria();
  const x = b.minX + Math.random() * w;
  const y = b.minY + Math.random() * h;
  return {
    id: proximoIdAeronave++,
    x,
    y,
    ax: x,
    ay: y,
    vx,
    vy,
    opacidade: 0.85 + Math.random() * 0.15,
  };
}

function criarAeronaveEntrando() {
  const b = limitesRadar();
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  const lado = Math.floor(Math.random() * 4);
  let x;
  let y;

  switch (lado) {
    case 0:
      x = b.minX + Math.random() * w;
      y = b.minY - 20 - Math.random() * CONFIG.MARGEM_SAIDA;
      break;
    case 1:
      x = b.minX + Math.random() * w;
      y = b.maxY + 20 + Math.random() * CONFIG.MARGEM_SAIDA;
      break;
    case 2:
      x = b.minX - 20 - Math.random() * CONFIG.MARGEM_SAIDA;
      y = b.minY + Math.random() * h;
      break;
    default:
      x = b.maxX + 20 + Math.random() * CONFIG.MARGEM_SAIDA;
      y = b.minY + Math.random() * h;
      break;
  }

  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const dx = cx - x;
  const dy = cy - y;
  const mag = Math.hypot(dx, dy) || 1;
  const vel =
    CONFIG.VELOCIDADE_MIN +
    Math.random() * (CONFIG.VELOCIDADE_MAX - CONFIG.VELOCIDADE_MIN);

  return {
    id: proximoIdAeronave++,
    x,
    y,
    ax: x,
    ay: y,
    vx: (dx / mag) * vel,
    vy: (dy / mag) * vel,
    opacidade: 0,
  };
}

function saiuDoRadar(p) {
  const b = limitesRadar();
  const pad = CONFIG.MARGEM_SAIDA;
  return (
    p.x < b.minX - pad ||
    p.x > b.maxX + pad ||
    p.y < b.minY - pad ||
    p.y > b.maxY + pad
  );
}

function definirStatus(badge, titulo, texto, classe = "") {
  elBadge.textContent = badge;
  elBadge.className = "status-badge" + (classe ? " " + classe : "");
  elStatusTitulo.textContent = titulo;
  elStatusTexto.textContent = texto;
}

const ORDEM_PASSOS = ["idle", "bruta", "dc", "done"];

function definirPassoAtivo(id) {
  const idx = ORDEM_PASSOS.indexOf(id);
  passosEl.forEach((el) => {
    const p = el.dataset.passo;
    const pi = ORDEM_PASSOS.indexOf(p);
    el.classList.remove("ativo", "concluido");
    if (p === id) el.classList.add("ativo");
    else if (pi >= 0 && pi < idx) el.classList.add("concluido");
  });
}

function definirProgresso(pct) {
  const v = Math.min(100, Math.max(0, pct));
  elProgressBar.style.setProperty("--progress", v + "%");
  elProgressLabel.textContent = Math.round(v) + "%";
}

function atualizarLabelZoom() {
  elZoomValor.textContent = Math.round(camera.scale * 100) + "%";
}

function resetarCamera() {
  camera.scale = 1;
  camera.offsetX = 0;
  camera.offsetY = 0;
  atualizarLabelZoom();
}

function aplicarZoom(novaEscala, focalX, focalY) {
  const escala = Math.min(CONFIG.ZOOM_MAX, Math.max(CONFIG.ZOOM_MIN, novaEscala));
  const wx = (focalX - camera.offsetX) / camera.scale;
  const wy = (focalY - camera.offsetY) / camera.scale;
  camera.scale = escala;
  camera.offsetX = focalX - wx * escala;
  camera.offsetY = focalY - wy * escala;
  atualizarLabelZoom();
}

function coordsCanvas(evento) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: evento.clientX - rect.left,
    y: evento.clientY - rect.top,
  };
}

async function animarCameraPara(mx, my, escalaAlvo, duracao = 850) {
  const ox0 = camera.offsetX;
  const oy0 = camera.offsetY;
  const s0 = camera.scale;
  const rect = canvas.getBoundingClientRect();
  const focalX = rect.width / 2;
  const focalY = rect.height / 2;
  const ox1 = focalX - mx * escalaAlvo;
  const oy1 = focalY - my * escalaAlvo;
  const inicio = performance.now();

  return new Promise((resolve) => {
    const step = (now) => {
      const u = Math.min(1, (now - inicio) / duracao);
      const e = u * u * (3 - 2 * u);
      camera.scale = s0 + (escalaAlvo - s0) * e;
      camera.offsetX = ox0 + (ox1 - ox0) * e;
      camera.offsetY = oy0 + (oy1 - oy0) * e;
      atualizarLabelZoom();
      if (u < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

function iniciarLoopAnimacao() {
  if (viz.rafId) return;
  viz.ultimoTick = performance.now();

  const tick = (agora) => {
    const dt = Math.min(32, agora - viz.ultimoTick);
    viz.ultimoTick = agora;
    viz.tempo = agora;
    viz.sweep += 0.011;
    viz.pulse = (Math.sin(agora * 0.005) + 1) * 0.5;

    if (
      estado.trafegoAtivo &&
      !viz.congelado &&
      !viz.animando &&
      viz.spawnProgress >= 1
    ) {
      atualizarTrafego(dt);
    }

    desenharCena();
    viz.rafId = requestAnimationFrame(tick);
  };
  viz.rafId = requestAnimationFrame(tick);
}

function redimensionarCanvas() {
  const rect = canvasWrap.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  estado.largura = Math.floor(rect.width);
  estado.altura = Math.floor(rect.height);
  canvas.width = estado.largura * dpr;
  canvas.height = estado.altura * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  desenharCena();
}

function inicializarTrafego(quantidade) {
  proximoIdAeronave = 0;
  estado.metaQuantidade = quantidade;
  estado.trafegoAtivo = quantidade <= CONFIG.LIMITE_TRAFEGO;
  const pontos = [];
  for (let i = 0; i < quantidade; i++) {
    pontos.push(criarAeronaveDentro());
  }
  return pontos;
}

function atualizarTrafego(dt) {
  if (!estado.trafegoAtivo) return;

  const passo = (dt / 16) * 1.05;
  const meta = estado.metaQuantidade;
  const maxSpawnsPorFrame = Math.max(2, Math.ceil(meta / 200));

  for (let i = estado.pontos.length - 1; i >= 0; i--) {
    const p = estado.pontos[i];
    p.x += p.vx * passo;
    p.y += p.vy * passo;

    if (p.opacidade < 1) {
      p.opacidade = Math.min(1, p.opacidade + (dt / 500));
    }

    if (saiuDoRadar(p)) {
      estado.pontos.splice(i, 1);
    }
  }

  let criados = 0;
  while (estado.pontos.length < meta && criados < maxSpawnsPorFrame) {
    estado.pontos.push(criarAeronaveEntrando());
    criados++;
  }
}

function congelarEspacoAereo() {
  viz.congelado = true;
  for (const p of estado.pontos) {
    p.ax = p.x;
    p.ay = p.y;
  }
}

function travarAposAnalise() {
  estado.analiseFinalizada = true;
  viz.congelado = true;
  slider.disabled = true;
  btnAnalise.disabled = true;
  btnRegenerar.disabled = false;
}

function liberarRadar() {
  estado.analiseFinalizada = false;
  viz.congelado = false;
  slider.disabled = false;
  btnAnalise.disabled = false;
}

function desenharFundoTela() {
  ctx.fillStyle = "#0a121c";
  ctx.fillRect(0, 0, estado.largura, estado.altura);
}

function desenharGrade() {
  const { largura: w, altura: h } = estado;
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, "#0e1824");
  g.addColorStop(1, "#080e14");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const passo = 48 / Math.max(0.5, camera.scale);
  ctx.strokeStyle = "rgba(0, 200, 140, 0.05)";
  ctx.lineWidth = 1 / camera.scale;
  for (let x = 0; x <= w; x += passo) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += passo) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  const cx = w / 2;
  const cy = h / 2;
  const raio = Math.min(w, h) * 0.42;
  ctx.strokeStyle = "rgba(0, 230, 118, 0.35)";
  ctx.lineWidth = 2 / camera.scale;
  ctx.beginPath();
  ctx.arc(cx, cy, raio, 0, Math.PI * 2);
  ctx.stroke();
}

function desenharVarredura() {
  if (!viz.modoVarredura) return;
  const { largura: w, altura: h } = estado;
  const cx = w / 2;
  const cy = h / 2;
  const raio = Math.min(w, h) * 0.45;
  const ang = viz.sweep;

  ctx.save();
  ctx.strokeStyle = "rgba(0, 230, 118, 0.55)";
  ctx.lineWidth = 2 / camera.scale;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(ang) * raio, cy + Math.sin(ang) * raio);
  ctx.stroke();
  ctx.restore();
}

function desenharRegioes(corteX) {
  if (corteX == null || (!estado.regiaoEsq && !estado.regiaoDir)) return;
  const { largura: w, altura: h } = estado;
  const prog = Math.max(viz.cutProgress, estado.regiaoEsq || estado.regiaoDir ? 1 : 0);
  const xCorte = corteX;

  if (estado.regiaoEsq) {
    ctx.fillStyle = "rgba(66, 165, 245, 0.12)";
    ctx.fillRect(0, 0, xCorte, h);
    ctx.fillStyle = "rgba(66, 165, 245, 0.95)";
    ctx.font = `bold ${13 / camera.scale}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("ESQUERDA — subproblema", xCorte / 2, 36 / camera.scale);
  }
  if (estado.regiaoDir) {
    ctx.fillStyle = "rgba(255, 183, 77, 0.12)";
    ctx.fillRect(xCorte, 0, w - xCorte, h);
    ctx.fillStyle = "rgba(255, 183, 77, 0.95)";
    ctx.font = `bold ${13 / camera.scale}px system-ui`;
    ctx.textAlign = "center";
    ctx.fillText("DIREITA — subproblema", xCorte + (w - xCorte) / 2, 36 / camera.scale);
  }
}

function desenharFaixaCentral(corteX) {
  if (!estado.mostrarFaixa || corteX == null || estado.faixaDelta == null) return;
  const { altura: h } = estado;
  const d = estado.faixaDelta;
  const x0 = corteX - d;
  const larguraFaixa = d * 2;

  ctx.fillStyle = "rgba(186, 104, 255, 0.18)";
  ctx.fillRect(x0, 0, larguraFaixa, h);
  ctx.strokeStyle = "rgba(186, 104, 255, 0.75)";
  ctx.lineWidth = 2 / camera.scale;
  ctx.setLineDash([6 / camera.scale, 4 / camera.scale]);
  ctx.strokeRect(x0, 0, larguraFaixa, h);
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(220, 180, 255, 0.95)";
  ctx.font = `bold ${12 / camera.scale}px system-ui`;
  ctx.textAlign = "center";
  ctx.fillText("FAIXA CENTRAL — cruzar fronteira", corteX, 56 / camera.scale);
  ctx.font = `${10 / camera.scale}px system-ui`;
  ctx.fillText(
    `até ${MAX_VIZINHOS_FAIXA} vizinhos em y · 2δ ≈ ${larguraFaixa.toFixed(0)} px`,
    corteX,
    72 / camera.scale
  );
}

function desenharLinhaCorte(x) {
  if (x == null) return;
  const prog = viz.cutProgress;
  const w = estado.largura;
  const cx = w / 2;
  const xAnim = prog >= 1 ? x : cx + (x - cx) * prog;

  ctx.save();
  ctx.strokeStyle = "rgba(66, 165, 245, 0.85)";
  ctx.lineWidth = 2.5 / camera.scale;
  ctx.setLineDash([10 / camera.scale, 6 / camera.scale]);
  ctx.beginPath();
  ctx.moveTo(xAnim, 0);
  ctx.lineTo(xAnim, estado.altura);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(66, 165, 245, 0.95)";
  ctx.font = `bold ${11 / camera.scale}px system-ui`;
  ctx.textAlign = "center";
  ctx.fillText("DIVIDIR (eixo x)", xAnim, estado.altura - 18 / camera.scale);
  ctx.restore();
}

function pontoNaFaixa(p) {
  if (!estado.mostrarFaixa || estado.linhaCorteX == null || estado.faixaDelta == null) {
    return false;
  }
  const { x } = posExibicao(p);
  return Math.abs(x - estado.linhaCorteX) < estado.faixaDelta;
}

function corAeronave(p, par) {
  if (par && (p.id === par[0].id || p.id === par[1].id)) return "#ff8a80";
  if (estado.mostrarFaixa && pontoNaFaixa(p)) return "#ce93d8";
  if (estado.dcPasso === "esq" && estado.regiaoEsq) {
    const x = posExibicao(p).x;
    if (estado.linhaCorteX != null && x < estado.linhaCorteX) return "#81d4fa";
  }
  if (estado.dcPasso === "dir" && estado.regiaoDir) {
    const x = posExibicao(p).x;
    if (estado.linhaCorteX != null && x >= estado.linhaCorteX) return "#ffcc80";
  }
  return "#4dd0a8";
}

function desenharAeronaves(pontos) {
  const par = estado.parDestaque;

  for (const p of pontos) {
    const { x, y } = posExibicao(p);
    const emRisco = par && (p.id === par[0].id || p.id === par[1].id);
    const op = p.opacidade != null ? p.opacidade : 1;
    ctx.globalAlpha = op;
    ctx.fillStyle = corAeronave(p, par);
    ctx.beginPath();
    ctx.arc(x, y, CONFIG.RAIO_PONTO / camera.scale + (emRisco ? 1 : 0), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function desenharParPerigo(p1, p2) {
  if (!p1 || !p2) return;
  const a = posExibicao(p1);
  const b = posExibicao(p2);
  const pulse = 1 + viz.pulse * 0.4;
  const dist = Math.hypot(a.x - b.x, a.y - b.y);
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;

  ctx.save();
  ctx.strokeStyle = "#ff5252";
  ctx.lineWidth = (2.5 + viz.pulse * 2) / camera.scale;
  ctx.shadowColor = "rgba(255, 82, 82, 0.9)";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.restore();

  for (const p of [a, b]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, (5 * pulse) / camera.scale, 0, Math.PI * 2);
    ctx.fillStyle = "#ff5252";
    ctx.fill();
  }

  const label = dist.toFixed(1) + " px";
  const alerta = "ALERTA — PROXIMIDADE";
  ctx.textAlign = "center";
  ctx.font = `bold ${10 / camera.scale}px system-ui`;
  ctx.fillStyle = "rgba(255, 183, 77, 0.95)";
  ctx.fillText(alerta, mx, my - 42 / camera.scale);

  ctx.font = `bold ${12 / camera.scale}px system-ui`;
  ctx.fillStyle = "rgba(20, 8, 10, 0.92)";
  const tw = ctx.measureText(label).width;
  ctx.fillRect(mx - tw / 2 - 8, my - 28 / camera.scale, tw + 16, 22 / camera.scale);
  ctx.fillStyle = "#ff8a80";
  ctx.fillText(label, mx, my - 14 / camera.scale);
}

function desenharCena() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  desenharFundoTela();

  ctx.save();
  ctx.translate(camera.offsetX, camera.offsetY);
  ctx.scale(camera.scale, camera.scale);

  desenharGrade();
  desenharRegioes(estado.linhaCorteX);
  desenharFaixaCentral(estado.linhaCorteX);
  desenharAeronaves(estado.pontos);
  desenharVarredura();
  desenharLinhaCorte(estado.linhaCorteX);
  if (estado.parDestaque) {
    desenharParPerigo(estado.parDestaque[0], estado.parDestaque[1]);
  }

  ctx.restore();
}

function limparResultados() {
  elDistMin.textContent = "—";
  elTempoBruta.textContent = "—";
  elTempoDc.textContent = "—";
  elCompBruta.textContent = "";
  elCompDc.textContent = "";
  elRatioBox.hidden = true;
  estado.mostrarFaixa = false;
  estado.faixaDelta = null;
  estado.dcPasso = null;
}

function particionarListasY(pontosY, idsEsquerda) {
  const esqY = [];
  const dirY = [];
  for (let i = 0; i < pontosY.length; i++) {
    const p = pontosY[i];
    if (idsEsquerda.has(p.id)) esqY.push(p);
    else dirY.push(p);
  }
  return { esqY, dirY };
}

/** Dados do 1º merge — mesma lógica de dividirConquistarRec no nível raiz. */
function dadosPrimeiroNivelDc(pontos) {
  const pontosX = [...pontos].sort(
    (a, b) => posAlgoritmo(a).x - posAlgoritmo(b).x
  );
  const pontosY = [...pontos].sort(
    (a, b) => posAlgoritmo(a).y - posAlgoritmo(b).y
  );
  const meio = Math.floor(pontosX.length / 2);
  const pm = posAlgoritmo(pontosX[meio]);
  const esquerdaX = pontosX.slice(0, meio);
  const direitaX = pontosX.slice(meio);

  const idsEsq = new Set();
  for (let i = 0; i < meio; i++) idsEsq.add(esquerdaX[i].id);
  const { esqY, dirY } = particionarListasY(pontosY, idsEsq);

  const resEsq = dividirConquistarRec(esquerdaX, esqY);
  const resDir = dividirConquistarRec(direitaX, dirY);
  const melhorSub = menorPar(resEsq, resDir);
  const delta = melhorSub.distancia;
  const faixa = pontosY.filter(
    (p) => Math.abs(posAlgoritmo(p).x - pm.x) < delta
  );

  return {
    cutX: pm.x,
    delta,
    qtdEsq: esquerdaX.length,
    qtdDir: direitaX.length,
    qtdFaixa: faixa.length,
    distEsq: resEsq.distancia,
    distDir: resDir.distancia,
  };
}

async function demonstrarPassosDc(pontos) {
  const dados = dadosPrimeiroNivelDc(pontos);
  const { cutX, delta, qtdEsq, qtdDir, qtdFaixa, distEsq, distDir } = dados;
  const deltaTxt =
    delta === Infinity ? "—" : `${delta.toFixed(2)} px`;

  estado.regiaoEsq = false;
  estado.regiaoDir = false;
  estado.mostrarFaixa = false;
  estado.faixaDelta = null;
  estado.parDestaque = null;
  viz.cutProgress = 0;

  definirPassoAtivo("dc");
  estado.dcPasso = "corte";
  definirStatus(
    "D&C — Dividir",
    "Passo 1: cortar o plano (nível raiz)",
    "Ordena por x e divide em dois subproblemas. Cada metade será resolvida recursivamente.",
    "dc"
  );
  definirProgresso(70);
  await animarCorte(cutX);
  viz.cutProgress = 1;
  await sleep(1200);

  estado.dcPasso = "esq";
  estado.regiaoEsq = true;
  const txtEsq =
    distEsq === Infinity
      ? "subproblema pequeno"
      : `menor par recursivo: ${distEsq.toFixed(2)} px`;
  definirStatus(
    "D&C — Conquistar",
    "Passo 2: metade esquerda (recursivo)",
    `${qtdEsq.toLocaleString("pt-BR")} pontos · ${txtEsq}.`,
    "dc"
  );
  definirProgresso(76);
  await sleep(1400);

  estado.dcPasso = "dir";
  estado.regiaoDir = true;
  const txtDir =
    distDir === Infinity
      ? "subproblema pequeno"
      : `menor par recursivo: ${distDir.toFixed(2)} px`;
  definirStatus(
    "D&C — Conquistar",
    "Passo 3: metade direita (recursivo)",
    `${qtdDir.toLocaleString("pt-BR")} pontos · ${txtDir}.`,
    "dc"
  );
  definirProgresso(82);
  await sleep(1400);

  estado.dcPasso = "faixa";
  estado.mostrarFaixa = true;
  estado.faixaDelta = delta === Infinity ? null : delta;
  definirStatus(
    "D&C — Combinar",
    "Passo 4: faixa central (strip)",
    `δ = ${deltaTxt} (menor distância das metades). ${qtdFaixa.toLocaleString("pt-BR")} pontos na faixa · cada um compara com no máximo 7 vizinhos em y.`,
    "dc"
  );
  definirProgresso(88);
  await sleep(1600);

  return { cutX, delta, qtdFaixa };
}

async function animarSpawnRapido() {
  viz.spawnProgress = 0;
  const duracao = 450;
  const inicio = performance.now();
  return new Promise((resolve) => {
    const step = (now) => {
      viz.spawnProgress = Math.min(1, (now - inicio) / duracao);
      if (viz.spawnProgress < 1) requestAnimationFrame(step);
      else {
        viz.spawnProgress = 1;
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}

async function animarCorte(x) {
  estado.linhaCorteX = x;
  viz.cutProgress = 0;
  const inicio = performance.now();
  const duracao = 1100;

  return new Promise((resolve) => {
    const step = (now) => {
      viz.cutProgress = Math.min(1, (now - inicio) / duracao);
      if (viz.cutProgress < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

function forcaBruta(pontos) {
  let minDistSq = Infinity;
  let p1 = null;
  let p2 = null;
  for (let i = 0; i < pontos.length - 1; i++) {
    const pi = posAlgoritmo(pontos[i]);
    for (let j = i + 1; j < pontos.length; j++) {
      const pj = posAlgoritmo(pontos[j]);
      const d = distanciaQuadradoCoords(pi.x, pi.y, pj.x, pj.y);
      if (d < minDistSq) {
        minDistSq = d;
        p1 = pontos[i];
        p2 = pontos[j];
      }
    }
  }
  return { distancia: Math.sqrt(minDistSq), p1, p2 };
}

function menorPar(a, b) {
  if (!a || a.distancia === Infinity) return b;
  if (!b || b.distancia === Infinity) return a;
  return a.distancia <= b.distancia ? a : b;
}

/** Strip merge — no máximo 7 vizinhos seguintes em y (O(n log n) garantido). */
const MAX_VIZINHOS_FAIXA = 7;

function faixaCentral(pontosOrdenadosY, delta, melhorAtual) {
  if (delta === Infinity) return melhorAtual;

  let melhor = melhorAtual;
  const n = pontosOrdenadosY.length;

  for (let i = 0; i < n; i++) {
    const pi = posAlgoritmo(pontosOrdenadosY[i]);
    const jMax = Math.min(i + MAX_VIZINHOS_FAIXA + 1, n);
    for (let j = i + 1; j < jMax; j++) {
      const pj = posAlgoritmo(pontosOrdenadosY[j]);
      if (pj.y - pi.y >= delta) break;
      const dSq = distanciaQuadradoCoords(pi.x, pi.y, pj.x, pj.y);
      if (dSq < melhor.distancia * melhor.distancia) {
        melhor = {
          distancia: Math.sqrt(dSq),
          p1: pontosOrdenadosY[i],
          p2: pontosOrdenadosY[j],
        };
      }
    }
  }
  return melhor;
}

function dividirConquistarRec(pontosX, pontosY) {
  const n = pontosX.length;
  if (n <= 3) return forcaBruta(pontosX);

  const meio = Math.floor(n / 2);
  const pm = posAlgoritmo(pontosX[meio]);
  const esquerdaX = pontosX.slice(0, meio);
  const direitaX = pontosX.slice(meio);

  const idsEsq = new Set();
  for (let i = 0; i < meio; i++) idsEsq.add(esquerdaX[i].id);
  const { esqY, dirY } = particionarListasY(pontosY, idsEsq);

  let melhor = menorPar(
    dividirConquistarRec(esquerdaX, esqY),
    dividirConquistarRec(direitaX, dirY)
  );
  const delta = melhor.distancia;
  const faixa = pontosY.filter(
    (p) => Math.abs(posAlgoritmo(p).x - pm.x) < delta
  );
  melhor = faixaCentral(faixa, delta, melhor);
  return melhor;
}

function dividirConquistar(pontos) {
  const pontosX = [...pontos].sort(
    (a, b) => posAlgoritmo(a).x - posAlgoritmo(b).x
  );
  const pontosY = [...pontos].sort(
    (a, b) => posAlgoritmo(a).y - posAlgoritmo(b).y
  );
  const linhaCorteX = posAlgoritmo(pontosX[Math.floor(pontosX.length / 2)]).x;
  return { ...dividirConquistarRec(pontosX, pontosY), linhaCorteX };
}

async function rodarAnalise() {
  if (estado.pontos.length < 2 || viz.animando) return;

  viz.animando = true;
  btnAnalise.disabled = true;
  btnRegenerar.disabled = true;
  elProgressWrap.hidden = false;
  limparResultados();

  estado.linhaCorteX = null;
  estado.parDestaque = null;
  estado.regiaoEsq = false;
  estado.regiaoDir = false;
  viz.cutProgress = 0;
  viz.modoVarredura = false;

  congelarEspacoAereo();
  iniciarLoopAnimacao();

  const n = estado.pontos.length;
  const pares = ((n * (n - 1)) / 2).toLocaleString("pt-BR");

  definirPassoAtivo("idle");
  definirStatus(
    "Congelado",
    "Instante capturado no radar",
    `${n.toLocaleString("pt-BR")} aeronaves paradas. Buscando o par com menor distância (alerta de proximidade).`,
    ""
  );
  definirProgresso(15);
  await sleep(700);

  definirPassoAtivo("bruta");
  definirStatus(
    "Força Bruta",
    "Varredura O(n²)",
    `Comparando ${pares} pares no instante congelado.`,
    "bruta"
  );
  viz.modoVarredura = true;
  definirProgresso(30);
  await sleep(n > 8000 ? 500 : 900);

  const inicioBruta = performance.now();
  const resBruta = forcaBruta(estado.pontos);
  const tempoBruta = performance.now() - inicioBruta;

  viz.modoVarredura = false;
  estado.parDestaque = [resBruta.p1, resBruta.p2];
  elDistMin.textContent = resBruta.distancia.toFixed(2);
  elTempoBruta.textContent = tempoBruta.toFixed(2);
  elCompBruta.textContent = `${pares} pares comparados`;

  definirProgresso(48);
  const pb = posAlgoritmo(resBruta.p1);
  const pbx = posAlgoritmo(resBruta.p2);
  const mx = (pb.x + pbx.x) / 2;
  const my = (pb.y + pbx.y) / 2;
  const zoomAlvo = Math.min(7, Math.max(2.2, 140 / resBruta.distancia));
  await animarCameraPara(mx, my, zoomAlvo);

  definirStatus(
    "Alerta",
    "Par mais próximo — em alerta",
    `Distância ${resBruta.distancia.toFixed(2)} px (${tempoBruta.toFixed(2)} ms). Essas duas aeronaves estão mais próximas que qualquer outro par.`,
    "bruta"
  );
  definirProgresso(58);
  await sleep(n > 8000 ? 900 : 1600);

  const dadosDcVis = await demonstrarPassosDc(estado.pontos);

  const inicioDc = performance.now();
  const resDc = dividirConquistar(estado.pontos);
  const tempoDc = performance.now() - inicioDc;

  estado.dcPasso = "resultado";
  estado.linhaCorteX = resDc.linhaCorteX || dadosDcVis.cutX;
  estado.regiaoEsq = true;
  estado.regiaoDir = true;
  estado.mostrarFaixa = true;
  estado.faixaDelta =
    dadosDcVis.delta === Infinity ? null : dadosDcVis.delta;
  estado.parDestaque = [resDc.p1, resDc.p2];
  elDistMin.textContent = resDc.distancia.toFixed(2);
  elTempoDc.textContent = tempoDc.toFixed(2);
  elCompDc.textContent = "Mesmo par em alerta confirmado";

  await animarCameraPara(mx, my, zoomAlvo);
  definirProgresso(100);

  const ratio = tempoBruta > 0 && tempoDc > 0 ? tempoBruta / tempoDc : 0;
  if (ratio > 1.05) {
    elRatioBox.hidden = false;
    elRatioValor.textContent = ratio.toFixed(1) + "×";
  }

  definirPassoAtivo("done");
  definirStatus(
    "Congelado",
    "Análise concluída — radar parado",
    `Par em alerta: ${resDc.distancia.toFixed(2)} px. Bruta ${tempoBruta.toFixed(2)} ms · D&C ${tempoDc.toFixed(2)} ms. Clique em Reset para novo tráfego.`,
    "done"
  );

  await sleep(400);
  elProgressWrap.hidden = true;
  viz.animando = false;
  travarAposAnalise();
}

function aplicarMetaQuantidade() {
  const qtd = Number(slider.value);
  estado.metaQuantidade = qtd;
  saidaQtd.textContent = qtd.toLocaleString("pt-BR");
}

async function reiniciarTrafego(animar = true) {
  const qtd = Number(slider.value);
  aplicarMetaQuantidade();
  liberarRadar();
  viz.animando = false;
  estado.pontos = inicializarTrafego(qtd);
  estado.linhaCorteX = null;
  estado.parDestaque = null;
  estado.regiaoEsq = false;
  estado.regiaoDir = false;
  estado.mostrarFaixa = false;
  estado.faixaDelta = null;
  estado.dcPasso = null;
  viz.modoVarredura = false;
  viz.cutProgress = 0;
  resetarCamera();
  limparResultados();

  const trafegoTxt = estado.trafegoAtivo
    ? "Aeronaves entram e saem do radar continuamente."
    : "Muitas aeronaves: exibição estática (performance). Análise congela o instante.";

  definirPassoAtivo("idle");
  definirStatus(
    "Pronto",
    "Tráfego aéreo ativo",
    `${qtd.toLocaleString("pt-BR")} no espaço. ${trafegoTxt} Clique em Rodar Análise para congelar.`,
    ""
  );

  iniciarLoopAnimacao();
  if (animar) await animarSpawnRapido();
  else viz.spawnProgress = 1;
}

function configurarZoomPan() {
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const c = coordsCanvas(e);
      const fator = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      aplicarZoom(camera.scale * fator, c.x, c.y);
    },
    { passive: false }
  );

  canvas.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    pan.ativo = true;
    pan.ultimoX = e.clientX;
    pan.ultimoY = e.clientY;
    canvas.classList.add("arrastando");
  });

  window.addEventListener("mousemove", (e) => {
    if (!pan.ativo) return;
    camera.offsetX += e.clientX - pan.ultimoX;
    camera.offsetY += e.clientY - pan.ultimoY;
    pan.ultimoX = e.clientX;
    pan.ultimoY = e.clientY;
  });

  window.addEventListener("mouseup", () => {
    pan.ativo = false;
    canvas.classList.remove("arrastando");
  });

  btnZoomIn.addEventListener("click", () => {
    const c = { x: estado.largura / 2, y: estado.altura / 2 };
    aplicarZoom(camera.scale * 1.35, c.x, c.y);
  });
  btnZoomOut.addEventListener("click", () => {
    const c = { x: estado.largura / 2, y: estado.altura / 2 };
    aplicarZoom(camera.scale / 1.35, c.x, c.y);
  });
  btnZoomReset.addEventListener("click", resetarCamera);
}

function init() {
  redimensionarCanvas();
  reiniciarTrafego(false);
  configurarZoomPan();
  atualizarLabelZoom();

  slider.addEventListener("input", () => {
    if (!estado.analiseFinalizada) aplicarMetaQuantidade();
  });
  slider.addEventListener("change", () => {
    if (!estado.analiseFinalizada) reiniciarTrafego(true);
  });
  btnAnalise.addEventListener("click", rodarAnalise);
  btnRegenerar.addEventListener("click", () => reiniciarTrafego(true));
  window.addEventListener("resize", redimensionarCanvas);
}

init();
