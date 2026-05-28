
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
  ctx.strokeStyle = "rgba(0, 230, 118, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.38, 0, Math.PI * 2);
  ctx.stroke();
}

function desenharLinhaCorte(x) {
  if (x == null) return;
  ctx.save();
  ctx.strokeStyle = "rgba(100, 181, 246, 0.9)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, estado.altura);
  ctx.stroke();
  ctx.restore();
}

function desenharAeronaves(pontos) {
  ctx.fillStyle = "#4dd0a8";
  for (const p of pontos) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, RAIO_PONTO, 0, Math.PI * 2);
    ctx.fill();
  }
}

function desenharParPerigo(p1, p2) {
  if (!p1 || !p2) return;
  ctx.strokeStyle = "#ff1744";
  ctx.lineWidth = 3;
  ctx.shadowColor = "rgba(255, 23, 68, 0.8)";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.shadowBlur = 0;
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
  elDistMin.textContent = elTempoBruta.textContent = elTempoDc.textContent = "—";
  desenharCena();
}

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

function faixaCentral(pontosY, delta, melhor) {
  let m = melhor;
  for (let i = 0; i < pontosY.length; i++) {
    for (let j = i + 1; j < pontosY.length; j++) {
      if (pontosY[j].y - pontosY[i].y >= delta) break;
      const d = distancia(pontosY[i], pontosY[j]);
      if (d < m.distancia) m = { distancia: d, p1: pontosY[i], p2: pontosY[j] };
    }
  }
  return m;
}

function dividirConquistarRec(pontosX, pontosY) {
  const n = pontosX.length;
  if (n <= 3) return forcaBruta(pontosX);

  const meio = Math.floor(n / 2);
  const pMedio = pontosX[meio];
  const esquerdaX = pontosX.slice(0, meio);
  const direitaX = pontosX.slice(meio);
  const setEsq = new Set(esquerdaX);
  const esqY = [];
  const dirY = [];
  for (const p of pontosY) {
    if (setEsq.has(p)) esqY.push(p);
    else dirY.push(p);
  }

  let melhor = menorPar(
    dividirConquistarRec(esquerdaX, esqY),
    dividirConquistarRec(direitaX, dirY)
  );
  const delta = melhor.distancia;
  const faixa = pontosY.filter((p) => Math.abs(p.x - pMedio.x) < delta);
  return faixaCentral(faixa, delta, melhor);
}

function dividirConquistar(pontos) {
  const pontosX = [...pontos].sort((a, b) => a.x - b.x);
  const pontosY = [...pontos].sort((a, b) => a.y - b.y);
  const linhaCorteX = pontosX[Math.floor(pontosX.length / 2)].x;
  return { ...dividirConquistarRec(pontosX, pontosY), linhaCorteX };
}

async function rodarAnalise() {
  if (estado.pontos.length < 2) return;
  btnAnalise.disabled = true;
  estado.linhaCorteX = null;
  estado.parDestaque = null;
  elDistMin.textContent = elTempoBruta.textContent = elTempoDc.textContent = "—";
  desenharCena();

  await new Promise((r) => requestAnimationFrame(r));

  const t0 = performance.now();
  const resBruta = forcaBruta(estado.pontos);
  elTempoBruta.textContent = (performance.now() - t0).toFixed(2);
  estado.parDestaque = [resBruta.p1, resBruta.p2];
  elDistMin.textContent = resBruta.distancia.toFixed(2);
  desenharCena();

  await new Promise((r) => requestAnimationFrame(r));

  const t1 = performance.now();
  const resDc = dividirConquistar(estado.pontos);
  elTempoDc.textContent = (performance.now() - t1).toFixed(2);
  estado.linhaCorteX = resDc.linhaCorteX;
  estado.parDestaque = [resDc.p1, resDc.p2];
  elDistMin.textContent = resDc.distancia.toFixed(2);
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
