/**
 * Etapa 5 — Versão final (idêntica à raiz do projeto).
 * Radar ATS — Par de Pontos Mais Próximos
 * Força Bruta O(n²) vs Dividir e Conquistar O(n log n)
 */

const MARGEM = 12;
const RAIO_PONTO = 1.5;

const estado = {
  pontos: [],
  largura: 0,
  altura: 0,
  linhaCorteX: null,
  parDestaque: null,
};

const canvas = document.getElementById("radar");
const ctx = canvas.getContext("2d", { alpha: false });
const slider = document.getElementById("qtd-aviões");
const saidaQtd = document.getElementById("qtd-valor");
const btnAnalise = document.getElementById("btn-analise");
const elDistMin = document.getElementById("dist-min");
const elTempoBruta = document.getElementById("tempo-bruta");
const elTempoDc = document.getElementById("tempo-dc");

function distanciaQuadrado(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function distancia(a, b) {
  return Math.sqrt(distanciaQuadrado(a, b));
}

function redimensionarCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  estado.largura = Math.floor(rect.width);
  estado.altura = Math.floor(rect.height);
  canvas.width = estado.largura * dpr;
  canvas.height = estado.altura * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  desenharCena();
}

function gerarPontos(quantidade) {
  const pontos = [];
  const w = Math.max(0, estado.largura - 2 * MARGEM);
  const h = Math.max(0, estado.altura - 2 * MARGEM);
  for (let i = 0; i < quantidade; i++) {
    pontos.push({
      x: MARGEM + Math.random() * w,
      y: MARGEM + Math.random() * h,
      id: i,
    });
  }
  return pontos;
}

function desenharGrade() {
  const { largura: w, altura: h } = estado;
  ctx.fillStyle = "#0d1520";
  ctx.fillRect(0, 0, w, h);

  const passo = 40;
  ctx.strokeStyle = "rgba(0, 180, 120, 0.06)";
  ctx.lineWidth = 1;
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
  ctx.strokeStyle = "rgba(0, 220, 150, 0.12)";
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  ctx.lineTo(cx, h);
  ctx.moveTo(0, cy);
  ctx.lineTo(w, cy);
  ctx.stroke();

  ctx.strokeStyle = "rgba(0, 230, 118, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(w, h) * 0.38, 0, Math.PI * 2);
  ctx.stroke();
}

function desenharLinhaCorte(x) {
  if (x == null) return;
  ctx.save();
  ctx.strokeStyle = "rgba(100, 181, 246, 0.9)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.shadowColor = "rgba(100, 181, 246, 0.5)";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, estado.altura);
  ctx.stroke();
  ctx.restore();
}

function desenharAeronaves(pontos) {
  ctx.fillStyle = "#4dd0a8";
  for (let i = 0; i < pontos.length; i++) {
    const p = pontos[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, RAIO_PONTO, 0, Math.PI * 2);
    ctx.fill();
  }
}

