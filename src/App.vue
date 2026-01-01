<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { EventBus } from './game/EventBus';
import PhaserGame from './PhaserGame.vue';
import { GameDataManager } from './game/data/GameData';

// State
const phaserRef = ref();
const currentRuleText = ref('加载中...');
const dataManager = GameDataManager.getInstance();

// Gameplay Stats
const globalTime = ref(60);
const maxTime = ref(60);
const energy = ref(0);
const currentLevel = ref(1);
const isFever = ref(false);
const bossHP = ref<number | null>(null);
const userCoins = ref(dataManager.coins);

// Computed
const timePercent = computed(() => Math.max(0, (globalTime.value / maxTime.value) * 100));
const isTimeLow = computed(() => globalTime.value <= 10);

// Modals
const showPerks = ref(false);
const showGameOver = ref(false);
const showShop = ref(false);
const reachedLevel = ref(1);

const perks = [
    { id: 'time_thief', title: '时间窃贼', desc: '每关奖励时间 +1s', icon: '⏳' },
    { id: 'energy_master', title: '充能大师', desc: '能量获取效率 +50%', icon: '⚡' },
    { id: 'shield', title: '护盾', desc: '每关可抵挡一次错误点击', icon: '🛡️' }
];
const randomPerks = ref<any[]>([]);

// Upgrades State
const upgradeInfo = ref({
    maxTime: { level: 0, cost: 0, val: 0 },
    coinGain: { level: 0, cost: 0, val: 0 },
    penalty: { level: 0, cost: 0, val: 0 }
});

const refreshShopData = () => {
    userCoins.value = dataManager.coins;
    upgradeInfo.value = {
        maxTime: {
            level: dataManager.upgrades.maxTimeLevel,
            cost: dataManager.getUpgradeCost('maxTimeLevel'),
            val: dataManager.getInitialTime()
        },
        coinGain: {
            level: dataManager.upgrades.coinGainLevel,
            cost: dataManager.getUpgradeCost('coinGainLevel'),
            val: dataManager.getCoinMultiplier()
        },
        penalty: {
            level: dataManager.upgrades.penaltyLevel,
            cost: dataManager.getUpgradeCost('penaltyLevel'),
            val: dataManager.getPenaltyTime()
        }
    };
};

const buyUpgrade = (type: 'maxTimeLevel' | 'coinGainLevel' | 'penaltyLevel') => {
    if (dataManager.buyUpgrade(type)) {
        refreshShopData();
    }
};

const openShop = () => {
    showGameOver.value = false;
    refreshShopData();
    showShop.value = true;
};

const closeShop = () => {
    showShop.value = false;
    EventBus.emit('restart-game');
};

const selectPerk = (perkId: string) => {
    showPerks.value = false;
    EventBus.emit('apply-perk', perkId);
};

const restartGame = () => {
    showGameOver.value = false;
    EventBus.emit('restart-game');
};

onMounted(() => {
    refreshShopData();

    EventBus.on('data-updated', () => {
        userCoins.value = dataManager.coins;
    });

    EventBus.on('update-hud', (data: any) => {
        globalTime.value = data.time;
        energy.value = data.energy;
        currentLevel.value = data.level;
        isFever.value = data.isFever;
        bossHP.value = data.bossHP;

        if (data.time > maxTime.value) maxTime.value = data.time;
    });

    EventBus.on('update-rule', (rule: string) => {
        currentRuleText.value = rule;
    });

    EventBus.on('show-perks', () => {
        randomPerks.value = perks.sort(() => 0.5 - Math.random()).slice(0, 3);
        showPerks.value = true;
    });

    EventBus.on('game-over', (data: any) => {
        reachedLevel.value = data.level;
        showGameOver.value = true;
        refreshShopData();
    });
});

onUnmounted(() => {
    EventBus.off('update-hud');
    EventBus.off('update-rule');
    EventBus.off('show-perks');
    EventBus.off('game-over');
    EventBus.off('data-updated');
});
</script>

