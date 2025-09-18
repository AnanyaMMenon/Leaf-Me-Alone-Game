const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const box = 22; // cell size (increased to make everything larger)
const rows = 20, cols = 20;

// Maze grid (0 = wall, 1 = path with pellets, 2 = empty path, 3 = power pellet)
let mazeTemplate = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,1,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1,1,1,0],
  [0,1,0,1,0,1,0,0,0,1,0,1,0,0,1,0,1,0,1,0],
  [0,1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,1,0,1,0],
  [0,1,0,0,0,0,1,0,0,0,0,0,1,0,1,0,0,0,1,0],
  [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,1,0],
  [0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,0,0],
  [0,1,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,0],
  [0,1,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0],
  [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,1,0],
  [0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,0,0],
  [0,1,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,0],
  [0,1,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0],
  [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,1,0],
  [0,0,0,0,1,0,0,0,1,0,1,0,0,0,1,0,0,0,0,0],
  [0,1,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,0],
  [0,1,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,1,0],
  [0,1,1,1,1,0,1,1,1,0,1,1,1,0,1,1,1,1,1,0],
  [0,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,1,1,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
];

let maze; // will be cloned from template on reset

// Cat and ghosts positions
let cat = { x: 1, y: 1 };
let ghosts = [
  { x: 18, y: 18 },
  { x: 1, y: 18 },
  { x: 18, y: 1 }
];
let score = 0;
let direction = null;
let powerMode = false;
let game = null; // interval handle
let isRunning = false; // only true while the game loop is active

// Highscore persistence for Pawc-Man
let catHighscore = 0;
try {
  const stored = localStorage.getItem('catnap_highscore');
  if (stored) catHighscore = parseInt(stored, 10) || 0;
} catch (e) {}

// --- Music (Web Audio API) ---
let audioCtx = null;
let musicTimer = null;
let musicStep = 0;

// Simple chiptune-ish melody (frequencies in Hz) and durations (ms)
const melody = [660, 0, 660, 0, 660, 0, 520, 0, 0, 0, 520];
const beats =  [150, 75, 150, 75, 150, 75, 300, 150, 150, 150, 300];

function playNote(freq, duration) {
  if (!audioCtx) return;
  if (freq === 0) return; // rest
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.01);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  // release
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration/1000);
  setTimeout(() => {
    try { osc.stop(); osc.disconnect(); gain.disconnect(); } catch(e) {}
  }, duration + 50);
}

function scheduleMusic() {
  if (!audioCtx) return;
  playNote(melody[musicStep], beats[musicStep]);
  const dur = beats[musicStep];
  musicStep = (musicStep + 1) % melody.length;
  musicTimer = setTimeout(scheduleMusic, dur);
}

function startMusic() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  // resume if suspended
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (musicTimer) return; // already playing
  musicStep = 0;
  scheduleMusic();
}

function stopMusic() {
  if (musicTimer) { clearTimeout(musicTimer); musicTimer = null; }
  if (audioCtx && audioCtx.state !== 'closed') {
    try { audioCtx.suspend(); } catch(e) {}
  }
}
// --- end music ---

// Controls
document.addEventListener("keydown", (e) => {
  if (!isRunning) return; // ignore input until game started
  if (e.key === "ArrowLeft") direction = "LEFT";
  if (e.key === "ArrowRight") direction = "RIGHT";
  if (e.key === "ArrowUp") direction = "UP";
  if (e.key === "ArrowDown") direction = "DOWN";
});

function initMaze() {
  // deep clone
  maze = mazeTemplate.map(row => row.slice());
  // ensure spawn cells are empty so player/ghosts don't start on pellets
  if (cat && maze[cat.y] && typeof maze[cat.y][cat.x] !== 'undefined') maze[cat.y][cat.x] = 2;
  ghosts.forEach(g => { if (maze[g.y] && typeof maze[g.y][g.x] !== 'undefined') maze[g.y][g.x] = 2; });
  // place power pellets at four corners-ish if path but avoid cat/ghost spawn
  const powerPositions = [ [1,1], [1,18], [18,1], [18,18] ];
  powerPositions.forEach(([y,x]) => {
    const overlapWithCat = (cat && cat.x === x && cat.y === y);
    const overlapWithGhost = ghosts.some(g => g.x === x && g.y === y);
    if (maze[y] && maze[y][x] === 1 && !overlapWithCat && !overlapWithGhost) maze[y][x] = 3;
  });
}

