class Calculator {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <h2>工具1: 计算器</h2>
            <input type="text" id="calcInput" placeholder="输入计算表达式">
            <button onclick="calculator.calculate()">计算</button>
            <p id="calcResult"></p>
        `;
    }

    calculate() {
        const input = document.getElementById('calcInput').value;
        try {
            const result = eval(input);
            document.getElementById('calcResult').innerText = `结果: ${result}`;
        } catch (error) {
            document.getElementById('calcResult').innerText = '无效的表达式';
        }
    }
} 