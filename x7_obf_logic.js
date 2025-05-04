
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const size = 15;
const rows = canvas.height / size;
const cols = canvas.width / size;
const stepDelay = 40;
const slowDelay = stepDelay + 70;
const fadeDurationDefault = 400;
const fadeDurationSlow = 1200;

let barrierMode = false, repolarMode = false, pacemakerMode = false, slowConductionMode = false, paceActive = false;
let isMouseDown = false, paintAction = null;
let hideObstacles = false;
let selectPixelMode = false;
let selectedPixel = { row: rows - 1, col: 0 };

const barrierToggle = document.getElementById('barrierToggle');
const repolarToggle = document.getElementById('repolarToggle');
const slowConductionToggle = document.getElementById('slowConductionToggle');
const pacemakerToggle = document.getElementById('pacemakerToggle');
const paceModeToggle = document.getElementById('paceModeToggle');
const visibilityToggle = document.getElementById('visibilityToggle');
const selectPixelButton = document.getElementById('selectPixelButton');
const pacemakerEntries = document.getElementById('pacemakerEntries');
const resetButton = document.getElementById('resetButton');
const circleBlockButton = document.getElementById('circleBlockButton');
const diamondBlockButton = document.getElementById('diamondBlockButton');

let grid = Array.from({ length: rows }, () =>
  Array.from({ length: cols }, () => ({
    value: 0, time: 0,
    barrier: false,
    repolarizeSlow: false,
    pacemaker: false,
    slowConduction: false,
    paceRate: 60,
    lastPaceTime: performance.now()
  }))
);

barrierToggle.onclick = () => { barrierMode = !barrierMode; repolarMode = pacemakerMode = slowConductionMode = false; updateButtons(); };
repolarToggle.onclick = () => { repolarMode = !repolarMode; barrierMode = pacemakerMode = slowConductionMode = false; updateButtons(); };
slowConductionToggle.onclick = () => { slowConductionMode = !slowConductionMode; barrierMode = repolarMode = pacemakerMode = false; updateButtons(); };
pacemakerToggle.onclick = () => { pacemakerMode = !pacemakerMode; barrierMode = repolarMode = slowConductionMode = false; updateButtons(); };
paceModeToggle.onclick = () => { paceActive = !paceActive; updateButtons(); };
visibilityToggle.onclick = () => {
  hideObstacles = !hideObstacles;
  visibilityToggle.textContent = hideObstacles
    ? "👁️ Show Only Activation Waves: ON"
    : "👁️ Show Only Activation Waves: OFF";
};
selectPixelButton.onclick = () => {
  selectPixelMode = !selectPixelMode;
  selectPixelButton.textContent = selectPixelMode
    ? "📍 Select Pixel to Monitor: ON"
    : "📍 Select Pixel to Monitor: OFF";
};

circleBlockButton.onclick = () => {
const centerX = Math.floor(cols / 2);
const centerY = Math.floor(rows / 2);
const radius = Math.floor(Math.min(cols, rows) / 2) - 2;

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const dist = Math.sqrt((c - centerX) ** 2 + (r - centerY) ** 2);
    if (dist >= radius - 1 && dist <= radius + 1) {
      grid[r][c].barrier = true;
      grid[r][c].repolarizeSlow = false;
      grid[r][c].slowConduction = false;
      grid[r][c].pacemaker = false;
    }
  }
}
};

diamondBlockButton.onclick = () => {
const centerX = Math.floor(cols / 2);
const centerY = Math.floor(rows / 2);
const maxDist = Math.floor((Math.min(cols, rows) / 2)) - 2;

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const manhattan = Math.abs(r - centerY) + Math.abs(c - centerX);
    if (manhattan >= maxDist - 1 && manhattan <= maxDist + 1) {
      grid[r][c].barrier = true;
      grid[r][c].repolarizeSlow = false;
      grid[r][c].slowConduction = false;
      grid[r][c].pacemaker = false;
    }
  }
}
};




