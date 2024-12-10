class DataAnalysis {
    constructor(containerId) {
        console.log('DataAnalysis initialized');
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container not found:', containerId);
            return;
        }
        this.data = null;
        this.currentFile = null;
        this.render();
        this.initializeEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <h2>模型评估</h2>
            <div class="upload-container" id="dropZone">
                <div class="upload-area">
                    <p>拖拽文件到此处或</p>
                    <input type="file" id="fileInput" accept=".csv,.xlsx,.xls" style="display: none;">
                    <button onclick="document.getElementById('fileInput').click()">选择文件</button>
                </div>
                <p class="file-types">支持的文件类型: CSV, Excel</p>
            </div>
            <div id="previewContainer" style="display: none;">
                <div class="preview-header">
                    <div class="preview-title">
                        <h3>数据预览</h3>
                        <button class="toggle-btn" onclick="dataAnalysis.togglePreview()">
                            <span class="toggle-icon">▼</span> 折叠/展开
                        </button>
                    </div>
                    <div class="file-info">
                        <p id="fileInfo"></p>
                    </div>
                </div>
                <div class="preview-content">
                    <div class="analysis-controls">
                        <select id="badcaseColumn">
                            <option value="">真实数据所在列</option>
                        </select>
                        <select id="labelColumn">
                            <option value="">预测数据所在列</option>
                        </select>
                        <input type="text" id="positiveLabel" placeholder="输入预测标签">
                    </div>
                    <div class="preview-table-container">
                        <table id="previewTable"></table>
                    </div>
                    <div class="action-buttons">
                        <button class="delete-btn" onclick="dataAnalysis.deleteFile()">删除文件</button>
                        <button class="analyze-btn" onclick="dataAnalysis.analyze()">开始分析</button>
                    </div>
                    <div id="resultContainer" style="display: none;"></div>
                </div>
            </div>
        `;
    }

    initializeEventListeners() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length) {
                this.handleFile(files[0]);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                this.handleFile(e.target.files[0]);
            }
        });
    }

    handleFile(file) {
        if (!this.validateFile(file)) {
            alert('请上传CSV或Excel文件！');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const lines = content.split('\n');
                const headers = lines[0].split(',');
                
                // 更新列选择下拉框
                const badcaseSelect = document.getElementById('badcaseColumn');
                const labelSelect = document.getElementById('labelColumn');
                badcaseSelect.innerHTML = '<option value="">真实数据所在列</option>';
                labelSelect.innerHTML = '<option value="">预测数据所在列</option>';
                
                headers.forEach((header, index) => {
                    const option = document.createElement('option');
                    option.value = header.trim();
                    option.textContent = header.trim();
                    badcaseSelect.appendChild(option.cloneNode(true));
                    labelSelect.appendChild(option);
                });

                this.currentFile = file;
                this.showPreview(lines);
            } catch (error) {
                console.error('文件读取错误:', error);
                alert('文件读取失败，请重试！');
            }
        };
        reader.readAsText(file);
    }

    validateFile(file) {
        return file.name.endsWith('.csv');
    }

    showPreview(lines) {
        const previewContainer = document.getElementById('previewContainer');
        const previewTable = document.getElementById('previewTable');
        const fileInfo = document.getElementById('fileInfo');

        previewTable.innerHTML = '';
        const maxRows = Math.min(lines.length, 11);

        for (let i = 0; i < maxRows; i++) {
            const row = document.createElement('tr');
            const cells = lines[i].split(',');
            cells.forEach(cell => {
                const element = i === 0 ? 'th' : 'td';
                const cellElement = document.createElement(element);
                cellElement.textContent = cell.trim();
                row.appendChild(cellElement);
            });
            previewTable.appendChild(row);
        }

        fileInfo.textContent = `文件名: ${this.currentFile.name} | 总行数: ${lines.length}`;
        previewContainer.style.display = 'block';
    }

    togglePreview() {
        const previewTable = document.querySelector('.preview-table-container');
        const toggleIcon = document.querySelector('.toggle-icon');
        if (previewTable.style.display === 'none') {
            previewTable.style.display = 'block';
            toggleIcon.textContent = '▼';
        } else {
            previewTable.style.display = 'none';
            toggleIcon.textContent = '▶';
        }
    }

    deleteFile() {
        if (confirm('确定要删除当前文件吗？')) {
            this.currentFile = null;
            document.getElementById('fileInput').value = '';
            document.getElementById('previewContainer').style.display = 'none';
            document.getElementById('resultContainer').style.display = 'none';
        }
    }

    analyze() {
        const badcaseColumn = document.getElementById('badcaseColumn').value;
        const labelColumn = document.getElementById('labelColumn').value;
        const positiveLabel = document.getElementById('positiveLabel').value;

        if (!this.currentFile || !badcaseColumn || !labelColumn || !positiveLabel) {
            alert('请确保已选择文件并填写所有必要信息！');
            return;
        }

        const formData = new FormData();
        formData.append('file', this.currentFile);
        formData.append('badcase_column', badcaseColumn);
        formData.append('label_column', labelColumn);
        formData.append('positive_label', positiveLabel);

        fetch(`http://localhost:5000/upload?t=${new Date().getTime()}`, {
            method: 'POST',
            body: formData,
            mode: 'cors',
            credentials: 'same-origin',
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                alert('Error: ' + data.error);
                return;
            }
            this.displayResults(data);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('分析失败，请重试！');
        });
    }

    displayResults(data) {
        console.log('Received data:', data);
        const resultContainer = document.getElementById('resultContainer');
        if (data.error) {
            console.error('Error in data:', data.error);
            alert('Error: ' + data.error);
            return;
        }

        try {
            resultContainer.innerHTML = `
                <h3>分析结果</h3>
                <div class="results-container">
                    <div class="metrics-container">
                        <!-- 样本数量统计 -->
                        <div class="metric-section">
                            <h4>样本统计</h4>
                            <div class="metrics-row">
                                <div class="metric-item">
                                    <label>总样本数:</label>
                                    <span>${data.total_samples}</span>
                                </div>
                                <div class="metric-item">
                                    <label>真实正例:</label>
                                    <span>${data.total_positive}</span>
                                </div>
                                <div class="metric-item">
                                    <label>真实负例:</label>
                                    <span>${data.total_negative}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 主要评估指标 -->
                        <div class="metric-section">
                            <h4>准召情况</h4>
                            <div class="metrics-row">
                                <div class="metric-item">
                                    <label>准确率 (Accuracy):</label>
                                    <span>${data.accuracy.toFixed(2)}%</span>
                                </div>
                                <div class="metric-item">
                                    <label>精确率 (Precision):</label>
                                    <span>${data.precision.toFixed(2)}%</span>
                                </div>
                                <div class="metric-item">
                                    <label>召回率 (Recall):</label>
                                    <span>${data.recall.toFixed(2)}%</span>
                                </div>
                                <div class="metric-item">
                                    <label>F1分数:</label>
                                    <span>${data.f1.toFixed(2)}%</span>
                                </div>
                            </div>
                        </div>

                        <!-- 补充评估指标 -->
                        <div class="metric-section">
                            <h4>其他评估指标</h4>
                            <div class="metrics-row">
                                <div class="metric-item">
                                    <label>特异度 (Specificity):</label>
                                    <span>${data.specificity.toFixed(2)}%</span>
                                </div>
                                <div class="metric-item">
                                    <label>假阳性率 (FPR):</label>
                                    <span>${data.fpr.toFixed(2)}%</span>
                                </div>
                                <div class="metric-item">
                                    <label>假阴性率 (FNR):</label>
                                    <span>${data.fnr.toFixed(2)}%</span>
                                </div>
                                <div class="metric-item">
                                    <label>负预测值 (NPV):</label>
                                    <span>${data.npv.toFixed(2)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="plotlyConfusionMatrix" style="width: 600px; height: 400px;"></div>
                </div>
            `;

            const confusionMatrix = [
                [data.confusion_matrix[0][0], data.confusion_matrix[0][1]],
                [data.confusion_matrix[1][0], data.confusion_matrix[1][1]]
            ];

            const layout = {
                title: '混淆矩阵',
                xaxis: {
                    title: '预测类别',
                    tickvals: [0, 1],
                    ticktext: ['负例', '正例']
                },
                yaxis: {
                    title: '实际类别',
                    tickvals: [0, 1],
                    ticktext: ['负例', '正例']
                },
                annotations: [
                    { x: 0, y: 0, text: confusionMatrix[0][0], showarrow: false, font: { size: 16, color: '#000000' } },
                    { x: 1, y: 0, text: confusionMatrix[0][1], showarrow: false, font: { size: 16, color: '#000000' } },
                    { x: 0, y: 1, text: confusionMatrix[1][0], showarrow: false, font: { size: 16, color: '#000000' } },
                    { x: 1, y: 1, text: confusionMatrix[1][1], showarrow: false, font: { size: 16, color: '#000000' } }
                ],
                hoverlabel: {
                    bgcolor: 'white',
                    font: { size: 14 }
                },
                showlegend: false
            };

            Plotly.newPlot('plotlyConfusionMatrix', [{
                z: confusionMatrix,
                x: ['预测负例', '预测正例'],
                y: ['实际负例', '实际正例'],
                type: 'heatmap',
                colorscale: [
                    [0, '#f7fbff'],     
                    [0.2, '#deebf7'],   
                    [0.4, '#c6dbef'],   
                    [0.6, '#4292c6'],   
                    [0.8, '#2171b5'],   
                    [1, '#084594']      
                ],
                colorbar: { 
                    title: '统计值',
                    titleside: 'right',
                    thickness: 15,
                    len: 0.5,
                    tickmode: 'array',
                    ticktext: (() => {
                        const maxVal = Math.max(...confusionMatrix.flat());
                        const step = Math.ceil(maxVal / 5);
                        return [0, step, step*2, step*3, step*4, maxVal].map(String);
                    })(),
                    tickvals: (() => {
                        const maxVal = Math.max(...confusionMatrix.flat());
                        const step = Math.ceil(maxVal / 5);
                        return [0, step, step*2, step*3, step*4, maxVal];
                    })()
                }
            }], layout);

            resultContainer.style.display = 'block';
        } catch (error) {
            console.error('Error in displayResults:', error);
            alert('显示结果时发生错误，请查看控制台了解详情');
        }
    }
}

// 初始化
console.log('Creating DataAnalysis instance');
const dataAnalysis = new DataAnalysis('dataAnalysis');
