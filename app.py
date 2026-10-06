from flask import Flask, render_template, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_sqlalchemy import SQLAlchemy
import os
import json
from datetime import datetime
from functools import wraps

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-change-this'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///web_os.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app)
db = SQLAlchemy(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    avatar = db.Column(db.String(200), default='default.png')
    status = db.Column(db.String(20), default='offline')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    friends = db.relationship('User', secondary='friendship', primaryjoin='User.id==friendship.c.user_id', secondaryjoin='User.id==friendship.c.friend_id')

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    read = db.Column(db.Boolean, default=False)
    sender = db.relationship('User', foreign_keys=[sender_id])
    recipient = db.relationship('User', foreign_keys=[recipient_id])

class FileSystem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text)
    file_type = db.Column(db.String(20))  # 'file', 'folder'
    parent_id = db.Column(db.Integer, db.ForeignKey('file_system.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user = db.relationship('User')

class GameSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    game_name = db.Column(db.String(100), nullable=False)
    players = db.relationship('User', secondary='game_player')
    status = db.Column(db.String(20), default='waiting')  # waiting, playing, finished
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class App(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    icon = db.Column(db.String(200))
    category = db.Column(db.String(50))
    installed_by = db.relationship('User', secondary='app_install')

# Association tables
friendship = db.Table('friendship',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id')),
    db.Column('friend_id', db.Integer, db.ForeignKey('user.id'))
)

game_player = db.Table('game_player',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id')),
    db.Column('game_session_id', db.Integer, db.ForeignKey('game_session.id'))
)

app_install = db.Table('app_install',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id')),
    db.Column('app_id', db.Integer, db.ForeignKey('app.id'))
)

# Authentication helper
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        try:
            user_id = int(token.split()[1]) if len(token.split()) > 1 else None
            if not user_id:
                raise ValueError
        except:
            return jsonify({'message': 'Invalid token!'}), 401
        return f(user_id, *args, **kwargs)
    return decorated

# Routes
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'message': 'Username already exists'}), 400
    user = User(username=data['username'], email=data['email'], password=data['password'])
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'User created', 'user_id': user.id}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username'], password=data['password']).first()
    if user:
        return jsonify({'message': 'Login successful', 'user_id': user.id, 'username': user.username}), 200
    return jsonify({'message': 'Invalid credentials'}), 401

@app.route('/api/users', methods=['GET'])
@token_required
def get_users(user_id):
    users = User.query.all()
    return jsonify([{'id': u.id, 'username': u.username, 'status': u.status, 'avatar': u.avatar} for u in users])

@app.route('/api/messages/<int:recipient_id>', methods=['GET'])
@token_required
def get_messages(user_id, recipient_id):
    messages = Message.query.filter(
        ((Message.sender_id == user_id) & (Message.recipient_id == recipient_id)) |
        ((Message.sender_id == recipient_id) & (Message.recipient_id == user_id))
    ).order_by(Message.timestamp).all()
    return jsonify([{'id': m.id, 'sender_id': m.sender_id, 'content': m.content, 'timestamp': m.timestamp.isoformat()} for m in messages])

@app.route('/api/messages', methods=['POST'])
@token_required
def send_message(user_id):
    data = request.get_json()
    message = Message(sender_id=user_id, recipient_id=data['recipient_id'], content=data['content'])
    db.session.add(message)
    db.session.commit()
    socketio.emit('new_message', {'sender_id': user_id, 'recipient_id': data['recipient_id'], 'content': data['content']}, broadcast=True)
    return jsonify({'message': 'Message sent', 'message_id': message.id}), 201

@app.route('/api/files', methods=['GET'])
@token_required
def get_files(user_id):
    files = FileSystem.query.filter_by(user_id=user_id).all()
    return jsonify([{'id': f.id, 'filename': f.filename, 'type': f.file_type, 'content': f.content} for f in files])

@app.route('/api/files', methods=['POST'])
@token_required
def create_file(user_id):
    data = request.get_json()
    file = FileSystem(user_id=user_id, filename=data['filename'], file_type=data.get('type', 'file'), content=data.get('content', ''))
    db.session.add(file)
    db.session.commit()
    return jsonify({'message': 'File created', 'file_id': file.id}), 201

@app.route('/api/files/<int:file_id>', methods=['PUT'])
@token_required
def update_file(user_id, file_id):
    data = request.get_json()
    file = FileSystem.query.get_or_404(file_id)
    if file.user_id != user_id:
        return jsonify({'message': 'Unauthorized'}), 403
    file.content = data.get('content', file.content)
    file.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'File updated'}), 200

@app.route('/api/apps', methods=['GET'])
def get_apps():
    apps = App.query.all()
    return jsonify([{'id': a.id, 'name': a.name, 'description': a.description, 'icon': a.icon, 'category': a.category} for a in apps])

# WebSocket Events
@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('response', {'data': 'Connected'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('message')
def handle_message(data):
    emit('response', {'data': data}, broadcast=True)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
