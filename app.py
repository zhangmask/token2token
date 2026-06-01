from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import hashlib
import json
import os
import sys
import logging
import subprocess
from datetime import datetime

app = Flask(__name__, static_folder='static')
CORS(app)

PORT = int(os.environ.get('PORT', 5000))

LOG_DIR = 'logs'
os.makedirs(LOG_DIR, exist_ok=True)
log_file = os.path.join(LOG_DIR, 'server.log')
logging.basicConfig(
    filename=log_file,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

BASE_TOKEN = 'H6fPb4HQoaSl7Is0Dl1czvNfnDb'
TABLE_USERS = 'tbl8C6TRxFxQvaXw'
TABLE_KEYS = 'tblwtR3Bwe46Okuq'
TABLE_LOGS = 'tbldld5Eb3WhU7T0'


class LarkBase:
    @staticmethod
    def find_cli():
        import platform
        if platform.system() == "Windows":
            paths = ['lark-cli.cmd', 'lark-cli']
            npm_global = os.path.expanduser('~\\AppData\\Roaming\\npm\\lark-cli.cmd')
            if os.path.exists(npm_global):
                paths.insert(0, npm_global)
        else:
            paths = ['lark-cli', os.path.expanduser('~/.npm-global/bin/lark-cli'), '/usr/local/bin/lark-cli', '/opt/render/.npm-global/bin/lark-cli']
        for p in paths:
            try:
                result = subprocess.run([p, '--version'], capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    return p
            except:
                continue
        logger.error('未找到 lark-cli')
        return None

    @staticmethod
    def run_cmd(args):
        try:
            cli = LarkBase.find_cli()
            if not cli:
                return None
            cmd = [cli] + args
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                encoding='utf-8',
                timeout=30
            )
            if result.returncode == 0:
                return json.loads(result.stdout) if result.stdout.strip() else {}
            else:
                logger.error(f'lark-cli错误: {result.stderr}')
                return None
        except Exception as e:
            logger.error(f'lark-cli异常: {str(e)}')
            return None

    @staticmethod
    def run_cmd_with_json(args, json_data):
        temp_path = os.path.join(os.getcwd(), f'_temp_{os.getpid()}.json')
        with open(temp_path, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, ensure_ascii=False)
        try:
            cli = LarkBase.find_cli()
            if not cli:
                return None
            cmd = [cli] + args + ['--json', f'@./{os.path.basename(temp_path)}']
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                encoding='utf-8',
                timeout=30
            )
            if result.returncode == 0:
                return json.loads(result.stdout) if result.stdout.strip() else {}
            else:
                logger.error(f'lark-cli错误: {result.stderr}')
                return None
        except Exception as e:
            logger.error(f'lark-cli异常: {str(e)}')
            return None
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    @staticmethod
    def search_records(table_id, filter_expr=None):
        args = [
            'base', '+record-search',
            '--base-token', BASE_TOKEN,
            '--table-id', table_id,
            '--as', 'user'
        ]
        if filter_expr:
            args.extend(['--filter', filter_expr])
        return LarkBase.run_cmd(args)

    @staticmethod
    def get_record(table_id, record_id):
        args = [
            'base', '+record-get',
            '--base-token', BASE_TOKEN,
            '--table-id', table_id,
            '--record-id', record_id,
            '--format', 'json',
            '--as', 'user'
        ]
        return LarkBase.run_cmd(args)

    @staticmethod
    def create_record(table_id, fields):
        args = [
            'base', '+record-upsert',
            '--base-token', BASE_TOKEN,
            '--table-id', table_id,
            '--as', 'user'
        ]
        return LarkBase.run_cmd_with_json(args, fields)

    @staticmethod
    def update_record(table_id, record_id, fields):
        args = [
            'base', '+record-upsert',
            '--base-token', BASE_TOKEN,
            '--table-id', table_id,
            '--record-id', record_id,
            '--as', 'user'
        ]
        return LarkBase.run_cmd_with_json(args, fields)

    @staticmethod
    def list_records(table_id, limit=200):
        args = [
            'base', '+record-list',
            '--base-token', BASE_TOKEN,
            '--table-id', table_id,
            '--limit', str(limit),
            '--format', 'json',
            '--as', 'user'
        ]
        return LarkBase.run_cmd(args)


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def mask_api_key(api_key):
    if not api_key or len(api_key) <= 8:
        return api_key[:3] + '***' if api_key else ''
    return api_key[:4] + '****' + api_key[-4:]


