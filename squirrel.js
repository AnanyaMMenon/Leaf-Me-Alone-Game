const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let squirrelImg = new Image();
squirrelImg.src = "Assets/squirrel.png"; // fallback to emoji if missing

class Squirrel {
  constructor() {
    this.x = -60;
    this.y = canvas.height - 60; // Adjusted to keep squirrel at the bottom
    this.speed = 2 + Math.random() * 2;
    this.size = 60;
    this.active = true;
  }

  update() {
    this.x += this.speed;
    if (this.x > canvas.width + this.size) {
      this.active = false;
    }
  }

  draw() {
    if (squirrelImg.complete && squirrelImg.naturalWidth > 0) {
      ctx.drawImage(squirrelImg, this.x, this.y, this.size, this.size);
    } else {
      ctx.font = this.size + "px serif";
      ctx.fillText("🐿️", this.x, this.y + this.size / 2);
    }
  }
}

class SpeechBubble {
  constructor(squirrel, messages) {
    this.squirrel = squirrel; // Reference to the squirrel
    this.messages = messages;
    this.currentMessageIndex = 0;
    this.width = 200;
    this.height = 50;
    this.font = "16px Comic Sans MS";
    this.color = "#333";
    this.backgroundColor = "rgba(255, 255, 255, 0.9)";
    this.borderRadius = 10;
    this.padding = 10;
  }

  update() {
    this.currentMessageIndex = (this.currentMessageIndex + 1) % this.messages.length;
  }

  draw() {
    const message = this.messages[this.currentMessageIndex];
    const x = this.squirrel.x + this.squirrel.size / 2 - this.width / 2;
    const y = this.squirrel.y - this.height - 10; // Position above the squirrel

    ctx.fillStyle = this.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(x, y, this.width, this.height, this.borderRadius);
    ctx.fill();

    ctx.fillStyle = this.color;
    ctx.font = this.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(message, x + this.width / 2, y + this.height / 2);
  }
}

let squirrels = [];
let speechBubbles = [];

function spawnSquirrel() {
  const squirrel = new Squirrel();
  squirrels.push(squirrel);
  speechBubbles.push(new SpeechBubble(squirrel, [
    "Welcome back, Leaf Hero!",
    "New quests coming soon…",
    "Don’t forget your pumpkin spice ☕."
  ]));
  setTimeout(spawnSquirrel, 8000 + Math.random() * 8000); 
}

// animation loop
function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  squirrels = squirrels.filter(s => s.active);
  speechBubbles = speechBubbles.filter(sb => sb.squirrel.active);

  squirrels.forEach(s => {
    s.update();
    s.draw();
  });

  speechBubbles.forEach(sb => {
    sb.draw();
  });

  requestAnimationFrame(animate);
}

spawnSquirrel();
animate();

setInterval(() => {
  speechBubbles.forEach(sb => sb.update());
}, 5000); // Change message every 5 seconds

// resize handling
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  squirrels.forEach(s => s.y = canvas.height - 60); // Adjust squirrel position on resize
});