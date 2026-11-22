"use strict";
/* Ghost Dash — a tiny one-button arcade dodger.
   Hold SPACE / ↑ / touch to fly up, release to swoop down.
   Dodge bats, collect stars. 3 lives. Difficulty ramps up. */

var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d");
var W = canvas.width, H = canvas.height; // 480 x 640

var scoreEl = document.getElementById("score-val");
var livesEl = document.getElementById("lives");
var startScreen = document.getElementById("start-screen");
var overScreen = document.getElementById("gameover-screen");
var finalScoreEl = document.getElementById("final-score");
var bestStartEl = document.getElementById("best-start");
var bestOverEl = document.getElementById("best-over");
var newBestEl = document.getElementById("new-best");
var startBtn = document.getElementById("start-btn");
var restartBtn = document.getElementById("restart-btn");

// ---- state ----
var state = "start"; // start | playing | over
var score = 0, lives = 3, best = 0;
try { best = parseInt(localStorage.getItem("ghostDashBest") || "0", 10) || 0; } catch (e) {}
var time = 0, elapsed = 0, spawnT = 0, starT = 0, shake = 0, flash = 0;
var holding = false; // the one button

// ---- ghost ----
var ghost = { x: 110, y: H / 2, vy: 0, r: 26, tilt: 0, inv: 0, bob: 0 };

var bats = [];   // {x, y, speed, wing, r}
var stars = [];  // {x, y, r, tw}
var parts = [];  // particles {x, y, vx, vy, life, color, size}

// ---- difficulty: ramps with elapsed seconds ----
function difficulty() {
  var d = Math.min(elapsed / 60, 1); // 0 -> 1 over the first minute
  return {
    batSpeed: 170 + d * 190 + Math.random() * 30,
    batEvery: Math.max(0.55, 1.35 - d * 0.75),
    starEvery: 1.1
  };
}

function reset() {
  score = 0; lives = 3; elapsed = 0; spawnT = 0.8; starT = 0.4;
  shake = 0; flash = 0;
  ghost.y = H / 2; ghost.vy = 0; ghost.inv = 0;
  bats = []; stars = []; parts = [];
  updateHUD();
}

function startGame() {
  reset();
  state = "playing";
  startScreen.classList.add("hidden");
  overScreen.classList.add("hidden");
}

function gameOver() {
  state = "over";
  score = Math.floor(score);
  var isBest = score > best;
  if (isBest) {
    best = score;
    try { localStorage.setItem("ghostDashBest", String(best)); } catch (e) {}
  }
  finalScoreEl.textContent = score;
  bestOverEl.textContent = best;
  newBestEl.classList.toggle("hidden", !isBest);
  overScreen.classList.remove("hidden");
  burst(ghost.x, ghost.y, "#ffffff", 26);
  burst(ghost.x, ghost.y, "#c4b5fd", 18);
}

function updateHUD() {
  scoreEl.textContent = Math.floor(score);
  var s = "";
  for (var i = 0; i < 3; i++) {
    s += '<span class="heart' + (i < lives ? "" : " off") + '">♥</span>';
  }
  livesEl.innerHTML = s;
  bestStartEl.textContent = best;
}

// ---- spawning ----
function spawnBat() {
  var d = difficulty();
  bats.push({
    x: W + 40,
    y: 60 + Math.random() * (H - 140),
    speed: d.batSpeed,
    wing: Math.random() * Math.PI * 2,
    r: 24
  });
}

function spawnStar() {
  stars.push({
    x: W + 30,
    y: 50 + Math.random() * (H - 110),
    r: 13,
    tw: Math.random() * Math.PI * 2
  });
}

function burst(x, y, color, n) {
  for (var i = 0; i < n; i++) {
    var a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 180;
    parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.5 + Math.random() * 0.5, color: color, size: 2 + Math.random() * 3 });
  }
}

