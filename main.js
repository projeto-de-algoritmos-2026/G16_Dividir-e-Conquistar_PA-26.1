/**
 * Etapa 3 — Força Bruta O(n²): distância, tempo e linha vermelha.
 */

const MARGEM = 12;
const RAIO_PONTO = 1.5;

const estado = { pontos: [], largura: 0, altura: 0, parDestaque: null };
const canvas = document.getElementById("radar");
const ctx = canvas.getContext("2d", { alpha: false });
const slider = document.getElementById("qtd-aviões");
const saidaQtd = document.getElementById("qtd-valor");
const btnAnalise = document.getElementById("btn-analise");
const elDistMin = document.getElementById("dist-min");
const elTempoBruta = document.getElementById("tempo-bruta");

function distanciaQuadrado(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
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
  if (estado.parDestaque) {
    desenharParPerigo(estado.parDestaque[0], estado.parDestaque[1]);
  }
}

function atualizarPontos() {
  const qtd = Number(slider.value);
  saidaQtd.textContent = qtd.toLocaleString("pt-BR");
  estado.pontos = gerarPontos(qtd);
  estado.parDestaque = null;
  elDistMin.textContent = "—";
  elTempoBruta.textContent = "—";
  desenharCena();
}

/** Força Bruta — O(n²) */
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

function rodarAnalise() {
  if (estado.pontos.length < 2) return;
  btnAnalise.disabled = true;

  const inicio = performance.now();
  const resultado = forcaBruta(estado.pontos);
  const tempo = performance.now() - inicio;

  estado.parDestaque = [resultado.p1, resultado.p2];
  elDistMin.textContent = resultado.distancia.toFixed(2);
  elTempoBruta.textContent = tempo.toFixed(2);
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
