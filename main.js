
const MARGEM = 12;
const RAIO_PONTO = 1.5;

const estado = { pontos: [], largura: 0, altura: 0 };
const canvas = document.getElementById("radar");
const ctx = canvas.getContext("2d", { alpha: false });
const slider = document.getElementById("qtd-aviões");
const saidaQtd = document.getElementById("qtd-valor");

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

  ctx.strokeStyle = "rgba(0, 230, 118, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.38, 0, Math.PI * 2);
  ctx.stroke();
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

function desenharCena() {
  desenharGrade();
  desenharAeronaves(estado.pontos);
}

function atualizarPontos() {
  const qtd = Number(slider.value);
  saidaQtd.textContent = qtd.toLocaleString("pt-BR");
  estado.pontos = gerarPontos(qtd);
  desenharCena();
}

function init() {
  redimensionarCanvas();
  atualizarPontos();
  slider.addEventListener("input", atualizarPontos);
  window.addEventListener("resize", redimensionarCanvas);
}

init();
