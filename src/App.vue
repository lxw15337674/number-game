<script setup lang="ts">
import Phaser from 'phaser';
import { ref, onMounted, onUnmounted } from 'vue';
import { EventBus } from './game/EventBus';
import PhaserGame from './PhaserGame.vue';

// State
const phaserRef = ref();
const isGameActive = ref(true);
const showModal = ref(false);
const lastDuration = ref(0);
const currentTime = ref('0.00');
const penaltyTime = ref(0);
const isPenalized = ref(false);
const currentRuleText = ref('加载中...'); // New state for game rule
let timerInterval: any = null;
let startTime = 0;

const currentScene = (scene: Phaser.Scene) => {
    // Game started logic if needed when scene is ready
    if (scene.scene.key === 'Game') {
        startGameTimer();
    } else {
        stopGameTimer();
        currentTime.value = '0.00';
    }
};

const startGameTimer = () => {
    stopGameTimer();
    startTime = Date.now();
    penaltyTime.value = 0;
    
    timerInterval = setInterval(() => {
        if (!showModal.value) {
            const diff = (Date.now() - startTime) / 1000 + penaltyTime.value;
            currentTime.value = diff.toFixed(2);
        }
    }, 100);
};

const stopGameTimer = () => {
    if (timerInterval) clearInterval(timerInterval);
};

const onNextLevel = () => {
    showModal.value = false;
    isGameActive.value = true;
    EventBus.emit('restart-game');
    startGameTimer();
};

onMounted(() => {
    EventBus.on('game-solved', (data: { duration: number }) => {
        // Use the displayed time as the final score to include penalties
        lastDuration.value = parseFloat(currentTime.value);
        showModal.value = true;
        stopGameTimer();
    });

    EventBus.on('time-penalty', (seconds: number) => {
        penaltyTime.value += seconds;
        // Trigger visual feedback
        isPenalized.value = true;
        setTimeout(() => {
            isPenalized.value = false;
        }, 500);
    });

    // Listen for rule updates
    EventBus.on('update-rule', (rule: string) => {
        currentRuleText.value = rule;
    });
});

onUnmounted(() => {
    stopGameTimer();
    EventBus.off('game-solved');
    EventBus.off('time-penalty');
    EventBus.off('update-rule');
});
</script>

<template>
    <div class="game-container">
        <!-- Header / HUD -->
        <div class="hud">
            <h1>数字篇</h1>
            <div class="rule-display">{{ currentRuleText }}</div>
            <div class="timer" :class="{ penalized: isPenalized }">时间: {{ currentTime }} s</div>
        </div>

        <PhaserGame ref="phaserRef" @current-active-scene="currentScene" />

        <!-- Victory Modal -->
        <div v-if="showModal" class="modal-overlay">
            <div class="modal-content">
                <h2>🎉 眼疾手快!</h2>
                <p>本局耗时: <strong>{{ lastDuration.toFixed(2) }}</strong> 秒</p>
                <button class="next-btn" @click="onNextLevel">挑战下一关</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.game-container {
    position: relative;
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: #2d2d2d;
    color: white;
    font-family: Arial, sans-serif;
}

.hud {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    justify-content: space-between;
    align-items: center; /* Center items vertically */
    width: 100%;
    max-width: 1024px;
    padding: 10px 20px;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10;
    box-sizing: border-box;
}

.rule-display {
    font-size: 1.8rem;
    font-weight: bold;
    color: #f1c40f; /* Gold color for importance */
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    flex-grow: 1;
    text-align: center;
}

.timer {
    font-size: 1.5rem;
    font-weight: bold;
    color: #00ff00;
    transition: color 0.2s, transform 0.2s;
    min-width: 120px; /* Prevent jitter */
    text-align: right;
}

.timer.penalized {
    color: #ff0000;
    transform: scale(1.5);
}

/* Modal Styles */
.modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
}

.modal-content {
    background: white;
    color: #333;
    padding: 30px;
    border-radius: 12px;
    text-align: center;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    min-width: 300px;
}

.modal-content h2 {
    margin-top: 0;
    color: #e67e22;
}

.modal-content p {
    font-size: 1.2rem;
    margin: 20px 0;
}

.next-btn {
    background-color: #3498db;
    color: white;
    border: none;
    padding: 12px 24px;
    font-size: 1rem;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
}

.next-btn:hover {
    background-color: #2980b9;
}
</style>
