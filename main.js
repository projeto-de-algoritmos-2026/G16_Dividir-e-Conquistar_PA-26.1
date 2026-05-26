/**
 * Etapa 1 — Setup inicial: layout, canvas vazio e painel estático.
 */

const estado = { largura: 0, altura: 0 };
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
  desenharRadarVazio();
}

function desenharRadarVazio() {
  const { largura: w, altura: h } = estado;
  ctx.fillStyle = "#0d1520";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(0, 230, 118, 0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.38, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(0, 230, 118, 0.5)";
  ctx.font = "14px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Radar pronto — aguardando aeronaves", w / 2, h / 2);
}

function atualizarSlider() {
  saidaQtd.textContent = Number(slider.value).toLocaleString("pt-BR");
}

function init() {
  redimensionarCanvas();
  atualizarSlider();
  slider.addEventListener("input", atualizarSlider);
  window.addEventListener("resize", redimensionarCanvas);
}

init();
