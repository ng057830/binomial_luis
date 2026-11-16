/* ============================================
   DISTRIBUCIÓN BINOMIAL — LÓGICA INTERACTIVA
   ============================================ */

const REAL_COUNTS = { 0: 40, 1: 38, 2: 17, 3: 4, 4: 1 };
const REAL_TOTAL_LOTS = 100;
const REAL_PHAT = 88 / 2000; // 0.044

const state = {
  n: 20,
  p: 0.05,
  op: 'le',
  k: 2,
  simLots: 0,
  simCounts: {},
  simTotalDefects: 0,
  recentLots: [],
  showRealOverlay: true,
  showPhatOverlay: true,
  animating: false,
  stopRequested: false
};

// ============================================
// MATEMÁTICAS BINOMIALES
// ============================================

function comb(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let c = 1;
  const m = Math.min(k, n - k);
  for (let i = 1; i <= m; i++) {
    c = (c * (n - i + 1)) / i;
  }
  return Math.round(c);
}

function binomPMF(n, k, p) {
  if (k < 0 || k > n) return 0;
  return comb(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

function matchesCondition(x, op, k) {
  if (op === 'le') return x <= k;
  if (op === 'eq') return x === k;
  if (op === 'ge') return x >= k;
  return false;
}

function theoreticalConditionProb(n, p, op, k) {
  let sum = 0;
  for (let x = 0; x <= n; x++) {
    if (matchesCondition(x, op, k)) {
      sum += binomPMF(n, x, p);
    }
  }
  return sum;
}

function formatOpSymbol(op) {
  if (op === 'le') return '≤';
  if (op === 'eq') return '=';
  return '≥';
}

// ============================================
// NAVEGACIÓN POR PESTAÑAS Y KATEX
// ============================================

function renderMathIn(el) {
  if (typeof renderMathInElement === 'function' && el) {
    renderMathInElement(el, {
      delimiters: [
        { left: '\\[', right: '\\]', display: true },
        { left: '\\(', right: '\\)', display: false },
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ],
      throwOnError: false
    });
  }
}

function initMath() {
  renderMathIn(document.body);
}

function setupTabs() {
  const buttons = document.querySelectorAll('.toggle-btn');
  const views = document.querySelectorAll('.view');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      buttons.forEach((b) => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      views.forEach((v) => v.classList.remove('active'));
      const activeView = document.getElementById(`view-${target}`);
      activeView.classList.add('active');

      if (target === 'data') {
        renderDataChart();
      } else if (target === 'sim') {
        renderSimChart();
      }
      renderMathIn(activeView);
    });
  });
}

// ============================================
// PESTAÑA 1: SIMULADOR DE LOTES
// ============================================

function renderPiecesGrid(pieces = null) {
  const grid = document.getElementById('pieces-grid');
  grid.innerHTML = '';

  for (let i = 0; i < state.n; i++) {
    const chip = document.createElement('div');
    chip.className = 'piece-chip';
    if (pieces) {
      const isDefect = pieces[i] === 1;
      chip.classList.add(isDefect ? 'defect' : 'good');
      chip.innerHTML = `<span class="yi">${isDefect ? '1' : '0'}</span><span class="idx">P${i + 1}</span>`;
      chip.title = `Pieza ${i + 1}: ${isDefect ? 'Defectuosa (Y=1)' : 'Correcta (Y=0)'}`;
    } else {
      chip.innerHTML = `<span class="yi">?</span><span class="idx">P${i + 1}</span>`;
    }
    grid.appendChild(chip);
  }
}

function simulateSingleLotValues() {
  const pieces = [];
  let defects = 0;
  for (let i = 0; i < state.n; i++) {
    const y = Math.random() < state.p ? 1 : 0;
    pieces.push(y);
    defects += y;
  }
  return { pieces, defects };
}

function recordLot(defects) {
  state.simLots += 1;
  state.simTotalDefects += defects;
  state.simCounts[defects] = (state.simCounts[defects] || 0) + 1;
  state.recentLots.push({ lotNum: state.simLots, defects });
  if (state.recentLots.length > 24) {
    state.recentLots.shift();
  }
}

