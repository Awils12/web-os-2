// Web OS Application

const API_URL = 'http://localhost:5000';
const socket = io();

let currentUser = null;
let currentView = 'login';
const openWindows = {};

// Window Manager
class WindowManager {
  constructor() {
    this.windows = {};
    this.zIndex = 100;
  }

  create(id, title, content, options = {}) {
    const window = document.createElement('div');
    window.className = 'window active';
    window.id = `window-${id}`;
    window.style.left = (options.left || 100) + 'px';
    window.style.top = (options.top || 100) + 'px';
    window.style.width = (options.width || 500) + 'px';
    window.style.height = (options.height || 400) + 'px';
    window.style.zIndex = this.zIndex++;

    window.innerHTML = `
      <div class="window-header">
        <h3>${title}</h3>
        <div class="window-controls">
          <button class="window-btn" onclick="windowManager.minimize('${id}')">_</button>
          <button class="window-btn" onclick="windowManager.close('${id}')">×</button>
        </div>
      </div>
      <div class="window-content" id="content-${id}">
        ${content}
      </div>
    `;

    document.querySelector('.desktop-content').appendChild(window);
    this.windows[id] = window;
    this.makeDraggable(window);
    return window;
  }

  makeDraggable(element) {
    const header = element.querySelector('.window-header');
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

    header.onmousedown = (e) => {
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = () => { document.onmousemove = null; };
      document.onmousemove = (e) => {
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + 'px';
        element.style.left = (element.offsetLeft - pos1) + 'px';
      };
    };
  }

  close(id) {
    const window = this.windows[id];
    if (window) window.remove();
    delete this.windows[id];
  }

  minimize(id) {
    const window = this.windows[id];
    if (window) window.style.display = window.style.display === 'none' ? 'flex' : 'none';
  }
}

const windowManager = new WindowManager();

// UI Renderer
function render() {
  const app = document.getElementById('app');

  if (!currentUser) {
    app.innerHTML = `
      <div class="login-container">
        <div class="login-box">
          <h1>Web OS</h1>
          <div id="login-form">
            <div class="form-group">
              <label>Username</label>
              <input type="text" id="username" placeholder="Enter username">
            </div>
            <div class="form-group">
              <label>Email (for signup)</label>
              <input type="email" id="email" placeholder="Enter email">
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" id="password" placeholder="Enter password">
            </div>
            <button onclick="handleLogin()">Login</button>
            <button class="toggle-btn" onclick="toggleAuthForm()">Create New Account</button>
          </div>
        </div>
      </div>
    `;
  } else {
    app.innerHTML = `
      <div class="desktop">
        <div class="desktop-content" id="desktop-content">
          <div class="icon-grid">
            <div class="desktop-icon" ondblclick="openApp('messenger')">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect fill='%230066cc' width='64' height='64' rx='8'/%3E%3Ctext x='32' y='40' font-size='20' fill='white' text-anchor='middle'%3E💬%3C/text%3E%3C/svg%3E" alt="Messenger">
              <label>Messenger</label>
            </div>
            <div class="desktop-icon" ondblclick="openApp('files')">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect fill='%23ffa500' width='64' height='64' rx='8'/%3E%3Ctext x='32' y='40' font-size='20' fill='white' text-anchor='middle'%3E📁%3C/text%3E%3C/svg%3E" alt="Files">
              <label>File System</label>
            </div>
            <div class="desktop-icon" ondblclick="openApp('code')">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect fill='%23333' width='64' height='64' rx='8'/%3E%3Ctext x='32' y='40' font-size='20' fill='white' text-anchor='middle'%3E%3C%3E%3C/text%3E%3C/svg%3E" alt="Code">
              <label>Code Editor</label>
            </div>
            <div class="desktop-icon" ondblclick="openApp('games')">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect fill='%23ff6b6b' width='64' height='64' rx='8'/%3E%3Ctext x='32' y='40' font-size='20' fill='white' text-anchor='middle'%3E🎮%3C/text%3E%3C/svg%3E" alt="Games">
              <label>Games</label>
            </div>
            <div class="desktop-icon" ondblclick="openApp('apps')">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect fill='%2328a745' width='64' height='64' rx='8'/%3E%3Ctext x='32' y='40' font-size='20' fill='white' text-anchor='middle'%3E⬇️%3C/text%3E%3C/svg%3E" alt="App Store">
              <label>App Store</label>
            </div>
          </div>
        </div>
        <div class="taskbar">
          <button class="taskbar-btn" onclick="openApp('settings')">Settings</button>
          <span style="color: white; margin-left: auto; margin-right: 10px;">Logged in as: ${currentUser.username}</span>
          <button class="taskbar-btn" onclick="logout()">Logout</button>
        </div>
      </div>
    `;
  }
}

