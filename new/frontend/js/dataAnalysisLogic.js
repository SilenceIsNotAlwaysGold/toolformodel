// 全局变量
let rawData = null;
let processedData = null;
let model = null;

// DOM 元素
const csvFileInput = document.getElementById('csvFile');
const uploadBtn = document.getElementById('uploadBtn');
const previewSection = document.querySelector('.preview-section');
const analysisConfig = document.querySelector('.analysis-config');
const resultsSection = document.querySelector('.results-section');
const previewTable = document.getElementById('previewTable');
const xAxisSelect = document.getElementById('xAxis');
const yAxisSelect = document.getElementById('yAxis');
const modelTypeSelect = document.getElementById('modelType');
const analyzeBtn = document.getElementById('analyzeBtn');
const exportReportBtn = document.getElementById('exportReport');

// 事件监听器
uploadBtn.addEventListener('click', handleFileUpload);
analyzeBtn.addEventListener('click', performAnalysis);
exportReportBtn.addEventListener('click', exportReport);
modelTypeSelect.addEventListener('change', updateUIBasedOnModelType);

// 文件上传和解析
async function handleFileUpload() {
    const file = csvFileInput.files[0];
    if (!file) {
        alert('请选择CSV文件');
        return;
    }

    Papa.parse(file, {
        complete: function(results) {
            rawData = results.data;
            if (rawData.length > 0) {
                processData();
                showDataPreview();
                setupAnalysisOptions();
                previewSection.style.display = 'block';
                analysisConfig.style.display = 'block';
            }
        },
        header: true,
        dynamicTyping: true
    });
}

// 数据预处理
function processData() {
    processedData = {...rawData};
    
    // 检测数据类型
    const dataTypes = detectDataTypes(rawData);
    
    // 处理缺失值
    if (document.getElementById('fillMissing').checked) {
        fillMissingValues(processedData, dataTypes);
    }
    
    // 处理异常值
    if (document.getElementById('removeOutliers').checked) {
        removeOutliers(processedData, dataTypes);
    }
    
    // 数据标准化
    if (document.getElementById('normalizeData').checked) {
        normalizeData(processedData, dataTypes);
    }
}

// 检测数据类型
function detectDataTypes(data) {
    const types = {};
    const headers = Object.keys(data[0]);
    
    headers.forEach(header => {
        const values = data.map(row => row[header]).filter(val => val != null);
        if (values.every(val => typeof val === 'number')) {
            types[header] = 'numeric';
        } else if (values.every(val => typeof val === 'boolean' || val === 0 || val === 1)) {
            types[header] = 'boolean';
        } else {
            types[header] = 'categorical';
        }
    });
    
    return types;
}

// 填充缺失值
function fillMissingValues(data, types) {
    Object.keys(types).forEach(column => {
        const values = data.map(row => row[column]).filter(val => val != null);
        if (types[column] === 'numeric') {
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            data.forEach(row => {
                if (row[column] == null) row[column] = mean;
            });
        } else {
            const mode = findMode(values);
            data.forEach(row => {
                if (row[column] == null) row[column] = mode;
            });
        }
    });
}

// 移除异常值
function removeOutliers(data, types) {
    Object.keys(types).forEach(column => {
        if (types[column] === 'numeric') {
            const values = data.map(row => row[column]);
            const q1 = quantile(values, 0.25);
            const q3 = quantile(values, 0.75);
            const iqr = q3 - q1;
            const lower = q1 - 1.5 * iqr;
            const upper = q3 + 1.5 * iqr;
            
            data = data.filter(row => {
                const val = row[column];
                return val >= lower && val <= upper;
            });
        }
    });
}

// 数据标准化
function normalizeData(data, types) {
    Object.keys(types).forEach(column => {
        if (types[column] === 'numeric') {
            const values = data.map(row => row[column]);
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const std = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
            
            data.forEach(row => {
                row[column] = (row[column] - mean) / std;
            });
        }
    });
}

// 显示数据预览
function showDataPreview() {
    const headers = Object.keys(rawData[0]);
    const previewData = rawData.slice(0, 10);
    
    let tableHTML = '<thead><tr>';
    headers.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    previewData.forEach(row => {
        tableHTML += '<tr>';
        headers.forEach(header => {
            tableHTML += `<td>${row[header]}</td>`;
        });
        tableHTML += '</tr>';
    });
    
    tableHTML += '</tbody>';
    previewTable.innerHTML = tableHTML;
}

// 设置分析选项
function setupAnalysisOptions() {
    const headers = Object.keys(rawData[0]);
    
    xAxisSelect.innerHTML = '';
    yAxisSelect.innerHTML = '';
    
    headers.forEach(header => {
        xAxisSelect.add(new Option(header, header));
        yAxisSelect.add(new Option(header, header));
    });
}