<template>
    <div class="game-wrapper">
        <div class="game-container" :class="{ 'fever-active': isFever }">
            <!-- Compact HUD -->
            <div class="hud">
                <!-- Top Bar -->
                <div class="hud-top">
                    <div class="level-badge">
                        <span class="level-label">LEVEL</span>
                        <span class="level-num">{{ currentLevel }}</span>
                    </div>

                    <div class="rule-display">
                        <span class="rule-text">{{ currentRuleText }}</span>
                    </div>

                    <div class="coin-display">
                        <span class="coin-icon">🪙</span>
                        <span class="coin-value">{{ userCoins.toLocaleString() }}</span>
                    </div>
                </div>

                <!-- Bars Row -->
                <div class="hud-bars">
                    <div class="bar-wrapper time-wrapper" :class="{ 'time-low': isTimeLow }">
                        <div class="bar-icon">⏱</div>
                        <div class="bar-container time-bar">
                            <div class="bar-bg"></div>
                            <div class="bar-fill" :style="{ width: timePercent + '%' }"></div>
                            <div class="bar-shine"></div>
                        </div>
                        <div class="bar-value">{{ Math.ceil(globalTime) }}s</div>
                    </div>

                    <div class="bar-wrapper energy-wrapper" :class="{ 'fever-ready': energy >= 100 }">
                        <div class="bar-icon">⚡</div>
                        <div class="bar-container energy-bar">
                            <div class="bar-bg"></div>
                            <div class="bar-fill" :style="{ width: energy + '%' }"></div>
                            <div class="bar-shine"></div>
                        </div>
                        <div class="bar-value">{{ Math.floor(energy) }}%</div>

                        <!-- Boss HP inline -->
                        <div class="boss-hp" v-if="bossHP !== null">
                            <span class="boss-label">BOSS</span>
                            <span v-for="i in 3" :key="i" class="hp-dot" :class="{ active: i <= bossHP }"></span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Fever Overlay -->
            <div class="fever-overlay" v-if="isFever">
                <div class="fever-text">FEVER!</div>
            </div>

            <PhaserGame ref="phaserRef" />

            <!-- Perk Selection Modal -->
            <Transition name="modal">
                <div v-if="showPerks" class="modal-overlay" @click.self="() => {}">
                    <div class="modal-content perks-modal">
                        <div class="modal-header">
                            <h2>命运的抉择</h2>
                            <p>击败 Boss！选择一项永久强化</p>
                        </div>
                        <div class="perk-list">
                            <div
                                v-for="(perk, index) in randomPerks"
                                :key="perk.id"
                                class="perk-card"
                                :style="{ '--delay': index * 0.1 + 's' }"
                                @click="selectPerk(perk.id)"
                            >
                                <div class="perk-glow"></div>
                                <div class="perk-icon">{{ perk.icon }}</div>
                                <h3>{{ perk.title }}</h3>
                                <p>{{ perk.desc }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Transition>

            <!-- Game Over Modal -->
            <Transition name="modal">
                <div v-if="showGameOver" class="modal-overlay">
                    <div class="modal-content result-modal">
                        <div class="modal-header">
                            <h2 class="death-title">挑战结束</h2>
                        </div>
                        <div class="result-stats">
                            <div class="stat-item">
                                <span class="stat-label">到达关卡</span>
                                <span class="stat-value">{{ reachedLevel }}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">当前金币</span>
                                <span class="stat-value coin">🪙 {{ userCoins.toLocaleString() }}</span>
                            </div>
                        </div>
                        <div class="action-buttons">
                            <button class="btn btn-primary" @click="restartGame">
                                <span>再次挑战</span>
                            </button>
                            <button class="btn btn-secondary" @click="openShop">
                                <span>强化中心</span>
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>

            <!-- Shop Modal -->
            <Transition name="modal">
                <div v-if="showShop" class="modal-overlay">
                    <div class="modal-content shop-modal">
                        <div class="modal-header">
                            <h2>强化中心</h2>
                            <div class="shop-coins">🪙 {{ userCoins.toLocaleString() }}</div>
                        </div>

                        <div class="upgrade-list">
                            <div class="upgrade-item">
                                <div class="upgrade-icon">⏳</div>
                                <div class="upgrade-info">
                                    <h3>时间沙漏</h3>
                                    <p>初始时间: <strong>{{ upgradeInfo.maxTime.val }}s</strong></p>
                                </div>
                                <button
                                    class="btn-upgrade"
                                    :class="{ maxed: upgradeInfo.maxTime.cost === -1 }"
                                    @click="buyUpgrade('maxTimeLevel')"
                                    :disabled="upgradeInfo.maxTime.cost === -1"
                                >
                                    <span class="upgrade-level">LV.{{ upgradeInfo.maxTime.level }}</span>
                                    <span class="upgrade-cost">
                                        {{ upgradeInfo.maxTime.cost === -1 ? 'MAX' : '🪙 ' + upgradeInfo.maxTime.cost }}
                                    </span>
                                </button>
                            </div>

                            <div class="upgrade-item">
                                <div class="upgrade-icon">💰</div>
                                <div class="upgrade-info">
                                    <h3>招财猫</h3>
                                    <p>金币倍率: <strong>x{{ upgradeInfo.coinGain.val.toFixed(1) }}</strong></p>
                                </div>
                                <button
                                    class="btn-upgrade"
                                    :class="{ maxed: upgradeInfo.coinGain.cost === -1 }"
                                    @click="buyUpgrade('coinGainLevel')"
                                    :disabled="upgradeInfo.coinGain.cost === -1"
                                >
                                    <span class="upgrade-level">LV.{{ upgradeInfo.coinGain.level }}</span>
                                    <span class="upgrade-cost">
                                        {{ upgradeInfo.coinGain.cost === -1 ? 'MAX' : '🪙 ' + upgradeInfo.coinGain.cost }}
                                    </span>
                                </button>
                            </div>

                            <div class="upgrade-item">
                                <div class="upgrade-icon">🛡️</div>
                                <div class="upgrade-info">
                                    <h3>冷静思维</h3>
                                    <p>错误惩罚: <strong>-{{ upgradeInfo.penalty.val }}s</strong></p>
                                </div>
                                <button
                                    class="btn-upgrade"
                                    :class="{ maxed: upgradeInfo.penalty.cost === -1 }"
                                    @click="buyUpgrade('penaltyLevel')"
                                    :disabled="upgradeInfo.penalty.cost === -1"
                                >
                                    <span class="upgrade-level">LV.{{ upgradeInfo.penalty.level }}</span>
                                    <span class="upgrade-cost">
                                        {{ upgradeInfo.penalty.cost === -1 ? 'MAX' : '🪙 ' + upgradeInfo.penalty.cost }}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <button class="btn btn-accent full-width" @click="closeShop">
                            开始挑战
                        </button>
                    </div>
                </div>
            </Transition>
        </div>
    </div>
</template>

<style scoped>
/* ==================== CSS Variables ==================== */
:root {
    --color-bg: #0a0a12;
    --color-surface: #1a1a2e;
    --color-surface-light: #252542;

    --color-primary: #00d4ff;
    --color-secondary: #7c3aed;
    --color-accent: #f59e0b;
    --color-danger: #ef4444;
    --color-success: #22c55e;

    --color-gold: #fbbf24;
    --color-gold-dark: #b45309;

    --color-text: #ffffff;
    --color-text-dim: #94a3b8;

    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 20px;

    --shadow-glow: 0 0 20px;
}

/* ==================== Layout ==================== */
.game-wrapper {
    width: 100%;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #000;
}

.game-container {
    position: relative;
    width: 1024px;
    height: 768px;
    background: var(--color-bg);
    overflow: hidden;
    font-family: 'Segoe UI', system-ui, sans-serif;
}

.game-container.fever-active {
    animation: feverPulse 0.5s ease-in-out infinite alternate;
}

@keyframes feverPulse {
    from { box-shadow: inset 0 0 60px rgba(251, 191, 36, 0.3); }
    to { box-shadow: inset 0 0 100px rgba(251, 191, 36, 0.5); }
}

/* ==================== HUD ==================== */
.hud {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    pointer-events: none;
    padding: 12px 20px;
    background: linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%);
}