// Auth Functions
async function handleLogin() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const email = document.getElementById('email').value;

  if (!username || !password) {
    alert('Please fill in all fields');
    return;
  }

  try {
    // Try to login first
    let response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (response.ok) {
      const data = await response.json();
      currentUser = { id: data.user_id, username: data.username };
      localStorage.setItem('token', `Bearer ${data.user_id}`);
      render();
    } else if (response.status === 401 && email) {
      // If login fails and email provided, try to register
      response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      if (response.ok) {
        const data = await response.json();
        alert('Account created! Please login.');
      }
    } else {
      alert('Login failed');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Network error');
  }
}

function toggleAuthForm() {
  // Toggle between login and signup
  render();
}

function logout() {
  currentUser = null;
  localStorage.removeItem('token');
  Object.keys(windowManager.windows).forEach(id => windowManager.close(id));
  render();
}

// App Functions
async function openApp(appName) {
  const token = localStorage.getItem('token');

  switch(appName) {
    case 'messenger':
      const usersResponse = await fetch(`${API_URL}/api/users`, {
        headers: { 'Authorization': token }
      });
      const users = await usersResponse.json();
      const usersList = users.filter(u => u.id !== currentUser.id)
        .map(u => `<div class="user-item" onclick="openMessenger(${u.id}, '${u.username}')">${u.username} <span class="user-status ${u.status === 'online' ? 'online' : ''}"></span></div>`)
        .join('');
      
      windowManager.create('messenger', 'Messenger', `<div class="users-list">${usersList}</div>`, { width: 300, height: 400 });
      break;

    case 'files':
      const filesResponse = await fetch(`${API_URL}/api/files`, {
        headers: { 'Authorization': token }
      });
      const files = await filesResponse.json();
      const filesList = files.map(f => `<div class="file-item">${f.filename} <small>[${f.type}]</small></div>`).join('');
      
      windowManager.create('files', 'File System', `
        <div class="files-list">${filesList || '<p>No files yet</p>'}</div>
        <div style="padding: 10px; border-top: 1px solid #ddd;">
          <input type="text" id="new-file" placeholder="New file name" style="width: 70%; padding: 5px;">
          <button onclick="createFile()" style="width: 25%; padding: 5px;">Create</button>
        </div>
      `, { width: 400, height: 500 });
      break;

    case 'code':
      windowManager.create('code', 'Code Editor', `
        <div class="code-editor">
          <div class="code-editor-toolbar">
            <button onclick="runCode()">Run Code</button>
            <button onclick="saveCode()">Save</button>
            <button onclick="clearCode()">Clear</button>
          </div>
          <textarea id="code-input" placeholder="// Write your code here...\n"></textarea>
          <div id="code-output" style="background: #f5f5f5; padding: 10px; height: 100px; overflow-y: auto; border-top: 1px solid #ddd; font-family: monospace; font-size: 11px;"></div>
        </div>
      `, { width: 700, height: 600 });
      break;

    case 'games':
      windowManager.create('games', 'Multiplayer Games', `
        <div class="game-lobby">
          <div class="game-card" onclick="joinGame('tictactoe')">
            <h4>Tic Tac Toe</h4>
            <p class="player-count">2 players online</p>
          </div>
          <div class="game-card" onclick="joinGame('chess')">
            <h4>Chess</h4>
            <p class="player-count">5 players online</p>
          </div>
          <div class="game-card" onclick="joinGame('snake')">
            <h4>Snake Multiplayer</h4>
            <p class="player-count">12 players online</p>
          </div>
          <div class="game-card" onclick="joinGame('quiz')">
            <h4>Quiz Battle</h4>
            <p class="player-count">8 players online</p>
          </div>
        </div>
      `, { width: 350, height: 450 });
      break;

    case 'apps':
      const appsResponse = await fetch(`${API_URL}/api/apps`);
      const apps = await appsResponse.json();
      const appsList = apps.map(a => `<div class="app-item" onclick="installApp(${a.id})">${a.name} <button onclick="installApp(${a.id})" style="width: auto; padding: 5px 10px;">Install</button></div>`).join('');
      
      windowManager.create('apps', 'App Store', `<div class="apps-list">${appsList}</div>`, { width: 450, height: 500 });
      break;

    case 'settings':
      windowManager.create('settings', 'Settings', `
        <div style="padding: 10px;">
          <h3>User Settings</h3>
          <p><strong>Username:</strong> ${currentUser.username}</p>
          <p><strong>User ID:</strong> ${currentUser.id}</p>
          <hr>
          <h4>Preferences</h4>
          <label><input type="checkbox" checked> Dark Mode</label><br>
          <label><input type="checkbox" checked> Notifications</label><br>
          <hr>
          <button onclick="logout()" style="background: #ff6b6b;">Logout</button>
        </div>
      `, { width: 350, height: 400 });
      break;
  }
}

