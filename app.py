from flask import Flask, request, jsonify, send_from_directory, g
from flask_cors import CORS
import sqlite3
import hashlib
import json
import os
from datetime import datetime

app = Flask(__name__, static_folder='static')
CORS(app)

DATABASE = 'database.db'


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA journal_mode=WAL')
        g.db.execute('PRAGMA foreign_keys=ON')
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS api_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            contributor_id INTEGER NOT NULL,
            platform TEXT NOT NULL,
            base_url TEXT NOT NULL,
            models TEXT NOT NULL,
            api_key TEXT NOT NULL,
            claimed_quota TEXT,
            expires_at TEXT,
            status TEXT DEFAULT 'available',
            assigned_to INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (contributor_id) REFERENCES users(id),
            FOREIGN KEY (assigned_to) REFERENCES users(id)
        )
    ''')

    try:
        cursor.execute('ALTER TABLE api_keys ADD COLUMN expires_at TEXT')
    except sqlite3.OperationalError:
        pass

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS key_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            key_id INTEGER,
            platform TEXT,
            api_key_masked TEXT,
            operator_id INTEGER NOT NULL,
            target_user_id INTEGER,
            detail TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (operator_id) REFERENCES users(id),
            FOREIGN KEY (target_user_id) REFERENCES users(id)
        )
    ''')

    conn.commit()
    conn.close()


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def mask_api_key(api_key):
    if len(api_key) <= 8:
        return api_key[:3] + '***'
    return api_key[:4] + '****' + api_key[-4:]


