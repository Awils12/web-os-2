const STORAGE_KEYS = {
  files: 'webos_v3_files',
  notes: 'webos_v3_notes',
  chat: 'webos_v3_chat',
  installedApps: 'webos_v3_installed',
};

const APP_CATALOG = [
  { id: 'browser', name: 'Browser', icon: '🌐', category: 'Web', installed: true },
  { id: 'files', name: 'Files', icon: '📁', category: 'System', installed: true },
  { id: 'writer', name: 'Writer', icon: '✍️', category: 'Notes', installed: true },
  { id: 'code', name: 'Code', icon: '💻', category: 'Dev', installed: true },
  { id: 'chat', name: 'Chat', icon: '💬', category: 'Social', installed: true },
  { id: 'games', name: 'Games', icon: '🎮', category: 'Play', installed: true },
  { id: 'store', name: 'App Store', icon: '🛍️', category: 'Apps', installed: true },
  { id: 'terminal', name: 'Terminal', icon: '⌨️', category: 'System', installed: true },
];

const state = {
  files: loadJSON(STORAGE_KEYS.files, [
    { id: 'welcome', name: 'welcome.txt', content: 'Welcome home.\n\nThis is your personal web desktop.\nEverything is yours to shape.' },
    { id: 'ideas', name: 'brainstorm.txt', content: 'Ideas:\n- launch app store\n- build a browser\n- write code\n- create snippets' },
    { id: 'notes', name: 'notes.md', content: '# Home screen\n\nA place to think, create, and roam.' },
  ]),
  notes: loadJSON(STORAGE_KEYS.notes, 'Dream big. Build thoughtfully. Make something that feels like home inside a screen.'),
  chat: loadJSON(STORAGE_KEYS.chat, [
    { author: 'System', text: 'Welcome back. Your desktop is ready.' },
    { author: 'Guest', text: 'This feels like a real home screen.' },
  ]),
  installedApps: loadJSON(STORAGE_KEYS.installedApps, APP_CATALOG.map((app) => app.id)),
};

const windows = {};
let zIndex = 100;

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

function updateClock() {
  const el = document.getElementById('clock');
  if (!el) return;
  el.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderDesktopIcons() {
  const host = document.getElementById('desktopIcons');
  const activeApps = APP_CATALOG.filter((app) => state.installedApps.includes(app.id));

  host.innerHTML = activeApps.map((app) => `
    <div class="desktop-icon" data-app="${app.id}" title="${app.name}">
      <div class="icon">${app.icon}</div>
      <div class="label">${app.name}</div>
    </div>
  `).join('');

  host.querySelectorAll('.desktop-icon').forEach((icon) => {
    icon.addEventListener('dblclick', () => openApp(icon.dataset.app));
  });
}

function renderDock() {
  const dock = document.getElementById('dockApps');
  const activeApps = APP_CATALOG.filter((app) => state.installedApps.includes(app.id));

  dock.innerHTML = activeApps.map((app) => `
    <div class="dock-icon" data-app="${app.id}" title="${app.name}">${app.icon}</div>
  `).join('');

  dock.querySelectorAll('.dock-icon').forEach((icon) => {
    icon.addEventListener('click', () => {
      if (windows[icon.dataset.app]) {
        focusWindow(icon.dataset.app);
      } else {
        openApp(icon.dataset.app);
      }
    });
  });
}

function renderStartMenu() {
  const startList = document.getElementById('startList');
  const activeApps = APP_CATALOG.filter((app) => state.installedApps.includes(app.id));

  startList.innerHTML = activeApps.map((app) => `
    <button class="start-item" data-menu-app="${app.id}">
      <span class="emoji">${app.icon}</span>
      <span>${app.name}</span>
    </button>
  `).join('');

  startList.querySelectorAll('.start-item').forEach((button) => {
    button.addEventListener('click', () => {
      openApp(button.dataset.menuApp);
      document.getElementById('startMenu').classList.add('hidden');
    });
  });
}

function openApp(appId) {
  if (!state.installedApps.includes(appId)) {
    return;
  }

  if (windows[appId]) {
    focusWindow(appId);
    return;
  }

  switch (appId) {
    case 'browser': createBrowserWindow(); break;
    case 'files': createFilesWindow(); break;
    case 'writer': createWriterWindow(); break;
    case 'code': createCodeWindow(); break;
    case 'chat': createChatWindow(); break;
    case 'games': createGamesWindow(); break;
    case 'store': createStoreWindow(); break;
    case 'terminal': createTerminalWindow(); break;
    default: break;
  }

  renderDock();
}

function createWindow(id, title, html, options = {}) {
  const layer = document.getElementById('windowLayer');
  const win = document.createElement('div');
  win.className = 'window active';
  win.id = `window-${id}`;
  win.style.left = options.left || '180px';
  win.style.top = options.top || '120px';
  win.style.width = options.width || '720px';
  win.style.height = options.height || '520px';
  win.style.zIndex = String(++zIndex);

  win.innerHTML = `
    <div class="window-header" data-handle="${id}">
      <div class="window-title">${title}</div>
      <div class="window-controls">
        <button class="window-btn" data-action="minimize" data-target="${id}">—</button>
        <button class="window-btn" data-action="close" data-target="${id}">×</button>
      </div>
    </div>
    <div class="window-body">${html}</div>
  `;

  layer.appendChild(win);
  windows[id] = win;

  win.addEventListener('mousedown', () => focusWindow(id));

  win.querySelectorAll('.window-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      const target = button.dataset.target;
      if (action === 'close') closeWindow(target);
      if (action === 'minimize') minimizeWindow(target);
    });
  });

  makeDraggable(win);
  focusWindow(id);
  return win;
}

