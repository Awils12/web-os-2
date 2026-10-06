# Web OS

A full-featured browser-based operating system with accounts, messaging, games, code editor, file system, and app store.

## Features

- **User Accounts**: Register and login system
- **Real-time Messaging**: Chat with other users via WebSocket
- **Multiplayer Games**: Tic Tac Toe, Chess, Snake, Quiz Battle
- **File System**: Create, edit, and manage files
- **Code Editor**: Write and execute code in the browser
- **App Store**: Browse and install applications
- **Desktop Environment**: Draggable windows, taskbar, desktop icons

## Setup

### Requirements
- Python 3.8+
- pip

### Installation

1. Extract the zip file
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the application:
   ```bash
   python app.py
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5000
   ```

## Default Accounts

Create new accounts on first login:
- Username: your_username
- Email: your_email@example.com
- Password: your_password

## Project Structure

```
web-os-2/
├── app.py                 # Flask backend with database
├── requirements.txt       # Python dependencies
├── static/
│   ├── index.html        # Main HTML file
│   ├── style.css         # Styling
│   └── app.js            # Frontend logic
└── README.md
```

## Technologies Used

- **Backend**: Flask, Flask-SocketIO, SQLAlchemy
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Database**: SQLite
- **Communication**: WebSocket (Socket.IO)

## Usage

### Messaging
1. Open Messenger app from desktop
2. Click on a user to open chat
3. Type and send messages in real-time

### File System
1. Open File System app
2. Create new files
3. View and manage your files

### Code Editor
1. Open Code Editor app
2. Write JavaScript code
3. Click "Run Code" to execute
4. Save code to file system

### Games
1. Open Games app
2. Select a game to join
3. Wait for opponents to join
4. Play!

### App Store
1. Open App Store
2. Browse available applications
3. Click Install to add to your system

## Features Coming Soon

- Audio/video calls
- File sharing
- Game multiplayer matchmaking
- Cloud storage sync
- Mobile app
- Theme customization

## License

MIT
