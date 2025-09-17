// Pumpkin Toss - a second mini-game
// Controls: click/tap to throw a pumpkin from bottom toward click position
// Throw arc is simulated. Different baskets give different points.
// Occasionally a squirrel runs across and steals a pumpkin.

const canvasP = document.getElementById('gameCanvas');
const ctxP = canvasP.getContext('2d');

let runningPumpkin = false;
let pumpkins = [];
let baskets = [];
let scorePumpkin = 0;
let livesPumpkin = 3;
let squirrel = null;
let lastSquirrelTime = 0;
let squirrelInterval = 8000 + Math.random() * 8000;

// small local confetti for pumpkin page
const confettiLocal = [];
function spawnConfettiLocal(x, y, count = 20) {
  for (let i = 0; i < count; i++) {
    confettiLocal.push({ x, y, vx: (Math.random()-0.5)*4, vy: -2-Math.random()*3, life: 40+Math.random()*40, color: ['#f59e0b','#ef4444','#f97316'][Math.floor(Math.random()*3)] });
  }
}
function updateConfettiLocal() {
  for (let i = confettiLocal.length-1;i>=0;i--) {
    const p = confettiLocal[i]; p.vy += 0.15; p.x += p.vx; p.y += p.vy; p.life--; if (p.life<=0) confettiLocal.splice(i,1);
  }
}
function drawConfettiLocal() {
  confettiLocal.forEach(p => { ctxP.fillStyle = p.color; ctxP.beginPath(); ctxP.ellipse(p.x,p.y,4,3,0,0,Math.PI*2); ctxP.fill(); });
}

function initPumpkinBaskets() {
  baskets = [
    { x: 40, y: canvasP.height - 70, w: 90, h: 50, points: 1, color: '#8b5e3c' },
    { x: canvasP.width/2 - 60, y: canvasP.height - 110, w: 120, h: 60, points: 3, color: '#6b3f1a' },
    { x: canvasP.width - 140, y: canvasP.height - 70, w: 100, h: 52, points: 2, color: '#7a4a2b' }
  ];
}

function Pumpkin(x, y, vx, vy) {
  this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.r = 14; this.alive = true; this.thrown = true;
  this.update = function() {
    if (!this.alive) return;
    this.vy += 0.35; // gravity
    this.x += this.vx;
    this.y += this.vy;
    // ground check
    if (this.y > canvasP.height + 50) {
      this.alive = false;
      livesPumpkin -= 1;
      if (livesPumpkin <= 0) stopPumpkinGame();
    }
  };
  this.draw = function() {
    if (!this.alive) return;
    ctxP.save();
    ctxP.fillStyle = '#ff7f11';
    ctxP.beginPath();
    ctxP.ellipse(this.x, this.y, this.r, this.r*0.85, 0, 0, Math.PI*2);
    ctxP.fill();
    // stem
    ctxP.fillStyle = '#3b2b1b';
    ctxP.fillRect(this.x - 2, this.y - this.r - 6, 4, 8);
    ctxP.restore();
  };
}

function spawnSquirrel() {
  squirrel = {
    x: -60,
    y: canvasP.height - 140,
    vx: 3 + Math.random()*2,
    w: 60,
    h: 40,
    active: true
  };
}

function updateSquirrel() {
  if (!squirrel || !squirrel.active) return;
  squirrel.x += squirrel.vx;
  // if squirrel crosses, check for collision with pumpkins
  for (let i = pumpkins.length-1;i>=0;i--) {
    const p = pumpkins[i];
    if (!p.alive) continue;
    if (p.x > squirrel.x && p.x < squirrel.x + squirrel.w && p.y > squirrel.y && p.y < squirrel.y + squirrel.h) {
      // squirrel steals pumpkin
      p.alive = false;
      // visual nibble
      try { spawnConfettiLocal(p.x, p.y, 12); } catch(e){}
    }
  }
  if (squirrel.x > canvasP.width + 80) {
    squirrel.active = false;
    squirrel = null;
    lastSquirrelTime = Date.now();
    squirrelInterval = 8000 + Math.random()*9000;
  }
}