function focusWindow(id) {
  Object.values(windows).forEach((windowEl) => windowEl.classList.remove('active'));
  const target = windows[id];
  if (!target) return;
  target.classList.add('active');
  target.style.zIndex = String(++zIndex);
}

function closeWindow(id) {
  if (!windows[id]) return;
  windows[id].remove();
  delete windows[id];
  renderDock();
}

function minimizeWindow(id) {
  const target = windows[id];
  if (!target) return;
  target.style.display = target.style.display === 'none' ? 'flex' : 'none';
}

function makeDraggable(win) {
  const handle = win.querySelector('[data-handle]');
  if (!handle) return;

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener('mousedown', (event) => {
    dragging = true;
    const rect = win.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    focusWindow(win.id.replace('window-', ''));
  });

  window.addEventListener('mousemove', (event) => {
    if (!dragging) return;
    win.style.left = `${event.clientX - offsetX}px`;
    win.style.top = `${event.clientY - offsetY}px`;
  });

  window.addEventListener('mouseup', () => { dragging = false; });
}

function normalizeUrl(raw) {
  const value = raw.trim();
  if (!value) return 'https://example.com';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function createBrowserWindow() {
  const html = `
    <div class="browser-toolbar">
      <input id="browserUrl" value="https://example.com" />
      <button id="goBtn">Go</button>
      <button id="refreshBtn">Refresh</button>
    </div>
    <iframe id="browserFrame" class="browser-frame" src="https://example.com" title="Browser"></iframe>
  `;

  const win = createWindow('browser', 'Browser', html, { left: '180px', top: '100px', width: '860px', height: '600px' });
  const input = win.querySelector('#browserUrl');
  const frame = win.querySelector('#browserFrame');
  const goBtn = win.querySelector('#goBtn');
  const refreshBtn = win.querySelector('#refreshBtn');

  goBtn.addEventListener('click', () => { frame.src = normalizeUrl(input.value); });
  refreshBtn.addEventListener('click', () => { frame.src = frame.src; });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') frame.src = normalizeUrl(input.value);
  });
}