function updateButtons() {
  barrierToggle.textContent = barrierMode ? "🔴 Conduction blocks: ON" : "🔴 Conduction blocks: OFF";
  repolarToggle.textContent = repolarMode ? "🟫 Slow repolarization: ON" : "🟫 Slow repolarization: OFF";
  slowConductionToggle.textContent = slowConductionMode ? "🟩 Slow conduction: ON" : "🟩 Slow conduction: OFF";
  pacemakerToggle.textContent = pacemakerMode ? "💙 Add Pacemakers: ON" : "💙 Add Pacemakers: OFF";
  paceModeToggle.textContent = paceActive ? "⚡ PACE Mode: ON" : "⚡ PACE Mode: OFF";
}

canvas.addEventListener('mousedown', (e) => {
  const { row, col } = getMousePos(e);
  if (selectPixelMode) {
    selectedPixel = { row, col };
    selectPixelMode = false;
    selectPixelButton.textContent = "📍 Select Pixel to Monitor: OFF";
    return;
  }
  isMouseDown = true;
  const cell = grid[row][col];
  if (barrierMode) paintAction = cell.barrier ? "remove" : "add";
  else if (repolarMode) paintAction = cell.repolarizeSlow ? "remove" : "add";
  else if (slowConductionMode) paintAction = cell.slowConduction ? "remove" : "add";
  else if (pacemakerMode) paintAction = cell.pacemaker ? "remove" : "add";
  paintCell(row, col, paintAction);
});

canvas.addEventListener('mousemove', (e) => {
  if (!isMouseDown) return;
  const { row, col } = getMousePos(e);
  paintCell(row, col, paintAction);
});
window.addEventListener('mouseup', () => {
  isMouseDown = false;
  paintAction = null;
});

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  return { col: Math.floor(x / size), row: Math.floor(y / size) };
}

function paintCell(row, col, overrideAction = null) {
  if (col < 0 || col >= cols || row < 0 || row >= rows) return;
  const cell = grid[row][col];
  if (barrierMode) {
    const action = overrideAction || (cell.barrier ? "remove" : "add");
    cell.barrier = (action === "add");
    if (cell.barrier) cell.repolarizeSlow = cell.pacemaker = cell.slowConduction = false;
  } else if (repolarMode) {
    const action = overrideAction || (cell.repolarizeSlow ? "remove" : "add");
    cell.repolarizeSlow = (action === "add");
    if (cell.repolarizeSlow) cell.barrier = cell.pacemaker = cell.slowConduction = false;
  } else if (slowConductionMode) {
    const action = overrideAction || (cell.slowConduction ? "remove" : "add");
    cell.slowConduction = (action === "add");
    if (cell.slowConduction) cell.barrier = cell.repolarizeSlow = cell.pacemaker = false;
  } else if (pacemakerMode) {
    const action = overrideAction || (cell.pacemaker ? "remove" : "add");
    cell.pacemaker = (action === "add");
    if (cell.pacemaker) {
      cell.barrier = cell.repolarizeSlow = cell.slowConduction = false;
      cell.paceRate = 60;
      cell.lastPaceTime = performance.now();
    }
    updatePacemakerList();
  } else if (cell.value <= 0.2 && !cell.barrier) {
    startWave(row, col);
  }
}

function startWave(startRow, startCol) {
  const queue = [[startRow, startCol]];
  const nextWaves = new Map();

  function addToWave(delay, r, c) {
    if (!nextWaves.has(delay)) nextWaves.set(delay, []);
    nextWaves.get(delay).push([r, c]);
  }

  function propagateWave() {
    if (queue.length === 0 && nextWaves.size === 0) return;
    const current = queue.splice(0);
    for (const [r, c] of current) {
      const cell = grid[r][c];
      if (cell.barrier || cell.value > 0.2) continue;
      cell.value = 1;
      cell.time = performance.now();
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr, nc = c + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          const neighbor = grid[nr][nc];
          if (neighbor.barrier || neighbor.value > 0.2) continue;
          const distance = Math.sqrt(dr * dr + dc * dc);
          const delay = Math.round((neighbor.slowConduction ? slowDelay * 1.5 : stepDelay) * distance);
          addToWave(delay, nr, nc);
        }
      }
    }
    for (const [delay, list] of nextWaves) {
      setTimeout(() => {
        queue.push(...list);
        propagateWave();
      }, delay);
    }
    nextWaves.clear();
  }

  propagateWave();
}