function renderLotHistory() {
  const wrap = document.getElementById('lot-history-wrap');
  const container = document.getElementById('lot-history');
  if (state.recentLots.length === 0) {
    wrap.hidden = true;
    container.innerHTML = '';
    return;
  }
  wrap.hidden = false;
  container.innerHTML = '';
  state.recentLots.forEach((item) => {
    const ok = matchesCondition(item.defects, state.op, state.k);
    const pill = document.createElement('span');
    pill.className = `lot-pill ${ok ? 'ok' : 'fail'}`;
    pill.textContent = `#${item.lotNum}: X=${item.defects}`;
    container.appendChild(pill);
  });
}

function updateLotStageUI(pieces, defects) {
  renderPiecesGrid(pieces);
  const badge = document.getElementById('lot-status-badge');
  const summary = document.getElementById('lot-summary');
  const ok = matchesCondition(defects, state.op, state.k);

  badge.className = `lot-badge ${ok ? 'ok' : 'fail'}`;
  badge.textContent = `X = ${defects} defectuosa${defects === 1 ? '' : 's'} · ${ok ? 'Cumple' : 'No cumple'} (${formatOpSymbol(state.op)} ${state.k})`;

  summary.innerHTML = `En este lote: <strong>${defects}</strong> pieza${defects === 1 ? '' : 's'} con \\(Y_i = 1\\) y <strong>${state.n - defects}</strong> con \\(Y_i = 0\\).`;
  renderMathIn(summary);
  renderLotHistory();
}

function getMsPerPiece(amount, speed) {
  const baseMap = {
    1: 35,
    10: 12,
    50: 6,
    100: 4,
    1000: 0.8
  };
  const base = baseMap[amount] ?? 4;
  const mult = speed === 'slow' ? 2.2 : speed === 'fast' ? 0.35 : 1;
  return base * mult;
}

function clearPiecesToUnknown(chips) {
  chips.forEach((chip) => {
    chip.className = 'piece-chip';
    chip.querySelector('.yi').textContent = '?';
  });
}

async function runSimulation() {
  if (state.animating) return;
  const amount = parseInt(document.getElementById('sim-amount').value, 10);
  const speed = document.getElementById('sim-speed').value;
  const msPerPiece = getMsPerPiece(amount, speed);

  state.animating = true;
  state.stopRequested = false;

  const btnRun = document.getElementById('btn-sim-run');
  const btnStop = document.getElementById('btn-sim-stop');
  const progressWrap = document.getElementById('sim-progress-wrap');
  const progressBar = document.getElementById('sim-progress-bar');
  const progressText = document.getElementById('sim-progress-text');
  const lotTitle = document.getElementById('stage-lot-title');
  const badge = document.getElementById('lot-status-badge');
  const summary = document.getElementById('lot-summary');

  btnRun.disabled = true;
  btnStop.hidden = false;
  progressWrap.hidden = false;
  progressBar.style.width = '0%';
  progressText.textContent = `0 / ${amount} lotes`;

  renderPiecesGrid(null);
  let chips = document.querySelectorAll('#pieces-grid .piece-chip');

  let lotIdx = 0;
  let pieceIdx = 0;
  let currentLot = simulateSingleLotValues();
  let lastTime = performance.now();
  let accMs = 0;

  lotTitle.textContent = `Inspeccionando lote ${lotIdx + 1} de ${amount}…`;
  badge.className = 'lot-badge';
  badge.textContent = 'Inspeccionando piezas…';

  const step = (now) => {
    if (state.stopRequested) {
      finishAnimation(true);
      return;
    }

    const dt = Math.min(100, now - lastTime);
    lastTime = now;
    accMs += dt;

    let stepsToAdvance = Math.floor(accMs / msPerPiece);
    if (stepsToAdvance > 0) {
      accMs -= stepsToAdvance * msPerPiece;
      // Limitar por frame para no bloquear el hilo de render
      stepsToAdvance = Math.min(stepsToAdvance, state.n * 2);

      let lotCompletedInFrame = false;

      while (stepsToAdvance > 0 && lotIdx < amount) {
        if (pieceIdx === 0) {
          clearPiecesToUnknown(chips);
          lotTitle.textContent = `Inspeccionando lote ${lotIdx + 1} de ${amount}…`;
        }

        const isDefect = currentLot.pieces[pieceIdx] === 1;
        const chip = chips[pieceIdx];
        chip.classList.remove('scanning');
        chip.classList.add(isDefect ? 'defect' : 'good');
        chip.querySelector('.yi').textContent = isDefect ? '1' : '0';

        pieceIdx++;
        stepsToAdvance--;

        if (pieceIdx < state.n) {
          chips[pieceIdx].classList.add('scanning');
        } else {
          // Lote completado
          recordLot(currentLot.defects);
          lotCompletedInFrame = true;
          lotIdx++;
          pieceIdx = 0;

          const ok = matchesCondition(currentLot.defects, state.op, state.k);
          badge.className = `lot-badge ${ok ? 'ok' : 'fail'}`;
          badge.textContent = `Lote #${state.simLots}: X = ${currentLot.defects} · ${ok ? 'Cumple' : 'No cumple'}`;
          summary.textContent = `Último lote completado: ${currentLot.defects} defectuosa${currentLot.defects === 1 ? '' : 's'} y ${state.n - currentLot.defects} correctas.`;

          if (lotIdx < amount) {
            currentLot = simulateSingleLotValues();
          }
        }
      }

      if (lotCompletedInFrame) {
        const pct = (lotIdx / amount) * 100;
        progressBar.style.width = `${pct.toFixed(1)}%`;
        progressText.textContent = `${lotIdx} / ${amount} lotes`;
        updateSimStats();
        renderLotHistory();
        renderSimChart();
      }
    }

    if (lotIdx < amount) {
      requestAnimationFrame(step);
    } else {
      finishAnimation(false);
    }
  };

  const finishAnimation = (stoppedEarly) => {
    btnRun.disabled = false;
    btnStop.hidden = true;
    state.animating = false;
    state.stopRequested = false;
    lotTitle.innerHTML = 'Último lote inspeccionado (\\(X = \\sum Y_i\\))';
    renderMathIn(lotTitle);
    if (stoppedEarly) {
      badge.className = 'lot-badge';
      badge.textContent = `Detenido en ${lotIdx} / ${amount} lotes`;
    } else {
      progressBar.style.width = '100%';
      progressText.textContent = `${amount} / ${amount} lotes`;
    }
  };

  requestAnimationFrame(step);
}