// ---- update ----
function update(dt) {
  time += dt;
  elapsed += dt;
  score += dt * 2; // survival points
  var d = difficulty();

  // ghost physics: hold = thrust up, release = gravity
  if (holding) ghost.vy -= 1500 * dt;
  ghost.vy += 900 * dt;
  ghost.vy = Math.max(-420, Math.min(520, ghost.vy));
  ghost.y += ghost.vy * dt;
  ghost.tilt = Math.max(-0.35, Math.min(0.45, ghost.vy / 900));
  ghost.bob += dt;

  if (ghost.y < 30) { ghost.y = 30; ghost.vy = Math.max(ghost.vy, 0); }
  if (ghost.y > H - 30) { ghost.y = H - 30; ghost.vy = Math.min(ghost.vy, 0); }
  if (ghost.inv > 0) ghost.inv -= dt;

  // spawn
  spawnT -= dt; starT -= dt;
  if (spawnT <= 0) { spawnBat(); spawnT = d.batEvery * (0.75 + Math.random() * 0.5); }
  if (starT <= 0) { spawnStar(); starT = d.starEvery * (0.8 + Math.random() * 0.5); }

  // bats
  for (var i = bats.length - 1; i >= 0; i--) {
    var b = bats[i];
    b.x -= b.speed * dt;
    b.wing += dt * 14;
    b.y += Math.sin(time * 3 + b.wing * 0.4) * 22 * dt;
    if (b.x < -60) { bats.splice(i, 1); continue; }
    if (ghost.inv <= 0 && dist(ghost.x, ghost.y, b.x, b.y) < ghost.r + b.r - 8) {
      bats.splice(i, 1);
      loseLife(b.x, b.y);
      if (state !== "playing") return;
    }
  }

  // stars
  for (var j = stars.length - 1; j >= 0; j--) {
    var s = stars[j];
    s.x -= (d.batSpeed * 0.75) * dt;
    s.tw += dt * 5;
    if (s.x < -40) { stars.splice(j, 1); continue; }
    if (dist(ghost.x, ghost.y, s.x, s.y) < ghost.r + s.r + 4) {
      stars.splice(j, 1);
      score += 10;
      burst(s.x, s.y, "#ffe45e", 10);
    }
  }

  // particles
  for (var k = parts.length - 1; k >= 0; k--) {
    var p = parts[k];
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= dt;
    if (p.life <= 0) parts.splice(k, 1);
  }

  if (shake > 0) shake -= dt;
  if (flash > 0) flash -= dt;
  updateHUD();
}

function loseLife(x, y) {
  lives -= 1;
  ghost.inv = 2; // 2s of mercy
  shake = 0.35; flash = 0.25;
  burst(x, y, "#ff5e8a", 16);
  updateHUD();
  if (lives <= 0) gameOver();
}

function dist(x1, y1, x2, y2) {
  var dx = x1 - x2, dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

// ---- drawing ----
var skyStars = [];
for (var i = 0; i < 70; i++) {
  skyStars.push({ x: Math.random() * W, y: Math.random() * H * 0.7,
    r: Math.random() * 1.6 + 0.4, p: Math.random() * Math.PI * 2 });
}

function draw() {
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);

  // sky gradient
  var g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0b0620"); g.addColorStop(0.55, "#1b0f3d"); g.addColorStop(1, "#2a1454");
  ctx.fillStyle = g;
  ctx.fillRect(-20, -20, W + 40, H + 40);

  // moon
  ctx.fillStyle = "#ffe9a8";
  ctx.beginPath(); ctx.arc(W - 70, 66, 30, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,233,168,0.18)";
  ctx.beginPath(); ctx.arc(W - 70, 66, 44, 0, Math.PI * 2); ctx.fill();

  // twinkling background stars
  for (var i = 0; i < skyStars.length; i++) {
    var st = skyStars[i];
    ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(time * 1.5 + st.p));
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // distant hills
  ctx.fillStyle = "#12082e";
  ctx.beginPath(); ctx.moveTo(0, H);
  ctx.quadraticCurveTo(W * 0.3, H - 90, W * 0.6, H - 30);
  ctx.quadraticCurveTo(W * 0.85, H + 10, W, H - 50);
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill();

  drawStars();
  drawBats();
  if (state !== "over") drawGhost();
  drawParts();

  // hit flash
  if (flash > 0) {
    ctx.fillStyle = "rgba(255,60,110," + (flash * 1.2) + ")";
    ctx.fillRect(-20, -20, W + 40, H + 40);
  }
  ctx.restore();

  // "hold to fly" hint at the very start of a run
  if (state === "playing" && elapsed < 2.5) {
    ctx.globalAlpha = Math.min(1, 2.5 - elapsed);
    ctx.fillStyle = "#fff";
    ctx.font = "800 20px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("HOLD TO FLY!", W / 2, H - 90);
    ctx.globalAlpha = 1;
  }
}

