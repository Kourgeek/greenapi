"""
Green API Flask Application
"""

import os
import json
from functools import wraps
from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from dotenv import load_dotenv
import requests

load_dotenv()

app = Flask(__name__)
CORS(app)
app.secret_key = os.getenv('SECRET_KEY', os.urandom(24).hex())

API_URL = os.getenv('apiUrl')
MEDIA_URL = os.getenv('mediaUrl')
ID_INSTANCE = os.getenv('idInstance')
API_TOKEN_INSTANCE = os.getenv('apiTokenInstance')
REQUEST_TIMEOUT = 30


def get_credentials():
    if session.get('idInstance') and session.get('apiTokenInstance'):
        return (
            session.get('apiUrl', 'https://1105.api.green-api.com'),
            session.get('idInstance'),
            session.get('apiTokenInstance')
        )

    if API_URL and ID_INSTANCE and API_TOKEN_INSTANCE:
        return (API_URL, ID_INSTANCE, API_TOKEN_INSTANCE)

    return (None, None, None)


def mask_token(token: str, visible_chars: int = 4) -> str:
    if not token or len(token) <= visible_chars * 2:
        return token

    return f"{token[:visible_chars]}...{token[-visible_chars:]}"


def green_api_request(endpoint: str, method: str = 'POST', json_data: dict = None,
                      api_url: str = None, id_instance: str = None, api_token: str = None):
    if not all([api_url, id_instance, api_token]):
        creds = get_credentials()
        if not all(creds):
            raise requests.exceptions.RequestException("Учетные данные не настроены")
        api_url, id_instance, api_token = creds

    base_url = f"{api_url}/waInstance{id_instance}"
    url = f"{base_url}{endpoint}/{api_token}"

    try:
        if method == 'GET':
            response = requests.get(url, timeout=REQUEST_TIMEOUT)
        else:
            response = requests.post(
                url,
                json=json_data,
                timeout=REQUEST_TIMEOUT,
                headers={'Content-Type': 'application/json'}
            )

        response.raise_for_status()
        return response.json()

    except requests.exceptions.Timeout:
        raise requests.exceptions.Timeout(f"Превышено время ожидания для {endpoint}")
    except requests.exceptions.RequestException as e:
        raise requests.exceptions.RequestException(f"Ошибка запроса к {endpoint}: {str(e)}")


def validate_credentials():
    api_url, id_instance, api_token = get_credentials()

    if not all([api_url, id_instance, api_token]):
        return False, "Учетные данные не настроены. Введите их в форме."

    return True, "OK"


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/demo')
def demo():
    return render_template('demo.html')


@app.route('/api/credentials', methods=['GET'])
def api_get_credentials():
    is_valid, message = validate_credentials()

    if not is_valid:
        return jsonify({
            'success': False,
            'error': message
        }), 500

    api_url, id_instance, api_token = get_credentials()

    return jsonify({
        'success': True,
        'data': {
            'idInstance': id_instance,
            'apiTokenInstance': mask_token(api_token),
            'apiUrl': api_url
        }
    })


@app.route('/api/credentials', methods=['POST'])
def api_save_credentials():
    data = request.get_json()

    if not data:
        return jsonify({
            'success': False,
            'error': 'Отсутствует JSON тело запроса'
        }), 400

    id_instance = data.get('idInstance')
    api_token = data.get('apiTokenInstance')
    api_url = data.get('apiUrl', 'https://1105.api.green-api.com')

    if not id_instance or not api_token:
        return jsonify({
            'success': False,
            'error': 'idInstance и apiTokenInstance обязательны'
        }), 400

    session['idInstance'] = id_instance
    session['apiTokenInstance'] = api_token
    session['apiUrl'] = api_url

    return jsonify({
        'success': True,
        'message': 'Учетные данные сохранены',
        'data': {
            'idInstance': id_instance,
            'apiTokenInstance': mask_token(api_token),
            'apiUrl': api_url
        }
    })


@app.route('/api/getSettings', methods=['POST'])
def api_get_settings():
    is_valid, message = validate_credentials()

    if not is_valid:
        return jsonify({
            'success': False,
            'error': message
        }), 500

    try:
        result = green_api_request('/getSettings', method='GET')

        return jsonify({
            'success': True,
            'data': result
        })

    except requests.exceptions.Timeout as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 504

    except requests.exceptions.RequestException as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/getStateInstance', methods=['POST'])
def api_get_state_instance():
    is_valid, message = validate_credentials()

    if not is_valid:
        return jsonify({
            'success': False,
            'error': message
        }), 500

    try:
        result = green_api_request('/getStateInstance', method='GET')

        return jsonify({
            'success': True,
            'data': result
        })

    except requests.exceptions.Timeout as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 504

    except requests.exceptions.RequestException as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/sendMessage', methods=['POST'])
def api_send_message():
    is_valid, message = validate_credentials()

    if not is_valid:
        return jsonify({
            'success': False,
            'error': message
        }), 500

    data = request.get_json()

    if not data:
        return jsonify({
            'success': False,
            'error': 'Отсутствует JSON тело запроса'
        }), 400

    chat_id = data.get('chatId')
    message = data.get('message')

    if not chat_id:
        return jsonify({
            'success': False,
            'error': 'Поле chatId обязательно'
        }), 400

    if not message:
        return jsonify({
            'success': False,
            'error': 'Поле message обязательно'
        }), 400

    try:
        result = green_api_request(
            '/sendMessage',
            method='POST',
            json_data={
                'chatId': chat_id,
                'message': message
            }
        )

        return jsonify({
            'success': True,
            'data': result
        })

    except requests.exceptions.Timeout as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 504

    except requests.exceptions.RequestException as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/sendFileByUrl', methods=['POST'])
def api_send_file_by_url():
    is_valid, message = validate_credentials()

    if not is_valid:
        return jsonify({
            'success': False,
            'error': message
        }), 500

    data = request.get_json()

    if not data:
        return jsonify({
            'success': False,
            'error': 'Отсутствует JSON тело запроса'
        }), 400

    chat_id = data.get('chatId')
    url_file = data.get('urlFile')
    file_name = data.get('fileName', '')
    caption = data.get('caption', '')

    if not chat_id:
        return jsonify({
            'success': False,
            'error': 'Поле chatId обязательно'
        }), 400

    if not url_file:
        return jsonify({
            'success': False,
            'error': 'Поле urlFile обязательно'
        }), 400

    try:
        json_data = {
            'chatId': chat_id,
            'urlFile': url_file
        }

        if file_name:
            json_data['fileName'] = file_name
        if caption:
            json_data['caption'] = caption

        result = green_api_request(
            '/sendFileByUrl',
            method='POST',
            json_data=json_data
        )

        return jsonify({
            'success': True,
            'data': result
        })

    except requests.exceptions.Timeout as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 504

    except requests.exceptions.RequestException as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    is_valid, _ = validate_credentials()

    return jsonify({
        'status': 'healthy',
        'credentials_valid': is_valid
    })


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Эндпоинт не найден'
    }), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Внутренняя ошибка сервера'
    }), 500


@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        'success': False,
        'error': 'Метод не разрешен'
    }), 405


if __name__ == '__main__':
    print("=" * 60)
    print("Green API Flask Application")
    print("=" * 60)
    print(f"API URL: {API_URL}")
    print(f"Instance ID: {ID_INSTANCE}")
    print(f"Token masked: {mask_token(API_TOKEN_INSTANCE)}")
    print("=" * 60)

    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )
