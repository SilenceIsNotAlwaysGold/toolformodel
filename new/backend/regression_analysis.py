from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    mean_squared_error, r2_score,
    accuracy_score, precision_score, recall_score, f1_score,
    roc_curve, auc
)
import io
import base64
import json

regression_bp = Blueprint('regression', __name__)

@regression_bp.route('/api/regression/analyze', methods=['POST'])
def analyze():
    try:
        # 获取上传的文件和参数
        if 'file' not in request.files:
            return jsonify({'error': '没有上传文件'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '没有选择文件'}), 400

        # 读取CSV文件
        df = pd.read_csv(file)
        
        # 获取参数
        params = json.loads(request.form.get('params', '{}'))
        x_column = params.get('x_column')
        y_column = params.get('y_column')
        model_type = params.get('model_type', 'linear')
        test_size = params.get('test_size', 0.2)
        
        # 数据预处理选项
        fill_missing = params.get('fill_missing', True)
        remove_outliers = params.get('remove_outliers', False)
        normalize_data = params.get('normalize_data', True)
        
        if not x_column or not y_column:
            return jsonify({'error': '未指定特征或目标变量'}), 400
        
        # 数据预处理
        X = df[x_column].values.reshape(-1, 1)
        y = df[y_column].values
        
        # 处理缺失值
        if fill_missing:
            X = np.nan_to_num(X, nan=np.nanmean(X))
            y = np.nan_to_num(y, nan=np.nanmean(y))
        
        # 处理异常值
        if remove_outliers:
            X, y = remove_outliers_iqr(X, y)
        
        # 数据标准化
        if normalize_data:
            scaler_X = StandardScaler()
            X = scaler_X.fit_transform(X)
            if model_type == 'linear':
                scaler_y = StandardScaler()
                y = scaler_y.fit_transform(y.reshape(-1, 1)).ravel()
        
        # 分割训练集和测试集
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )
        
        # 模型训练和评估
        if model_type == 'linear':
            results = train_linear_regression(
                X_train, X_test, y_train, y_test,
                scaler_X if normalize_data else None,
                scaler_y if normalize_data else None
            )
        else:
            results = train_logistic_regression(
                X_train, X_test, y_train, y_test
            )
        
        return jsonify(results)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def remove_outliers_iqr(X, y):
    def get_outliers_mask(data):
        Q1 = np.percentile(data, 25)
        Q3 = np.percentile(data, 75)
        IQR = Q3 - Q1
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR
        return (data >= lower_bound) & (data <= upper_bound)
    
    mask_X = get_outliers_mask(X.ravel())
    mask_y = get_outliers_mask(y)
    mask = mask_X & mask_y
    
    return X[mask], y[mask]

def train_linear_regression(X_train, X_test, y_train, y_test, scaler_X=None, scaler_y=None):
    # 训练模型
    model = LinearRegression()
    model.fit(X_train, y_train)
    
    # 预测
    y_pred = model.predict(X_test)
    
    # 如果数据被标准化，需要转换回原始尺度
    if scaler_y:
        y_test = scaler_y.inverse_transform(y_test.reshape(-1, 1)).ravel()
        y_pred = scaler_y.inverse_transform(y_pred.reshape(-1, 1)).ravel()
    
    # 计算评估指标
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)
    
    # 生成回归线数据点
    X_line = np.linspace(X_test.min(), X_test.max(), 100).reshape(-1, 1)
    if scaler_X:
        X_line = scaler_X.transform(X_line)
    y_line = model.predict(X_line)
    if scaler_y:
        y_line = scaler_y.inverse_transform(y_line.reshape(-1, 1)).ravel()
        X_line = scaler_X.inverse_transform(X_line)
    
    return {
        'metrics': {
            'mse': float(mse),
            'rmse': float(rmse),
            'r2': float(r2),
            'coef': float(model.coef_[0]),
            'intercept': float(model.intercept_)
        },
        'plot_data': {
            'x_test': X_test.tolist(),
            'y_test': y_test.tolist(),
            'y_pred': y_pred.tolist(),
            'x_line': X_line.ravel().tolist(),
            'y_line': y_line.tolist()
        }
    }

def train_logistic_regression(X_train, X_test, y_train, y_test):
    # 训练模型
    model = LogisticRegression(random_state=42)
    model.fit(X_train, y_train)
    
    # 预测概率和类别
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_pred = model.predict(X_test)
    
    # 计算评估指标
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    
    # 计算ROC曲线
    fpr, tpr, _ = roc_curve(y_test, y_pred_proba)
    roc_auc = auc(fpr, tpr)
    
    return {
        'metrics': {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1': float(f1),
            'auc': float(roc_auc),
            'coef': float(model.coef_[0][0]),
            'intercept': float(model.intercept_[0])
        },
        'plot_data': {
            'x_test': X_test.tolist(),
            'y_test': y_test.tolist(),
            'y_pred': y_pred.tolist(),
            'y_pred_proba': y_pred_proba.tolist(),
            'roc': {
                'fpr': fpr.tolist(),
                'tpr': tpr.tolist()
            }
        }
    }

@regression_bp.route('/api/regression/preview', methods=['POST'])
def preview_data():
    try:
        if 'file' not in request.files:
            return jsonify({'error': '没有上传文件'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '没有选择文件'}), 400
        
        # 读取CSV文件的前几行
        df = pd.read_csv(file, nrows=10)
        
        # 获取数据类型信息
        dtypes = df.dtypes.astype(str).to_dict()
        
        # 准备预览数据
        preview_data = {
            'columns': list(df.columns),
            'data': df.values.tolist(),
            'dtypes': dtypes
        }
        
        return jsonify(preview_data)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500 