function update() {
  const now = performance.now();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (cell.value > 0) {
        const duration = cell.repolarizeSlow ? fadeDurationSlow : fadeDurationDefault;
        const elapsed = now - cell.time;
        if (elapsed > duration) cell.value = 0;
        else cell.value = Math.max(0, 1 - elapsed / duration);
      }
      if (paceActive && cell.pacemaker && now - cell.lastPaceTime >= 1000 * 60 / cell.paceRate) {
        startWave(r, c);
        cell.lastPaceTime = now;
      }
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (cell.repolarizeSlow && !hideObstacles) ctx.fillStyle = "gray";
      else if (cell.barrier && !hideObstacles) ctx.fillStyle = "red";
      else if (cell.slowConduction && !hideObstacles) ctx.fillStyle = "green";
      else {
        const val = Math.floor((1 - cell.value) * 255);
        ctx.fillStyle = `rgb(${val},${val},255)`;
      }
      ctx.fillRect(c * size + 0.5, r * size + 0.5, size - 1, size - 1);
      if (cell.pacemaker) {
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 2;
        ctx.strokeRect(c * size + 0.5, r * size + 0.5, size - 2, size - 2);
      }
    }
  }

  // Highlight selected pixel
  ctx.strokeStyle = "black";
  ctx.lineWidth = 3;
  ctx.strokeRect(
    selectedPixel.col * size + 0.5,
    selectedPixel.row * size + 0.5,
    size - 1,
    size - 1
  );
}

function updatePacemakerList() {
  pacemakerEntries.innerHTML = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      if (cell.pacemaker) {
        const div = document.createElement('div');
        div.className = 'pacemaker-entry';
        div.innerHTML = `<span>(${r},${c}) → ${cell.paceRate} BPM</span>
          <button class="small-btn" onclick="changeRate(${r},${c},-10)">−</button>
          <button class="small-btn" onclick="changeRate(${r},${c},10)">+</button>`;
        pacemakerEntries.appendChild(div);
      }
    }
  }
}

window.changeRate = function(r, c, delta) {
  const cell = grid[r][c];
  cell.paceRate = Math.max(10, Math.min(300, cell.paceRate + delta));
  updatePacemakerList();
};

const signalCanvas = document.getElementById('signalCanvas');
const signalCtx = signalCanvas.getContext('2d');
const signalData = [];
const maxSignalLength = 300;

function updateSignalPlot() {
  const val = grid[selectedPixel.row][selectedPixel.col].value;
  const last = signalData.at(-1) ?? val;
  const smoothed = last * 0.8 + val * 0.2;
  signalData.push(smoothed);
  if (signalData.length > maxSignalLength) signalData.shift();

  signalCtx.clearRect(0, 0, signalCanvas.width, signalCanvas.height);
  signalCtx.beginPath();
  signalCtx.moveTo(0, signalCanvas.height - signalData[0] * signalCanvas.height);
  for (let i = 1; i < signalData.length; i++) {
    const x = (i / maxSignalLength) * signalCanvas.width;
    const y = signalCanvas.height - signalData[i] * signalCanvas.height;
    signalCtx.lineTo(x, y);
  }
  signalCtx.strokeStyle = 'blue';
  signalCtx.lineWidth = 2;
  signalCtx.stroke();
}

function loop() {
  update();
  draw();
  updateSignalPlot();
  requestAnimationFrame(loop);
}

resetButton.onclick = () => {
  for (let row of grid)
    for (let cell of row)
      Object.assign(cell, {
        barrier: false,
        repolarizeSlow: false,
        slowConduction: false,
        pacemaker: false,
        value: 0
      });
  updatePacemakerList();
};

updateButtons();
updatePacemakerList();
loop();
