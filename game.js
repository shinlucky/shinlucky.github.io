(() => {
  const canvas = document.getElementById('snake-canvas');
  const context = canvas?.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestScoreEl = document.getElementById('best-score');
  const statusEl = document.getElementById('game-status');
  const startBtn = document.getElementById('game-start');
  const pauseBtn = document.getElementById('game-pause');
  const restartBtn = document.getElementById('game-restart');
  const enemyLayer = document.getElementById('enemy-layer');
  const touchButtons = document.querySelectorAll('[data-dir]');

  if (!canvas || !context) return;

  const grid = 20;
  const cells = canvas.width / grid;
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const state = {
    snake: [],
    dir: directions.right,
    nextDir: directions.right,
    food: { x: 10, y: 10 },
    score: 0,
    bestScore: Number(localStorage.getItem('shinlucky-best-score') || 0),
    running: false,
    paused: false,
    timer: null,
    enemyTimer: null,
    enemies: [],
  };

  bestScoreEl.textContent = String(state.bestScore);

  function randomCell() {
    return {
      x: Math.floor(Math.random() * cells),
      y: Math.floor(Math.random() * cells),
    };
  }

  function sameCell(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function isOpposite(a, b) {
    return a.x + b.x === 0 && a.y + b.y === 0;
  }

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function resetSnake() {
    const head = { x: 10, y: 10 };
    state.snake = [head, { x: 9, y: 10 }, { x: 8, y: 10 }];
    state.dir = directions.right;
    state.nextDir = directions.right;
    state.food = randomCell();
    while (state.snake.some((segment) => sameCell(segment, state.food))) {
      state.food = randomCell();
    }
    state.score = 0;
    scoreEl.textContent = '0';
    setStatus('Ready');
  }

  function updateBestScore() {
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      localStorage.setItem('shinlucky-best-score', String(state.bestScore));
      bestScoreEl.textContent = String(state.bestScore);
    }
  }

  function spawnEnemies() {
    if (!enemyLayer) return;
    enemyLayer.innerHTML = '';
    state.enemies = Array.from({ length: 4 }, (_, index) => {
      const el = document.createElement('div');
      el.className = 'enemy';
      el.textContent = index + 1;
      enemyLayer.appendChild(el);
      return {
        el,
        position: randomCell(),
        velocity: {
          x: Math.random() < 0.5 ? -1 : 1,
          y: Math.random() < 0.5 ? -1 : 1,
        },
        exploded: false,
      };
    });
  }

  function renderEnemies() {
    const stage = canvas.getBoundingClientRect();
    const cellW = stage.width / cells;
    const cellH = stage.height / cells;
    state.enemies.forEach((enemy) => {
      const { x, y } = enemy.position;
      enemy.el.style.left = `${x * cellW + cellW / 2}px`;
      enemy.el.style.top = `${y * cellH + cellH / 2}px`;
      enemy.el.classList.toggle('exploding', enemy.exploded);
    });
  }

  function animateEnemies() {
    state.enemies.forEach((enemy) => {
      if (enemy.exploded) return;
      if (Math.random() < 0.35) {
        const options = Object.values(directions);
        enemy.velocity = options[Math.floor(Math.random() * options.length)];
      }
      enemy.position = {
        x: (enemy.position.x + enemy.velocity.x + cells) % cells,
        y: (enemy.position.y + enemy.velocity.y + cells) % cells,
      };
    });
    renderEnemies();
  }

  function explodeEnemies() {
    state.enemies.forEach((enemy) => {
      enemy.exploded = true;
    });
    renderEnemies();
    window.setTimeout(() => {
      state.enemies.forEach((enemy) => {
        enemy.position = randomCell();
        enemy.velocity = {
          x: Math.random() < 0.5 ? -1 : 1,
          y: Math.random() < 0.5 ? -1 : 1,
        };
        enemy.exploded = false;
      });
      renderEnemies();
    }, 240);
  }

  function clearTimers() {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
    if (state.enemyTimer) {
      clearInterval(state.enemyTimer);
      state.enemyTimer = null;
    }
  }

  function step() {
    if (!state.running || state.paused) return;
    const currentDir = state.dir;
    const nextHead = {
      x: (state.snake[0].x + currentDir.x + cells) % cells,
      y: (state.snake[0].y + currentDir.y + cells) % cells,
    };

    if (state.snake.some((segment) => sameCell(segment, nextHead))) {
      gameOver();
      return;
    }

    state.snake.unshift(nextHead);

    if (sameCell(nextHead, state.food)) {
      state.score += 1;
      scoreEl.textContent = String(state.score);
      updateBestScore();
      do {
        state.food = randomCell();
      } while (state.snake.some((segment) => sameCell(segment, state.food)));
    } else {
      state.snake.pop();
    }

    state.dir = state.nextDir;
    draw();
  }

  function drawGrid() {
    context.fillStyle = '#08111d';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < cells; i += 1) {
      context.fillRect(i * grid, 0, 1, canvas.height);
      context.fillRect(0, i * grid, canvas.width, 1);
    }
  }

  function draw() {
    drawGrid();

    context.fillStyle = '#ffd24a';
    context.fillRect(state.food.x * grid + 2, state.food.y * grid + 2, grid - 4, grid - 4);

    state.snake.forEach((segment, index) => {
      context.fillStyle = index === 0 ? '#69f0ae' : '#22c55e';
      context.fillRect(segment.x * grid + 2, segment.y * grid + 2, grid - 4, grid - 4);
    });
  }

  function setDirection(next) {
    if (isOpposite(next, state.dir)) return;
    state.nextDir = next;
  }

  function startGame() {
    if (state.running) {
      state.paused = false;
      setStatus('Running');
      return;
    }
    clearTimers();
    resetSnake();
    spawnEnemies();
    state.running = true;
    state.paused = false;
    state.timer = setInterval(step, 140);
    state.enemyTimer = setInterval(animateEnemies, 160);
    setStatus('Running');
    draw();
    renderEnemies();
  }

  function pauseGame() {
    if (!state.running) return;
    state.paused = !state.paused;
    setStatus(state.paused ? 'Paused' : 'Running');
  }

  function gameOver() {
    state.running = false;
    state.paused = false;
    clearTimers();
    updateBestScore();
    setStatus('Game Over');
    draw();
    renderEnemies();
  }

  function restartGame() {
    state.running = false;
    state.paused = false;
    clearTimers();
    resetSnake();
    spawnEnemies();
    draw();
    renderEnemies();
    setStatus('Ready');
  }

  document.addEventListener('keydown', (event) => {
    const keyMap = {
      ArrowUp: directions.up,
      ArrowDown: directions.down,
      ArrowLeft: directions.left,
      ArrowRight: directions.right,
      w: directions.up,
      W: directions.up,
      a: directions.left,
      A: directions.left,
      s: directions.down,
      S: directions.down,
      d: directions.right,
      D: directions.right,
    };

    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      if (state.running) {
        pauseGame();
      } else {
        startGame();
      }
      return;
    }

    const next = keyMap[event.key];
    if (next) {
      event.preventDefault();
      setDirection(next);
    }
  });

  startBtn?.addEventListener('click', startGame);
  pauseBtn?.addEventListener('click', pauseGame);
  restartBtn?.addEventListener('click', restartGame);

  touchButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.dataset.dir;
      if (value && directions[value]) {
        setDirection(directions[value]);
      }
    });
  });

  resetSnake();
  spawnEnemies();
  draw();
  renderEnemies();
  setInterval(explodeEnemies, 4000);

  window.__snakeGame = {
    start: startGame,
    pause: pauseGame,
    restart: restartGame,
    step,
    setDirectionByName(name) {
      if (directions[name]) {
        setDirection(directions[name]);
      }
    },
    getSnapshot() {
      return {
        running: state.running,
        paused: state.paused,
        score: state.score,
        bestScore: state.bestScore,
        snakeLength: state.snake.length,
        head: { ...state.snake[0] },
        food: { ...state.food },
        enemyCount: state.enemies.length,
        dir: Object.entries(directions).find(([, value]) => value.x === state.dir.x && value.y === state.dir.y)?.[0] ?? 'right',
        nextDir: Object.entries(directions).find(([, value]) => value.x === state.nextDir.x && value.y === state.nextDir.y)?.[0] ?? 'right',
      };
    },
  };
})();