function resetSimulation() {
  state.stopRequested = true;
  state.simLots = 0;
  state.simCounts = {};
  state.simTotalDefects = 0;
  state.recentLots = [];
  document.getElementById('sim-progress-wrap').hidden = true;
  document.getElementById('stage-lot-title').innerHTML = 'Lote en inspección (\\(X = \\sum Y_i\\))';
  renderMathIn(document.getElementById('stage-lot-title'));
  renderPiecesGrid(null);
  renderLotHistory();
  const badge = document.getElementById('lot-status-badge');
  badge.className = 'lot-badge';
  badge.textContent = 'Esperando inspección...';
  const summary = document.getElementById('lot-summary');
  summary.innerHTML = 'Pulsa <strong>Inspeccionar Lotes</strong> para generar piezas con \\(Y_i \\sim \\text{Bernoulli}(p)\\).';
  renderMathIn(summary);
  updateSimStats();
  renderSimChart();
}

function updateSimStats() {
  const theoProb = theoreticalConditionProb(state.n, state.p, state.op, state.k);
  const theoMean = state.n * state.p;
  const theoVar = state.n * state.p * (1 - state.p);

  document.getElementById('theo-prob').textContent = `${(theoProb * 100).toFixed(2)} %`;
  const descEl = document.getElementById('theo-formula-desc');
  descEl.textContent = `P(X ${formatOpSymbol(state.op)} ${state.k}) con X ~ B(${state.n}, ${state.p.toFixed(2)})`;
  document.getElementById('theo-mean').textContent = theoMean.toFixed(2);
  document.getElementById('theo-var').textContent = theoVar.toFixed(2);

  if (state.simLots === 0) {
    document.getElementById('sim-prob').textContent = '—';
    document.getElementById('sim-count-desc').textContent = '0 lotes cumplen la condición de 0 inspeccionados';
    document.getElementById('sim-mean').textContent = '—';
    document.getElementById('sim-phat').textContent = '—';
  } else {
    let favorable = 0;
    for (const [kStr, count] of Object.entries(state.simCounts)) {
      if (matchesCondition(parseInt(kStr, 10), state.op, state.k)) {
        favorable += count;
      }
    }
    const simProb = (favorable / state.simLots) * 100;
    const simMean = state.simTotalDefects / state.simLots;
    const simPhat = state.simTotalDefects / (state.simLots * state.n);

    document.getElementById('sim-prob').textContent = `${simProb.toFixed(2)} %`;
    document.getElementById('sim-count-desc').textContent = `${favorable} lotes cumplen la condición de ${state.simLots} inspeccionados`;
    document.getElementById('sim-mean').textContent = simMean.toFixed(2);
    document.getElementById('sim-phat').textContent = `${simPhat.toFixed(4)} (${(simPhat * 100).toFixed(2)}%)`;
  }
}

