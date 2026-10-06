const STORAGE_KEYS = {
  files: 'webos_v3_files',
  notes: 'webos_v3_notes',
  installedApps: 'webos_v3_installed',
  theme: 'webos_v3_theme',
  accent: 'webos_v3_accent',
  wallpaper: 'webos_v3_wallpaper'
};

const APP_CATALOG = [
  { id: 'browser', name: 'Browser', icon: '🌐', category: 'Web', installed: true },
  { id: 'files', name: 'Files', icon: '📁', category: 'System', installed: true },
  { id: 'writer', name: 'Writer', icon: '✍️', category: 'Notes', installed: true },
  { id: 'code', name: 'Code', icon: '💻', category: 'Dev', installed: true },
  { id: 'games', name: 'Games', icon: '🎮', category: 'Play', installed: true },
  { id: 'store', name: 'App Store', icon: '🛍️', category: 'Apps', installed: true },
  { id: 'settings', name: 'Settings', icon: '⚙️', category: 'System', installed: true },
  { id: 'terminal', name: 'Terminal', icon: '⌨️', category: 'System', installed: true }
];

const state = {
  files: loadJSON(STORAGE_KEYS.files, [
    { id: 'welcome', name: 'welcome.txt', content: 'Welcome home.\n\nThis is your personal web desktop.\nEverything is yours to shape.' },
    { id: 'ideas', name: 'brainstorm.txt', content: 'Ideas:\n- launch app store\n- build a browser\n- write code\n- make good things' },
    { id: 'notes', name: 'notes.md', content: '# Home screen\n\nA place to think, create, and roam.' }
  ]),
  notes: loadJSON(STORAGE_KEYS.notes, 'Dream big. Build thoughtfully. Make something that feels like home inside a screen.'),
  installedApps: loadJSON(STORAGE_KEYS.installedApps, APP_CATALOG.map((app) => app.id)),
  theme: loadJSON(STORAGE_KEYS.theme, 'dark'),
  accent: loadJSON(STORAGE_KEYS.accent, '#68d5ff'),
  wallpaper: loadJSON(STORAGE_KEYS.wallpaper, '')
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

function applyTheme() {
  document.body.classList.remove('light-mode', 'neon-mode');
  if (state.theme === 'light') document.body.classList.add('light-mode');
  if (state.theme === 'neon') document.body.classList.add('neon-mode');

  document.documentElement.style.setProperty('--accent', state.accent);

  const desktop = document.getElementById('desktop');
  if (desktop) {
    if (state.wallpaper) {
      desktop.style.backgroundImage = `linear-gradient(135deg, rgba(7,19,33,0.55), rgba(12,26,45,0.5)), url(${state.wallpaper})`;
      desktop.style.backgroundSize = 'cover';
      desktop.style.backgroundPosition = 'center';
    } else {
      desktop.style.backgroundImage = 'none';
      desktop.style.background = 'var(--desktop-bg)';
    }
  }
}

function showNotification(message, kind = 'info') {
  const tray = document.getElementById('notificationCenter');
  if (!tray) return;

  const note = document.createElement('div');
  note.className = 'notification';
  note.textContent = message;
  note.style.borderColor = kind === 'success' ? 'rgba(67, 211, 158, 0.6)' : 'rgba(255,255,255,0.12)';
  tray.appendChild(note);

  setTimeout(() => {
    note.remove();
  }, 2600);
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
  const searchInput = document.getElementById('startSearch');

  const renderApps = (filter = '') => {
    const filtered = activeApps.filter((app) => app.name.toLowerCase().includes(filter.toLowerCase()));
    startList.innerHTML = filtered.map((app) => `
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
  };

  if (searchInput) {
    searchInput.value = '';
    searchInput.oninput = (event) => renderApps(event.target.value);
  }

  renderApps();
}

function openApp(appId) {
  if (!state.installedApps.includes(appId)) return;

  if (windows[appId]) {
    focusWindow(appId);
    return;
  }

  switch (appId) {
    case 'browser': createBrowserWindow(); break;
    case 'files': createFilesWindow(); break;
    case 'writer': createWriterWindow(); break;
    case 'code': createCodeWindow(); break;
    case 'games': createGamesWindow(); break;
    case 'store': createStoreWindow(); break;
    case 'settings': createSettingsWindow(); break;
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
  win.dataset.id = id;
  win.style.left = options.left || '180px';
  win.style.top = options.top || '120px';
  win.style.width = options.width || '720px';
  win.style.height = options.height || '520px';
  win.style.zIndex = String(++zIndex);

  const body = document.createElement('div');
  body.className = 'window-body';
  body.innerHTML = html;

  const header = document.createElement('div');
  header.className = 'window-header';
  header.dataset.handle = id;
  header.innerHTML = `
    <div class="window-title">${title}</div>
    <div class="window-controls">
      <button class="window-btn" data-action="minimize" data-target="${id}">—</button>
      <button class="window-btn" data-action="maximize" data-target="${id}">▢</button>
      <button class="window-btn" data-action="close" data-target="${id}">×</button>
    </div>
  `;

  win.appendChild(header);
  win.appendChild(body);

  const resizeHandles = ['north', 'south', 'east', 'west', 'ne', 'nw', 'se', 'sw'];
  resizeHandles.forEach((dir) => {
    const handle = document.createElement('div');
    handle.className = `resize-handle ${dir === 'ne' || dir === 'nw' || dir === 'se' || dir === 'sw' ? 'corner' : ''} ${dir}`;
    handle.dataset.resize = dir;
    win.appendChild(handle);
  });

  layer.appendChild(win);
  windows[id] = win;

  win.addEventListener('mousedown', () => focusWindow(id));

  win.querySelectorAll('.window-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      const target = button.dataset.target;
      if (action === 'close') closeWindow(target);
      if (action === 'minimize') minimizeWindow(target);
      if (action === 'maximize') toggleMaximize(target);
    });
  });

  makeDraggable(win);
  makeResizable(win);
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

function toggleMaximize(id) {
  const target = windows[id];
  if (!target) return;

  const area = document.querySelector('.desktop-area');
  const rect = area.getBoundingClientRect();

  if (target.dataset.maximized === 'true') {
    const prev = JSON.parse(target.dataset.prev || '{}');
    target.style.left = prev.left || '180px';
    target.style.top = prev.top || '120px';
    target.style.width = prev.width || '720px';
    target.style.height = prev.height || '520px';
    target.dataset.maximized = 'false';
  } else {
    target.dataset.prev = JSON.stringify({
      left: target.style.left,
      top: target.style.top,
      width: target.style.width,
      height: target.style.height
    });
    target.style.left = '0px';
    target.style.top = '0px';
    target.style.width = `${rect.width}px`;
    target.style.height = `${rect.height}px`;
    target.dataset.maximized = 'true';
  }
}

function makeDraggable(win) {
  const handle = win.querySelector('[data-handle]');
  if (!handle) return;

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener('mousedown', (event) => {
    if (win.dataset.maximized === 'true') return;
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

function makeResizable(win) {
  const handles = win.querySelectorAll('.resize-handle');
  if (!handles.length) return;

  handles.forEach((handle) => {
    handle.addEventListener('mousedown', (event) => {
      event.stopPropagation();
      const dir = handle.dataset.resize;
      const startX = event.clientX;
      const startY = event.clientY;
      const rect = win.getBoundingClientRect();
      const onMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        if (dir.includes('e')) win.style.width = `${rect.width + dx}px`;
        if (dir.includes('s')) win.style.height = `${rect.height + dy}px`;
        if (dir.includes('w')) {
          const newWidth = rect.width - dx;
          win.style.width = `${Math.max(260, newWidth)}px`;
          win.style.left = `${rect.left + dx}px`;
        }
        if (dir.includes('n')) {
          const newHeight = rect.height - dy;
          win.style.height = `${Math.max(180, newHeight)}px`;
          win.style.top = `${rect.top + dy}px`;
        }
      };

      const onUp = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  });
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
  const activeFile = files[0];
  const fileList = files.map((file) => `
    <button class="file-item ${file.id === activeFile.id ? 'active' : ''}" data-file-id="${file.id}">${file.name}</button>
  `).join('');

  const html = `
    <div class="file-layout">
      <aside class="file-sidebar">
        <div class="file-list">${fileList}</div>
        <div class="editor-actions">
          <button id="newFileBtn">+ New</button>
        </div>
      </aside>
      <section class="file-editor">
        <textarea id="fileEditorArea">${escapeHtml(activeFile.content)}</textarea>
        <div class="editor-actions">
          <button id="saveFileBtn">Save</button>
          <button id="deleteFileBtn">Delete</button>
        </div>
      </section>
    </div>
  `;

  const win = createWindow('files', 'Files', html, { left: '220px', top: '120px', width: '760px', height: '540px' });
  const editor = win.querySelector('#fileEditorArea');
  let selectedId = activeFile.id;

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
    showNotification('File saved');
  });

  win.querySelector('#deleteFileBtn').addEventListener('click', () => {
    if (state.files.length <= 1) return;
    state.files = state.files.filter((file) => file.id !== selectedId);
    selectedId = state.files[0].id;
    saveJSON(STORAGE_KEYS.files, state.files);
    closeWindow('files');
    createFilesWindow();
    showNotification('File deleted');
  });

  win.querySelector('#newFileBtn').addEventListener('click', () => {
    const id = `file-${Date.now()}`;
    const name = `new-file-${state.files.length + 1}.txt`;
    state.files.push({ id, name, content: 'Write something new...' });
    saveJSON(STORAGE_KEYS.files, state.files);
    closeWindow('files');
    createFilesWindow();
    showNotification('New file created');
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
    showNotification('Notebook saved');
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
    showNotification('Code saved to Files');
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

function createSettingsWindow() {
  const html = `
    <div class="settings-window">
      <div class="settings-grid">
        <div class="setting-card">
          <label>Theme</label>
          <div class="setting-btn-row">
            <button data-theme="dark">Dark</button>
            <button data-theme="light">Light</button>
            <button data-theme="neon">Neon</button>
          </div>
        </div>

        <div class="setting-card">
          <label>Accent</label>
          <input id="accentInput" type="color" value="${state.accent}" />
        </div>

        <div class="setting-card">
          <label>Wallpaper</label>
          <input id="wallpaperInput" type="file" accept="image/*" />
          <div class="setting-btn-row">
            <button id="clearWallpaperBtn">Clear</button>
          </div>
        </div>

        <div class="setting-card">
          <label>Quick actions</label>
          <div class="setting-btn-row">
            <button id="showShortcutsBtn">Shortcuts</button>
            <button id="showNotificationBtn">Notify</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const win = createWindow('settings', 'Settings', html, { left: '340px', top: '120px', width: '560px', height: '420px' });

  win.querySelectorAll('[data-theme]').forEach((button) => {
    button.addEventListener('click', () => {
      state.theme = button.dataset.theme;
      saveJSON(STORAGE_KEYS.theme, state.theme);
      applyTheme();
      showNotification(`Theme set to ${state.theme}`);
    });
  });

  win.querySelector('#accentInput').addEventListener('input', (event) => {
    state.accent = event.target.value;
    saveJSON(STORAGE_KEYS.accent, state.accent);
    applyTheme();
  });

  win.querySelector('#wallpaperInput').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.wallpaper = reader.result;
      saveJSON(STORAGE_KEYS.wallpaper, state.wallpaper);
      applyTheme();
      showNotification('Wallpaper updated');
    };
    reader.readAsDataURL(file);
  });

  win.querySelector('#clearWallpaperBtn').addEventListener('click', () => {
    state.wallpaper = '';
    saveJSON(STORAGE_KEYS.wallpaper, state.wallpaper);
    applyTheme();
    showNotification('Wallpaper cleared');
  });

  win.querySelector('#showShortcutsBtn').addEventListener('click', () => {
    const text = [
      'Desktop: right-click for quick actions',
      'Windows: drag to move, use the resize handles',
      'Dock: click apps to open/bring forward',
      'Start: search apps instantly',
      'Theme: change with settings panel'
    ].join('\n');
    showNotification('Shortcuts ready');
    const info = document.createElement('div');
    info.className = 'notification';
    info.textContent = text;
    document.getElementById('notificationCenter').appendChild(info);
    setTimeout(() => info.remove(), 3000);
  });

  win.querySelector('#showNotificationBtn').addEventListener('click', () => {
    showNotification('System ready');
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

function setupContextMenu() {
  const menu = document.getElementById('desktopContextMenu');
  const items = [
    { label: 'New Folder', action: () => { showNotification('Folder creation coming next'); } },
    { label: 'Change Wallpaper', action: () => openApp('settings') },
    { label: 'Toggle Theme', action: () => {
        state.theme = state.theme === 'dark' ? 'light' : state.theme === 'light' ? 'neon' : 'dark';
        saveJSON(STORAGE_KEYS.theme, state.theme);
        applyTheme();
        showNotification(`Theme set to ${state.theme}`);
      }
    },
    { label: 'Open Settings', action: () => openApp('settings') },
    { label: 'Shortcuts', action: () => showNotification('Drag windows, right-click desktop, search apps from Start') }
  ];

  menu.innerHTML = items.map((item) => `
    <button class="context-item" data-action="${item.label}">${item.label}</button>
  `).join('');

  menu.querySelectorAll('.context-item').forEach((button) => {
    button.addEventListener('click', () => {
      const label = button.dataset.action;
      const match = items.find((item) => item.label === label);
      if (match) match.action();
      menu.classList.add('hidden');
    });
  });

  document.addEventListener('contextmenu', (event) => {
    const target = event.target.closest('.window') || event.target.closest('.start-menu') || event.target.closest('.dock') || event.target.closest('.context-menu');
    if (target) return;
    event.preventDefault();
    menu.style.left = `${event.clientX}px`;
    menu.style.top = `${event.clientY}px`;
    menu.classList.remove('hidden');
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.context-item') && !event.target.closest('.context-menu')) {
      menu.classList.add('hidden');
    }
  });
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
  applyTheme();
  updateClock();
  setInterval(updateClock, 30000);

  setupContextMenu();
  showNotification('Desktop ready');

  openApp('browser');
  openApp('files');
  openApp('code');
  openApp('games');
  openApp('terminal');
}

setupDesktop();