def parse_records(data):
    if not data or 'data' not in data:
        return []
    record_data = data['data']
    fields_list = record_data.get('fields', [])
    data_list = record_data.get('data', [])
    record_id_list = record_data.get('record_id_list', [])
    
    records = []
    for i, record in enumerate(data_list):
        record_dict = {'record_id': record_id_list[i] if i < len(record_id_list) else ''}
        for j, field_name in enumerate(fields_list):
            if j < len(record):
                value = record[j]
                if isinstance(value, list) and len(value) == 1:
                    value = value[0]
                record_dict[field_name] = value
        records.append(record_dict)
    return records


def get_user_by_id(user_id):
    data = LarkBase.get_record(TABLE_USERS, user_id)
    if data and 'data' in data:
        record_data = data['data']
        fields_list = record_data.get('fields', [])
        data_list = record_data.get('data', [])
        if data_list:
            record_dict = {}
            for j, field_name in enumerate(fields_list):
                if j < len(data_list[0]):
                    value = data_list[0][j]
                    if isinstance(value, list) and len(value) == 1:
                        value = value[0]
                    record_dict[field_name] = value
            return record_dict
    return None


def get_user_by_username(username):
    data = LarkBase.list_records(TABLE_USERS)
    if data and 'data' in data:
        record_data = data['data']
        fields_list = record_data.get('fields', [])
        data_list = record_data.get('data', [])
        record_id_list = record_id_list = record_data.get('record_id_list', [])
        
        for i, record in enumerate(data_list):
            record_dict = {}
            for j, field_name in enumerate(fields_list):
                if j < len(record):
                    record_dict[field_name] = record[j]
            
            if record_dict.get('用户名') == username:
                record_id = record_id_list[i] if i < len(record_id_list) else ''
                return {'record_id': record_id, **record_dict}
    return None