function setupSimulatorControls() {
  const inputN = document.getElementById('input-n');
  const inputP = document.getElementById('input-p');
  const inputOp = document.getElementById('input-op');
  const inputK = document.getElementById('input-k');

  const syncLabels = () => {
    document.getElementById('val-n').textContent = state.n;
    document.getElementById('val-p').textContent = `${state.p.toFixed(2)} (${(state.p * 100).toFixed(0)}%)`;
    document.getElementById('val-cond-label').textContent = `X ${formatOpSymbol(state.op)} ${state.k}`;
    inputK.max = state.n;
  };

  inputN.addEventListener('input', () => {
    state.n = parseInt(inputN.value, 10);
    if (state.k > state.n) {
      state.k = state.n;
      inputK.value = state.k;
    }
    syncLabels();
    resetSimulation();
  });

  inputP.addEventListener('input', () => {
    state.p = parseFloat(inputP.value);
    syncLabels();
    resetSimulation();
  });

  inputOp.addEventListener('change', () => {
    state.op = inputOp.value;
    syncLabels();
    updateSimStats();
    renderSimChart();
  });

  inputK.addEventListener('input', () => {
    let val = parseInt(inputK.value, 10);
    if (isNaN(val)) val = 0;
    val = Math.max(0, Math.min(state.n, val));
    state.k = val;
    syncLabels();
    updateSimStats();
    renderSimChart();
  });

  document.getElementById('btn-sim-run').addEventListener('click', runSimulation);
  document.getElementById('btn-sim-stop').addEventListener('click', () => {
    state.stopRequested = true;
  });
  document.getElementById('btn-sim-reset').addEventListener('click', resetSimulation);

  document.getElementById('btn-sim-default').addEventListener('click', () => {
    state.n = 20;
    state.p = 0.05;
    state.op = 'le';
    state.k = 2;
    inputN.value = 20;
    inputP.value = 0.05;
    inputOp.value = 'le';
    inputK.value = 2;
    syncLabels();
    resetSimulation();
  });

  document.getElementById('toggle-real-overlay').addEventListener('change', (e) => {
    state.showRealOverlay = e.target.checked;
    document.getElementById('legend-real').style.display = state.showRealOverlay ? 'inline-flex' : 'none';
    renderSimChart();
  });

  syncLabels();
  renderPiecesGrid(null);
  updateSimStats();
  renderSimChart();
}

// ============================================
// GRÁFICOS SVG INTERACTIVOS
// ============================================

function showTooltip(evt, html) {
  const tt = document.getElementById('chart-tooltip');
  tt.innerHTML = html;
  tt.hidden = false;
  tt.style.left = `${Math.min(window.innerWidth - 220, evt.clientX + 12)}px`;
  tt.style.top = `${Math.max(10, evt.clientY - 40)}px`;
}

function hideTooltip() {
  document.getElementById('chart-tooltip').hidden = true;
}

