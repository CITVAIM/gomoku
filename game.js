(function () {
  "use strict";

  var SIZE = 15;
  var EMPTY = 0, BLACK = 1, WHITE = 2;

  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  var statusText = document.getElementById("status-text");
  var turnDot = document.getElementById("turn-dot");
  var modeAi = document.getElementById("mode-ai");
  var mode2p = document.getElementById("mode-2p");
  var undoBtn = document.getElementById("undo");
  var restartBtn = document.getElementById("restart");

  var board, history, current, gameOver, winner, winLine, lastMove, mode, thinking;
  var cellSize = 0;

  mode = "ai";

  function newGame() {
    board = [];
    for (var y = 0; y < SIZE; y++) {
      board.push(new Array(SIZE).fill(EMPTY));
    }
    history = [];
    current = BLACK;
    gameOver = false;
    winner = 0;
    winLine = null;
    lastMove = null;
    thinking = false;
    updateStatus();
    draw();
  }

  function inBounds(x, y) {
    return x >= 0 && y >= 0 && x < SIZE && y < SIZE;
  }

  function countDir(x, y, dx, dy, color) {
    var n = 0;
    var cx = x + dx, cy = y + dy;
    while (inBounds(cx, cy) && board[cy][cx] === color) {
      n++;
      cx += dx;
      cy += dy;
    }
    return n;
  }

  function patternScore(count, openEnds) {
    if (count >= 5) return 10000000;
    if (count === 4) return openEnds === 2 ? 1000000 : openEnds === 1 ? 100000 : 0;
    if (count === 3) return openEnds === 2 ? 50000 : openEnds === 1 ? 5000 : 0;
    if (count === 2) return openEnds === 2 ? 1000 : openEnds === 1 ? 100 : 0;
    if (count === 1) return openEnds === 2 ? 100 : openEnds === 1 ? 10 : 0;
    return 0;
  }

  function evalPoint(x, y, color) {
    var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    var total = 0;
    for (var i = 0; i < dirs.length; i++) {
      var dx = dirs[i][0], dy = dirs[i][1];
      var f = countDir(x, y, dx, dy, color);
      var b = countDir(x, y, -dx, -dy, color);
      var count = 1 + f + b;
      var openEnds = 0;
      var fx = x + dx * (f + 1), fy = y + dy * (f + 1);
      if (inBounds(fx, fy) && board[fy][fx] === EMPTY) openEnds++;
      var bx = x - dx * (b + 1), by = y - dy * (b + 1);
      if (inBounds(bx, by) && board[by][bx] === EMPTY) openEnds++;
      total += patternScore(count, openEnds);
    }
    return total;
  }

  function hasNeighbor(x, y, dist) {
    for (var dy = -dist; dy <= dist; dy++) {
      for (var dx = -dist; dx <= dist; dx++) {
        var nx = x + dx, ny = y + dy;
        if (inBounds(nx, ny) && board[ny][nx] !== EMPTY) return true;
      }
    }
    return false;
  }

  function aiMove() {
    var aiColor = WHITE;
    var humanColor = BLACK;

    if (history.length === 0) {
      return { x: 7, y: 7 };
    }

    var best = -1;
    var choices = [];
    for (var y = 0; y < SIZE; y++) {
      for (var x = 0; x < SIZE; x++) {
        if (board[y][x] !== EMPTY) continue;
        if (!hasNeighbor(x, y, 2)) continue;
        var attack = evalPoint(x, y, aiColor);
        var defend = evalPoint(x, y, humanColor);
        var score = attack * 1.15 + defend + Math.random() * 5;
        if (score > best) {
          best = score;
          choices = [{ x: x, y: y }];
        } else if (score === best) {
          choices.push({ x: x, y: y });
        }
      }
    }
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function findWin(x, y, color) {
    var dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (var i = 0; i < dirs.length; i++) {
      var dx = dirs[i][0], dy = dirs[i][1];
      var cells = [{ x: x, y: y }];
      var f = 1;
      while (inBounds(x + dx * f, y + dy * f) && board[y + dy * f][x + dx * f] === color) {
        cells.push({ x: x + dx * f, y: y + dy * f });
        f++;
      }
      var b = 1;
      while (inBounds(x - dx * b, y - dy * b) && board[y - dy * b][x - dx * b] === color) {
        cells.unshift({ x: x - dx * b, y: y - dy * b });
        b++;
      }
      if (cells.length >= 5) return cells;
    }
    return null;
  }

  function place(x, y, color) {
    board[y][x] = color;
    history.push({ x: x, y: y, color: color });
    lastMove = { x: x, y: y };
    var line = findWin(x, y, color);
    if (line) {
      gameOver = true;
      winner = color;
      winLine = line;
    } else if (history.length === SIZE * SIZE) {
      gameOver = true;
      winner = 0;
    } else {
      current = color === BLACK ? WHITE : BLACK;
    }
    updateStatus();
    draw();
  }

  function humanPlay(x, y) {
    if (gameOver || thinking) return;
    if (board[y][x] !== EMPTY) return;
    if (mode === "ai" && current !== BLACK) return;
    place(x, y, current);

    if (mode === "ai" && !gameOver && current === WHITE) {
      thinking = true;
      updateStatus();
      setTimeout(function () {
        var mv = aiMove();
        thinking = false;
        if (!gameOver && mv) place(mv.x, mv.y, WHITE);
        else updateStatus();
      }, 180);
    }
  }

  function updateStatus() {
    turnDot.classList.toggle("white", current === WHITE);
    if (gameOver) {
      turnDot.classList.remove("white");
      if (winner === BLACK) {
        turnDot.classList.remove("white");
        statusText.textContent = mode === "ai" ? "黑棋（你）获胜！" : "黑棋获胜！";
      } else if (winner === WHITE) {
        turnDot.classList.add("white");
        statusText.textContent = mode === "ai" ? "白棋（电脑）获胜" : "白棋获胜！";
      } else {
        statusText.textContent = "平局";
      }
      return;
    }
    if (thinking) {
      statusText.textContent = "电脑思考中…";
      return;
    }
    var who = current === BLACK ? "黑棋" : "白棋";
    var extra = "";
    if (mode === "ai") extra = current === BLACK ? "（你）" : "（电脑）";
    statusText.textContent = who + extra + "行棋";
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    var s = rect.width * dpr;
    ctx.setTransform(s / SIZE, 0, 0, s / SIZE, 0, 0);
    cellSize = 1;
    draw();
  }

  function pos(i) {
    return i + 0.5;
  }

  function draw() {
    var N = SIZE;
    ctx.clearRect(0, 0, N, N);
    ctx.fillStyle = "#e9c88a";
    ctx.fillRect(0, 0, N, N);

    ctx.strokeStyle = "#6b4b1f";
    ctx.lineWidth = 0.02;
    var i;
    for (i = 0; i < N; i++) {
      ctx.beginPath();
      ctx.moveTo(pos(0), pos(i));
      ctx.lineTo(pos(N - 1), pos(i));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos(i), pos(0));
      ctx.lineTo(pos(i), pos(N - 1));
      ctx.stroke();
    }

    ctx.strokeStyle = "#7a5626";
    ctx.lineWidth = 0.05;
    ctx.strokeRect(pos(0), pos(0), N - 1, N - 1);

    var stars = [[3, 3], [11, 3], [3, 11], [11, 11], [7, 7]];
    ctx.fillStyle = "#4a3212";
    for (i = 0; i < stars.length; i++) {
      ctx.beginPath();
      ctx.arc(pos(stars[i][0]), pos(stars[i][1]), 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        if (board[y][x] !== EMPTY) drawStone(x, y, board[y][x]);
      }
    }

    if (winLine) {
      ctx.strokeStyle = "rgba(230,60,60,0.85)";
      ctx.lineWidth = 0.12;
      ctx.beginPath();
      ctx.moveTo(pos(winLine[0].x), pos(winLine[0].y));
      var lastCell = winLine[winLine.length - 1];
      ctx.lineTo(pos(lastCell.x), pos(lastCell.y));
      ctx.stroke();
    }

    if (lastMove && !winLine) {
      ctx.strokeStyle = "#e23b3b";
      ctx.lineWidth = 0.06;
      ctx.beginPath();
      ctx.arc(pos(lastMove.x), pos(lastMove.y), 0.18, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawStone(x, y, color) {
    var cx = pos(x), cy = pos(y);
    var r = 0.42;
    var grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
    if (color === BLACK) {
      grad.addColorStop(0, "#6a6a6a");
      grad.addColorStop(1, "#0a0a0a");
    } else {
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(1, "#c9c4ba");
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color === BLACK ? "#000" : "#a9a49a";
    ctx.lineWidth = 0.02;
    ctx.stroke();
  }

  canvas.addEventListener("click", function (e) {
    var rect = canvas.getBoundingClientRect();
    var gx = ((e.clientX - rect.left) / rect.width) * SIZE;
    var gy = ((e.clientY - rect.top) / rect.height) * SIZE;
    var col = Math.round(gx - 0.5);
    var row = Math.round(gy - 0.5);
    if (!inBounds(col, row)) return;
    humanPlay(col, row);
  });

  function undo() {
    if (!history.length || thinking) return;
    var removed = history.pop();
    board[removed.y][removed.x] = EMPTY;
    if (mode === "ai" && removed.color === WHITE && history.length) {
      var rem2 = history.pop();
      board[rem2.y][rem2.x] = EMPTY;
    }
    gameOver = false;
    winner = 0;
    winLine = null;
    lastMove = history.length ? { x: history[history.length - 1].x, y: history[history.length - 1].y } : null;
    current = history.length % 2 === 0 ? BLACK : WHITE;
    updateStatus();
    draw();
  }

  function setMode(m) {
    mode = m;
    modeAi.classList.toggle("active", m === "ai");
    mode2p.classList.toggle("active", m === "2p");
    newGame();
  }

  modeAi.addEventListener("click", function () { setMode("ai"); });
  mode2p.addEventListener("click", function () { setMode("2p"); });
  undoBtn.addEventListener("click", undo);
  restartBtn.addEventListener("click", newGame);
  window.addEventListener("resize", resize);

  newGame();
  resize();
})();