function createFilesWindow() {
  const files = state.files;
  const fileList = files.map((file) => `
    <button class="file-item ${file.id === files[0].id ? 'active' : ''}" data-file-id="${file.id}">${file.name}</button>
  `).join('');

  const firstFile = files[0];
  const html = `
    <div class="file-layout">
      <aside class="file-sidebar">
        <div class="file-list">${fileList}</div>
        <div class="editor-actions">
          <button id="newFileBtn">+ New</button>
        </div>
      </aside>
      <section class="file-editor">
        <textarea id="fileEditorArea">${escapeHtml(firstFile.content)}</textarea>
        <div class="editor-actions">
          <button id="saveFileBtn">Save</button>
          <button id="deleteFileBtn">Delete</button>
        </div>
      </section>
    </div>
  `;

  const win = createWindow('files', 'Files', html, { left: '220px', top: '120px', width: '760px', height: '540px' });
  const editor = win.querySelector('#fileEditorArea');
  let selectedId = firstFile.id;

  win.querySelectorAll('.file-item').forEach((item) => {
    item.addEventListener('click', () => {
      const id = item.dataset.fileId;
      const file = state.files.find((entry) => entry.id === id);
      if (!file) return;
      selectedId = id;
      editor.value = file.content;
      win.querySelectorAll('.file-item').forEach((node) => node.classList.toggle('active', node.dataset.fileId === id));
    });
  });

  win.querySelector('#saveFileBtn').addEventListener('click', () => {
    const target = state.files.find((file) => file.id === selectedId);
    if (!target) return;
    target.content = editor.value;
    saveJSON(STORAGE_KEYS.files, state.files);
  });

  win.querySelector('#deleteFileBtn').addEventListener('click', () => {
    if (state.files.length <= 1) return;
    state.files = state.files.filter((file) => file.id !== selectedId);
    selectedId = state.files[0].id;
    saveJSON(STORAGE_KEYS.files, state.files);
    closeWindow('files');
    createFilesWindow();
  });

  win.querySelector('#newFileBtn').addEventListener('click', () => {
    const id = `file-${Date.now()}`;
    const name = `new-file-${state.files.length + 1}.txt`;
    state.files.push({ id, name, content: 'Write something new...' });
    saveJSON(STORAGE_KEYS.files, state.files);
    closeWindow('files');
    createFilesWindow();
  });
}

function createWriterWindow() {
  const html = `
    <div class="notes-window">
      <div class="notes-editor">
        <textarea id="writerArea">${escapeHtml(state.notes)}</textarea>
        <div class="editor-actions">
          <button id="saveNotesBtn">Save</button>
        </div>
      </div>
    </div>
  `;

  const win = createWindow('writer', 'Writer', html, { left: '320px', top: '150px', width: '520px', height: '430px' });
  const textarea = win.querySelector('#writerArea');
  win.querySelector('#saveNotesBtn').addEventListener('click', () => {
    state.notes = textarea.value;
    saveJSON(STORAGE_KEYS.notes, state.notes);
  });
}

function createCodeWindow() {
  const html = `
    <div class="code-editor-wrap">
      <textarea id="codeEditor">function hello() {
  console.log('hello from your screen');
}

hello();</textarea>
      <div class="editor-actions">
        <button id="runCodeBtn">Run</button>
        <button id="saveCodeBtn">Save</button>
      </div>
      <div id="codeOutput" class="code-output">Output appears here...</div>
    </div>
  `;

  const win = createWindow('code', 'Code', html, { left: '250px', top: '140px', width: '800px', height: '560px' });
  const editor = win.querySelector('#codeEditor');
  const output = win.querySelector('#codeOutput');

  win.querySelector('#runCodeBtn').addEventListener('click', () => {
    try {
      const code = editor.value;
      const runner = new Function(code + '\nreturn "done";');
      const result = runner();
      output.textContent = `Result: ${result}`;
    } catch (err) {
      output.textContent = `Error: ${err.message}`;
    }
  });

  win.querySelector('#saveCodeBtn').addEventListener('click', () => {
    const snippet = { id: `snippet-${Date.now()}`, name: 'snippet.js', content: editor.value };
    state.files.push(snippet);
    saveJSON(STORAGE_KEYS.files, state.files);
    output.textContent = 'Saved to Files as snippet.js';
  });
}

function createChatWindow() {
  const html = `
    <div class="chat-window">
      <div id="chatThread" class="chat-thread"></div>
      <div class="chat-compose">
        <input id="chatInput" placeholder="Type a message..." />
        <button id="sendChatBtn">Send</button>
      </div>
    </div>
  `;

  const win = createWindow('chat', 'Chat', html, { left: '420px', top: '120px', width: '470px', height: '530px' });
  const thread = win.querySelector('#chatThread');
  const input = win.querySelector('#chatInput');

  function renderThread() {
    thread.innerHTML = state.chat.map((msg) => `
      <div class="chat-bubble ${msg.author === 'Guest' ? 'self' : ''}">
        <strong>${msg.author}:</strong> ${escapeHtml(msg.text)}
      </div>
    `).join('');
    thread.scrollTop = thread.scrollHeight;
  }

  renderThread();

  win.querySelector('#sendChatBtn').addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) return;
    state.chat.push({ author: 'Guest', text });
    state.chat.push({ author: 'System', text: `Echo: ${text}` });
    saveJSON(STORAGE_KEYS.chat, state.chat);
    input.value = '';
    renderThread();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') win.querySelector('#sendChatBtn').click();
  });
}