/* Top Row */
.hud-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
}

.level-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-light) 100%);
    padding: 6px 16px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(255,255,255,0.1);
    min-width: 70px;
}

.level-label {
    font-size: 10px;
    color: var(--color-text-dim);
    letter-spacing: 2px;
    font-weight: 600;
}

.level-num {
    font-size: 24px;
    font-weight: bold;
    color: var(--color-primary);
    text-shadow: 0 0 10px var(--color-primary);
    line-height: 1;
}

.rule-display {
    flex: 1;
    text-align: center;
    padding: 0 20px;
}

.rule-text {
    font-size: 1.6rem;
    font-weight: bold;
    color: var(--color-gold);
    text-shadow: 0 0 20px rgba(251, 191, 36, 0.6);
    letter-spacing: 1px;
}

.coin-display {
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(180, 83, 9, 0.2) 100%);
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    border: 1px solid rgba(251, 191, 36, 0.3);
}

.coin-icon {
    font-size: 1.4rem;
}

.coin-value {
    font-size: 1.3rem;
    font-weight: bold;
    color: var(--color-gold);
    min-width: 60px;
    text-align: right;
}

/* Bars Row */
.hud-bars {
    display: flex;
    gap: 20px;
}

.bar-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
}

.bar-icon {
    font-size: 1.2rem;
    width: 24px;
    text-align: center;
}

