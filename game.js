/* =========================================================
   MINIJUEGO "SUBE AL SERVIDOR"
   Juego de plataformas y escaleras 100% original: sprites,
   niveles y música propios, sin usar personajes, sonidos
   ni assets de ningún videojuego con derechos de autor.
   ========================================================= */
(function () {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return; // esta página no tiene el juego
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const LEVELS = 4; // Unidad 1 a 4 (nivel 0 = piso inicial)
  const levelY = [360, 280, 200, 120, 40];
  const ladderX = [100, 520, 100, 520]; // conecta levelY[i] con levelY[i+1]
  const LADDER_HALF_WIDTH = 18;

  let player = { x: 60, y: levelY[0], level: 0, climbing: false, climbDir: 0, facing: 1, speed: 150, climbSpeed: 95 };
  let keys = {};
  let lives = 3;
  let invuln = 0;
  let unlocked = JSON.parse(localStorage.getItem('unlockedUnits') || '[]');
  let bugs = [];
  let particles = [];
  let running = false;
  let won = false;
  let lastTime = 0;

  function resetBugs() {
    bugs = [];
    for (let i = 1; i <= LEVELS; i++) {
      bugs.push({ level: i, x: 150 + Math.random() * 300, dir: Math.random() < 0.5 ? -1 : 1, speed: 45 + i * 12 });
    }
  }
  function resetPlayer() {
    player.x = 60; player.level = 0; player.y = levelY[0]; player.climbing = false;
  }
  function unlockLevel(lv) {
    if (lv < 1 || lv > LEVELS) return;
    if (!unlocked.includes(lv)) {
      unlocked.push(lv);
      localStorage.setItem('unlockedUnits', JSON.stringify(unlocked));
      if (typeof playCoin === 'function') playCoin();
      if (typeof getScore === 'function' && typeof setScore === 'function') setScore(getScore() + 50);
      spawnParticles(player.x, player.y);
    }
    if (lv === LEVELS) {
      won = true;
      if (typeof playFanfare === 'function') playFanfare();
    }
  }
  function spawnParticles(x, y) {
    for (let i = 0; i < 14; i++) {
      particles.push({ x, y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 160 - 40, life: 1 });
    }
  }
  function hitBug() {
    if (invuln > 0) return;
    lives--;
    invuln = 1.5;
    if (typeof playError === 'function') playError();
    resetPlayer();
    if (lives <= 0) { running = false; lives = 3; }
    updateLivesHud();
  }
  function updateLivesHud() {
    const el = document.getElementById('gameLives');
    if (el) el.textContent = '❤️'.repeat(Math.max(lives, 0)) + '🖤'.repeat(3 - Math.max(lives, 0));
  }

  function update(dt) {
    if (!running) return;

    if (!player.climbing) {
      let dx = 0;
      if (keys.ArrowLeft) { dx -= 1; player.facing = -1; }
      if (keys.ArrowRight) { dx += 1; player.facing = 1; }
      player.x += dx * player.speed * dt;
      player.x = Math.max(14, Math.min(W - 14, player.x));

      const ladderUp = ladderX[player.level];
      if (keys.ArrowUp && player.level < LEVELS && Math.abs(player.x - ladderUp) < LADDER_HALF_WIDTH) {
        player.climbing = true; player.climbDir = 1; player.x = ladderUp;
      }
      const ladderDown = ladderX[player.level - 1];
      if (keys.ArrowDown && player.level > 0 && ladderDown !== undefined && Math.abs(player.x - ladderDown) < LADDER_HALF_WIDTH) {
        player.climbing = true; player.climbDir = -1; player.x = ladderDown;
      }
    } else {
      player.y += -player.climbDir * player.climbSpeed * dt;
      const targetLevel = player.climbDir > 0 ? player.level + 1 : player.level - 1;
      const targetY = levelY[targetLevel];
      if ((player.climbDir > 0 && player.y <= targetY) || (player.climbDir < 0 && player.y >= targetY)) {
        player.y = targetY;
        player.level = targetLevel;
        player.climbing = false;
        if (player.climbDir > 0) unlockLevel(player.level);
      }
    }
    if (!player.climbing) player.y = levelY[player.level];

    bugs.forEach(b => {
      b.x += b.dir * b.speed * dt;
      if (b.x < 40 || b.x > W - 40) b.dir *= -1;
    });

    if (invuln > 0) invuln -= dt;

    bugs.forEach(b => {
      if (b.level === player.level && !player.climbing && Math.abs(b.x - player.x) < 16) hitBug();
    });

    particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.life -= dt; });
    particles = particles.filter(p => p.life > 0);
  }

  function pixelText(text, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.font = `${size}px "Press Start 2P", monospace`;
    ctx.fillText(text, x, y);
  }

  function draw() {
    ctx.fillStyle = '#0f1419';
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i <= LEVELS; i++) {
      const y = levelY[i];
      ctx.fillStyle = (unlocked.includes(i) || i === 0) ? '#3aa886' : '#263140';
      ctx.fillRect(0, y + 18, W, 10);
      ctx.fillStyle = 'rgba(0,0,0,.15)';
      for (let bx = 0; bx < W; bx += 20) ctx.fillRect(bx, y + 18, 1, 10);
      if (i > 0) {
        pixelText('UNIDAD ' + String(i).padStart(2, '0'), 14, y + 14, 9, unlocked.includes(i) ? '#ffd23f' : '#93a2b0');
        if (unlocked.includes(i)) pixelText('OK', W - 46, y + 14, 10, '#ffd23f');
      } else {
        pixelText('INICIO', 14, y + 14, 9, '#93a2b0');
      }
    }

    ctx.strokeStyle = '#93a2b0';
    ctx.lineWidth = 3;
    for (let i = 0; i < LEVELS; i++) {
      const x = ladderX[i];
      const yTop = levelY[i + 1] + 18, yBot = levelY[i] + 18;
      ctx.beginPath();
      ctx.moveTo(x - 8, yTop); ctx.lineTo(x - 8, yBot);
      ctx.moveTo(x + 8, yTop); ctx.lineTo(x + 8, yBot);
      ctx.stroke();
      for (let ry = yTop; ry < yBot; ry += 10) {
        ctx.beginPath(); ctx.moveTo(x - 8, ry); ctx.lineTo(x + 8, ry); ctx.stroke();
      }
    }

    bugs.forEach(b => {
      ctx.fillStyle = '#ff4d4d';
      ctx.fillRect(b.x - 6, levelY[b.level] - 4, 12, 10);
      ctx.fillStyle = '#000';
      ctx.fillRect(b.x - 4, levelY[b.level] - 2, 2, 2);
      ctx.fillRect(b.x + 2, levelY[b.level] - 2, 2, 2);
    });

    if (invuln <= 0 || Math.floor(invuln * 10) % 2 === 0) {
      ctx.fillStyle = '#4fd1a5';
      ctx.fillRect(player.x - 9, player.y - 22, 18, 22);
      ctx.fillStyle = '#0b1210';
      ctx.fillRect(player.x - 5 + (player.facing > 0 ? 2 : -2), player.y - 16, 3, 3);
    }

    particles.forEach(p => {
      ctx.fillStyle = `rgba(255,210,63,${Math.max(p.life, 0)})`;
      ctx.fillRect(p.x, p.y, 4, 4);
    });

    if (!running && !won) {
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(0, 0, W, H);
      pixelText('PRESIONA INICIAR', W / 2 - 130, H / 2, 12, '#e7edf3');
    }
    if (won) {
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(0, 0, W, H);
      pixelText('¡NIVEL COMPLETADO!', W / 2 - 150, H / 2 - 10, 13, '#ffd23f');
      pixelText('4/4 unidades desbloqueadas', W / 2 - 155, H / 2 + 20, 8, '#e7edf3');
    }
  }

  function loop(t) {
    const dt = Math.min((t - lastTime) / 1000, 0.05) || 0;
    lastTime = t;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  window.addEventListener('keydown', e => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
    keys[e.key] = true;
  });
  window.addEventListener('keyup', e => { keys[e.key] = false; });

  document.querySelectorAll('[data-game-key]').forEach(btn => {
    const key = btn.getAttribute('data-game-key');
    const press = () => keys[key] = true;
    const release = () => keys[key] = false;
    btn.addEventListener('touchstart', e => { e.preventDefault(); press(); });
    btn.addEventListener('touchend', e => { e.preventDefault(); release(); });
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
  });

  const startBtn = document.getElementById('gameStart');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      running = true; won = false; lives = 3; resetPlayer(); resetBugs();
      updateLivesHud();
      if (typeof playJump === 'function') playJump();
    });
  }

  resetBugs();
  updateLivesHud();
  requestAnimationFrame(loop);
})();