function createGamesWindow() {
  const html = `
    <div class="games-window">
      <div class="canvas-wrap">
        <canvas id="gameCanvas" width="420" height="240"></canvas>
      </div>
      <div class="game-controls">
        <button id="restartGameBtn">Restart</button>
      </div>
    </div>
  `;

  const win = createWindow('games', 'Games', html, { left: '300px', top: '180px', width: '500px', height: '430px' });
  const canvas = win.querySelector('#gameCanvas');
  const ctx = canvas.getContext('2d');

  const snake = {
    dx: 10,
    dy: 0,
    cells: [{ x: 100, y: 100 }, { x: 90, y: 100 }, { x: 80, y: 100 }],
    food: { x: 220, y: 100 },
    score: 0,
  };

  let loopId = null;

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#091521';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    snake.cells.forEach((cell) => {
      ctx.fillStyle = '#68d5ff';
      ctx.fillRect(cell.x, cell.y, 10, 10);
    });

    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(snake.food.x, snake.food.y, 10, 10);

    ctx.fillStyle = '#edf5ff';
    ctx.font = '16px Segoe UI';
    ctx.fillText(`Score: ${snake.score}`, 16, 22);
  }

  function tick() {
    const head = { x: snake.cells[0].x + snake.dx, y: snake.cells[0].y + snake.dy };

    if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) {
      clearInterval(loopId);
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

  function startGame() {
    clearInterval(loopId);
    loopId = setInterval(tick, 120);
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' && snake.dy !== 10) { snake.dx = 0; snake.dy = -10; }
    if (event.key === 'ArrowDown' && snake.dy !== -10) { snake.dx = 0; snake.dy = 10; }
    if (event.key === 'ArrowLeft' && snake.dx !== 10) { snake.dx = -10; snake.dy = 0; }
    if (event.key === 'ArrowRight' && snake.dx !== -10) { snake.dx = 10; snake.dy = 0; }
  });

  win.querySelector('#restartGameBtn').addEventListener('click', () => {
    snake.cells = [{ x: 100, y: 100 }, { x: 90, y: 100 }, { x: 80, y: 100 }];
    snake.dx = 10;
    snake.dy = 0;
    snake.score = 0;
    snake.food = { x: 220, y: 100 };
    startGame();
  });

  draw();
  startGame();
}

function createStoreWindow() {
  const html = `
    <div class="store-list">
      ${APP_CATALOG.map((app) => `
        <div class="store-card">
          <div><strong>${app.icon} ${app.name}</strong><br><small>${app.category}</small></div>
          <button data-store-id="${app.id}">${state.installedApps.includes(app.id) ? 'Installed' : 'Install'}</button>
        </div>
      `).join('')}
    </div>
  `;

  const win = createWindow('store', 'App Store', html, { left: '360px', top: '120px', width: '480px', height: '520px' });

  win.querySelectorAll('[data-store-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.storeId;
      if (state.installedApps.includes(id)) {
        state.installedApps = state.installedApps.filter((item) => item !== id);
      } else {
        state.installedApps.push(id);
      }
      saveJSON(STORAGE_KEYS.installedApps, state.installedApps);
      renderDesktopIcons();
      renderDock();
      renderStartMenu();
      closeWindow('store');
      createStoreWindow();
    });
  });
}

function createTerminalWindow() {
  const html = `
    <div class="terminal-window">
      <div class="console-output">web-os:~$ whoami
guest
web-os:~$ ls
apps  desktop  notes  projects
web-os:~$ open browser
Ready.</div>
    </div>
  `;

  createWindow('terminal', 'Terminal', html, { left: '420px', top: '170px', width: '520px', height: '360px' });
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
  document.getElementById('startButton').addEventListener('click', () => {
    const menu = document.getElementById('startMenu');
    menu.classList.toggle('hidden');
  });

  document.addEventListener('click', (event) => {
    const menu = document.getElementById('startMenu');
    if (!event.target.closest('#startButton') && !event.target.closest('.start-item')) {
      menu.classList.add('hidden');
    }
  });

  renderDesktopIcons();
  renderDock();
  renderStartMenu();
  updateClock();
  setInterval(updateClock, 30000);

  openApp('browser');
  openApp('files');
  openApp('chat');
  openApp('code');
  openApp('games');
  openApp('terminal');
}

setupDesktop();
