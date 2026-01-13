// Snore Stop - Антихрап приложение
// Звуки генерируются программно через Web Audio API

class SnoreStop {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.isRunning = false;
        this.checkInterval = null;
        
        this.threshold = 30;
        this.timeout = 5;
        this.currentVolume = 0.3;
        this.baseVolume = 0.3;
        this.maxVolume = 1.0;
        this.volumeStep = 0.15;
        
        this.triggerCount = 0;
        
        // Типы звуков
        this.soundTypes = ['beep', 'smack', 'seagull', 'meow', 'bark'];
        
        this.initUI();
    }
    
    initUI() {
        // Элементы
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.levelFill = document.getElementById('levelFill');
        this.currentLevelText = document.getElementById('currentLevel');
        this.thresholdSlider = document.getElementById('threshold');
        this.thresholdValue = document.getElementById('thresholdValue');
        this.thresholdMarker = document.getElementById('thresholdMarker');
        this.timeoutSlider = document.getElementById('timeout');
        this.timeoutValue = document.getElementById('timeoutValue');
        this.volumeSlider = document.getElementById('volume');
        this.volumeValue = document.getElementById('volumeValue');
        this.statusText = document.getElementById('statusText');
        this.triggersDisplay = document.getElementById('triggers');
        
        // События
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
        
        this.thresholdSlider.addEventListener('input', (e) => {
            this.threshold = parseInt(e.target.value);
            this.thresholdValue.textContent = this.threshold + '%';
            this.thresholdMarker.style.left = this.threshold + '%';
        });
        
        this.timeoutSlider.addEventListener('input', (e) => {
            this.timeout = parseInt(e.target.value);
            this.timeoutValue.textContent = this.timeout + ' сек';
        });
        
        this.volumeSlider.addEventListener('input', (e) => {
            this.baseVolume = parseInt(e.target.value) / 100;
            this.volumeValue.textContent = e.target.value + '%';
        });
        
        // Начальная позиция маркера
        this.thresholdMarker.style.left = this.threshold + '%';
    }
    
    async start() {
        try {
            // Запрос доступа к микрофону
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);
            
            this.isRunning = true;
            this.currentVolume = this.baseVolume;
            this.triggerCount = 0;
            this.triggersDisplay.textContent = '';
            
            // UI
            this.startBtn.classList.add('hidden');
            this.stopBtn.classList.remove('hidden');
            this.statusText.textContent = 'Мониторинг активен...';
            this.statusText.classList.remove('alert');
            
            // Запуск мониторинга
            this.monitor();
            
        } catch (err) {
            console.error('Ошибка доступа к микрофону:', err);
            this.statusText.textContent = 'Ошибка: нет доступа к микрофону';
            this.statusText.classList.add('alert');
        }
    }
    
    stop() {
        this.isRunning = false;
        
        if (this.checkInterval) {
            clearTimeout(this.checkInterval);
            this.checkInterval = null;
        }
        
        if (this.microphone) {
            this.microphone.disconnect();
        }
        
        if (this.audioContext) {
            this.audioContext.close();
        }
        
        // UI
        this.startBtn.classList.remove('hidden');
        this.stopBtn.classList.add('hidden');
        this.statusText.textContent = 'Мониторинг остановлен';
        this.statusText.classList.remove('alert');
        this.levelFill.style.width = '0%';
        this.currentLevelText.textContent = '0%';
    }
    
    monitor() {
        if (!this.isRunning) return;
        
        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);
        
        // Средний уровень
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        const level = Math.round((average / 255) * 100);
        
        // Обновление UI
        this.levelFill.style.width = level + '%';
        this.currentLevelText.textContent = level + '%';
        
        // Проверка порога
        if (level > this.threshold) {
            this.trigger();
        } else {
            // Продолжаем мониторинг
            requestAnimationFrame(() => this.monitor());
        }
    }
    
    async trigger() {
        this.triggerCount++;
        this.triggersDisplay.textContent = '🔔'.repeat(Math.min(this.triggerCount, 10));
        
        // Случайный звук
        const soundType = this.soundTypes[Math.floor(Math.random() * this.soundTypes.length)];
        
        this.statusText.textContent = `Храп! Звук: ${this.getSoundName(soundType)} (${Math.round(this.currentVolume * 100)}%)`;
        this.statusText.classList.add('alert');
        
        // 3 бипа
        for (let i = 0; i < 3; i++) {
            await this.playSound(soundType);
            await this.sleep(300);
        }
        
        // Увеличиваем громкость для следующего раза
        this.currentVolume = Math.min(this.currentVolume + this.volumeStep, this.maxVolume);
        
        // Ждём таймаут и проверяем снова
        this.statusText.textContent = `Пауза ${this.timeout} сек...`;
        this.statusText.classList.remove('alert');
        
        this.checkInterval = setTimeout(() => {
            if (this.isRunning) {
                this.monitor();
            }
        }, this.timeout * 1000);
    }
    
    getSoundName(type) {
        const names = {
            'beep': 'Гудок',
            'smack': 'Чмок',
            'seagull': 'Чайка',
            'meow': 'Мяу',
            'bark': 'Лай'
        };
        return names[type] || type;
    }
    
    async playSound(type) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const gainNode = ctx.createGain();
        gainNode.connect(ctx.destination);
        gainNode.gain.value = this.currentVolume;
        
        switch(type) {
            case 'beep':
                await this.playBeep(ctx, gainNode);
                break;
            case 'smack':
                await this.playSmack(ctx, gainNode);
                break;
            case 'seagull':
                await this.playSeagull(ctx, gainNode);
                break;
            case 'meow':
                await this.playMeow(ctx, gainNode);
                break;
            case 'bark':
                await this.playBark(ctx, gainNode);
                break;
        }
        
        setTimeout(() => ctx.close(), 1000);
    }
    
    // Гудок - простой синус
    async playBeep(ctx, gainNode) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 800;
        osc.connect(gainNode);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    }
    
    // Чмок - короткий низкий звук с модуляцией
    async playSmack(ctx, gainNode) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
        
        const smackGain = ctx.createGain();
        smackGain.gain.setValueAtTime(1, ctx.currentTime);
        smackGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        
        osc.connect(smackGain);
        smackGain.connect(gainNode);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    }
    
    // Чайка - высокий крик с вибрато
    async playSeagull(ctx, gainNode) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        
        // Крик чайки - переменная частота
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1500, ctx.currentTime + 0.1);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.3);
        osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.4);
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.5);
        
        const seagullGain = ctx.createGain();
        seagullGain.gain.setValueAtTime(0.5, ctx.currentTime);
        seagullGain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        
        osc.connect(seagullGain);
        seagullGain.connect(gainNode);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    }
    
    // Мяу - два тона
    async playMeow(ctx, gainNode) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        
        osc.frequency.setValueAtTime(700, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.2);
        osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.4);
        
        const meowGain = ctx.createGain();
        meowGain.gain.setValueAtTime(0.8, ctx.currentTime);
        meowGain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        
        osc.connect(meowGain);
        meowGain.connect(gainNode);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
    }
    
    // Лай - резкие короткие звуки
    async playBark(ctx, gainNode) {
        for (let i = 0; i < 2; i++) {
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, ctx.currentTime + i * 0.15);
            osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + i * 0.15 + 0.1);
            
            const barkGain = ctx.createGain();
            barkGain.gain.setValueAtTime(0.6, ctx.currentTime + i * 0.15);
            barkGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.1);
            
            osc.connect(barkGain);
            barkGain.connect(gainNode);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.1);
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    window.snoreStop = new SnoreStop();
});

// Service Worker регистрация
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('SW registered'))
        .catch(err => console.log('SW error:', err));
}