function buildGroupedBarSVG({ maxK, series, highlightCond = null }) {
  const width = 760;
  const height = 300;
  const padL = 48;
  const padR = 16;
  const padT = 20;
  const padB = 42;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  let maxY = 0.05;
  for (let k = 0; k <= maxK; k++) {
    series.forEach((s) => {
      if (s.values[k] > maxY) maxY = s.values[k];
    });
  }
  maxY = Math.ceil(maxY * 10) / 10;
  if (maxY < 0.2) maxY = 0.2;

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'chart-svg');

  // Líneas guía horizontales
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = (maxY * i) / steps;
    const y = padT + plotH - (val / maxY) * plotH;

    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', padL);
    line.setAttribute('x2', width - padR);
    line.setAttribute('y1', y);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', 'rgba(28,27,24,0.1)');
    line.setAttribute('stroke-dasharray', i === 0 ? '' : '3,3');
    svg.appendChild(line);

    const lbl = document.createElementNS(ns, 'text');
    lbl.setAttribute('x', padL - 8);
    lbl.setAttribute('y', y + 4);
    lbl.setAttribute('text-anchor', 'end');
    lbl.setAttribute('font-size', '11');
    lbl.setAttribute('fill', '#6B6A66');
    lbl.textContent = `${(val * 100).toFixed(0)}%`;
    svg.appendChild(lbl);
  }

  const groupW = plotW / (maxK + 1);
  const activeCount = series.length;
  const barW = Math.max(6, Math.min(20, (groupW * 0.75) / activeCount));
  const totalBarsW = barW * activeCount + (activeCount - 1) * 2;

  for (let k = 0; k <= maxK; k++) {
    const gx = padL + k * groupW;

    if (highlightCond && highlightCond(k)) {
      const bg = document.createElementNS(ns, 'rect');
      bg.setAttribute('x', gx + 2);
      bg.setAttribute('y', padT);
      bg.setAttribute('width', groupW - 4);
      bg.setAttribute('height', plotH);
      bg.setAttribute('fill', 'rgba(24, 95, 165, 0.06)');
      bg.setAttribute('rx', '4');
      svg.appendChild(bg);
    }

    const startX = gx + (groupW - totalBarsW) / 2;

    series.forEach((s, idx) => {
      const val = s.values[k] || 0;
      const barH = (val / maxY) * plotH;
      const bx = startX + idx * (barW + 2);
      const by = padT + plotH - barH;

      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', bx);
      rect.setAttribute('y', by);
      rect.setAttribute('width', barW);
      rect.setAttribute('height', Math.max(1, barH));
      rect.setAttribute('fill', s.color);
      rect.setAttribute('rx', '2');
      rect.style.cursor = 'pointer';

      rect.addEventListener('mousemove', (evt) => {
        const lines = series
          .map((item) => `<span style="color:${item.lightColor || '#fff'}">● ${item.label}:</span> <strong>${((item.values[k] || 0) * 100).toFixed(2)}%</strong>`)
          .join('<br>');
        showTooltip(evt, `<strong>X = ${k} defectuosa${k === 1 ? '' : 's'}</strong><br>${lines}`);
      });
      rect.addEventListener('mouseleave', hideTooltip);
      svg.appendChild(rect);
    });

    const xLbl = document.createElementNS(ns, 'text');
    xLbl.setAttribute('x', gx + groupW / 2);
    xLbl.setAttribute('y', height - 16);
    xLbl.setAttribute('text-anchor', 'middle');
    xLbl.setAttribute('font-size', '12');
    xLbl.setAttribute('font-weight', highlightCond && highlightCond(k) ? '700' : '400');
    xLbl.setAttribute('fill', highlightCond && highlightCond(k) ? '#185FA5' : '#6B6A66');
    xLbl.textContent = k;
    svg.appendChild(xLbl);
  }

  const axisTitle = document.createElementNS(ns, 'text');
  axisTitle.setAttribute('x', padL + plotW / 2);
  axisTitle.setAttribute('y', height - 2);
  axisTitle.setAttribute('text-anchor', 'middle');
  axisTitle.setAttribute('font-size', '11');
  axisTitle.setAttribute('fill', '#6B6A66');
  axisTitle.textContent = 'Número de piezas defectuosas (k)';
  svg.appendChild(axisTitle);

  return svg;
}

function renderSimChart() {
  const wrapper = document.getElementById('sim-chart-wrapper');
  wrapper.innerHTML = '';

  const maxK = Math.min(state.n, Math.max(7, state.k + 2, Math.round(state.n * state.p + 4 * Math.sqrt(state.n * state.p * (1 - state.p)))));

  const theoVals = {};
  const simVals = {};
  const realVals = {};

  for (let k = 0; k <= maxK; k++) {
    theoVals[k] = binomPMF(state.n, k, state.p);
    simVals[k] = state.simLots > 0 ? (state.simCounts[k] || 0) / state.simLots : 0;
    realVals[k] = (REAL_COUNTS[k] || 0) / REAL_TOTAL_LOTS;
  }

  const series = [
    { label: `Teórica B(${state.n}, ${state.p.toFixed(2)})`, color: '#185FA5', lightColor: '#7cb8f7', values: theoVals },
    { label: 'Simulada', color: '#639922', lightColor: '#a3d962', values: simVals }
  ];

  if (state.showRealOverlay) {
    series.push({ label: '100 lotes reales', color: '#8B5CF6', lightColor: '#c4b5fd', values: realVals });
  }

  const svg = buildGroupedBarSVG({
    maxK,
    series,
    highlightCond: (k) => matchesCondition(k, state.op, state.k)
  });
  wrapper.appendChild(svg);
}