async function openMessenger(recipientId, recipientName) {
  const token = localStorage.getItem('token');
  const messagesResponse = await fetch(`${API_URL}/api/messages/${recipientId}`, {
    headers: { 'Authorization': token }
  });
  const messages = await messagesResponse.json();
  const messagesList = messages.map(m => `
    <div class="message ${m.sender_id === currentUser.id ? 'sent' : 'received'}">${m.content}</div>
  `).join('');

  windowManager.create(`chat-${recipientId}`, `Chat with ${recipientName}`, `
    <div class="message-list" id="message-list-${recipientId}">${messagesList}</div>
    <div class="message-input-area">
      <input type="text" id="message-input-${recipientId}" placeholder="Type a message...">
      <button onclick="sendMessage(${recipientId})">Send</button>
    </div>
  `, { width: 450, height: 500 });
}

async function sendMessage(recipientId) {
  const input = document.getElementById(`message-input-${recipientId}`);
  const message = input.value;
  if (!message) return;

  const token = localStorage.getItem('token');
  await fetch(`${API_URL}/api/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token
    },
    body: JSON.stringify({ recipient_id: recipientId, content: message })
  });

  input.value = '';
  // Refresh messages
  const messageList = document.getElementById(`message-list-${recipientId}`);
  messageList.innerHTML += `<div class="message sent">${message}</div>`;
  messageList.scrollTop = messageList.scrollHeight;
}

async function createFile() {
  const filename = document.getElementById('new-file').value;
  if (!filename) return;

  const token = localStorage.getItem('token');
  await fetch(`${API_URL}/api/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token
    },
    body: JSON.stringify({ filename, type: 'file' })
  });

  openApp('files');
}

function runCode() {
  const code = document.getElementById('code-input').value;
  const output = document.getElementById('code-output');
  
  try {
    // Simple eval for demo - in production use safer execution
    output.innerHTML = '<strong>Output:</strong><br>' + eval(code);
  } catch (error) {
    output.innerHTML = `<strong style="color: red;">Error:</strong><br>${error.message}`;
  }
}

function saveCode() {
  const code = document.getElementById('code-input').value;
  const token = localStorage.getItem('token');
  
  fetch(`${API_URL}/api/files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token
    },
    body: JSON.stringify({ filename: 'code.js', content: code, type: 'file' })
  }).then(() => alert('Code saved!'));
}

function clearCode() {
  document.getElementById('code-input').value = '';
  document.getElementById('code-output').innerHTML = '';
}

function joinGame(gameName) {
  windowManager.create(`game-${gameName}`, gameName.toUpperCase(), `
    <div style="padding: 20px; text-align: center;">
      <h3>Waiting for players...</h3>
      <p>You are in the lobby for ${gameName}</p>
      <p style="font-size: 32px; margin: 30px 0;">🎮</p>
      <p>Searching for opponents...</p>
      <button onclick="windowManager.close('game-${gameName}')">Leave Game</button>
    </div>
  `, { width: 500, height: 450 });
}

function installApp(appId) {
  alert(`App #${appId} installed!`);
}

// Socket.io Events
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('response', (data) => {
  console.log('Server response:', data);
});

socket.on('new_message', (data) => {
  console.log('New message:', data);
});

// Initial render
render();
