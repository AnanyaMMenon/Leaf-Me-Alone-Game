// Pumpkin Toss (now: Pumpkin Hoops) - basketball-style mini-game
const canvasP = document.getElementById('gameCanvas');
const ctxP = canvasP.getContext('2d');

// Simple WebAudio helpers for Pumpkin game SFX
var _pumpkinAudioCtx = null;
function ensureAudio() {
  if (_pumpkinAudioCtx) return _pumpkinAudioCtx;
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  _pumpkinAudioCtx = new AudioCtx();
  return _pumpkinAudioCtx;
}

function playSwish() {
  var ctx = ensureAudio(); if (!ctx) return;
  var o = ctx.createOscillator(); var g = ctx.createGain(); var f = ctx.createBiquadFilter();
  o.type = 'sine'; o.frequency.value = 900 + Math.random() * 220;
  f.type = 'highpass'; f.frequency.value = 600;
  o.connect(f); f.connect(g); g.connect(ctx.destination);
  var now = ctx.currentTime; g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.28, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  o.start(now); o.stop(now + 0.2);
}

function playBuzzer() {
  var ctx = ensureAudio(); if (!ctx) return;
  var o1 = ctx.createOscillator(); var o2 = ctx.createOscillator(); var g = ctx.createGain();
  o1.type = 'square'; o2.type = 'sawtooth';
  o1.frequency.value = 220; o2.frequency.value = 130;
  o1.connect(g); o2.connect(g); g.connect(ctx.destination);
  var now = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.18, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
  o1.start(now); o2.start(now); o1.stop(now + 0.9); o2.stop(now + 0.9);
}

let running = false;
let pumpkins = [];
let score = 0;
let hoop = null; // {x,y,r,backboard}
let previewPath = [];
let confettiLocal = [];

// aiming state
let aiming = false;
let aimStart = null; // {x,y}
let aimCurrent = null;
let chargeStart = 0;

let currentPumpkin = null; // Track the single active pumpkin
let clickCount = 0; // Track the number of clicks to adjust angle

let rolling = true; // Track if the pumpkin is rolling
let clickIntensity = 0; // Accumulate click intensity

// Load highscore from localStorage
let highscore = 0;
try {
  const stored = localStorage.getItem('pumpkin_highscore');
  if (stored) highscore = parseInt(stored, 10) || 0;
} catch (e) {
  // ignore
}

function spawnConfettiLocal(x, y, count = 20) {
  for (let i = 0; i < count; i++) {
    confettiLocal.push({ x, y, vx: (Math.random()-0.5)*4, vy: -2-Math.random()*3, life: 40+Math.random()*40, color: ['#f59e0b','#ef4444','#f97316'][Math.floor(Math.random()*3)] });
  }
}
function updateConfettiLocal() {
  for (let i = confettiLocal.length-1;i>=0;i--) {
    const p = confettiLocal[i]; p.vy += 0.12; p.x += p.vx; p.y += p.vy; p.life--; if (p.life<=0) confettiLocal.splice(i,1);
  }
}
function drawConfettiLocal() {
  confettiLocal.forEach(p => { ctxP.fillStyle = p.color; ctxP.beginPath(); ctxP.ellipse(p.x,p.y,3,2,0,0,Math.PI*2); ctxP.fill(); });
}

function initHoop() {
  // center-right hoop placement
  const x = canvasP.width * 0.75;
  const y = canvasP.height * 0.35;
  hoop = { x, y, r: 22, rimWidth: 4 };
  // try to load a hoop image from Assets: prefer basket.webp if present, fall back to SVG
  if (!window._pumpkinHoopImg && !window._pumpkinHoopTried) {
    window._pumpkinHoopTried = true;
    const img = new Image();
    img.onload = () => { window._pumpkinHoopImg = img; };
    img.onerror = () => {
      // try svg fallback
      const img2 = new Image();
      img2.onload = () => { window._pumpkinHoopImg = img2; };
      img2.onerror = () => { window._pumpkinHoopImg = null; };
      img2.src = '../Assets/basketball_hoop.svg';
    };
    img.src = '../Assets/basket.webp';
  }
}