function renderDataChart() {
  const wrapper = document.getElementById('data-chart-wrapper');
  wrapper.innerHTML = '';

  const maxK = 6;
  const theoVals = {};
  const realVals = {};
  const phatVals = {};

  for (let k = 0; k <= maxK; k++) {
    theoVals[k] = binomPMF(20, k, 0.05);
    realVals[k] = (REAL_COUNTS[k] || 0) / REAL_TOTAL_LOTS;
    phatVals[k] = binomPMF(20, k, REAL_PHAT);
  }

  const series = [
    { label: 'Teórica (p=0.05)', color: '#185FA5', lightColor: '#7cb8f7', values: theoVals },
    { label: 'Observada (100 lotes)', color: '#8B5CF6', lightColor: '#c4b5fd', values: realVals }
  ];

  if (state.showPhatOverlay) {
    series.push({ label: 'Modelo empírico (p̂=0.044)', color: '#D97706', lightColor: '#fcd34d', values: phatVals });
  }

  const svg = buildGroupedBarSVG({
    maxK,
    series,
    highlightCond: (k) => k <= 2
  });
  wrapper.appendChild(svg);
}

// ============================================
// PESTAÑA 2: EXPLORADOR DE k EN TEORÍA
// ============================================

function setupTheoryExplorer() {
  const slider = document.getElementById('explorer-k');
  const valLabel = document.getElementById('explorer-k-val');
  const resultBox = document.getElementById('explorer-result');

  const update = () => {
    const k = parseInt(slider.value, 10);
    valLabel.textContent = `k = ${k}`;
    const c = comb(20, k);
    const pk = Math.pow(0.05, k);
    const qnk = Math.pow(0.95, 20 - k);
    const prob = c * pk * qnk;

    resultBox.innerHTML = `
      <div>\\( P(X = ${k}) = \\binom{20}{${k}} (0.05)^{${k}} (0.95)^{${20 - k}} \\)</div>
      <div style="margin-top:0.45rem;">
        Combinaciones: <strong>\\(\\binom{20}{${k}} = ${c.toLocaleString('es-ES')}\\)</strong> ·
        Probabilidad: <strong style="color:var(--primary);">${prob.toFixed(6)} (${(prob * 100).toFixed(2)} %)</strong>
      </div>
    `;
    renderMathIn(resultBox);
  };

  slider.addEventListener('input', update);
  update();
}

// ============================================
// PESTAÑA 3: DATOS REALES Y DESCARGA CSV
// ============================================