def add_log(action, operator_id, key_id=None, platform=None, api_key=None, target_user_id=None, detail=None):
    conn = get_db()
    conn.execute(
        '''INSERT INTO key_logs (action, key_id, platform, api_key_masked, operator_id, target_user_id, detail)
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        (action, key_id, platform, mask_api_key(api_key) if api_key else None, operator_id, target_user_id, detail)
    )
    conn.commit()


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': '用户名和密码不能为空'}), 400

    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
            (username, hash_password(password))
        )
        conn.commit()
        user_id = cursor.lastrowid
        return jsonify({'message': '注册成功', 'user_id': user_id, 'username': username})
    except sqlite3.IntegrityError:
        return jsonify({'error': '用户名已存在'}), 400


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': '用户名和密码不能为空'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        'SELECT * FROM users WHERE username = ? AND password_hash = ?',
        (username, hash_password(password))
    )
    user = cursor.fetchone()

    if user:
        return jsonify({
            'message': '登录成功',
            'user_id': user['id'],
            'username': user['username']
        })
    else:
        return jsonify({'error': '用户名或密码错误'}), 401


@app.route('/api/keys', methods=['GET'])
def get_keys():
    platform = request.args.get('platform', '')
    status = request.args.get('status', 'available')

    conn = get_db()
    cursor = conn.cursor()

    query = '''
        SELECT k.*, u.username as contributor_name
        FROM api_keys k
        JOIN users u ON k.contributor_id = u.id
        WHERE k.status = ?
    '''
    params = [status]

    if platform:
        query += ' AND k.platform = ?'
        params.append(platform)

    query += ' ORDER BY k.created_at DESC'

    cursor.execute(query, params)
    keys = cursor.fetchall()

    result = []
    for key in keys:
        result.append({
            'id': key['id'],
            'platform': key['platform'],
            'base_url': key['base_url'],
            'models': json.loads(key['models']),
            'claimed_quota': key['claimed_quota'],
            'expires_at': key['expires_at'],
            'status': key['status'],
            'contributor_name': key['contributor_name'],
            'created_at': key['created_at']
        })

    return jsonify(result)


@app.route('/api/keys', methods=['POST'])
def add_keys():
    data = request.json
    contributor_id = data.get('contributor_id')
    platform = data.get('platform')
    base_url = data.get('base_url')
    models = data.get('models', [])
    api_keys = data.get('api_keys', [])
    claimed_quota = data.get('claimed_quota', '')
    expires_at = data.get('expires_at', '')

    if not all([contributor_id, platform, base_url, api_keys, expires_at]):
        return jsonify({'error': '缺少必要参数'}), 400

    conn = get_db()
    cursor = conn.cursor()

    added_count = 0
    for key in api_keys:
        if key.strip():
            cursor.execute(
                '''INSERT INTO api_keys 
                   (contributor_id, platform, base_url, models, api_key, claimed_quota, expires_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?)''',
                (contributor_id, platform, base_url, json.dumps(models), key.strip(), claimed_quota, expires_at)
            )
            add_log('add', operator_id=contributor_id, key_id=cursor.lastrowid, platform=platform, api_key=key.strip(),
                    detail=f'添加了 {platform} 的 Key')
            added_count += 1

    conn.commit()

    return jsonify({'message': f'成功添加 {added_count} 个Key'})


@app.route('/api/platforms/assign', methods=['POST'])
def assign_by_platform():
    data = request.json
    user_id = data.get('user_id')
    platform = data.get('platform')

    if not user_id or not platform:
        return jsonify({'error': '缺少必要参数'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        'SELECT * FROM api_keys WHERE platform = ? AND status = ? ORDER BY RANDOM() LIMIT 1',
        (platform, 'available')
    )
    key = cursor.fetchone()

    if not key:
        return jsonify({'error': f'{platform} 暂无可用资源'}), 400

    key_id = key['id']
    cursor.execute(
        'UPDATE api_keys SET status = ?, assigned_to = ? WHERE id = ?',
        ('assigned', user_id, key_id)
    )
    conn.commit()

    cursor.execute('SELECT api_key FROM api_keys WHERE id = ?', (key_id,))
    result = cursor.fetchone()

    add_log('assign', operator_id=user_id, key_id=key_id, platform=key['platform'], api_key=result['api_key'],
            target_user_id=key['contributor_id'], detail=f'领取了 {key["platform"]} 的 Key')

    return jsonify({
        'message': '分配成功',
        'api_key': result['api_key'],
        'platform': key['platform'],
        'base_url': key['base_url']
    })


@app.route('/api/keys/<int:key_id>/assign', methods=['POST'])
def assign_key(key_id):
    data = request.json
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({'error': '缺少用户ID'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM api_keys WHERE id = ? AND status = ?', (key_id, 'available'))
    key = cursor.fetchone()

    if not key:
        return jsonify({'error': '该Key不可用'}), 400

    cursor.execute(
        'UPDATE api_keys SET status = ?, assigned_to = ? WHERE id = ?',
        ('assigned', user_id, key_id)
    )
    conn.commit()

    cursor.execute('SELECT api_key FROM api_keys WHERE id = ?', (key_id,))
    result = cursor.fetchone()

    add_log('assign', operator_id=user_id, key_id=key_id, platform=key['platform'], api_key=result['api_key'],
            target_user_id=key['contributor_id'], detail=f'领取了 {key["platform"]} 的 Key')

    return jsonify({
        'message': '分配成功',
        'api_key': result['api_key'],
        'platform': key['platform'],
        'base_url': key['base_url']
    })


@app.route('/api/my-keys', methods=['GET'])
def get_my_keys():
    user_id = request.args.get('user_id')

    if not user_id:
        return jsonify({'error': '缺少用户ID'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT k.*, u.username as assigned_to_name
        FROM api_keys k
        LEFT JOIN users u ON k.assigned_to = u.id
        WHERE k.contributor_id = ?
        ORDER BY k.created_at DESC
    ''', (user_id,))
    contributed_keys = cursor.fetchall()

    cursor.execute('''
        SELECT k.*, u.username as contributor_name
        FROM api_keys k
        JOIN users u ON k.contributor_id = u.id
        WHERE k.assigned_to = ?
        ORDER BY k.created_at DESC
    ''', (user_id,))
    using_keys = cursor.fetchall()

    result = {
        'contributed': [{
            'id': k['id'],
            'platform': k['platform'],
            'base_url': k['base_url'],
            'models': json.loads(k['models']),
            'claimed_quota': k['claimed_quota'],
            'status': k['status'],
            'assigned_to_name': k['assigned_to_name'],
            'api_key': k['api_key'] if k['status'] == 'assigned' else '***',
            'created_at': k['created_at']
        } for k in contributed_keys],
        'using': [{
            'id': k['id'],
            'platform': k['platform'],
            'base_url': k['base_url'],
            'models': json.loads(k['models']),
            'api_key': k['api_key'],
            'contributor_name': k['contributor_name'],
            'created_at': k['created_at']
        } for k in using_keys]
    }

    return jsonify(result)