function Pumpkin(x, y, vx, vy) {
  this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.r = 12; this.alive = true; this.scored = false;
  this.thrown = !!vx || !!vy; // if initial vx/vy given, consider thrown

  this.update = function() {
    if (!this.alive) return;
    if (this.thrown) {
      this.vy += 0.28; // gravity
      this.vx *= 0.999; // slight air drag
      this.x += this.vx;
      this.y += this.vy;

      // Bounce off the ground
      if (this.y > canvasP.height - this.r) {
        this.y = canvasP.height - this.r;
        this.vy *= -0.6; // Reverse velocity and reduce it to simulate energy loss
      }

      // Bounce off the top (ceiling) so the pumpkin stays in play
      if (this.y - this.r < 0) {
        this.y = this.r;
        this.vy *= -0.6; // reverse vertical velocity with damping
      }

      // Bounce off the walls
      if (this.x < this.r || this.x > canvasP.width - this.r) {
        this.vx *= -0.6; // Reverse horizontal velocity and reduce it
        this.x = Math.max(this.r, Math.min(this.x, canvasP.width - this.r));
      }
    } else {
      this.vx = 0; this.vy = 0;
      this.y = canvasP.height - 48;
    }
  };

  this.draw = function() {
    if (!this.alive) return;
    ctxP.save();

    // Draw pumpkin body
    ctxP.fillStyle = '#ff7f11';
    ctxP.beginPath();
    ctxP.ellipse(this.x, this.y, this.r, this.r * 0.9, 0, 0, Math.PI * 2);
    ctxP.fill();

    // Add pumpkin ridges
    ctxP.strokeStyle = '#de6f0fff';
    ctxP.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) {
      ctxP.beginPath();
      ctxP.ellipse(this.x, this.y, this.r + i, this.r * 0.9, 0, 0, Math.PI * 2);
      ctxP.stroke();
    }

    // Draw pumpkin stem
    ctxP.fillStyle = '#03824bff';
    ctxP.fillRect(this.x - 2, this.y - this.r - 6, 4, 6);

    ctxP.restore();
  };
}

function launchPumpkinToHoop(p) {
  if (!p || p.thrown || !hoop) return;
  // time estimation based on horizontal distance
  const dx = hoop.x - p.x;
  const dy = hoop.y - p.y;
  const dist = Math.hypot(dx, dy);
  // choose travel time between 0.7s and 1.4s depending on distance
  const t = Math.max(0.7, Math.min(1.4, dist / 300));
  const g = 0.28; // gravity used in update
  const vx = dx / t;
  const vy = (dy - 0.5 * g * t * t) / t;
  p.vx = vx; p.vy = vy; p.thrown = true;
}

function launchPumpkinWithClicks(p, clicks) {
  if (!p || p.thrown || !hoop) return;
  launchPumpkinToHoop(p);
  // increase vertical component (more negative = higher arc) per click
  p.vy -= (clicks || 0) * 1.6;
  // reduce horizontal speed slightly with more clicks so arc is steeper
  p.vx *= Math.max(0.35, 1 - (clicks || 0) * 0.12);
}

function drawHoop() {
  if (!hoop) return;
  // if we have an image loaded, draw it scaled at the hoop position
  if (window._pumpkinHoopImg) {
    const img = window._pumpkinHoopImg;
    // desired display size - adjust to fit canvas
    const displayW = Math.min(140, canvasP.width * 0.4);
    const displayH = displayW * (img.height / img.width);
    ctxP.drawImage(img, hoop.x - displayW/2, hoop.y - displayH/2, displayW, displayH);
    return;
  }
  // fallback drawing
  ctxP.save();
  // backboard
  ctxP.fillStyle = '#ffffff';
  ctxP.fillRect(hoop.x + 34, hoop.y - 48, 10, 96);
  ctxP.strokeStyle = '#bbbbbb';
  ctxP.strokeRect(hoop.x + 34, hoop.y - 48, 10, 96);
  // rim
  ctxP.fillStyle = '#c0392b';
  ctxP.beginPath();
  ctxP.arc(hoop.x, hoop.y, hoop.r, 0, Math.PI*2);
  ctxP.lineWidth = hoop.rimWidth;
  ctxP.strokeStyle = '#c0392b';
  ctxP.stroke();
  // net (simple lines)
  ctxP.strokeStyle = 'rgba(255,255,255,0.9)';
  for (let i = -3; i <= 3; i++) {
    ctxP.beginPath();
    ctxP.moveTo(hoop.x + i*6, hoop.y + hoop.r - 2);
    ctxP.quadraticCurveTo(hoop.x + i*6, hoop.y + hoop.r + 22, hoop.x + i*6, hoop.y + hoop.r + 34);
    ctxP.stroke();
  }
  ctxP.restore();
}

function checkHoopScore(p) {
  // Adjusted scoring logic to make it easier
  const dx = p.x - hoop.x;
  const dy = p.y - hoop.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Increase the scoring radius and allow scoring from a wider range
  if (!p.scored && dist < hoop.r + 10 && p.vy > 0) {
    p.scored = true;
    return true;
  }
  return false;
}