function desenharParPerigo(p1, p2) {
  if (!p1 || !p2) return;

  ctx.save();
  ctx.strokeStyle = "#ff1744";
  ctx.lineWidth = 3;
  ctx.shadowColor = "rgba(255, 23, 68, 0.8)";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.restore();

  for (const p of [p1, p2]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ff1744";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function desenharCena() {
  desenharGrade();
  desenharAeronaves(estado.pontos);
  desenharLinhaCorte(estado.linhaCorteX);
  if (estado.parDestaque) {
    desenharParPerigo(estado.parDestaque[0], estado.parDestaque[1]);
  }
}

function atualizarPontos() {
  const qtd = Number(slider.value);
  saidaQtd.textContent = qtd.toLocaleString("pt-BR");
  estado.pontos = gerarPontos(qtd);
  estado.linhaCorteX = null;
  estado.parDestaque = null;
  limparResultados();
  desenharCena();
}

function limparResultados() {
  elDistMin.textContent = "—";
  elTempoBruta.textContent = "—";
  elTempoDc.textContent = "—";
}

/** Força Bruta — O(n²): compara todos os pares de pontos. */
function forcaBruta(pontos) {
  let minDistSq = Infinity;
  let p1 = null;
  let p2 = null;

  for (let i = 0; i < pontos.length - 1; i++) {
    for (let j = i + 1; j < pontos.length; j++) {
      const d = distanciaQuadrado(pontos[i], pontos[j]);
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

/** Faixa central (strip): verifica pares a até δ de distância da linha de corte. */
function faixaCentral(pontosOrdenadosY, delta, melhorAtual) {
  let melhor = melhorAtual;

  for (let i = 0; i < pontosOrdenadosY.length; i++) {
    const pi = pontosOrdenadosY[i];
    for (let j = i + 1; j < pontosOrdenadosY.length; j++) {
      const pj = pontosOrdenadosY[j];
      if (pj.y - pi.y >= delta) break;

      const d = distancia(pi, pj);
      if (d < melhor.distancia) {
        melhor = { distancia: d, p1: pi, p2: pj };
      }
    }
  }

  return melhor;
}

/** Dividir e Conquistar — O(n log n): recursão + merge na faixa central. */
function dividirConquistarRec(pontosX, pontosY) {
  const n = pontosX.length;
  if (n <= 3) return forcaBruta(pontosX);

  const meio = Math.floor(n / 2);
  const pMedio = pontosX[meio];
  const esquerdaX = pontosX.slice(0, meio);
  const direitaX = pontosX.slice(meio);

  const conjuntoEsquerda = new Set(esquerdaX);
  const esquerdaY = [];
  const direitaY = [];
  for (const p of pontosY) {
    if (conjuntoEsquerda.has(p)) esquerdaY.push(p);
    else direitaY.push(p);
  }

  const resEsq = dividirConquistarRec(esquerdaX, esquerdaY);
  const resDir = dividirConquistarRec(direitaX, direitaY);
  let melhor = menorPar(resEsq, resDir);

  const delta = melhor.distancia;
  const faixa = pontosY.filter((p) => Math.abs(p.x - pMedio.x) < delta);
  melhor = faixaCentral(faixa, delta, melhor);

  return melhor;
}

function dividirConquistar(pontos) {
  const pontosX = [...pontos].sort((a, b) => a.x - b.x);
  const pontosY = [...pontos].sort((a, b) => a.y - b.y);
  const linhaCorteX = pontosX[Math.floor(pontosX.length / 2)].x;
  const resultado = dividirConquistarRec(pontosX, pontosY);
  return { ...resultado, linhaCorteX };
}

async function rodarAnalise() {
  if (estado.pontos.length < 2) return;

  btnAnalise.disabled = true;
  estado.linhaCorteX = null;
  estado.parDestaque = null;
  limparResultados();
  desenharCena();

  await new Promise((resolve) => requestAnimationFrame(resolve));

  const inicioBruta = performance.now();
  const resBruta = forcaBruta(estado.pontos);
  const tempoBruta = performance.now() - inicioBruta;

  estado.parDestaque = [resBruta.p1, resBruta.p2];
  elDistMin.textContent = resBruta.distancia.toFixed(2);
  elTempoBruta.textContent = tempoBruta.toFixed(2);
  desenharCena();

  await new Promise((resolve) => requestAnimationFrame(resolve));

  const inicioDc = performance.now();
  const resDc = dividirConquistar(estado.pontos);
  const tempoDc = performance.now() - inicioDc;

  estado.linhaCorteX = resDc.linhaCorteX;
  estado.parDestaque = [resDc.p1, resDc.p2];
  elDistMin.textContent = resDc.distancia.toFixed(2);
  elTempoDc.textContent = tempoDc.toFixed(2);
  desenharCena();

  btnAnalise.disabled = false;
}

function init() {
  redimensionarCanvas();
  atualizarPontos();
  slider.addEventListener("input", atualizarPontos);
  btnAnalise.addEventListener("click", rodarAnalise);
  window.addEventListener("resize", redimensionarCanvas);
}

init();
