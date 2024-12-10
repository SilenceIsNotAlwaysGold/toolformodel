// 全局变量
let rawData = null;
let processedData = null;

// API 端点
const API_BASE_URL = 'http://localhost:5000/api/regression';

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

// 文件上传和预览
async function handleFileUpload() {
    const file = csvFileInput.files[0];
    if (!file) {
        alert('请选择CSV文件');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE_URL}/preview`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('数据预览失败');
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        // 显示数据预览
        showDataPreview(data);
        setupAnalysisOptions(data);
        
        previewSection.style.display = 'block';
        analysisConfig.style.display = 'block';
        
    } catch (error) {
        console.error('Error:', error);
        alert('文件上传失败: ' + error.message);
    }
}

// 显示数据预览
function showDataPreview(data) {
    let tableHTML = '<thead><tr>';
    data.columns.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    data.data.forEach(row => {
        tableHTML += '<tr>';
        row.forEach(cell => {
            tableHTML += `<td>${cell}</td>`;
        });
        tableHTML += '</tr>';
    });
    
    tableHTML += '</tbody>';
    previewTable.innerHTML = tableHTML;
}

// 设置分析选项
function setupAnalysisOptions(data) {
    xAxisSelect.innerHTML = '';
    yAxisSelect.innerHTML = '';
    
    data.columns.forEach(column => {
        const dtype = data.dtypes[column];
        if (dtype.includes('float') || dtype.includes('int')) {
            xAxisSelect.add(new Option(column, column));
            yAxisSelect.add(new Option(column, column));
        }
    });
}

// 更新UI基于模型类型
function updateUIBasedOnModelType() {
    const modelType = modelTypeSelect.value;
    const options = yAxisSelect.options;
    
    // 保存当前选择
    const currentValue = yAxisSelect.value;
    
    // 清空选项
    yAxisSelect.innerHTML = '';
    
    // 重新添加适合的选项
    Array.from(options).forEach(option => {
        if (modelType === 'linear' || isBinaryColumn(option.value)) {
            yAxisSelect.add(new Option(option.text, option.value));
        }
    });
    
    // 如果之前的选择仍然有效，保持它
    if (Array.from(yAxisSelect.options).some(opt => opt.value === currentValue)) {
        yAxisSelect.value = currentValue;
    }
}

// 检查是否为二元变量
function isBinaryColumn(column) {
    if (!rawData) return true;
    const values = new Set(rawData.map(row => row[column]));
    return values.size === 2;
}

// 执行分析
async function performAnalysis() {
    const file = csvFileInput.files[0];
    if (!file) {
        alert('请先上传文件');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('params', JSON.stringify({
        x_column: xAxisSelect.value,
        y_column: yAxisSelect.value,
        model_type: modelTypeSelect.value,
        fill_missing: document.getElementById('fillMissing').checked,
        remove_outliers: document.getElementById('removeOutliers').checked,
        normalize_data: document.getElementById('normalizeData').checked
    }));

    try {
        const response = await fetch(`${API_BASE_URL}/analyze`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('分析请求失败');
        }

        const results = await response.json();
        if (results.error) {
            throw new Error(results.error);
        }

        // 显示结果
        showResults(results);
        resultsSection.style.display = 'block';
        
    } catch (error) {
        console.error('Error:', error);
        alert('分析失败: ' + error.message);
    }
}

// 显示结果
function showResults(results) {
    const modelType = modelTypeSelect.value;
    const metrics = document.getElementById('modelMetrics');
    
    // 显示评估指标
    if (modelType === 'linear') {
        metrics.innerHTML = `
            <div class="metric-item">
                <div class="metric-value">${results.metrics.r2.toFixed(4)}</div>
                <div class="metric-label">R² 值</div>
            </div>
            <div class="metric-item">
                <div class="metric-value">${results.metrics.mse.toFixed(4)}</div>
                <div class="metric-label">均方误差 (MSE)</div>
            </div>
            <div class="metric-item">
                <div class="metric-value">${results.metrics.rmse.toFixed(4)}</div>
                <div class="metric-label">均方根误差 (RMSE)</div>
            </div>
        `;
        
        // 绘制散点图和回归线
        drawScatterPlot(results.plot_data);
    } else {
        metrics.innerHTML = `
            <div class="metric-item">
                <div class="metric-value">${results.metrics.accuracy.toFixed(4)}</div>
                <div class="metric-label">准确率</div>
            </div>
            <div class="metric-item">
                <div class="metric-value">${results.metrics.precision.toFixed(4)}</div>
                <div class="metric-label">精确度</div>
            </div>
            <div class="metric-item">
                <div class="metric-value">${results.metrics.recall.toFixed(4)}</div>
                <div class="metric-label">召回率</div>
            </div>
            <div class="metric-item">
                <div class="metric-value">${results.metrics.f1.toFixed(4)}</div>
                <div class="metric-label">F1 分数</div>
            </div>
            <div class="metric-item">
                <div class="metric-value">${results.metrics.auc.toFixed(4)}</div>
                <div class="metric-label">AUC</div>
            </div>
        `;
        
        // 绘制ROC曲线
        drawROCCurve(results.plot_data.roc);
    }
    
    // 生成分析报告
    generateReport(results);
}

// 绘制散点图和回归线
function drawScatterPlot(plotData) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    const xColumn = xAxisSelect.value;
    const yColumn = yAxisSelect.value;
    
    new Chart(ctx, {
        data: {
            datasets: [{
                type: 'scatter',
                label: '测试数据点',
                data: plotData.x_test.map((x, i) => ({
                    x: x,
                    y: plotData.y_test[i]
                })),
                backgroundColor: 'rgba(54, 162, 235, 0.5)'
            }, {
                type: 'line',
                label: '回归线',
                data: plotData.x_line.map((x, i) => ({
                    x: x,
                    y: plotData.y_line[i]
                })),
                borderColor: 'rgba(255, 99, 132, 1)',
                fill: false
            }]
        },
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
function drawROCCurve(rocData) {
    const trace = {
        x: rocData.fpr,
        y: rocData.tpr,
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
function generateReport(results) {
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
            <p>R² 值：${results.metrics.r2.toFixed(4)}</p>
            <p>均方误差 (MSE)：${results.metrics.mse.toFixed(4)}</p>
            <p>均方根误差 (RMSE)：${results.metrics.rmse.toFixed(4)}</p>
            <p>回归方程：y = ${results.metrics.coef.toFixed(4)}x + ${results.metrics.intercept.toFixed(4)}</p>
            <p>模型解释：</p>
            <ul>
                <li>R² 值表示模型可以解释${(results.metrics.r2 * 100).toFixed(2)}%的数据变异性</li>
                <li>RMSE 表示预测值与实际值的平均偏差为 ${results.metrics.rmse.toFixed(4)} 个单位</li>
                <li>每单位${xColumn}的变化会导致${yColumn}变化${Math.abs(results.metrics.coef).toFixed(4)}个单位</li>
            </ul>
        `;
    } else {
        reportHTML += `
            <p>准确率：${results.metrics.accuracy.toFixed(4)}</p>
            <p>精确度：${results.metrics.precision.toFixed(4)}</p>
            <p>召回率：${results.metrics.recall.toFixed(4)}</p>
            <p>F1 分数：${results.metrics.f1.toFixed(4)}</p>
            <p>AUC：${results.metrics.auc.toFixed(4)}</p>
            <p>逻辑回归方程：logit(p) = ${results.metrics.coef.toFixed(4)}x + ${results.metrics.intercept.toFixed(4)}</p>
            <p>模型解释：</p>
            <ul>
                <li>模型的总体准确率为 ${(results.metrics.accuracy * 100).toFixed(2)}%</li>
                <li>精确度为 ${(results.metrics.precision * 100).toFixed(2)}%，表示在模型预测为正类的样本中，真实为正类的比例</li>
                <li>召回率为 ${(results.metrics.recall * 100).toFixed(2)}%，表示在所有真实正类样本中，被正确预测的比例</li>
                <li>AUC 为 ${results.metrics.auc.toFixed(4)}，表示模型的整体分类性能</li>
            </ul>
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
    a.download = '回归分析报告.txt';
    a.click();
    window.URL.revokeObjectURL(url);
} 