function updateHUD() {
  // Also update the DOM HUD if present
  try {
    var hh = document.getElementById('gameHighscore'); if (hh) hh.textContent = 'Highscore: ' + highscore;
    var gs = document.getElementById('gameScore'); if (gs) gs.textContent = 'Score: ' + score;
  } catch (e) {}

  // Removed canvas text draw for 'Score' to avoid duplicate HUDs; the DOM `#gameScore` is used instead

  // Update highscore if the current score exceeds it
  if (score > highscore) {
    highscore = score;
    try {
      localStorage.setItem('pumpkin_highscore', String(highscore));
    } catch (e) {
      // ignore
    }
  }
}

let timeLeft = 60; // 1 minute in seconds
function drawTimer() {
  ctxP.fillStyle = '#ffffff';
  ctxP.font = '18px sans-serif';
  ctxP.textAlign = 'right';
  ctxP.fillText('Time: ' + Math.ceil(timeLeft) + 's', canvasP.width - 12, 28);
}

function updateTimer() {
  if (!running) return;
  timeLeft -= 1 / 60; // Decrease time by 1/60th of a second per frame
  if (timeLeft <= 0) {
    running = false;
    ctxP.fillStyle = 'rgba(0,0,0,0.6)';
    ctxP.fillRect(0, canvasP.height / 2 - 40, canvasP.width, 80);
    ctxP.fillStyle = '#fff';
    ctxP.font = '22px sans-serif';
    ctxP.textAlign = 'center';
    ctxP.fillText('Time Up! Score: ' + score, canvasP.width / 2, canvasP.height / 2 + 8);
    // play buzzer sound on game over
    try { playBuzzer(); } catch (e) {}
  }
}

// Update the game loop to include the timer and bouncing mechanics
function gameLoop() {
  if (!running) return;
  ctxP.clearRect(0, 0, canvasP.width, canvasP.height);

  // Draw the hoop, HUD, and timer
  drawHoop();
  updateHUD();
  drawTimer();

  // Update and draw the pumpkin
  for (let i = pumpkins.length - 1; i >= 0; i--) {
    const p = pumpkins[i];
    p.update();
    if (checkHoopScore(p)) {
      score += 2; // Increment score for a successful shot
      spawnConfettiLocal(p.x, p.y, 18);
      // Do not alter the remaining time when a basket is scored.
      pumpkins.splice(i, 1); // Remove the scored pumpkin
        try { playSwish(); } catch (e) {}
      const x = canvasP.width / 2;
      const y = canvasP.height - 48;
      currentPumpkin = new Pumpkin(x, y, 0, 0);
      pumpkins.push(currentPumpkin);
    }
    if (!p.alive) pumpkins.splice(i, 1);
  }
  pumpkins.forEach((p) => p.draw());

  drawConfettiLocal();
  updateConfettiLocal();
  updateTimer();

  requestAnimationFrame(gameLoop);
}

// input handling: click a floor pumpkin to launch it toward the hoop
canvasP.addEventListener('pointerdown', (e) => {
  if (!running || !currentPumpkin) return;

  if (rolling) {
    // Stop rolling on the first click
    rolling = false;
    return;
  }

  // Apply an upward force to the pumpkin
  const jumpForce = -8; // Strong upward force
  currentPumpkin.vy += jumpForce; // Increment vertical velocity

  // Add a horizontal force to move towards the basket
  const dx = hoop.x - currentPumpkin.x;
  const horizontalForce = Math.sign(dx) * 3; // Directional force towards the hoop
  currentPumpkin.vx += horizontalForce; // Increment horizontal velocity

  // Ensure the pumpkin is marked as thrown
  currentPumpkin.thrown = true;
});

// start/reset buttons wiring - ensure DOM is ready and elements exist
document.addEventListener('DOMContentLoaded', () => {
  const startEl = document.getElementById('startBtn');
  const resetEl = document.getElementById('resetBtn');
  const backEl = document.getElementById('backBtn');

  if (startEl) startEl.addEventListener('click', () => startGame());
  if (resetEl) resetEl.addEventListener('click', () => resetGame());
  if (backEl) backEl.addEventListener('click', () => { window.location.href = '../index.html#menu'; });
});

function startGame() {
  running = true;
  pumpkins = [];
  score = 0;
  timeLeft = 60; // Reset timer to 1 minute
  initHoop();
  confettiLocal = [];

  // Place the initial pumpkin on the ground
  const x = canvasP.width / 2;
  const y = canvasP.height - 48;
  currentPumpkin = new Pumpkin(x, y, 0, 0);
  pumpkins.push(currentPumpkin);
  gameLoop();
}

function resetGame() {
  running = false;
  pumpkins = [];
  score = 0;
  timeLeft = 60; // Reset timer to 1 minute
  ctxP.clearRect(0, 0, canvasP.width, canvasP.height);
}

// expose some functions for compatibility
window.startPumpkin = startGame;
window.resetPumpkin = resetGame;

