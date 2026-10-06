const STORAGE_KEYS = {
  files: 'webos_files',
  notes: 'webos_notes',
  chat: 'webos_chat',
  installedApps: 'webos_installed_apps',
};

const appCatalog = [
  { id: 'browser', name: 'Browser', icon: '🌐', category: 'Internet', installed: true },
  { id: 'files', name: 'Files', icon: '📁', category: 'System', installed: true },
  { id: 'code', name: 'Code', icon: '💻', category: 'Dev', installed: true },
  { id: 'chat', name: 'Chat', icon: '💬', category: 'Social', installed: true },
  { id: 'games', name: 'Games', icon: '🎮', category: 'Play', installed: true },
  { id: 'notes', name: 'Notes', icon: '📝', category: 'Productivity', installed: true },
  { id: 'store', name: 'App Store', icon: '🛍️', category: 'Apps', installed: true },
];

const defaultFiles = [
  { id: 'welcome', name: 'welcome.txt', content: 'Welcome to your Web OS\n\nThis is a guest desktop system with files, chat, games, browser, and app launcher.' },
  { id: 'todo', name: 'todo.txt', content: 'Plan for today:\n- Build a cool app\n- Open the browser\n- Write code\n- Play a game' },
  { id: 'index', name: 'index.html', content: '<!DOCTYPE html>\n<html>\n  <body>\n    <h1>Hello from Web OS</h1>\n  </body>\n</html>' },
];

const state = {
  files: loadJSON(STORAGE_KEYS.files, defaultFiles),
  notes: loadJSON(STORAGE_KEYS.notes, 'Welcome to Web OS! This is your notebook. Use it for ideas, code notes, and plans.'),
  chat: loadJSON(STORAGE_KEYS.chat, [
    { author: 'System', text: 'Guest mode active. Open the chat app to type messages.' },
  ]),
  installedApps: loadJSON(STORAGE_KEYS.installedApps, appCatalog.map((a) => a.id)),
};

const windowRegistry = {};
let zCounter = 100;

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function updateStatus(text) {
  const el = document.getElementById('statusText');
  if (el) el.textContent = text;
}

function updateClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderDesktopIcons() {
  const container = document.getElementById('desktop-icons');
  const installed = appCatalog.filter((app) => state.installedApps.includes(app.id));

  container.innerHTML = installed
    .map(
      (app) => `
        <div class="desktop-icon" data-app="${app.id}">
          <div class="icon">${app.icon}</div>
          <div class="label">${app.name}</div>
        </div>
      `
    )
    .join('');

  container.querySelectorAll('.desktop-icon').forEach((node) => {
    node.addEventListener('dblclick', () => openApp(node.dataset.app));
  });
}

function renderStartMenu() {
  const list = document.getElementById('startMenuList');
  const installed = appCatalog.filter((app) => state.installedApps.includes(app.id));

  list.innerHTML = ''; 
  installed.forEach((app) => {
    const btn = document.createElement('button');
    btn.className = 'start-item';
    btn.innerHTML = `<span class="emoji">${app.icon}</span><span>${app.name}</span>`;
    btn.addEventListener('click', () => {
      openApp(app.id);
      document.getElementById('startMenu').classList.add('hidden');
    });
    list.appendChild(btn);
  });
}

function renderOpenApps() {
  const tray = document.getElementById('openApps');
  const names = Object.keys(windowRegistry);
  tray.innerHTML = names
    .map((id) => `<div class="task-pill" data-task="${id}">${appCatalog.find((a) => a.id === id)?.name || id}</div>`)
    .join('');

  tray.querySelectorAll('.task-pill').forEach((node) => {
    node.addEventListener('click', () => focusWindow(node.dataset.task));
  });
}

function openApp(appId) {
  if (!state.installedApps.includes(appId)) {
    updateStatus('App not installed');
    return;
  }

  if (windowRegistry[appId]) {
    focusWindow(appId);
    return;
  }

  switch (appId) {
    case 'browser':
      createBrowserWindow();
      break;
    case 'files':
      createFilesWindow();
      break;
    case 'code':
      createCodeWindow();
      break;
    case 'chat':
      createChatWindow();
      break;
    case 'games':
      createGamesWindow();
      break;
    case 'notes':
      createNotesWindow();
      break;
    case 'store':
      createStoreWindow();
      break;
    default:
      break;
  }

  renderOpenApps();
}