.bar-container {
    flex: 1;
    height: 22px;
    position: relative;
    border-radius: 11px;
    overflow: hidden;
}

.bar-bg {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 11px;
}

.bar-fill {
    position: absolute;
    top: 2px;
    left: 2px;
    bottom: 2px;
    border-radius: 9px;
    transition: width 0.3s ease-out;
}

.time-bar .bar-fill {
    background: linear-gradient(90deg, #ef4444 0%, #f97316 50%, #22c55e 100%);
    background-size: 200% 100%;
    background-position: right;
}

.time-wrapper.time-low .bar-fill {
    background-position: left;
    animation: timePulse 0.5s ease-in-out infinite alternate;
}

@keyframes timePulse {
    to { opacity: 0.7; }
}

.energy-bar .bar-fill {
    background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #fbbf24 100%);
    background-size: 200% 100%;
    background-position: left;
}

.energy-wrapper .bar-fill {
    background-position: calc(var(--energy, 0) * 1%);
}

.bar-shine {
    position: absolute;
    top: 2px;
    left: 2px;
    right: 2px;
    height: 8px;
    background: linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%);
    border-radius: 9px 9px 0 0;
    pointer-events: none;
}

.bar-value {
    font-size: 0.95rem;
    font-weight: bold;
    color: var(--color-text);
    min-width: 45px;
    text-align: right;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
}

/* Boss HP */
.boss-hp {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: 15px;
    padding-left: 15px;
    border-left: 1px solid rgba(255,255,255,0.2);
}

.boss-label {
    font-size: 11px;
    font-weight: bold;
    color: var(--color-danger);
    letter-spacing: 1px;
}

.hp-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: rgba(239, 68, 68, 0.2);
    border: 2px solid var(--color-danger);
    transition: all 0.3s;
}

.hp-dot.active {
    background: var(--color-danger);
    box-shadow: 0 0 10px var(--color-danger);
}

/* Fever Overlay */
.fever-overlay {
    position: absolute;
    top: 100px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 15;
    pointer-events: none;
}

.fever-text {
    font-size: 3rem;
    font-weight: bold;
    color: var(--color-gold);
    text-shadow:
        0 0 20px var(--color-gold),
        0 0 40px var(--color-gold),
        0 0 60px rgba(251, 191, 36, 0.5);
    animation: feverBounce 0.5s ease-in-out infinite alternate;
    letter-spacing: 8px;
}

@keyframes feverBounce {
    from { transform: scale(1); }
    to { transform: scale(1.1); }
}

/* ==================== Modal Base ==================== */
.modal-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
}

.modal-content {
    background: linear-gradient(135deg, var(--color-surface) 0%, #12121f 100%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-lg);
    padding: 30px 40px;
    max-width: 550px;
    width: 90%;
    box-shadow:
        0 25px 50px rgba(0, 0, 0, 0.5),
        0 0 100px rgba(0, 212, 255, 0.1);
}

.modal-header {
    text-align: center;
    margin-bottom: 25px;
}

.modal-header h2 {
    font-size: 1.8rem;
    color: var(--color-text);
    margin: 0 0 8px 0;
    letter-spacing: 2px;
}

.modal-header p {
    color: var(--color-text-dim);
    margin: 0;
    font-size: 0.95rem;
}

/* Modal Transition */
.modal-enter-active {
    animation: modalIn 0.3s ease-out;
}

.modal-leave-active {
    animation: modalOut 0.2s ease-in;
}

@keyframes modalIn {
    from {
        opacity: 0;
        transform: scale(0.9);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

@keyframes modalOut {
    from {
        opacity: 1;
        transform: scale(1);
    }
    to {
        opacity: 0;
        transform: scale(0.9);
    }
}

/* ==================== Perk Modal ==================== */
.perk-list {
    display: flex;
    justify-content: center;
    gap: 20px;
}

.perk-card {
    position: relative;
    background: var(--color-surface-light);
    padding: 24px 20px;
    border-radius: var(--radius-md);
    width: 140px;
    text-align: center;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.3s ease;
    animation: perkSlideIn 0.4s ease-out backwards;
    animation-delay: var(--delay);
    overflow: hidden;
}

@keyframes perkSlideIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
}

.perk-card:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: var(--color-gold);
    box-shadow: 0 10px 30px rgba(251, 191, 36, 0.2);
}

.perk-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 0%, rgba(251, 191, 36, 0.15) 0%, transparent 60%);
    opacity: 0;
    transition: opacity 0.3s;
}