def add_log(action, operator_id, key_id=None, platform=None, api_key=None, target_user_id=None, detail=None):
    masked_key = mask_api_key(api_key) if api_key else None
    
    fields = {
        '操作类型': action,
        '操作人': str(operator_id),
        '操作时间': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    if platform:
        fields['平台'] = platform
    if masked_key:
        fields['Key脱敏'] = masked_key
    if target_user_id:
        fields['目标用户'] = str(target_user_id)
    if detail:
        fields['详情'] = detail

    LarkBase.create_record(TABLE_LOGS, fields)
    
    log_msg = f"用户{operator_id} {action} 操作"
    if platform:
        log_msg += f" 平台:{platform}"
    if masked_key:
        log_msg += f" Key:{masked_key}"
    if detail:
        log_msg += f" {detail}"
    logger.info(log_msg)


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    wechat_id = data.get('wechat_id', '')
    phone = data.get('phone', '')

    if not username or not password:
        return jsonify({'error': '用户名和密码不能为空'}), 400

    if not wechat_id or not phone:
        return jsonify({'error': '微信ID和手机号都需要填写'}), 400

    existing = get_user_by_username(username)
    if existing:
        return jsonify({'error': '用户名已存在'}), 400

    fields = {
        '用户名': username,
        '密码哈希': hash_password(password),
        '微信ID': wechat_id,
        '手机号': phone,
        '创建时间': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }

    result = LarkBase.create_record(TABLE_USERS, fields)
    logger.info(f'注册结果: {result}')
    if result and 'data' in result:
        record_id = result['data'].get('record', {}).get('record_id_list', [''])[0]
        return jsonify({'message': '注册成功', 'user_id': record_id, 'username': username})
    
    return jsonify({'error': '注册失败，请重试'}), 500


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': '用户名和密码不能为空'}), 400

    user = get_user_by_username(username)
    if user and user.get('密码哈希') == hash_password(password):
        return jsonify({
            'message': '登录成功',
            'user_id': user['record_id'],
            'username': user['用户名']
        })
    
    return jsonify({'error': '用户名或密码错误'}), 401


@app.route('/api/keys', methods=['GET'])
def get_keys():
    platform_filter = request.args.get('platform', '')

    data = LarkBase.list_records(TABLE_KEYS)
    records = parse_records(data)

    current_time = datetime.now().strftime('%Y-%m-%d')
    result = []

    for item in records:
        status = item.get('状态', '')
        expires_at = item.get('失效时间', '')
        
        if status != 'available':
            continue
        
        if expires_at and expires_at < current_time:
            continue
        
        if platform_filter and item.get('平台') != platform_filter:
            continue

        result.append({
            'id': item.get('record_id', ''),
            'platform': item.get('平台', ''),
            'base_url': item.get('API地址', ''),
            'models': [item.get('模型', '')],
            'claimed_quota': item.get('额度', ''),
            'expires_at': expires_at,
            'status': status,
            'contributor_name': item.get('贡献者', ''),
            'created_at': item.get('创建时间', '')
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

    if expires_at:
        try:
            datetime.strptime(expires_at, '%Y-%m-%d')
        except ValueError:
            return jsonify({'error': '日期格式错误，请使用YYYY-MM-DD格式'}), 400
        
        if expires_at < datetime.now().strftime('%Y-%m-%d'):
            return jsonify({'error': '失效日期不能早于今天'}), 400

    user = get_user_by_id(contributor_id)
    logger.info(f'获取用户信息: {user}')
    contributor_name = user.get('用户名', '未知') if user else '未知'
    logger.info(f'贡献者名称: {contributor_name}')

    added_count = 0
    for key in api_keys:
        if key.strip():
            fields = {
                '贡献者': contributor_name,
                '平台': platform,
                'API地址': base_url,
                '模型': models[0] if models else '',
                'API_Key': key.strip(),
                '额度': claimed_quota,
                '失效时间': expires_at,
                '状态': 'available',
                '创建时间': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            LarkBase.create_record(TABLE_KEYS, fields)
            add_log('add', operator_id=contributor_id, platform=platform, api_key=key.strip(),
                    detail=f'添加了 {platform} 的 Key')
            added_count += 1

    return jsonify({'message': f'成功添加 {added_count} 个Key'})


@app.route('/api/platforms/assign', methods=['POST'])
def assign_by_platform():
    data = request.json
    user_id = data.get('user_id')
    platform = data.get('platform')

    if not user_id or not platform:
        return jsonify({'error': '缺少必要参数'}), 400

    logs_data = LarkBase.list_records(TABLE_LOGS)
    logs_records = parse_records(logs_data)
    current_date = datetime.now().strftime('%Y-%m-%d')
    for item in logs_records:
        if (item.get('操作人') == str(user_id) and 
            item.get('操作类型') == 'assign' and
            item.get('操作时间', '').startswith(current_date)):
            return jsonify({'error': '每人每天最多申请一个Key'}), 400

    keys_data = LarkBase.list_records(TABLE_KEYS)
    keys_records = parse_records(keys_data)

    current_time = datetime.now().strftime('%Y-%m-%d')
    available_keys = []

    for item in keys_records:
        if (item.get('平台') == platform and 
            item.get('状态') == 'available' and
            (not item.get('失效时间') or item.get('失效时间') >= current_time)):
            available_keys.append(item)

    if not available_keys:
        return jsonify({'error': f'{platform} 暂无可用资源'}), 400

    import random
    selected = random.choice(available_keys)
    key_id = selected.get('record_id', '')

    LarkBase.update_record(TABLE_KEYS, key_id, {
        '状态': 'assigned',
        '分配给': str(user_id)
    })

    add_log('assign', operator_id=user_id, platform=selected.get('平台'), api_key=selected.get('API_Key'),
            detail=f'领取了 {selected.get("平台")} 的 Key')

    return jsonify({
        'message': '分配成功',
        'api_key': selected.get('API_Key'),
        'platform': selected.get('平台'),
        'base_url': selected.get('API地址')
    })


@app.route('/api/keys/<key_id>/assign', methods=['POST'])
def assign_key(key_id):
    data = request.json
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({'error': '缺少用户ID'}), 400

    logs_data = LarkBase.list_records(TABLE_LOGS)
    logs_records = parse_records(logs_data)
    current_date = datetime.now().strftime('%Y-%m-%d')
    for item in logs_records:
        if (item.get('操作人') == str(user_id) and 
            item.get('操作类型') == 'assign' and
            item.get('操作时间', '').startswith(current_date)):
            return jsonify({'error': '每人每天最多申请一个Key'}), 400

    key_data = LarkBase.get_record(TABLE_KEYS, key_id)
    if not key_data or 'data' not in key_data:
        return jsonify({'error': '该Key不存在'}), 400

    record_data = key_data['data']
    fields_list = record_data.get('fields', [])
    data_list = record_data.get('data', [])
    if not data_list:
        return jsonify({'error': '该Key不存在'}), 400
    
    key_fields = {}
    for j, field_name in enumerate(fields_list):
        if j < len(data_list[0]):
            value = data_list[0][j]
            if isinstance(value, list) and len(value) == 1:
                value = value[0]
            key_fields[field_name] = value
    
    current_time = datetime.now().strftime('%Y-%m-%d')
    expires_at = key_fields.get('失效时间', '')

    if key_fields.get('状态') != 'available':
        return jsonify({'error': '该Key不可用', 'status': key_fields.get('状态')}), 400

    if expires_at and expires_at < current_time:
        return jsonify({'error': '该Key已过期'}), 400

    LarkBase.update_record(TABLE_KEYS, key_id, {
        '状态': 'assigned',
        '分配给': str(user_id)
    })

    add_log('assign', operator_id=user_id, platform=key_fields.get('平台'), api_key=key_fields.get('API_Key'),
            detail=f'领取了 {key_fields.get("平台")} 的 Key')

    return jsonify({
        'message': '分配成功',
        'api_key': key_fields.get('API_Key'),
        'platform': key_fields.get('平台'),
        'base_url': key_fields.get('API地址')
    })


@app.route('/api/my-keys', methods=['GET'])
def get_my_keys():
    user_id = request.args.get('user_id')

    if not user_id:
        return jsonify({'error': '缺少用户ID'}), 400

    keys_data = LarkBase.list_records(TABLE_KEYS)
    keys_records = parse_records(keys_data)

    contributed = []
    using = []

    user = get_user_by_id(user_id)
    username = user.get('用户名', '') if user else ''

    for item in keys_records:
        key_info = {
            'id': item.get('record_id', ''),
            'platform': item.get('平台', ''),
            'base_url': item.get('API地址', ''),
            'models': [item.get('模型', '')],
            'claimed_quota': item.get('额度', ''),
            'status': item.get('状态', ''),
            'created_at': item.get('创建时间', '')
        }

        if item.get('贡献者') == username:
            key_info['assigned_to_name'] = item.get('分配给', '')
            key_info['api_key'] = item.get('API_Key', '') if item.get('状态') == 'assigned' else '***'
            contributed.append(key_info)

        if item.get('分配给') == str(user_id):
            key_info['api_key'] = item.get('API_Key', '')
            key_info['contributor_name'] = item.get('贡献者', '')
            using.append(key_info)

    return jsonify({'contributed': contributed, 'using': using})


@app.route('/api/keys/<key_id>/disable', methods=['POST'])
def disable_key(key_id):
    data = request.json
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({'error': '缺少用户ID'}), 400

    key_data = LarkBase.get_record(TABLE_KEYS, key_id)
    if not key_data or 'data' not in key_data:
        return jsonify({'error': '无权操作'}), 403

    record_data = key_data['data']
    fields_list = record_data.get('fields', [])
    data_list = record_data.get('data', [])
    if not data_list:
        return jsonify({'error': '无权操作'}), 403
    
    key_fields = {}
    for j, field_name in enumerate(fields_list):
        if j < len(data_list[0]):
            value = data_list[0][j]
            if isinstance(value, list) and len(value) == 1:
                value = value[0]
            key_fields[field_name] = value
    
    user = get_user_by_id(user_id)
    
    if not user or key_fields.get('贡献者') != user.get('用户名', ''):
        return jsonify({'error': '无权操作'}), 403

    LarkBase.update_record(TABLE_KEYS, key_id, {'状态': 'disabled'})

    add_log('disable', operator_id=user_id, platform=key_fields.get('平台'), api_key=key_fields.get('API_Key'),
            detail=f'禁用了 {key_fields.get("平台")} 的 Key')

    return jsonify({'message': '已禁用'})


@app.route('/api/stats', methods=['GET'])
def get_stats():
    users_data = LarkBase.list_records(TABLE_USERS)
    keys_data = LarkBase.list_records(TABLE_KEYS)

    users_records = parse_records(users_data)
    keys_records = parse_records(keys_data)

    user_count = len(users_records)

    available_keys = 0
    assigned_keys = 0
    expired_keys = 0
    platforms = set()
    current_time = datetime.now().strftime('%Y-%m-%d')

    for item in keys_records:
        status = item.get('状态', '')
        expires_at = item.get('失效时间', '')
        platform = item.get('平台', '')
        
        if platform:
            platforms.add(platform)

        is_expired = expires_at and expires_at < current_time
        
        if status == 'expired' or is_expired:
            expired_keys += 1
        elif status == 'available':
            available_keys += 1
        elif status == 'assigned':
            assigned_keys += 1

    return jsonify({
        'user_count': user_count,
        'available_keys': available_keys,
        'assigned_keys': assigned_keys,
        'expired_keys': expired_keys,
        'platforms': list(platforms)
    })


@app.route('/api/logs', methods=['GET'])
def get_logs():
    logs_data = LarkBase.list_records(TABLE_LOGS)
    logs_records = parse_records(logs_data)

    result = []
    for item in logs_records:
        result.append({
            'id': item.get('record_id', ''),
            'action': item.get('操作类型', ''),
            'platform': item.get('平台', ''),
            'api_key_masked': item.get('Key脱敏', ''),
            'operator_name': item.get('操作人', ''),
            'target_user_name': item.get('目标用户', ''),
            'detail': item.get('详情', ''),
            'created_at': item.get('操作时间', '')
        })

    return jsonify(result)


if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=PORT)