const pelletSpacing = 2; // increase to space pellets (2 -> every other cell)

function drawMaze() {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (maze[y][x] === 0) {
        // thicker wall look
        ctx.fillStyle = "#27134a"; // dark purple wall
        ctx.fillRect(x * box - 2, y * box - 2, box + 4, box + 4);
        // inner path overdraw to create border effect
        ctx.fillStyle = "#12081a";
        ctx.fillRect(x * box + 2, y * box + 2, box - 4, box - 4);
        // subtle glow
        ctx.strokeStyle = "rgba(124,58,237,0.6)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x * box - 2, y * box - 2, box + 4, box + 4);
      } else {
        ctx.fillStyle = "#0f172a"; // path background
        ctx.fillRect(x * box, y * box, box, box);
        if (maze[y][x] === 1) {
          // only draw pellets with spacing
          if ((x + y) % pelletSpacing === 0) {
            ctx.fillStyle = "#ff8c00"; // orange pellet
            ctx.beginPath();
            ctx.arc(x * box + box/2, y * box + box/2, 5, 0, Math.PI*2); // slightly larger
            ctx.fill();
          }
        } else if (maze[y][x] === 3) {
          // power pellet (pumpkin emoji) - larger
          ctx.font = Math.floor(box * 0.8) + "px serif";
          ctx.fillText("🎃", x * box + Math.floor(box*0.15), y * box + Math.floor(box*0.75));
        }
      }
    }
  }
}

function drawCat() {
  ctx.font = Math.floor(box * 0.9) + "px serif"; // scale emoji with box
  ctx.fillText("🐈", cat.x * box + Math.floor(box*0.1), cat.y * box + Math.floor(box*0.85));
}

function drawGhosts() {
  ghosts.forEach(ghost => {
    if (powerMode) {
      ctx.font = Math.floor(box * 0.9) + "px serif";
      ctx.fillText("🦃", ghost.x * box + Math.floor(box*0.1), ghost.y * box + Math.floor(box*0.85));
    } else {
      ctx.font = Math.floor(box * 0.9) + "px serif";
      ctx.fillText("👻", ghost.x * box + Math.floor(box*0.1), ghost.y * box + Math.floor(box*0.85));
    }
  });
}

function moveCat() {
  if (!isRunning) return; // don't move or collect until game started
  let nx = cat.x, ny = cat.y;
  if (direction === "LEFT") nx--;
  if (direction === "RIGHT") nx++;
  if (direction === "UP") ny--;
  if (direction === "DOWN") ny++;
  if (maze[ny] && maze[ny][nx] !== 0) { // not a wall and inside bounds
    cat.x = nx; cat.y = ny;
  }
  // collect pellets or power pellets
  if (maze[cat.y][cat.x] === 1) {
    score += 10;
    maze[cat.y][cat.x] = 2;
  } else if (maze[cat.y][cat.x] === 3) {
    score += 50;
    maze[cat.y][cat.x] = 2;
    powerMode = true;
    setTimeout(() => powerMode = false, 10000); // power mode lasts 10 seconds
  }
  const scoreEl = document.getElementById("score");
  if (scoreEl) scoreEl.textContent = "Score: " + score;

  // update DOM highscore if exceeded
  if (score > catHighscore) {
    catHighscore = score;
    try { localStorage.setItem('catnap_highscore', String(catHighscore)); } catch (e) {}
  }
  try { var hh = document.getElementById('cnHighscore'); if (hh) hh.textContent = 'Highscore: ' + catHighscore; } catch (e) {}
}