.perk-card:hover .perk-glow {
    opacity: 1;
}

.perk-icon {
    font-size: 2.5rem;
    margin-bottom: 12px;
}

.perk-card h3 {
    font-size: 1rem;
    color: var(--color-primary);
    margin: 0 0 8px 0;
}

.perk-card p {
    font-size: 0.8rem;
    color: var(--color-text-dim);
    margin: 0;
    line-height: 1.4;
}

/* ==================== Result Modal ==================== */
.death-title {
    color: var(--color-danger) !important;
}

.result-stats {
    display: flex;
    justify-content: center;
    gap: 40px;
    margin-bottom: 30px;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.stat-label {
    font-size: 0.85rem;
    color: var(--color-text-dim);
}

.stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: var(--color-primary);
}

.stat-value.coin {
    color: var(--color-gold);
    font-size: 1.5rem;
}

.action-buttons {
    display: flex;
    justify-content: center;
    gap: 15px;
}

/* ==================== Shop Modal ==================== */
.shop-coins {
    font-size: 1.4rem;
    color: var(--color-gold);
    margin-top: 5px;
}

.upgrade-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 25px;
}

.upgrade-item {
    display: flex;
    align-items: center;
    gap: 15px;
    background: var(--color-surface-light);
    padding: 15px 20px;
    border-radius: var(--radius-md);
    border: 1px solid rgba(255,255,255,0.05);
    transition: all 0.2s;
}

.upgrade-item:hover {
    border-color: rgba(255,255,255,0.1);
    background: #2a2a45;
}

.upgrade-icon {
    font-size: 2rem;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 212, 255, 0.1);
    border-radius: var(--radius-sm);
}

.upgrade-info {
    flex: 1;
}

.upgrade-info h3 {
    font-size: 1rem;
    color: var(--color-text);
    margin: 0 0 4px 0;
}

.upgrade-info p {
    font-size: 0.85rem;
    color: var(--color-text-dim);
    margin: 0;
}

.upgrade-info strong {
    color: var(--color-primary);
}

.btn-upgrade {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: linear-gradient(135deg, var(--color-success) 0%, #16a34a 100%);
    border: none;
    padding: 10px 20px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: all 0.2s;
    min-width: 90px;
}

.btn-upgrade:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow: 0 5px 20px rgba(34, 197, 94, 0.3);
}

.btn-upgrade:active:not(:disabled) {
    transform: scale(0.98);
}

.btn-upgrade.maxed {
    background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
    cursor: default;
}

.upgrade-level {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.8);
    font-weight: 600;
}

.upgrade-cost {
    font-size: 0.9rem;
    font-weight: bold;
    color: white;
}

/* ==================== Buttons ==================== */
.btn {
    padding: 14px 32px;
    border-radius: var(--radius-md);
    border: none;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
}

.btn:active {
    transform: scale(0.96);
}

.btn-primary {
    background: linear-gradient(135deg, var(--color-primary) 0%, #0891b2 100%);
    color: white;
}

.btn-primary:hover {
    box-shadow: 0 5px 25px rgba(0, 212, 255, 0.4);
}

.btn-secondary {
    background: linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%);
    color: #1a1a2e;
}

.btn-secondary:hover {
    box-shadow: 0 5px 25px rgba(251, 191, 36, 0.4);
}

.btn-accent {
    background: linear-gradient(135deg, var(--color-danger) 0%, #dc2626 100%);
    color: white;
}

.btn-accent:hover {
    box-shadow: 0 5px 25px rgba(239, 68, 68, 0.4);
}

.full-width {
    width: 100%;
}
</style>