function createWindow(id, title, html, options = {}) {
  const layer = document.getElementById('windowLayer');
  const win = document.createElement('div');
  win.className = 'window';
  win.id = `window-${id}`;
  win.style.left = options.left || '140px';
  win.style.top = options.top || '90px';
  win.style.width = options.width || '700px';
  win.style.height = options.height || '520px';
  win.style.zIndex = String(++zCounter);

  win.innerHTML = `
    <div class="window-header" data-handle="${id}">
      <div class="window-title">${title}</div>
      <div class="window-controls">
        <button class="window-btn" data-action="minimize" data-id="${id}">—</button>
        <button class="window-btn" data-action="close" data-id="${id}">×</button>
      </div>
    </div>
    <div class="window-body">
      ${html}
    </div>
  `;

  layer.appendChild(win);
  windowRegistry[id] = win;

  makeDraggable(win);

  win.querySelectorAll('.window-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const target = btn.dataset.id;
      if (action === 'close') closeWindow(target);
      if (action === 'minimize') minimizeWindow(target);
    });
  });

  win.addEventListener('mousedown', () => focusWindow(id));
  focusWindow(id);
  return win;
}

function focusWindow(id) {
  Object.values(windowRegistry).forEach((win) => {
    win.classList.remove('active');
  });

  const target = windowRegistry[id];
  if (!target) return;
  target.classList.add('active');
  target.style.zIndex = String(++zCounter);
}

function closeWindow(id) {
  const target = windowRegistry[id];
  if (!target) return;
  target.remove();
  delete windowRegistry[id];
  renderOpenApps();
}

function minimizeWindow(id) {
  const target = windowRegistry[id];
  if (!target) return;
  target.style.display = target.style.display === 'none' ? 'flex' : 'none';
  renderOpenApps();
}

function makeDraggable(win) {
  const handle = win.querySelector('[data-handle]');
  if (!handle) return;

  let isDown = false;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener('mousedown', (event) => {
    isDown = true;
    const rect = win.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    focusWindow(win.id.replace('window-', ''));
  });

  window.addEventListener('mousemove', (event) => {
    if (!isDown) return;
    win.style.left = `${event.clientX - offsetX}px`;
    win.style.top = `${event.clientY - offsetY}px`;
  });

  window.addEventListener('mouseup', () => {
    isDown = false;
  });
}

function normalizeUrl(value) {
  const v = value.trim();
  if (!v) return 'https://example.com';
  if (/^https?:\/\//i.test(v)) return v;
  if (/^\//.test(v)) return `https:${v}`;
  return `https://${v}`;
}

function createBrowserWindow() {
  const html = `
    <div class="browser-toolbar">
      <input id="browserAddress" value="https://example.com" />
      <button id="browserGo">Go</button>
      <button id="browserRefresh">Refresh</button>
    </div>
    <iframe id="browserFrame" class="browser-frame" src="https://example.com" title="Browser"></iframe>
  `;

  const win = createWindow('browser', 'Browser', html, { width: '900px', height: '620px', left: '200px', top: '80px' });

  const address = win.querySelector('#browserAddress');
  const frame = win.querySelector('#browserFrame');
  const goBtn = win.querySelector('#browserGo');
  const refreshBtn = win.querySelector('#browserRefresh');

  goBtn.addEventListener('click', () => {
    frame.src = normalizeUrl(address.value);
    updateStatus('Browsing...');
  });

  refreshBtn.addEventListener('click', () => {
    frame.src = frame.src || normalizeUrl(address.value);
  });

  address.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      frame.src = normalizeUrl(address.value);
    }
  });
}

