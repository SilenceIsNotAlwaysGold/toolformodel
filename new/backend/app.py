from flask import Flask, request, jsonify
from flask_cors import CORS
from regression_analysis import regression_bp

app = Flask(__name__)
CORS(app)

# 注册回归分析蓝图
app.register_blueprint(regression_bp)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
