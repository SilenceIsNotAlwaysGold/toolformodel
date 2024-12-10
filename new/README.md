## 说明

### Backend

- **app.py**: Flask应用程序，处理文件上传和数据分析。
- **requirements.txt**: 列出所有Python依赖库。

### Frontend

- **index.html**: 主页面文件，包含所有前端组件。
- **css/style.css**: 样式文件，定义页面的样式。
- **js/dataAnalysisLogic.js**: 包含数据分析的前端逻辑。
- **js/calculator.js**: 计算器功能的JavaScript代码。
- **js/timer.js**: 计时器功能的JavaScript代码。
- **components/dataAnalysis.js**: 数据分析组件的JavaScript代码。
- **components/calculator.js**: 计算器组件的JavaScript代码。
- **components/timer.js**: 计时器组件的JavaScript代码。

## 部署和运行

### 后端

1. 进入 `backend` 目录。
2. 安装依赖：
   ```bash
   pip install -r requirements.txt
   ```
3. 运行 Flask 应用：
   ```bash
   python app.py
   ```

### 前端

1. 进入 `frontend` 目录。
2. 使用静态文件服务器（如 `http-server`）运行前端：
   ```bash
   npx http-server .
   ```
3. 在浏览器中访问前端页面。

## 依赖

- Flask
- pandas
- scikit-learn