function createFilesWindow() {
  const files = state.files;
  const activeId = files[0]?.id || 'welcome';
  const activeFile = files.find((file) => file.id === activeId) || files[0];

  const html = `
    <div class="file-area">
      <div class="file-sidebar">
        <div class="file-list">
          ${files
            .map(
              (file) => `
                <div class="file-item ${file.id === activeId ? 'active' : ''}" data-file-id="${file.id}">
                  ${file.name}
                </div>
              `
            )
            .join('')}
        </div>
        <div class="editor-actions">
          <button id="newFileBtn">+ New</button>
        </div>
      </div>
      <div class="file-editor">
        <textarea id="fileContent">${escapeHtml(activeFile?.content || '')}</textarea>
        <div class="editor-actions">
          <button id="saveFileBtn">Save</button>
          <button id="deleteFileBtn">Delete</button>
        </div>
      </div>
    </div>
  `;

  const win = createWindow('files', 'Files', html, { width: '760px', height: '520px', left: '220px', top: '120px' });

  const fileItems = win.querySelectorAll('.file-item');
  const textarea = win.querySelector('#fileContent');
  const saveBtn = win.querySelector('#saveFileBtn');
  const deleteBtn = win.querySelector('#deleteFileBtn');
  const newFileBtn = win.querySelector('#newFileBtn');

  let selectedId = activeId;

  fileItems.forEach((item) => {
    item.addEventListener('click', () => {
      selectedId = item.dataset.fileId;
      const file = state.files.find((f) => f.id === selectedId);
      textarea.value = file?.content || '';
      fileItems.forEach((node) => node.classList.toggle('active', node.dataset.fileId === selectedId));
      updateStatus(`Selected ${file?.name || 'file'}`);
    });
  });

  saveBtn.addEventListener('click', () => {
    const file = state.files.find((f) => f.id === selectedId);
    if (!file) return;
    file.content = textarea.value;
    saveJSON(STORAGE_KEYS.files, state.files);
    updateStatus(`Saved ${file.name}`);
  });

  deleteBtn.addEventListener('click', () => {
    if (state.files.length <= 1) {
      updateStatus('At least one file must remain');
      return;
    }
    state.files = state.files.filter((file) => file.id !== selectedId);
    selectedId = state.files[0].id;
    saveJSON(STORAGE_KEYS.files, state.files);
    renderOpenApps();
    createFilesWindow();
    closeWindow('files');
    updateStatus('File deleted');
  });

  newFileBtn.addEventListener('click', () => {
    const id = `file-${Date.now()}`;
    const name = `new-file-${state.files.length + 1}.txt`;
    state.files.push({ id, name, content: 'Write something...' });
    saveJSON(STORAGE_KEYS.files, state.files);
    closeWindow('files');
    createFilesWindow();
    updateStatus(`Created ${name}`);
  });
}

function createCodeWindow() {
  const html = `
    <div class="code-editor-wrap">
      <textarea id="codeEditor">function hello(){\n  console.log('Hello from Web OS');\n}\n\nhello();</textarea>
      <div class="code-actions">
        <button id="runCodeBtn">Run code</button>
        <button id="saveCodeBtn">Save to file</button>
      </div>
      <div id="codeOutput" class="code-output">Output will appear here.</div>
    </div>
  `;

  const win = createWindow('code', 'Code', html, { width: '820px', height: '560px', left: '260px', top: '110px' });
  const editor = win.querySelector('#codeEditor');
  const output = win.querySelector('#codeOutput');

  win.querySelector('#runCodeBtn').addEventListener('click', () => {
    try {
      const userCode = editor.value;
      const result = new Function(`${userCode}; return 'OK';`)();
      output.textContent = `Output: ${String(result)}`;
    } catch (err) {
      output.textContent = `Error: ${err.message}`;
    }
  });

  win.querySelector('#saveCodeBtn').addEventListener('click', () => {
    const id = `script-${Date.now()}`;
    state.files.push({ id, name: 'script.js', content: editor.value });
    saveJSON(STORAGE_KEYS.files, state.files);
    output.textContent = 'Saved to file system as script.js';
  });
}

function createChatWindow() {
  const html = `
    <div class="chat-box">
      <div id="chatThread" class="chat-thread"></div>
      <div class="chat-compose">
        <input id="chatInput" placeholder="Type a message..." />
        <button id="chatSend">Send</button>
      </div>
    </div>
  `;

  const win = createWindow('chat', 'Chat', html, { width: '440px', height: '560px', left: '420px', top: '80px' });
  const thread = win.querySelector('#chatThread');
  const input = win.querySelector('#chatInput');
  const sendBtn = win.querySelector('#chatSend');

  function renderChat() {
    thread.innerHTML = state.chat
      .map(
        (msg) => `
          <div class="chat-bubble ${msg.author === 'Guest' ? 'self' : ''}">
            <strong>${msg.author}:</strong> ${escapeHtml(msg.text)}
          </div>
        `
      )
      .join('');
    thread.scrollTop = thread.scrollHeight;
  }

  renderChat();

  sendBtn.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) return;
    state.chat.push({ author: 'Guest', text });
    state.chat.push({ author: 'System', text: `Echo: ${text}` });
    saveJSON(STORAGE_KEYS.chat, state.chat);
    input.value = '';
    renderChat();
    updateStatus('Chat updated');
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      sendBtn.click();
    }
  });
}

