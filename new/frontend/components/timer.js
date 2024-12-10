class Timer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.seconds = 0;
        this.timer = null;
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <h2>工具2: 计时器</h2>
            <button onclick="timer.startTimer()">开始计时</button>
            <button onclick="timer.stopTimer()">停止计时</button>
            <p id="timerDisplay">0 秒</p>
        `;
    }

    startTimer() {
        if (this.timer) return;
        this.timer = setInterval(() => {
            this.seconds++;
            document.getElementById('timerDisplay').innerText = `${this.seconds} 秒`;
        }, 1000);
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
} 