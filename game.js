(() => {
  const canvas = document.getElementById('target-canvas');
  const context = canvas?.getContext('2d');
  const actionButton = document.getElementById('game-action');
  const scoreEl = document.getElementById('score');
  const bestScoreEl = document.getElementById('best-score');
  const statusEl = document.getElementById('game-status');
  const windReadout = document.getElementById('wind-readout');

  if (!canvas || !context || !actionButton) return;

  const W = 960;
  const H = 560;
  const bow = { x: 110, y: 430 };
  const targetRadius = 68;
  const ringSize = targetRadius / 10;
  const storageKey = 'shinlucky-target-best-score';

  const state = {
    started: false,
    score: 0,
    bestScore: Number(localStorage.getItem(storageKey) || 0),
    status: 'Ready',
    wind: 0,
    nextWindAt: 0,
    target: {
      x: 640,
      y: 220,
      dir: 1,
      speed: 170,
      pausedX: 640,
    },
    arrow: null,
    recoil: 0,
    lastTime: 0,
  };

  canvas.width = W;
  canvas.height = H;
  bestScoreEl.textContent = String(state.bestScore);
  windReadout.textContent = state.wind.toFixed(2);

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function setStatus(text) {
    state.status = text;
    statusEl.textContent = text;
  }

  function updateBestScore() {
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      localStorage.setItem(storageKey, String(state.bestScore));
      bestScoreEl.textContent = String(state.bestScore);
    }
  }

  function randomWind(now) {
    state.wind = rand(-0.45, 0.45);
    state.nextWindAt = now + rand(2200, 4200);
    windReadout.textContent = state.wind.toFixed(2);
  }

  function startGame(now) {
    if (state.started) return;
    state.started = true;
    state.lastTime = now;
    state.target.x = state.target.pausedX;
    state.target.speed = rand(150, 210);
    randomWind(now);
    actionButton.textContent = 'Shot';
    setStatus('Running');
  }

  function shoot(now) {
    if (!state.started || state.arrow) return;
    const aim = { x: state.target.x, y: state.target.y };
    const dx = aim.x - bow.x;
    const dy = aim.y - bow.y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = 620;
    state.arrow = {
      x: bow.x,
      y: bow.y,
      vx: (dx / len) * speed,
      vy: (dy / len) * speed - 35,
      trail: [],
      bornAt: now,
    };
    state.recoil = 1;
    setStatus('Flying');
  }

  function scoreFromDistance(distance) {
    if (distance > targetRadius) return 0;
    return clamp(10 - Math.floor(distance / ringSize), 1, 10);
  }

  function finishShot(hitScore) {
    if (hitScore > 0) {
      state.score += hitScore;
      scoreEl.textContent = String(state.score);
      updateBestScore();
      setStatus(`Hit +${hitScore}`);
    } else {
      setStatus('Miss');
    }
    state.arrow = null;
    state.recoil = 0;
    actionButton.textContent = 'Shot';
  }

  function advanceTarget(dt) {
    state.target.x += state.target.dir * state.target.speed * dt;
    if (state.target.x > 840) {
      state.target.x = 840;
      state.target.dir = -1;
      state.target.speed = rand(150, 210);
    }
    if (state.target.x < 520) {
      state.target.x = 520;
      state.target.dir = 1;
      state.target.speed = rand(150, 210);
    }
    state.target.pausedX = state.target.x;
  }

  function advanceArrow(dt, now) {
    if (!state.arrow) return;

    if (now >= state.nextWindAt) {
      randomWind(now);
    }

    state.arrow.vx += state.wind * 30 * dt;
    state.arrow.vy += 150 * dt;
    state.arrow.x += state.arrow.vx * dt;
    state.arrow.y += state.arrow.vy * dt;
    state.arrow.trail.push({ x: state.arrow.x, y: state.arrow.y });
    if (state.arrow.trail.length > 22) {
      state.arrow.trail.shift();
    }

    const dx = state.arrow.x - state.target.x;
    const dy = state.arrow.y - state.target.y;
    const distance = Math.hypot(dx, dy);

    if (distance <= targetRadius) {
      finishShot(scoreFromDistance(distance));
      return;
    }

    if (state.arrow.x > W + 70 || state.arrow.y > H + 70 || state.arrow.y < -70) {
      finishShot(0);
    }
  }

  function drawSky() {
    context.clearRect(0, 0, W, H);
    const sky = context.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#9ee7ff');
    sky.addColorStop(0.42, '#54b9ff');
    sky.addColorStop(0.74, '#2a6ecb');
    sky.addColorStop(0.75, '#2f8b48');
    sky.addColorStop(1, '#215f31');
    context.fillStyle = sky;
    context.fillRect(0, 0, W, H);

    context.fillStyle = 'rgba(255,255,255,0.24)';
    context.beginPath();
    context.arc(160, 90, 36, 0, Math.PI * 2);
    context.arc(205, 88, 44, 0, Math.PI * 2);
    context.arc(256, 96, 32, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.arc(650, 70, 34, 0, Math.PI * 2);
    context.arc(696, 68, 42, 0, Math.PI * 2);
    context.arc(744, 78, 31, 0, Math.PI * 2);
    context.fill();
  }

  function drawGround() {
    context.fillStyle = '#275b2f';
    context.fillRect(0, H - 112, W, 112);
    context.fillStyle = '#17431f';
    context.fillRect(0, H - 80, W, 80);
    context.fillStyle = '#6fdc7f';
    context.fillRect(0, H - 116, W, 8);
  }

  function drawTarget() {
    const x = state.target.x;
    const y = state.target.y;

    context.save();
    context.translate(x, y);

    context.fillStyle = '#7b4f1d';
    context.fillRect(-7, targetRadius + 2, 14, 110);

    context.fillStyle = '#fff7ea';
    context.beginPath();
    context.ellipse(0, -78, 50, 42, 0, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = '#ff7d7d';
    context.beginPath();
    context.arc(0, 0, targetRadius, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = '#fff8f0';
    context.beginPath();
    context.arc(0, 0, targetRadius * 0.76, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = '#4da3ff';
    context.beginPath();
    context.arc(0, 0, targetRadius * 0.52, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = '#fff8f0';
    context.beginPath();
    context.arc(0, 0, targetRadius * 0.26, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = 'rgba(255,255,255,0.4)';
    context.lineWidth = 4;
    context.beginPath();
    context.arc(0, 0, targetRadius, 0, Math.PI * 2);
    context.stroke();

    context.restore();
  }

  function drawBow() {
    const recoil = state.recoil * 10;
    const x = bow.x;
    const y = bow.y;

    context.save();
    context.translate(x - recoil * 0.2, y + recoil * 0.15);
    context.rotate(-0.18 - recoil * 0.01);

    context.strokeStyle = '#7b4f1d';
    context.lineWidth = 14;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(-20, -48);
    context.quadraticCurveTo(-60, 0, -20, 48);
    context.stroke();

    context.strokeStyle = '#f8d6a2';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(-15, -48);
    context.lineTo(10, 0);
    context.lineTo(-15, 48);
    context.stroke();

    context.fillStyle = '#d97706';
    context.beginPath();
    context.arc(5, 0, 9, 0, Math.PI * 2);
    context.fill();

    context.restore();
  }

  function drawArrow() {
    if (!state.arrow) return;
    const trail = state.arrow.trail;
    context.save();

    trail.forEach((point, index) => {
      const alpha = (index + 1) / trail.length;
      context.strokeStyle = `rgba(255, 240, 180, ${alpha * 0.5})`;
      context.lineWidth = 6;
      context.beginPath();
      if (index === 0) {
        context.moveTo(bow.x, bow.y);
      } else {
        context.moveTo(trail[index - 1].x, trail[index - 1].y);
      }
      context.lineTo(point.x, point.y);
      context.stroke();
    });

    context.translate(state.arrow.x, state.arrow.y);
    const angle = Math.atan2(state.arrow.vy, state.arrow.vx);
    context.rotate(angle);

    context.strokeStyle = '#fff2c4';
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(-24, 0);
    context.lineTo(22, 0);
    context.stroke();

    context.fillStyle = '#d1a160';
    context.beginPath();
    context.moveTo(22, 0);
    context.lineTo(12, -6);
    context.lineTo(12, 6);
    context.closePath();
    context.fill();

    context.fillStyle = '#8b5e34';
    context.beginPath();
    context.moveTo(-24, 0);
    context.lineTo(-38, -8);
    context.lineTo(-34, 0);
    context.lineTo(-38, 8);
    context.closePath();
    context.fill();

    context.restore();
  }

  function drawUI() {
    context.fillStyle = 'rgba(0, 0, 0, 0.18)';
    context.fillRect(16, 16, 210, 58);
    context.fillStyle = '#ffffff';
    context.font = 'bold 20px "Noto Sans KR", sans-serif';
    context.fillText(`Score ${state.score}`, 28, 42);
    context.font = '16px "Noto Sans KR", sans-serif';
    context.fillText(`Best ${state.bestScore}`, 28, 63);
  }

  function render() {
    drawSky();
    drawGround();
    drawTarget();
    drawBow();
    drawArrow();
    drawUI();
  }

  function frame(time) {
    const now = time || performance.now();
    const dt = state.lastTime ? Math.min(0.032, (now - state.lastTime) / 1000) : 0.016;
    state.lastTime = now;

    if (state.started) {
      advanceTarget(dt);
    }

    if (state.arrow) {
      advanceArrow(dt, now);
    }

    if (state.recoil > 0) {
      state.recoil = Math.max(0, state.recoil - dt * 4);
    }

    render();
    requestAnimationFrame(frame);
  }

  function action() {
    const now = performance.now();
    if (!state.started) {
      startGame(now);
      return;
    }
    shoot(now);
  }

  actionButton.addEventListener('click', action);

  document.addEventListener('keydown', (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      action();
    }
  });

  window.__targetGame = {
    start: () => startGame(performance.now()),
    shoot: () => shoot(performance.now()),
    tick: (ms = 16) => {
      const now = state.lastTime + ms;
      if (state.started) advanceTarget(ms / 1000);
      if (state.arrow) advanceArrow(ms / 1000, now);
      render();
    },
    setTargetX: (x) => {
      state.target.x = clamp(x, 520, 840);
      render();
    },
    setWind: (wind) => {
      state.wind = clamp(wind, -0.75, 0.75);
      windReadout.textContent = state.wind.toFixed(2);
      render();
    },
    setTargetSpeed: (speed) => {
      state.target.speed = Math.max(0, speed);
      render();
    },
    getSnapshot: () => ({
      started: state.started,
      score: state.score,
      bestScore: state.bestScore,
      wind: Number(state.wind.toFixed(2)),
      targetX: Number(state.target.x.toFixed(1)),
      targetDir: state.target.dir,
      arrowActive: Boolean(state.arrow),
      buttonLabel: actionButton.textContent,
      status: state.status,
    }),
  };

  render();
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(frame);
  }
})();