// 更新UI基于模型类型
function updateUIBasedOnModelType() {
    const modelType = modelTypeSelect.value;
    // 可以根据模型类型更新UI元素
}

// 执行分析
async function performAnalysis() {
    const xColumn = xAxisSelect.value;
    const yColumn = yAxisSelect.value;
    const modelType = modelTypeSelect.value;
    
    // 准备数据
    const X = processedData.map(row => row[xColumn]);
    const y = processedData.map(row => row[yColumn]);
    
    // 训练模型
    if (modelType === 'linear') {
        await trainLinearRegression(X, y);
    } else {
        await trainLogisticRegression(X, y);
    }
    
    // 显示结果
    showResults();
    resultsSection.style.display = 'block';
}

// 训练线性回归模型
async function trainLinearRegression(X, y) {
    // 使用TensorFlow.js创建和训练线性回归模型
    model = tf.sequential();
    model.add(tf.layers.dense({units: 1, inputShape: [1]}));
    model.compile({optimizer: 'sgd', loss: 'meanSquaredError'});
    
    const xs = tf.tensor2d(X, [X.length, 1]);
    const ys = tf.tensor2d(y, [y.length, 1]);
    
    await model.fit(xs, ys, {epochs: 100});
    
    // 计算评估指标
    const predictions = model.predict(xs);
    const mse = tf.metrics.meanSquaredError(ys, predictions).dataSync()[0];
    const r2 = calculateR2(y, predictions.dataSync());
    
    return {mse, r2};
}

// 训练逻辑回归模型
async function trainLogisticRegression(X, y) {
    // 使用TensorFlow.js创建和训练逻辑回归模型
    model = tf.sequential();
    model.add(tf.layers.dense({units: 1, activation: 'sigmoid', inputShape: [1]}));
    model.compile({optimizer: 'adam', loss: 'binaryCrossentropy', metrics: ['accuracy']});
    
    const xs = tf.tensor2d(X, [X.length, 1]);
    const ys = tf.tensor2d(y, [y.length, 1]);
    
    await model.fit(xs, ys, {epochs: 100});
    
    // 计算评估指标
    const predictions = model.predict(xs);
    const accuracy = calculateAccuracy(y, predictions.dataSync());
    const {precision, recall, f1} = calculatePRF(y, predictions.dataSync());
    
    return {accuracy, precision, recall, f1};
}

// 显示结果
function showResults() {
    const modelType = modelTypeSelect.value;
    const metrics = document.getElementById('modelMetrics');
    const report = document.getElementById('analysisReport');
    
    // 显示评估指标
    if (modelType === 'linear') {
        // 显示线性回归指标
        metrics.innerHTML = `
            <div class="metric-item">
                <div class="metric-value">${mse.toFixed(4)}</div>
                <div class="metric-label">均方误差 (MSE)</div>
            </div>
            <div class="metric-item">
                <div class="metric-value">${r2.toFixed(4)}</div>
                <div class="metric-label">R² 值</div>
            </div>
        `;
        
        // 绘制散点图和回归线
        drawScatterPlot();
    } else {
        // 显示逻辑回归指标
        metrics.innerHTML = `
            <div class="metric-item">
                <div class="metric-value">${accuracy.toFixed(4)}</div>
                <div class="metric-label">准确率</div>
            </div>
            <div class="metric-item">
                <div class="metric-value">${precision.toFixed(4)}</div>
                <div class="metric-label">精确度</div>
            </div>
            <div class="metric-item">
                <div class="metric-value">${recall.toFixed(4)}</div>
                <div class="metric-label">召回率</div>
            </div>
            <div class="metric-item">
                <div class="metric-value">${f1.toFixed(4)}</div>
                <div class="metric-label">F1 分数</div>
            </div>
        `;
        
        // 绘制ROC曲线和混淆矩阵
        drawROCCurve();
        drawConfusionMatrix();
    }
    
    // 生成分析报告
    generateReport();
}

// 绘制散点图和回归线
function drawScatterPlot() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    const xColumn = xAxisSelect.value;
    const yColumn = yAxisSelect.value;
    
    const data = {
        datasets: [{
            label: '数据点',
            data: processedData.map(row => ({
                x: row[xColumn],
                y: row[yColumn]
            })),
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            type: 'scatter'
        }]
    };
    
    // 添加回归线
    const xRange = tf.linspace(0, Math.max(...processedData.map(row => row[xColumn])), 100);
    const predictions = model.predict(xRange.reshape([100, 1]));
    
    data.datasets.push({
        label: '回归线',
        data: Array.from(xRange.dataSync()).map((x, i) => ({
            x: x,
            y: predictions.dataSync()[i]
        })),
        type: 'line',
        borderColor: 'rgba(255, 99, 132, 1)',
        fill: false
    });
    
    new Chart(ctx, {
        type: 'scatter',
        data: data,
        options: {
            responsive: true,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: xColumn
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: yColumn
                    }
                }
            }
        }
    });
}