function drawSquirrel() {
  if (!squirrel || !squirrel.active) return;
  ctxP.save();
  ctxP.fillStyle = '#6b4b3b';
  ctxP.beginPath();
  ctxP.ellipse(squirrel.x + 24, squirrel.y + 20, 20, 14, 0, 0, Math.PI*2);
  ctxP.fill();
  // tail
  ctxP.fillStyle = '#4b3628';
  ctxP.beginPath();
  ctxP.ellipse(squirrel.x + 44, squirrel.y + 6, 12, 20, -0.4, 0, Math.PI*2);
  ctxP.fill();
  ctxP.restore();
}

function drawBaskets() {
  baskets.forEach(b => {
    ctxP.save();
    ctxP.fillStyle = b.color;
    ctxP.fillRect(b.x, b.y, b.w, b.h);
    // rim
    ctxP.fillStyle = '#2b1b10';
    ctxP.fillRect(b.x, b.y - 8, b.w, 8);
    // points label
    ctxP.fillStyle = '#fff9e6';
    ctxP.font = '14px sans-serif';
    ctxP.fillText('+' + b.points, b.x + 8, b.y + 20);
    ctxP.restore();
  });
}

function pumpkinLoop() {
  if (!runningPumpkin) return;
  ctxP.clearRect(0,0,canvasP.width,canvasP.height);
  // draw background via CSS; draw foreground elements
  drawBaskets();
  // spawn squirrel occasionally
  if (!squirrel && Date.now() - lastSquirrelTime > squirrelInterval) spawnSquirrel();
  updateSquirrel();
  drawSquirrel();

  for (let i = pumpkins.length-1;i>=0;i--) {
    const p = pumpkins[i];
    if (!p.alive) {
      pumpkins.splice(i,1); continue;
    }
    p.update();
    // collision with baskets
    for (const b of baskets) {
      if (p.x > b.x && p.x < b.x + b.w && p.y + p.r > b.y && p.y - p.r < b.y + b.h) {
        // scored
        p.alive = false;
        scorePumpkin += b.points;
        try { spawnConfettiLocal(p.x, p.y, 10); } catch(e){}
      }
    }
  }

  pumpkins.forEach(p => p.draw());
  drawConfettiLocal();
  updateConfettiLocal();

  // HUD
  ctxP.fillStyle = '#ffffff';
  ctxP.font = '16px sans-serif';
  ctxP.fillText('Score: ' + scorePumpkin, 12, 22);
  ctxP.fillText('Lives: ' + '❤'.repeat(livesPumpkin), 12, 42);

  requestAnimationFrame(pumpkinLoop);
}

// Player clicking to throw a pumpkin toward click position
canvasP.addEventListener('click', (e) => {
  if (!runningPumpkin) return;
  const rect = canvasP.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  // spawn pumpkin near bottom center
  const startX = canvasP.width / 2;
  const startY = canvasP.height - 18;
  // compute a simple ballistic arc: initial velocity derived from distance
  const dx = mx - startX;
  const dy = my - startY;
  const vx = dx * 0.06 + (Math.random()-0.5)*1.2;
  const vy = dy * 0.06 - 8 - Math.random()*2;
  pumpkins.push(new Pumpkin(startX, startY, vx, vy));
});

function startPumpkin() {
  runningPumpkin = true;
  pumpkins = [];
  scorePumpkin = 0; livesPumpkin = 3;
  initPumpkinBaskets();
  lastSquirrelTime = Date.now();
  squirrelInterval = 8000 + Math.random()*8000;
  pumpkinLoop();
}

function resetPumpkin() {
  runningPumpkin = false;
  pumpkins = [];
  scorePumpkin = 0; livesPumpkin = 3;
  ctxP.clearRect(0,0,canvasP.width,canvasP.height);
}

function stopPumpkinGame() {
  runningPumpkin = false;
  // show game over message
  ctxP.fillStyle = 'rgba(0,0,0,0.6)';
  ctxP.fillRect(0, canvasP.height/2 - 28, canvasP.width, 56);
  ctxP.fillStyle = '#fff';
  ctxP.font = '20px sans-serif';
  ctxP.textAlign = 'center';
  ctxP.fillText('Game Over — Score: ' + scorePumpkin, canvasP.width/2, canvasP.height/2 + 6);
}
