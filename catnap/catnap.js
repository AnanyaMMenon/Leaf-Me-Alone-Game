const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const box = 20; // grid size
let cat = [];
let direction;
let candy;
let obstacles = [];
let score = 0;
let game;
let speed = 150; // ms per frame

function startGame() {
  cat = [{ x: 9 * box, y: 10 * box }]; // starting position
  direction = null;
  score = 0;
  speed = 150;
  candy = randomPosition();
  obstacles = [];
  // update unified top-left HUD instead of legacy #score element
  const cnScoreEl = document.getElementById('cnScore'); if (cnScoreEl) cnScoreEl.textContent = 'Score: 0';
  clearInterval(game);
  game = setInterval(draw, speed);
}

function randomPosition() {
  return {
    x: Math.floor(Math.random() * (canvas.width / box)) * box,
    y: Math.floor(Math.random() * (canvas.height / box)) * box
  };
}

document.addEventListener("keydown", directionHandler);

function directionHandler(event) {
  if (event.key === "ArrowLeft" && direction !== "RIGHT") direction = "LEFT";
  if (event.key === "ArrowUp" && direction !== "DOWN") direction = "UP";
  if (event.key === "ArrowRight" && direction !== "LEFT") direction = "RIGHT";
  if (event.key === "ArrowDown" && direction !== "UP") direction = "DOWN";
}

function draw() {
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // draw candy (Halloween theme)
  ctx.font = "20px serif";
  ctx.fillText("🍬", candy.x + 2, candy.y + 18);

  // draw obstacles (Halloween theme)
  for (const obs of obstacles) {
    ctx.fillText(obs.icon, obs.x + 2, obs.y + 18);
  }

  // draw cat
  for (let i = 0; i < cat.length; i++) {
    if (i === 0) {
      ctx.fillText("🐈", cat[i].x + 2, cat[i].y + 18); // head
    } else {
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(cat[i].x, cat[i].y, box, box); // body block
    }
  }

  // current head
  let catX = cat[0].x;
  let catY = cat[0].y;

  if (direction === "LEFT") catX -= box;
  if (direction === "UP") catY -= box;
  if (direction === "RIGHT") catX += box;
  if (direction === "DOWN") catY += box;

  // if cat eats candy
  if (catX === candy.x && catY === candy.y) {
  score++;
  // update unified top-left HUD instead of legacy in-page score
  const cnScoreEl2 = document.getElementById('cnScore'); if (cnScoreEl2) cnScoreEl2.textContent = 'Score: ' + score;
    candy = randomPosition();
    // occasionally spawn obstacle
    if (score % 3 === 0) {
      obstacles.push({ ...randomPosition(), icon: Math.random() < 0.5 ? "👻" : "🎃" });
    }
    // speed up every few points
    if (score % 5 === 0) {
      clearInterval(game);
      speed = Math.max(60, speed - 10);
      game = setInterval(draw, speed);
    }
  } else {
    cat.pop(); // remove tail
  }

  // new head
  const newHead = { x: catX, y: catY };

  // game over conditions
  if (
    catX < 0 || catY < 0 ||
    catX >= canvas.width || catY >= canvas.height ||
    collision(newHead, cat) ||
    collision(newHead, obstacles)
  ) {
    clearInterval(game);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "20px Helvetica";
    ctx.fillText("Game Over! Final Score: " + score, 50, canvas.height / 2);
    return;
  }

  cat.unshift(newHead);
}

function collision(head, array) {
  for (let i = 0; i < array.length; i++) {
    if (head.x === array[i].x && head.y === array[i].y) {
      return true;
    }
  }
  return false;
}

document.getElementById("startButton").addEventListener("click", startGame);