function moveGhosts() {
  if (!isRunning) return; // ghosts don't move until game started
  ghosts.forEach(ghost => {
    let target;
    if (powerMode) {
      // flee: move away from cat by maximizing distance (choose move with largest manhattan distance)
      target = { x: -999, y: -999 };
    } else {
      // chase: move towards cat (minimize manhattan distance)
      target = cat;
    }
    const dirs = [
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 }
    ];
    const validMoves = dirs.filter(d => {
      let nx = ghost.x + d.dx, ny = ghost.y + d.dy;
      return maze[ny] && maze[ny][nx] !== 0;
    });
    if (validMoves.length > 0) {
      // sort by distance appropriately
      validMoves.sort((a, b) => {
        let na = { x: ghost.x + a.dx, y: ghost.y + a.dy };
        let nb = { x: ghost.x + b.dx, y: ghost.y + b.dy };
        let distA = Math.abs(na.x - (target.x)) + Math.abs(na.y - (target.y));
        let distB = Math.abs(nb.x - (target.x)) + Math.abs(nb.y - (target.y));
        return powerMode ? (distB - distA) : (distA - distB);
      });
      ghost.x += validMoves[0].dx;
      ghost.y += validMoves[0].dy;
    }
  });
}

function checkCollision() {
  ghosts.forEach(ghost => {
    if (cat.x === ghost.x && cat.y === ghost.y) {
      if (powerMode) {
        score += 100;
        ghost.x = 18; ghost.y = 18; // reset ghost position
      } else {
        stopGame();
        showGameOver();
      }
    }
  });
}

function showGameOver() {
  // dark translucent overlay
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // centered text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = '28px Helvetica';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 10);

  ctx.font = '20px Helvetica';
  ctx.fillText('Final Score: ' + score, canvas.width / 2, canvas.height / 2 + 24);

  // ensure highscore saved and DOM updated
  if (score > catHighscore) {
    catHighscore = score; try { localStorage.setItem('catnap_highscore', String(catHighscore)); } catch (e) {}
  }
  try { var hh = document.getElementById('cnHighscore'); if (hh) hh.textContent = 'Highscore: ' + catHighscore; } catch (e) {}

  // small hint to reset
  ctx.font = '14px Helvetica';
  ctx.fillText('Press Reset to play again', canvas.width / 2, canvas.height / 2 + 48);
}

function resetGame() {
  // set spawn positions first so initMaze doesn't put pellets under them
  cat = { x: 1, y: 1 };
  ghosts = [
    { x: 18, y: 18 },
    { x: 1, y: 18 },
    { x: 18, y: 1 }
  ];
  initMaze();
  score = 0;
  direction = null;
  powerMode = false;
  const scoreEl = document.getElementById("score");
  if (scoreEl) scoreEl.textContent = "Score: " + score;
  stopGame();
  draw();
}

function drawHUD() {
  ctx.fillStyle = "#f8fafc";
  ctx.font = Math.floor(box * 0.7) + "px Helvetica";
  ctx.textAlign = "center";
  ctx.fillText("Score: " + score, canvas.width / 2, 20);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMaze();
  moveCat();
  moveGhosts();
  drawCat();
  drawGhosts();
  checkCollision();
  drawHUD();
}

function startGame() {
  if (game) return; // already running
  if (!maze) initMaze();
  isRunning = true;
  game = setInterval(draw, 200);
  startMusic();
}

function stopGame() {
  if (game) { clearInterval(game); game = null; }
  isRunning = false;
  stopMusic();
}

// initialize board once
initMaze();
// render initial frame
draw();

// wire reset button in case HTML uses addEventListener instead of inline onclick
const resetBtn = document.getElementById("resetButton");
if (resetBtn) resetBtn.addEventListener('click', resetGame);

// ensure start button wiring if needed
const startBtn = document.getElementById("startButton");
if (startBtn) startBtn.addEventListener('click', startGame);