function setupDataTab() {
  document.getElementById('toggle-phat-overlay').addEventListener('change', (e) => {
    state.showPhatOverlay = e.target.checked;
    document.getElementById('legend-phat').style.display = state.showPhatOverlay ? 'inline-flex' : 'none';
    renderDataChart();
  });

  document.getElementById('btn-download-csv').addEventListener('click', () => {
    const rows = ['lote_id,tamano_lote,piezas_defectuosas'];
    let lotId = 1;
    for (const [defects, count] of Object.entries(REAL_COUNTS)) {
      for (let i = 0; i < count; i++) {
        rows.push(`${lotId},20,${defects}`);
        lotId++;
      }
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lotes_fabrica_100.csv';
    a.click();
    URL.revokeObjectURL(url);
  });
}

// ============================================
// PESTAÑA 4: MINI-QUIZ INTERACTIVO
// ============================================

const QUIZ_DATA = [
  {
    q: '1. En cada pieza individual \\(Y_i\\), ¿por qué llamamos "éxito" a que la pieza sea defectuosa?',
    options: [
      'Porque a la fábrica le conviene tener defectos',
      'Porque en estadística "éxito" (Y=1) es simplemente el resultado que queremos contar',
      'Porque p siempre debe ser mayor que 0.5'
    ],
    correct: 1,
    explanation: 'Correcto: en una variable de Bernoulli, "éxito" es solo una etiqueta matemática para el suceso que estamos contando (en este caso, pieza defectuosa).'
  },
  {
    q: '2. ¿Cuántas combinaciones posibles existen para encontrar exactamente 2 piezas defectuosas en un lote de 20 (\\(\\binom{20}{2}\\))?',
    options: ['20', '40', '190', '380'],
    correct: 2,
    explanation: '\\(\\binom{20}{2} = \\frac{20 \\cdot 19}{2 \\cdot 1} = 190\\) maneras distintas de ubicar las 2 piezas defectuosas.'
  },
  {
    q: '3. Según el modelo \\(X \\sim B(20, 0.05)\\), ¿cuál es la probabilidad de que un lote tenga como máximo 2 piezas defectuosas?',
    options: ['35,85 %', '73,59 %', '92,45 %', '95,00 %'],
    correct: 2,
    explanation: '\\(P(X \\le 2) = P(X=0) + P(X=1) + P(X=2) \\approx 0.3585 + 0.3774 + 0.1887 \\approx 0.9245\\) (92,45 %).'
  },
  {
    q: '4. En los 100 lotes registrados (2.000 piezas) hubo 88 defectos. ¿Qué representa \\(\\hat{p} = \\frac{88}{2000} = 0.044\\)?',
    options: [
      'La varianza de los lotes observados',
      'La estimación empírica de la probabilidad de defecto por pieza',
      'El número esperado de defectos por lote'
    ],
    correct: 1,
    explanation: '\\(\\hat{p} = 0.044\\) (4,4 %) es la tasa de defectos observada en los datos reales, que contrastamos con el parámetro teórico \\(p = 0.05\\) (5 %).'
  },
  {
    q: '5. Para \\(X \\sim B(20, 0.05)\\), ¿cuáles son la esperanza \\(E[X]\\) y la varianza \\(\\operatorname{Var}(X)\\)?',
    options: [
      'E[X] = 1 y Var(X) = 0.95',
      'E[X] = 0.95 y Var(X) = 1',
      'E[X] = 2 y Var(X) = 1.90'
    ],
    correct: 0,
    explanation: '\\(E[X] = np = 20(0.05) = 1\\) defecto esperado por lote, y \\(\\operatorname{Var}(X) = np(1-p) = 20(0.05)(0.95) = 0.95\\).'
  }
];

function setupQuiz() {
  const listEl = document.getElementById('quiz-list');
  const scoreEl = document.getElementById('quiz-score');
  let answered = {};

  const renderQuiz = () => {
    answered = {};
    scoreEl.textContent = `Puntuación: 0 / ${QUIZ_DATA.length}`;
    listEl.innerHTML = '';

    QUIZ_DATA.forEach((item, qIdx) => {
      const card = document.createElement('div');
      card.className = 'quiz-item';

      const qTitle = document.createElement('div');
      qTitle.className = 'quiz-q';
      qTitle.innerHTML = item.q;
      card.appendChild(qTitle);

      const optsDiv = document.createElement('div');
      optsDiv.className = 'quiz-options';

      const fb = document.createElement('div');
      fb.className = 'quiz-feedback';

      item.options.forEach((optText, oIdx) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt';
        btn.innerHTML = optText;
        btn.addEventListener('click', () => {
          if (answered[qIdx] !== undefined) return;
          answered[qIdx] = oIdx === item.correct;

          const allBtns = optsDiv.querySelectorAll('.quiz-opt');
          allBtns.forEach((b, i) => {
            b.disabled = true;
            if (i === item.correct) b.classList.add('correct');
            else if (i === oIdx) b.classList.add('wrong');
          });

          fb.className = `quiz-feedback show ${oIdx === item.correct ? 'ok' : 'bad'}`;
          fb.innerHTML = item.explanation;
          renderMathIn(fb);

          const totalOk = Object.values(answered).filter(Boolean).length;
          scoreEl.textContent = `Puntuación: ${totalOk} / ${QUIZ_DATA.length}`;
        });
        optsDiv.appendChild(btn);
      });

      card.appendChild(optsDiv);
      card.appendChild(fb);
      listEl.appendChild(card);
    });

    renderMathIn(listEl);
  };

  document.getElementById('btn-quiz-reset').addEventListener('click', renderQuiz);
  renderQuiz();
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupSimulatorControls();
  setupTheoryExplorer();
  setupDataTab();
  setupQuiz();
  renderDataChart();
  initMath();
});
