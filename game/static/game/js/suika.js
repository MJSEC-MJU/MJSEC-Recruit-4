(() => {
  const config = window.SuikaConfig || {};
  const targetScore = Number(config.targetScore) || 10000;
  const scoreBoostRaw = Number(config.scoreBoost);
  const scoreBoost =
    Number.isFinite(scoreBoostRaw) && scoreBoostRaw >= 1 ? scoreBoostRaw : 1;

  const canvas = document.getElementById("playfield");
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) {
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const CEILING_Y = 80;
  const GRAVITY = 1400;
  const WALL_PADDING = 0;

  const scoreEl = document.getElementById("score-value");
  const statusScoreEl = document.getElementById("status-score-value");
  const nextFruitNameEl = document.getElementById("next-fruit-name");
  const nextFruitEmojiEl = document.getElementById("next-fruit-emoji");
  const futureFruitNameEl = document.getElementById("future-fruit-name");
  const futureFruitEmojiEl = document.getElementById("future-fruit-emoji");
  const dropButton = document.getElementById("drop-button");
  const resetButton = document.getElementById("reset-button");
  const maxFruitLabel = document.getElementById("max-fruit-label");
  const resultForm = document.getElementById("game-result-form");
  const scoreField = document.getElementById("score-field");
  const resultStatusField = document.getElementById("result-status-field");
  const boostField = document.getElementById("boost-field");
  const resetForm = document.getElementById("game-reset-form");
  const resetBoostField = document.getElementById("reset-boost-field");

  const FRUITS = [
    { name: "체리", emoji: "🍒", radius: 32, color: "#fb7185" },
    { name: "딸기", emoji: "🍓", radius: 36, color: "#f7445e" },
    { name: "포도", emoji: "🍇", radius: 44, color: "#a855f7" },
    { name: "감", emoji: "🟠", radius: 52, color: "#fb923c" },
    { name: "사과", emoji: "🍎", radius: 60, color: "#ef4444" },
    { name: "배", emoji: "🍐", radius: 68, color: "#a3e635" },
    { name: "복숭아", emoji: "🍑", radius: 76, color: "#f472b6" },
    { name: "파인애플", emoji: "🍍", radius: 88, color: "#facc15" },
    { name: "멜론", emoji: "🍈", radius: 104, color: "#4ade80" },
    { name: "수박", emoji: "🍉", radius: 120, color: "#34d399" },
  ];

  let aimFraction = 0.5;
  let score = 0;
  let maxStage = 0;
  let nextStage = 0;
  let futureStage = 1;
  let dropLock = false;
  let gameOver = false;
  let lastTimestamp = performance.now();
  let animationFrame;
  let fruitId = 0;

  const fruits = [];

  init();

  function init() {
    updateAimFraction(aimFraction);
    resetQueue();
    attachEvents();
    updateScore(0);
    animationFrame = requestAnimationFrame(loop);
  }

  function attachEvents() {
    canvas.addEventListener("pointermove", (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      updateAimFraction(x);
    });

    canvas.addEventListener("pointerdown", (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      updateAimFraction(x);
      dropFruit();
      event.preventDefault();
    });

    canvas.addEventListener(
      "touchmove",
      (event) => {
        if (!event.touches.length) return;
        const rect = canvas.getBoundingClientRect();
        const x = (event.touches[0].clientX - rect.left) / rect.width;
        updateAimFraction(x);
        event.preventDefault();
      },
      { passive: false }
    );

    dropButton?.addEventListener("click", (event) => {
      event.preventDefault();
      dropFruit();
    });

  resetButton?.addEventListener("click", () => {
    if (resetBoostField) {
      resetBoostField.value = String(scoreBoostRaw || 1);
    }
    if (resetForm) {
      resetForm.submit();
      return;
    }
    window.location.href = "/play/";
  });

    window.addEventListener("keydown", (event) => {
      if (gameOver) return;
      if (event.key === "ArrowLeft") {
        updateAimFraction(aimFraction - 0.05);
      } else if (event.key === "ArrowRight") {
        updateAimFraction(aimFraction + 0.05);
      } else if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        dropFruit();
      }
    });
  }

  function resetQueue() {
    nextStage = randomStageIndex();
    futureStage = randomStageIndex();
    updateQueueDisplay();
  }

  function randomStageIndex() {
    const unlocked = Math.min(FRUITS.length - 2, Math.floor(score / 20) + 3);
    return Math.floor(Math.random() * Math.max(3, unlocked));
  }

  function updateQueueDisplay() {
    if (nextFruitEmojiEl) {
      nextFruitEmojiEl.textContent = FRUITS[nextStage].emoji;
    }
    if (nextFruitNameEl) {
      nextFruitNameEl.textContent = FRUITS[nextStage].name;
    }
    if (futureFruitEmojiEl) {
      futureFruitEmojiEl.textContent = FRUITS[futureStage].emoji;
    }
    if (futureFruitNameEl) {
      futureFruitNameEl.textContent = FRUITS[futureStage].name;
    }
  }

  function loop(timestamp) {
    const delta = Math.min((timestamp - lastTimestamp) / 1000, 0.03);
    lastTimestamp = timestamp;

    if (!gameOver) {
      updatePhysics(delta);
      checkOverflow(delta);
    }

    render();
    animationFrame = requestAnimationFrame(loop);
  }

  function updatePhysics(dt) {
    for (const fruit of fruits) {
      fruit.vy += GRAVITY * dt;
      fruit.x += fruit.vx * dt;
      fruit.y += fruit.vy * dt;

      const leftLimit = WALL_PADDING + fruit.radius;
      const rightLimit = width - WALL_PADDING - fruit.radius;

      if (fruit.x < leftLimit) {
        fruit.x = leftLimit;
        fruit.vx *= -0.4;
      } else if (fruit.x > rightLimit) {
        fruit.x = rightLimit;
        fruit.vx *= -0.4;
      }

      const bottom = height - fruit.radius - 6;
      if (fruit.y > bottom) {
        fruit.y = bottom;
        fruit.vy = Math.abs(fruit.vy) < 40 ? 0 : -fruit.vy * 0.35;
        fruit.vx *= 0.98;
      }
    }

    handleCollisions();
  }

  function handleCollisions() {
    const merges = [];

    for (let i = 0; i < fruits.length; i++) {
      for (let j = i + 1; j < fruits.length; j++) {
        const a = fruits[i];
        const b = fruits[j];
        if (a.removed || b.removed) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const minDist = a.radius + b.radius;

        if (dist < minDist) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;

          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          const relativeVx = b.vx - a.vx;
          const relativeVy = b.vy - a.vy;
          const relVelAlongNormal = relativeVx * nx + relativeVy * ny;

          if (relVelAlongNormal < 0) {
            const impulse = -1.2 * relVelAlongNormal;
            a.vx -= impulse * nx * 0.5;
            a.vy -= impulse * ny * 0.5;
            b.vx += impulse * nx * 0.5;
            b.vy += impulse * ny * 0.5;
          }

          if (a.stage === b.stage && a.stage < FRUITS.length - 1) {
            merges.push([a, b]);
          }
        }
      }
    }

    processMerges(merges);
  }

  function processMerges(merges) {
    if (!merges.length) return;
    const toRemove = new Set();
    const toAdd = [];

    for (const [a, b] of merges) {
      if (toRemove.has(a.id) || toRemove.has(b.id)) continue;
      if (a.stage !== b.stage) continue;

      toRemove.add(a.id);
      toRemove.add(b.id);

      if (a.stage === FRUITS.length - 1) {
        updateScore(score + scoreBoost);
        continue;
      }

      const newStage = a.stage + 1;
      const merged = createFruit(newStage, {
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
      });
      merged.vy = (a.vy + b.vy) / 2 - 50;
      merged.vx = (a.vx + b.vx) / 2 + (Math.random() - 0.5) * 60;
      toAdd.push(merged);

      updateScore(score + scoreBoost);
      updateMaxStage(newStage);
    }

    if (!toRemove.size) return;

    for (const fruit of fruits) {
      if (toRemove.has(fruit.id)) {
        fruit.removed = true;
      }
    }

    for (const fruit of toAdd) {
      fruits.push(fruit);
    }

    for (let i = fruits.length - 1; i >= 0; i--) {
      if (fruits[i].removed) {
        fruits.splice(i, 1);
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawFruits();
    drawAimIndicator();
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(1, "#020617");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let y = CEILING_Y; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(WALL_PADDING, y);
      ctx.lineTo(width - WALL_PADDING, y);
      ctx.stroke();
    }
  }

  function drawFruits() {
    for (const fruit of fruits) {
      const meta = FRUITS[fruit.stage];
      ctx.beginPath();
      ctx.fillStyle = meta.color;
      ctx.arc(fruit.x, fruit.y, fruit.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `${Math.max(fruit.radius, 14)}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(meta.emoji, fruit.x, fruit.y + 1);
    }
  }

  function drawAimIndicator() {
    if (gameOver) return;
    const meta = FRUITS[nextStage];
    const x = getAimX();
    const y = CEILING_Y - meta.radius - 10;

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.fillStyle = meta.color;
    ctx.arc(x, y, meta.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `${Math.max(meta.radius, 14)}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#0f172a";
    ctx.fillText(meta.emoji, x, y);
    ctx.restore();

    ctx.strokeStyle = "rgba(148, 163, 184, 0.8)";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(x, CEILING_Y - 60);
    ctx.lineTo(x, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function dropFruit() {
    if (dropLock || gameOver) return;
    dropLock = true;
    setTimeout(() => {
      dropLock = false;
      if (dropButton && !gameOver) {
        dropButton.disabled = false;
      }
    }, 400);

    if (dropButton) {
      dropButton.disabled = true;
    }

    const spawn = createFruit(nextStage, {
      x: getAimX(),
      y: CEILING_Y + FRUITS[nextStage].radius + 4,
    });
    spawn.vy = 50;
    fruits.push(spawn);

    nextStage = futureStage;
    futureStage = randomStageIndex();
    updateQueueDisplay();
    updateMaxStage(spawn.stage);
  }

  function createFruit(stage, position) {
    const meta = FRUITS[stage];
    return {
      id: ++fruitId,
      stage,
      x: position.x,
      y: position.y,
      radius: meta.radius,
      vx: 0,
      vy: 0,
      removed: false,
    };
  }

  function getAimX() {
    const minX = WALL_PADDING + FRUITS[nextStage].radius;
    const maxX = width - WALL_PADDING - FRUITS[nextStage].radius;
    return minX + (maxX - minX) * aimFraction;
  }

  function updateAimFraction(value) {
    const clamped = Math.min(Math.max(value, 0), 1);
    aimFraction = clamped;
  }

  function updateScore(newScore) {
    score = newScore;
    if (scoreEl) {
      scoreEl.textContent = String(score);
    }
    if (statusScoreEl) {
      statusScoreEl.textContent = `${score} pts`;
    }
    if (score >= targetScore) {
      handleVictory();
    }
  }

  function updateMaxStage(stage) {
    if (stage > maxStage) {
      maxStage = stage;
      if (maxFruitLabel) {
        maxFruitLabel.textContent = FRUITS[stage].name;
      }
    }
  }

  function checkOverflow(dt) {
    for (const fruit of fruits) {
      const top = fruit.y - fruit.radius;
      const isAboveLine = top <= CEILING_Y - 15;
      if (isAboveLine) {
        fruit.overflowTime = (fruit.overflowTime || 0) + dt;
        if (fruit.overflowTime >= 0.35) {
          handleFailure();
          return;
        }
      } else {
        fruit.overflowTime = 0;
      }
    }
  }

  function handleVictory() {
    if (gameOver) return;
    gameOver = true;
    if (dropButton) dropButton.disabled = true;
    submitResult("success");
  }

  function handleFailure() {
    if (gameOver) return;
    gameOver = true;
    if (dropButton) dropButton.disabled = true;
    submitResult("failure");
  }

  function submitResult(status) {
    if (!resultForm || !scoreField) return;
    scoreField.value = String(score);
    if (resultStatusField) {
      resultStatusField.value = status;
    }
    if (boostField) {
      boostField.value = String(scoreBoostRaw || 1);
    }
    setTimeout(() => resultForm.submit(), 200);
  }
})();