@app.route('/api/keys/<int:key_id>/disable', methods=['POST'])
def disable_key(key_id):
    data = request.json
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({'error': '缺少用户ID'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM api_keys WHERE id = ? AND contributor_id = ?', (key_id, user_id))
    key = cursor.fetchone()

    if not key:
        return jsonify({'error': '无权操作'}), 403

    cursor.execute('UPDATE api_keys SET status = ? WHERE id = ?', ('disabled', key_id))
    conn.commit()

    add_log('disable', operator_id=user_id, key_id=key_id, platform=key['platform'], api_key=key['api_key'],
            target_user_id=key['assigned_to'], detail=f'禁用了 {key["platform"]} 的 Key')

    return jsonify({'message': '已禁用'})


@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT COUNT(*) as count FROM users')
    user_count = cursor.fetchone()['count']

    cursor.execute("SELECT COUNT(*) as count FROM api_keys WHERE status = 'available'")
    available_keys = cursor.fetchone()['count']

    cursor.execute("SELECT COUNT(*) as count FROM api_keys WHERE status = 'assigned'")
    assigned_keys = cursor.fetchone()['count']

    cursor.execute('SELECT DISTINCT platform FROM api_keys')
    platforms = [row['platform'] for row in cursor.fetchall()]

    return jsonify({
        'user_count': user_count,
        'available_keys': available_keys,
        'assigned_keys': assigned_keys,
        'platforms': platforms
    })


@app.route('/api/logs', methods=['GET'])
def get_logs():
    user_id = request.args.get('user_id')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))

    conn = get_db()
    cursor = conn.cursor()

    if user_id:
        cursor.execute('''
            SELECT l.*, 
                   u1.username as operator_name,
                   u2.username as target_user_name
            FROM key_logs l
            LEFT JOIN users u1 ON l.operator_id = u1.id
            LEFT JOIN users u2 ON l.target_user_id = u2.id
            WHERE l.operator_id = ? OR l.target_user_id = ?
            ORDER BY l.created_at DESC
            LIMIT ? OFFSET ?
        ''', (user_id, user_id, per_page, (page - 1) * per_page))
    else:
        cursor.execute('''
            SELECT l.*, 
                   u1.username as operator_name,
                   u2.username as target_user_name
            FROM key_logs l
            LEFT JOIN users u1 ON l.operator_id = u1.id
            LEFT JOIN users u2 ON l.target_user_id = u2.id
            ORDER BY l.created_at DESC
            LIMIT ? OFFSET ?
        ''', (per_page, (page - 1) * per_page))

    logs = cursor.fetchall()

    result = []
    for log in logs:
        result.append({
            'id': log['id'],
            'action': log['action'],
            'key_id': log['key_id'],
            'platform': log['platform'],
            'api_key_masked': log['api_key_masked'],
            'operator_id': log['operator_id'],
            'operator_name': log['operator_name'],
            'target_user_id': log['target_user_id'],
            'target_user_name': log['target_user_name'],
            'detail': log['detail'],
            'created_at': log['created_at']
        })

    return jsonify(result)


if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