function drawGhost() {
  if (ghost.inv > 0 && Math.floor(time * 12) % 2 === 0) return; // blink while invincible
  var x = ghost.x, y = ghost.y + Math.sin(ghost.bob * 3) * 3;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ghost.tilt);
  // glow
  ctx.shadowColor = "rgba(255,255,255,0.8)";
  ctx.shadowBlur = 22;
  // body
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.bezierCurveTo(-26, -30, -30, -8, -30, 8);
  ctx.lineTo(-30, 26);
  ctx.quadraticCurveTo(-22, 18, -15, 26);
  ctx.quadraticCurveTo(-7, 18, 0, 26);
  ctx.quadraticCurveTo(7, 18, 15, 26);
  ctx.quadraticCurveTo(22, 18, 30, 26);
  ctx.lineTo(30, 8);
  ctx.bezierCurveTo(30, -8, 26, -30, 0, -30);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  // eyes
  ctx.fillStyle = "#1a1033";
  ctx.beginPath(); ctx.arc(-11, -6, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(11, -6, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(-9.5, -8, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(12.5, -8, 1.8, 0, Math.PI * 2); ctx.fill();
  // smile
  ctx.strokeStyle = "#1a1033";
  ctx.lineWidth = 2.5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(0, 4, 8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  // blush
  ctx.fillStyle = "rgba(255,179,217,0.8)";
  ctx.beginPath(); ctx.ellipse(-20, 4, 4.5, 2.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(20, 4, 4.5, 2.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBats() {
  for (var i = 0; i < bats.length; i++) {
    var b = bats[i];
    var flap = Math.sin(b.wing) * 0.9;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = "#2b1b4d";
    ctx.strokeStyle = "#8b5cf6";
    ctx.lineWidth = 2;
    // wings
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.quadraticCurveTo(-26, -14 - flap * 16, -38, -2 - flap * 10);
    ctx.quadraticCurveTo(-24, 2, -14, 6);
    ctx.quadraticCurveTo(-8, 10, -4, 4);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.quadraticCurveTo(26, -14 - flap * 16, 38, -2 - flap * 10);
    ctx.quadraticCurveTo(24, 2, 14, 6);
    ctx.quadraticCurveTo(8, 10, 4, 4);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // body
    ctx.fillStyle = "#3b2a63";
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.stroke();
    // ears
    ctx.fillStyle = "#3b2a63";
    ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(-5, -18); ctx.lineTo(-2, -10); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8, -10); ctx.lineTo(5, -18); ctx.lineTo(2, -10); ctx.closePath(); ctx.fill();
    // glowing eyes
    ctx.fillStyle = "#ff5e5e";
    ctx.beginPath(); ctx.arc(-4, -3, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -3, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawStars() {
  for (var i = 0; i < stars.length; i++) {
    var s = stars[i];
    var tw = 0.7 + 0.3 * Math.sin(s.tw);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(Math.sin(s.tw * 0.5) * 0.2);
    ctx.globalAlpha = tw;
    ctx.fillStyle = "#ffe45e";
    ctx.shadowColor = "#ffe45e"; ctx.shadowBlur = 12;
    ctx.beginPath();
    var R = s.r, r = s.r * 0.45;
    for (var k = 0; k < 10; k++) {
      var ang = -Math.PI / 2 + k * Math.PI / 5;
      var rad = k % 2 === 0 ? R : r;
      var px = Math.cos(ang) * rad, py = Math.sin(ang) * rad;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawParts() {
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    ctx.globalAlpha = Math.max(0, p.life * 1.6);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---- main loop ----
var last = performance.now();
function loop(now) {
  var dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (state === "playing") update(dt);
  else time += dt; // keep the sky alive behind menus
  draw();
  requestAnimationFrame(loop);
}

// ---- input: the ONE button ----
function pressOn(e) {
  if (e) e.preventDefault();
  holding = true;
  if (state === "start") startGame();
}
function pressOff(e) {
  if (e) e.preventDefault();
  holding = false;
}

window.addEventListener("keydown", function (e) {
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
    if (!e.repeat) pressOn(e);
    e.preventDefault();
  } else if (e.code === "Enter") {
    if (state === "start" || state === "over") startGame();
  }
});
window.addEventListener("keyup", function (e) {
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") pressOff(e);
});

var wrap = document.getElementById("game-wrap");
wrap.addEventListener("touchstart", pressOn, { passive: false });
wrap.addEventListener("touchend", pressOff, { passive: false });
wrap.addEventListener("touchcancel", pressOff, { passive: false });
wrap.addEventListener("mousedown", pressOn);
window.addEventListener("mouseup", pressOff);

startBtn.addEventListener("click", function (e) { e.stopPropagation(); startGame(); });
restartBtn.addEventListener("click", function (e) { e.stopPropagation(); startGame(); });

// pause when the tab is hidden so the ghost doesn't die off-screen
document.addEventListener("visibilitychange", function () {
  if (document.hidden) holding = false;
});

updateHUD();
requestAnimationFrame(loop);