function createGamesWindow() {
  const html = `
    <div class="game-shell">
      <div class="canvas-wrap">
        <canvas id="gameCanvas" width="420" height="240"></canvas>
      </div>
      <div class="game-controls">
        <button id="restartGameBtn">Restart</button>
      </div>
    </div>
  `;

  const win = createWindow('games', 'Games', html, { width: '520px', height: '420px', left: '300px', top: '160px' });
  const canvas = win.querySelector('#gameCanvas');
  const ctx = canvas.getContext('2d');

  const snake = {
    x: 100,
    y: 100,
    dx: 10,
    dy: 0,
    cells: [{ x: 100, y: 100 }, { x: 90, y: 100 }, { x: 80, y: 100 }],
    food: { x: 200, y: 100 },
    score: 0,
    speed: 120,
  };

  let gameLoop = null;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    snake.cells.forEach((cell) => {
      ctx.fillStyle = '#34d399';
      ctx.fillRect(cell.x, cell.y, 10, 10);
    });

    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(snake.food.x, snake.food.y, 10, 10);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '16px Segoe UI';
    ctx.fillText(`Score: ${snake.score}`, 16, 22);
  }

  function tick() {
    const head = { x: snake.cells[0].x + snake.dx, y: snake.cells[0].y + snake.dy };

    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
      clearInterval(gameLoop);
      updateStatus('Game over');
      return;
    }

    snake.cells.unshift(head);

    if (head.x === snake.food.x && head.y === snake.food.y) {
      snake.score += 1;
      snake.food = {
        x: Math.floor(Math.random() * (canvas.width / 10)) * 10,
        y: Math.floor(Math.random() * (canvas.height / 10)) * 10,
      };
    } else {
      snake.cells.pop();
    }

    draw();
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' && snake.dy !== 10) {
      snake.dx = 0;
      snake.dy = -10;
    }
    if (event.key === 'ArrowDown' && snake.dy !== -10) {
      snake.dx = 0;
      snake.dy = 10;
    }
    if (event.key === 'ArrowLeft' && snake.dx !== 10) {
      snake.dx = -10;
      snake.dy = 0;
    }
    if (event.key === 'ArrowRight' && snake.dx !== -10) {
      snake.dx = 10;
      snake.dy = 0;
    }
  });

  function startGame() {
    clearInterval(gameLoop);
    gameLoop = setInterval(tick, snake.speed);
  }

  startGame();
  draw();

  win.querySelector('#restartGameBtn').addEventListener('click', () => {
    snake.cells = [{ x: 100, y: 100 }, { x: 90, y: 100 }, { x: 80, y: 100 }];
    snake.dx = 10;
    snake.dy = 0;
    snake.score = 0;
    startGame();
    updateStatus('New game started');
  });
}

function createNotesWindow() {
  const html = `
    <div class="notes-editor">
      <textarea id="notesArea">${escapeHtml(state.notes)}</textarea>
      <div class="editor-actions">
        <button id="saveNotesBtn">Save</button>
      </div>
    </div>
  `;

  const win = createWindow('notes', 'Notes', html, { width: '540px', height: '420px', left: '500px', top: '110px' });
  const textarea = win.querySelector('#notesArea');
  win.querySelector('#saveNotesBtn').addEventListener('click', () => {
    state.notes = textarea.value;
    saveJSON(STORAGE_KEYS.notes, state.notes);
    updateStatus('Notes saved');
  });
}

function createStoreWindow() {
  const html = `
    <div class="app-store-list">
      ${appCatalog
        .map(
          (app) => `
            <div class="store-card">
              <div><strong>${app.icon} ${app.name}</strong><br><small>${app.category}</small></div>
              <button data-install-id="${app.id}">
                ${state.installedApps.includes(app.id) ? 'Installed' : 'Install'}
              </button>
            </div>
          `
        )
        .join('')}
    </div>
  `;

  const win = createWindow('store', 'App Store', html, { width: '480px', height: '500px', left: '350px', top: '110px' });

  win.querySelectorAll('[data-install-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.installId;
      if (state.installedApps.includes(id)) {
        state.installedApps = state.installedApps.filter((appId) => appId !== id);
        updateStatus(`${id} removed`);
      } else {
        state.installedApps.push(id);
        updateStatus(`${id} installed`);
      }
      saveJSON(STORAGE_KEYS.installedApps, state.installedApps);
      renderDesktopIcons();
      renderStartMenu();
      closeWindow('store');
      createStoreWindow();
    });
  });
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setupDesktop() {
  document.getElementById('startBtn').addEventListener('click', () => {
    const menu = document.getElementById('startMenu');
    menu.classList.toggle('hidden');
  });

  document.addEventListener('click', (event) => {
    const menu = document.getElementById('startMenu');
    if (!event.target.closest('.start-btn') && !event.target.closest('.start-item')) {
      menu.classList.add('hidden');
    }
  });

  renderDesktopIcons();
  renderStartMenu();
  renderOpenApps();
  updateClock();
  setInterval(updateClock, 1000 * 30);

  openApp('browser');
  openApp('files');
  openApp('chat');
  openApp('code');
  openApp('games');
  openApp('notes');
}

setupDesktop();
