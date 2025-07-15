(() => {
  // == ShyOS Ultimate v2.0 by Shia Swanson ==
  // Features: boot animation, login/signup, dock, real working apps,
  // draggable/resizable windows, dark/light theme, persistent settings, notifications, and much more.

  // DOM Elements
  const landing = document.getElementById('landing');
  const bootBtn = document.getElementById('bootBtn');
  const login = document.getElementById('login');
  const desktop = document.getElementById('desktop');
  const dock = document.getElementById('dock');
  const toolbar = document.getElementById('toolbar');
  const wallpaper = document.getElementById('wallpaper');
  const logoutBtn = document.getElementById('logoutBtn');
  const themeToggle = document.getElementById('themeToggle');
  const trayTime = document.getElementById('tray-time');
  const desktopIcons = document.getElementById('desktop-icons');
  const windowsContainer = document.getElementById('windows');
  const notifications = document.getElementById('notifications');
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const modalOk = document.getElementById('modal-ok');
  const modalCancel = document.getElementById('modal-cancel');

  // Variables
  let openWindows = new Map();
  let windowZIndex = 100;
  let currentUser = null;
  let theme = 'dark';
  let wallpaperImages = [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1280&q=80',
    'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1280&q=80',
    'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1280&q=80',
  ];
  let wallpaperIndex = 0;

  // Helpers

  // Save settings to localStorage
  function saveSettings() {
    if (!currentUser) return;
    localStorage.setItem(`shyos_user_${currentUser}`, JSON.stringify({
      theme,
      wallpaperIndex
    }));
  }

  // Load settings from localStorage
  function loadSettings() {
    if (!currentUser) return;
    const data = localStorage.getItem(`shyos_user_${currentUser}`);
    if (data) {
      const obj = JSON.parse(data);
      theme = obj.theme || 'dark';
      wallpaperIndex = obj.wallpaperIndex || 0;
    }
    applyTheme(theme);
    applyWallpaper();
  }

  // Apply theme to body
  function applyTheme(t) {
    if (t === 'light') {
      document.body.classList.add('light');
      themeToggle.textContent = '🌞';
    } else {
      document.body.classList.remove('light');
      themeToggle.textContent = '🌙';
    }
  }

  // Apply wallpaper
  function applyWallpaper() {
    wallpaper.style.backgroundImage = `url('${wallpaperImages[wallpaperIndex]}')`;
  }

  // Show notifications
  function notify(msg, duration = 3500) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    notifications.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 500);
    }, duration);
  }

  // Password hash (simple SHA-256 wrapper)
  async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
  }

  // User management
  async function signup(username, password) {
    if (!username || !password) {
      return {error: 'Username and password required'};
    }
    if (localStorage.getItem(`shyos_user_${username}`)) {
      return {error: 'User already exists'};
    }
    const passHash = await hashPassword(password);
    localStorage.setItem(`shyos_user_${username}`, JSON.stringify({
      passHash,
      theme: 'dark',
      wallpaperIndex: 0
    }));
    return {success: true};
  }

  async function loginUser(username, password) {
    if (!username || !password) return {error: 'Username and password required'};
    const userDataStr = localStorage.getItem(`shyos_user_${username}`);
    if (!userDataStr) return {error: 'User does not exist'};
    const userData = JSON.parse(userDataStr);
    const passHash = await hashPassword(password);
    if (passHash !== userData.passHash) return {error: 'Incorrect password'};
    return {success: true};
  }

  // Sign out
  function logout() {
    currentUser = null;
    desktop.classList.remove('active');
    login.classList.remove('active');
    landing.classList.add('active');
    openWindows.forEach(w => w.remove());
    openWindows.clear();
    notify('Logged out');
  }

  // Boot sequence
  bootBtn.addEventListener('click', () => {
    bootBtn.disabled = true;
    bootBtn.textContent = 'Booting...';
    setTimeout(() => {
      landing.classList.remove('active');
      login.classList.add('active');
      bootBtn.disabled = false;
      bootBtn.textContent = 'BOOT';
    }, 1200);
  });

  // Login / Signup buttons
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginError = document.getElementById('loginError');
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  const guestBtn = document.getElementById('guestBtn');

  loginBtn.addEventListener('click', async () => {
    loginError.textContent = '';
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const res = await loginUser(username, password);
    if (res.error) {
      loginError.textContent = res.error;
      return;
    }
    currentUser = username;
    loadSettings();
    showDesktop();
    notify(`Welcome back, ${username}!`);
  });

  signupBtn.addEventListener('click', async () => {
    loginError.textContent = '';
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const res = await signup(username, password);
    if (res.error) {
      loginError.textContent = res.error;
      return;
    }
    notify('Signup successful! Please login.');
  });

  guestBtn.addEventListener('click', () => {
    currentUser = 'guest';
    theme = 'dark';
    wallpaperIndex = 0;
    loadSettings();
    showDesktop();
    notify('Logged in as Guest');
  });

  // Show desktop and hide login
  function showDesktop() {
    login.classList.remove('active');
    desktop.classList.add('active');
    updateTime();
    renderDock();
    renderDesktopIcons();
  }

  // Update tray clock
  function updateTime() {
    const now = new Date();
    trayTime.textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
  }
  setInterval(updateTime, 1000);

  // Theme toggle
  themeToggle.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    saveSettings();
  });

  // Logout button
  logoutBtn.addEventListener('click', () => {
    logout();
  });

  // Desktop icons & drag/reorder
  const desktopApps = [
    {id: 'terminal', name: 'Terminal', icon: '🖥️'},
    {id: 'browser', name: 'Browser', icon: '🌐'},
    {id: 'files', name: 'Files', icon: '📁'},
    {id: 'textedit', name: 'TextEdit', icon: '📝'},
    {id: 'settings', name: 'Settings', icon: '⚙️'},
    {id: 'help', name: 'Help', icon: '❓'},
    {id: 'calculator', name: 'Calculator', icon: '🧮'},
    {id: 'music', name: 'Music', icon: '🎵'},
  ];

  function renderDesktopIcons() {
    desktopIcons.innerHTML = '';
    desktopApps.forEach(app => {
      const div = document.createElement('div');
      div.className = 'desktop-icon';
      div.tabIndex = 0;
      div.setAttribute('role', 'button');
      div.setAttribute('aria-label', app.name);
      div.textContent = `${app.icon} ${app.name}`;
      div.addEventListener('dblclick', () => openApp(app.id));
      desktopIcons.appendChild(div);
    });
  }

  // Dock apps (same as desktop apps for now)
  function renderDock() {
    dock.innerHTML = '';
    desktopApps.forEach(app => {
      const span = document.createElement('span');
      span.className = 'dock-app';
      span.title = app.name;
      span.textContent = app.icon;
      span.tabIndex = 0;
      span.setAttribute('role', 'button');
      span.addEventListener('click', () => openApp(app.id));
      dock.appendChild(span);
    });
  }

  // Window Management

  function createWindow(id, title, contentHTML, options = {}) {
    if (openWindows.has(id)) {
      bringToFront(openWindows.get(id));
      return openWindows.get(id);
    }
    const win = document.createElement('section');
    win.className = 'window';
    win.style.width = options.width || '480px';
    win.style.height = options.height || '320px';
    win.style.left = options.left || '100px';
    win.style.top = options.top || '80px';
    win.style.zIndex = windowZIndex++;
    win.id = 'win-' + id;
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', title);
    win.innerHTML = `
      <div class="titlebar" tabindex="0">
        <span class="title">${title}</span>
        <div class="controls">
          <button class="minimize" aria-label="Minimize Window">—</button>
          <button class="maximize" aria-label="Maximize Window">▢</button>
          <button class="close" aria-label="Close Window">×</button>
        </div>
      </div>
      <div class="content">${contentHTML}</div>
      <div class="resizer"></div>
    `;

    windowsContainer.appendChild(win);
    openWindows.set(id, win);

    // Dragging
    const titlebar = win.querySelector('.titlebar');
    let dragging = false;
    let offsetX = 0, offsetY = 0;

    titlebar.addEventListener('mousedown', e => {
      dragging = true;
      bringToFront(win);
      offsetX = e.clientX - win.offsetLeft;
      offsetY = e.clientY - win.offsetTop;
      titlebar.style.cursor = 'grabbing';
      e.preventDefault();
    });
    window.addEventListener('mouseup', () => {
      dragging = false;
      titlebar.style.cursor = 'grab';
    });
    window.addEventListener('mousemove', e => {
      if (dragging) {
        let x = e.clientX - offsetX;
        let y = e.clientY - offsetY;
        // boundaries
        x = Math.max(0, Math.min(window.innerWidth - win.offsetWidth, x));
        y = Math.max(40, Math.min(window.innerHeight - win.offsetHeight - 40, y));
        win.style.left = x + 'px';
        win.style.top = y + 'px';
      }
    });

    // Resizing
    const resizer = win.querySelector('.resizer');
    let resizing = false;
    let startX, startY, startWidth, startHeight;

    resizer.addEventListener('mousedown', e => {
      resizing = true;
      bringToFront(win);
      startX = e.clientX;
      startY = e.clientY;
      startWidth = win.offsetWidth;
      startHeight = win.offsetHeight;
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener('mouseup', () => resizing = false);

    window.addEventListener('mousemove', e => {
      if (resizing) {
        let newWidth = startWidth + (e.clientX - startX);
        let newHeight = startHeight + (e.clientY - startY);
        newWidth = Math.max(320, Math.min(window.innerWidth - win.offsetLeft, newWidth));
        newHeight = Math.max(200, Math.min(window.innerHeight - win.offsetTop - 40, newHeight));
        win.style.width = newWidth + 'px';
        win.style.height = newHeight + 'px';
      }
    });

    // Window Controls
    const minimizeBtn = win.querySelector('.minimize');
    const maximizeBtn = win.querySelector('.maximize');
    const closeBtn = win.querySelector('.close');

    minimizeBtn.addEventListener('click', () => {
      win.style.display = 'none';
    });

    maximizeBtn.addEventListener('click', () => {
      if (win.classList.contains('maximized')) {
        // Restore
        win.classList.remove('maximized');
        win.style.left = options.left || '100px';
        win.style.top = options.top || '80px';
        win.style.width = options.width || '480px';
        win.style.height = options.height || '320px';
      } else {
        // Maximize
        win.classList.add('maximized');
        win.style.left = '0';
        win.style.top = '40px';
        win.style.width = '100vw';
        win.style.height = 'calc(100vh - 40px)';
      }
    });

    closeBtn.addEventListener('click', () => {
      win.remove();
      openWindows.delete(id);
    });

    bringToFront(win);
    return win;
  }

  // Bring window to front
  function bringToFront(win) {
    windowZIndex++;
    win.style.zIndex = windowZIndex;
  }

  // Apps code

  // Terminal app
  function terminalApp() {
    const content = `
      <div id="terminal-output" style="height: 200px; overflow-y: auto; background: #000011; color: #0f0; padding: 10px; font-family: monospace; font-size: 14px; border-radius: 8px;"></div>
      <input type="text" id="terminal-input" placeholder="Type a command and hit Enter" style="width: 100%; margin-top: 10px; font-family: monospace; font-size: 14px; padding: 6px; border-radius: 6px; border: none; outline: none; background: #001133; color: #0f0;" autofocus />
    `;
    const win = createWindow('terminal', 'Terminal', content, {width: '600px', height: '340px'});

    const output = win.querySelector('#terminal-output');
    const input = win.querySelector('#terminal-input');

    let commandHistory = [];
    let historyIndex = -1;

    function appendOutput(text, type='info') {
      const p = document.createElement('p');
      p.textContent = text;
      if (type === 'error') p.style.color = '#f44';
      output.appendChild(p);
      output.scrollTop = output.scrollHeight;
    }

    function processCommand(cmd) {
      const c = cmd.trim();
      if (!c) return;
      commandHistory.push(c);
      historyIndex = commandHistory.length;
      appendOutput(`> ${c}`);

      const parts = c.split(' ');
      const base = parts[0].toLowerCase();
      const args = parts.slice(1);

      switch(base) {
        case 'help':
          appendOutput('Commands: help, echo [text], clear, date, about, exit');
          break;
        case 'echo':
          appendOutput(args.join(' '));
          break;
        case 'clear':
          output.innerHTML = '';
          break;
        case 'date':
          appendOutput(new Date().toString());
          break;
        case 'about':
          appendOutput('ShyOS Terminal v2.0 by Shia Swanson');
          break;
        case 'exit':
          win.remove();
          openWindows.delete('terminal');
          break;
        default:
          appendOutput(`Unknown command: ${base}`, 'error');
      }
    }

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        processCommand(input.value);
        input.value = '';
      } else if (e.key === 'ArrowUp') {
        if (historyIndex > 0) {
          historyIndex--;
          input.value = commandHistory[historyIndex];
        }
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        if (historyIndex < commandHistory.length -1) {
          historyIndex++;
          input.value = commandHistory[historyIndex];
        } else {
          historyIndex = commandHistory.length;
          input.value = '';
        }
        e.preventDefault();
      }
    });
  }

  // Browser app
  function browserApp() {
    const content = `
      <input type="text" id="browser-url" placeholder="Enter URL and press Go" style="width: calc(100% - 100px); padding: 6px; border-radius: 6px; border: none; margin-bottom: 10px; font-size: 14px;" />
      <button id="browser-go" style="width: 80px; padding: 6px; border-radius: 6px; border: none; cursor: pointer; background: #004a9f; color: white;">Go</button>
      <iframe id="browser-frame" src="https://wikipedia.org" style="width: 100%; height: 250px; border-radius: 10px; border: none;"></iframe>
    `;
    const win = createWindow('browser', 'Browser', content, {width: '640px', height: '340px'});

    const urlInput = win.querySelector('#browser-url');
    const goBtn = win.querySelector('#browser-go');
    const iframe = win.querySelector('#browser-frame');

    goBtn.addEventListener('click', () => {
      let url = urlInput.value.trim();
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      iframe.src = url;
    });
  }

  // Files app - fake FS
  let fakeFileSystem = {
    'root': {
      'Documents': {
        'Readme.txt': 'Welcome to ShyOS! This is a fake filesystem.',
        'Todo.txt': '1. Build more apps\n2. Add games\n3. Have fun'
      },
      'Pictures': {
        'ShyOS.png': '🖼️ Fake image placeholder',
        'Sunset.jpg': '🖼️ Fake image placeholder'
      },
      'Music': {},
      'Downloads': {},
    }
  };

  function filesApp() {
    const content = `
      <div id="file-path" style="font-weight: 700; margin-bottom: 10px; user-select: text;"></div>
      <ul id="file-list" style="list-style:none; padding-left: 10px; height: 250px; overflow-y: auto; border-radius: 10px; background: #001133; margin: 0;"></ul>
      <div style="margin-top: 10px;">
        <input type="text" id="new-folder-name" placeholder="New folder name" style="padding: 6px; border-radius: 6px; border: none; margin-right: 8px;" />
        <button id="new-folder-btn" style="background: #004a9f; border:none; padding: 6px 12px; border-radius: 6px; color: white; cursor: pointer;">New Folder</button>
      </div>
    `;
    const win = createWindow('files', 'Files', content, {width: '480px', height: '380px'});

    const filePathEl = win.querySelector('#file-path');
    const fileListEl = win.querySelector('#file-list');
    const newFolderInput = win.querySelector('#new-folder-name');
    const newFolderBtn = win.querySelector('#new-folder-btn');

    let currentPath = ['root'];

    function renderFiles() {
      filePathEl.textContent = '/' + currentPath.slice(1).join('/');
      fileListEl.innerHTML = '';
      let folder = getFolder(currentPath);
      if (!folder) return;
      // If not root, add .. to go back
      if (currentPath.length > 1) {
        const li = document.createElement('li');
        li.textContent = '⬆️ ..';
        li.style.cursor = 'pointer';
        li.style.fontWeight = '700';
        li.addEventListener('click', () => {
          currentPath.pop();
          renderFiles();
        });
        fileListEl.appendChild(li);
      }
      Object.entries(folder).forEach(([name, val]) => {
        const li = document.createElement('li');
        li.textContent = (typeof val === 'string') ? `📄 ${name}` : `📁 ${name}`;
        li.style.cursor = 'pointer';
        li.addEventListener('dblclick', () => {
          if (typeof val === 'string') {
            openTextFile(currentPath.concat(name), val);
          } else {
            currentPath.push(name);
            renderFiles();
          }
        });
        fileListEl.appendChild(li);
      });
    }

    // Get folder ref by path
    function getFolder(path) {
      let ptr = fakeFileSystem;
      for (const p of path) {
        if (!ptr[p]) return null;
        ptr = ptr[p];
      }
      return ptr;
    }

    // Open text file app
    function openTextFile(path, content) {
      textEditApp(path, content);
    }

    newFolderBtn.addEventListener('click', () => {
      const folderName = newFolderInput.value.trim();
      if (!folderName) {
        notify('Folder name required');
        return;
      }
      let folder = getFolder(currentPath);
      if (!folder) return;
      if (folder[folderName]) {
        notify('Folder already exists');
        return;
      }
      folder[folderName] = {};
      renderFiles();
      newFolderInput.value = '';
      notify(`Folder '${folderName}' created`);
    });

    renderFiles();
  }

  // TextEdit app (opens from Files or desktop)
  function textEditApp(path, initialContent) {
    const fileName = path ? path[path.length - 1] : 'Untitled.txt';
    const content = `
      <div style="display: flex; flex-direction: column; height: 100%;">
        <textarea id="texteditor-textarea" style="flex-grow: 1; width: 100%; font-family: monospace; font-size: 14px; border-radius: 10px; border: none; background: #001133; color: #ccf; padding: 12px; resize: none;"></textarea>
        <button id="texteditor-save" style="margin-top: 10px; padding: 10px; border-radius: 10px; border: none; background: #004a9f; color: white; font-weight: 700; cursor: pointer;">Save</button>
      </div>
    `;
    const win = createWindow('textedit-' + fileName, `TextEdit - ${fileName}`, content, {width: '600px', height: '380px'});

    const textarea = win.querySelector('#texteditor-textarea');
    const saveBtn = win.querySelector('#texteditor-save');

    textarea.value = initialContent || '';

    saveBtn.addEventListener('click', () => {
      if (!path) {
        notify('No file path - cannot save');
        return;
      }
      // Save in fakeFS
      let folder = fakeFileSystem;
      for(let i=0; i<path.length-1; i++) {
        folder = folder[path[i]];
        if (!folder) {
          notify('Save failed - folder not found');
          return;
        }
      }
      folder[path[path.length - 1]] = textarea.value;
      notify(`Saved ${fileName}`);
    });
  }

  // Settings app
  function settingsApp() {
    const content = `
      <h3>Settings</h3>
      <label>
        Theme:
        <select id="settings-theme">
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </label>
      <br/><br/>
      <label>
        Wallpaper:
        <select id="settings-wallpaper">
          <option value="0">Space Nebula</option>
          <option value="1">Mountains</option>
          <option value="2">Forest</option>
        </select>
      </label>
    `;
    const win = createWindow('settings', 'Settings', content, {width: '400px', height: '240px'});

    const themeSelect = win.querySelector('#settings-theme');
    const wallpaperSelect = win.querySelector('#settings-wallpaper');

    themeSelect.value = theme;
    wallpaperSelect.value = wallpaperIndex;

    themeSelect.addEventListener('change', e => {
      theme = e.target.value;
      applyTheme(theme);
      saveSettings();
    });

    wallpaperSelect.addEventListener('change', e => {
      wallpaperIndex = Number(e.target.value);
      applyWallpaper();
      saveSettings();
    });
  }

  // Help app
  function helpApp() {
    const content = `
      <h3>ShyOS Help</h3>
      <p>Welcome to ShyOS Ultimate v2.0!</p>
      <ul>
        <li>Boot up and log in with username and password</li>
        <li>Use the dock or desktop icons to open apps</li>
        <li>Drag and resize windows</li>
        <li>Use Terminal commands for quick actions</li>
        <li>Change theme and wallpaper in Settings</li>
        <li>Enjoy the fake filesystem with files and folders</li>
      </ul>
    `;
    createWindow('help', 'Help', content, {width: '400px', height: '280px'});
  }

  // Calculator app
  function calculatorApp() {
    const content = `
      <input type="text" id="calc-display" readonly style="width: 100%; font-size: 24px; padding: 10px; margin-bottom: 10px; border-radius: 10px; border: none; background: #001133; color: #eee; text-align: right;" />
      <div id="calc-buttons" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
        <button>7</button><button>8</button><button>9</button><button>/</button>
        <button>4</button><button>5</button><button>6</button><button>*</button>
        <button>1</button><button>2</button><button>3</button><button>-</button>
        <button>0</button><button>.</button><button>=</button><button>+</button>
      </div>
    `;
    const win = createWindow('calculator', 'Calculator', content, {width: '320px', height: '380px'});

    const display = win.querySelector('#calc-display');
    const buttons = win.querySelectorAll('#calc-buttons button');
    let expr = '';

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.textContent;
        if (val === '=') {
          try {
            expr = eval(expr).toString();
            display.value = expr;
          } catch {
            display.value = 'Error';
            expr = '';
          }
        } else {
          expr += val;
          display.value = expr;
        }
      });
    });
  }

  // Music app (fake player)
  function musicApp() {
    const content = `
      <div style="text-align: center;">
        <p>Now Playing: No music yet</p>
        <button id="play-music" style="padding: 10px; border-radius: 10px; border: none; background: #004a9f; color: white; cursor: pointer;">Play</button>
      </div>
    `;
    const win = createWindow('music', 'Music Player', content, {width: '320px', height: '180px'});

    const playBtn = win.querySelector('#play-music');
    playBtn.addEventListener('click', () => {
      notify('No music available yet. Coming soon!');
    });
  }

  // Open app by id
  function openApp(id) {
    switch(id) {
      case 'terminal': terminalApp(); break;
      case 'browser': browserApp(); break;
      case 'files': filesApp(); break;
      case 'textedit': textEditApp(); break;
      case 'settings': settingsApp(); break;
      case 'help': helpApp(); break;
      case 'calculator': calculatorApp(); break;
      case 'music': musicApp(); break;
      default:
        notify('App not found');
    }
  }

  // Keyboard shortcuts
  window.addEventListener('keydown', e => {
    if (!desktop.classList.contains('active')) return;

    if (e.ctrlKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      openApp('terminal');
    } else if (e.ctrlKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      openApp('browser');
    } else if (e.ctrlKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      openApp('files');
    }
  });

  // On page load
  window.addEventListener('load', () => {
    wallpaper.style.backgroundImage = `url('${wallpaperImages[wallpaperIndex]}')`;
  });

})();