// 绘制ROC曲线
function drawROCCurve() {
    const predictions = model.predict(tf.tensor2d(processedData.map(row => row[xAxisSelect.value]), [processedData.length, 1]));
    const {tpr, fpr} = calculateROCPoints(processedData.map(row => row[yAxisSelect.value]), predictions.dataSync());
    
    const trace = {
        x: fpr,
        y: tpr,
        type: 'scatter',
        mode: 'lines',
        name: 'ROC曲线',
        line: {
            color: 'rgb(54, 162, 235)'
        }
    };
    
    const layout = {
        title: 'ROC曲线',
        xaxis: {title: '假阳性率 (FPR)'},
        yaxis: {title: '真阳性率 (TPR)'},
        showlegend: true
    };
    
    Plotly.newPlot('additionalChart', [trace], layout);
}

// 生成分析报告
function generateReport() {
    const report = document.getElementById('analysisReport');
    const modelType = modelTypeSelect.value;
    const xColumn = xAxisSelect.value;
    const yColumn = yAxisSelect.value;
    
    let reportHTML = `
        <h4>分析概要</h4>
        <p>模型类型：${modelType === 'linear' ? '线性回归' : '逻辑回归'}</p>
        <p>特征变量：${xColumn}</p>
        <p>目标变量：${yColumn}</p>
        <h4>模型性能</h4>
    `;
    
    if (modelType === 'linear') {
        reportHTML += `
            <p>R² 值：${r2.toFixed(4)}</p>
            <p>均方误差 (MSE)：${mse.toFixed(4)}</p>
            <p>均方根误差 (RMSE)：${Math.sqrt(mse).toFixed(4)}</p>
        `;
    } else {
        reportHTML += `
            <p>准确率：${accuracy.toFixed(4)}</p>
            <p>精确度：${precision.toFixed(4)}</p>
            <p>召回率：${recall.toFixed(4)}</p>
            <p>F1 分数：${f1.toFixed(4)}</p>
        `;
    }
    
    report.innerHTML = reportHTML;
}

// 导出报告
function exportReport() {
    const reportContent = document.getElementById('analysisReport').innerText;
    const blob = new Blob([reportContent], {type: 'text/plain'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '数据分析报告.txt';
    a.click();
    window.URL.revokeObjectURL(url);
}

// 辅助函数
function findMode(arr) {
    return arr.sort((a,b) =>
        arr.filter(v => v === a).length - arr.filter(v => v === b).length
    ).pop();
}

function quantile(arr, q) {
    const sorted = arr.sort((a, b) => a - b);
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
        return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    } else {
        return sorted[base];
    }
}

function calculateR2(actual, predicted) {
    const mean = actual.reduce((a, b) => a + b, 0) / actual.length;
    const ssTotal = actual.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
    const ssResidual = actual.reduce((a, b, i) => a + Math.pow(b - predicted[i], 2), 0);
    return 1 - (ssResidual / ssTotal);
}

function calculateAccuracy(actual, predicted) {
    const correct = actual.filter((val, i) => Math.round(predicted[i]) === val).length;
    return correct / actual.length;
}

function calculatePRF(actual, predicted) {
    const tp = actual.filter((val, i) => val === 1 && Math.round(predicted[i]) === 1).length;
    const fp = actual.filter((val, i) => val === 0 && Math.round(predicted[i]) === 1).length;
    const fn = actual.filter((val, i) => val === 1 && Math.round(predicted[i]) === 0).length;
    
    const precision = tp / (tp + fp);
    const recall = tp / (tp + fn);
    const f1 = 2 * (precision * recall) / (precision + recall);
    
    return {precision, recall, f1};
}

function calculateROCPoints(actual, predicted) {
    const thresholds = Array.from({length: 100}, (_, i) => i / 100);
    const tpr = [];
    const fpr = [];
    
    thresholds.forEach(threshold => {
        const binaryPredictions = predicted.map(p => p >= threshold ? 1 : 0);
        const tp = actual.filter((val, i) => val === 1 && binaryPredictions[i] === 1).length;
        const fp = actual.filter((val, i) => val === 0 && binaryPredictions[i] === 1).length;
        const fn = actual.filter((val, i) => val === 1 && binaryPredictions[i] === 0).length;
        const tn = actual.filter((val, i) => val === 0 && binaryPredictions[i] === 0).length;
        
        tpr.push(tp / (tp + fn));
        fpr.push(fp / (fp + tn));
    });
    
    return {tpr, fpr};
}
