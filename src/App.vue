<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { EventBus } from './game/EventBus';
import PhaserGame from './PhaserGame.vue';
import { GameDataManager } from './game/data/GameData';

// State
const phaserRef = ref();
const dataManager = GameDataManager.getInstance();
const userCoins = ref(dataManager.coins);

// UI State
const showLevelIntro = ref(false);
const showRoundTransition = ref(false);
const levelIntroData = ref({ level: 1, isBoss: false, ruleText: '' });
const roundTransitionData = ref({ round: 1, total: 3 });

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

const startLevel = () => {
    showLevelIntro.value = false;
    EventBus.emit('start-level');
};

const continueNextRound = () => {
    showRoundTransition.value = false;
    EventBus.emit('next-round');
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

    EventBus.on('level-intro', (data: any) => {
        levelIntroData.value = {
            level: data.level,
            isBoss: data.isBoss,
            ruleText: data.ruleText
        };
        showLevelIntro.value = true;
    });

    EventBus.on('round-transition', (data: any) => {
        roundTransitionData.value = {
            round: data.round,
            total: data.total
        };
        showRoundTransition.value = true;
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
    EventBus.off('level-intro');
    EventBus.off('round-transition');
    EventBus.off('show-perks');
    EventBus.off('game-over');
    EventBus.off('data-updated');
});
</script>

<template>
    <div class="game-container">
        <PhaserGame ref="phaserRef" />

        <!-- Level Intro -->
        <div v-if="showLevelIntro" class="modal-overlay level-intro-overlay" @click="startLevel">
            <div class="intro-content">
                <h1 class="level-title">{{ levelIntroData.isBoss ? '⚔️ BOSS 战' : '第 ' + levelIntroData.level + ' 关' }}</h1>
                <p class="rule-intro">{{ levelIntroData.ruleText }}</p>
                <button class="start-btn">点击开始</button>
            </div>
        </div>

        <!-- Round Transition -->
        <div v-if="showRoundTransition" class="modal-overlay transition-overlay" @click="continueNextRound">
            <div class="transition-content">
                <h2 class="round-text">回合 {{ roundTransitionData.round }}/{{ roundTransitionData.total }}</h2>
                <p class="continue-hint">点击继续</p>
            </div>
        </div>

        <!-- Perk Selection -->
        <div v-if="showPerks" class="modal-overlay">
            <div class="modal-content perks-modal">
                <h2>命运的抉择</h2>
                <p>击败 Boss 奖励：选择一项强化</p>
                <div class="perk-list">
                    <div v-for="perk in randomPerks" :key="perk.id" class="perk-card" @click="selectPerk(perk.id)">
                        <div class="perk-icon">{{ perk.icon }}</div>
                        <h3>{{ perk.title }}</h3>
                        <p>{{ perk.desc }}</p>
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
    flex-direction: column;
    background-color: #0b0014;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Modal Styles */
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

/* Level Intro */
.level-intro-overlay {
    cursor: pointer;
}

.intro-content {
    text-align: center;
    animation: fadeInScale 0.5s ease;
}

.level-title {
    font-size: 4rem;
    margin: 0 0 30px 0;
    color: #f1c40f;
    text-shadow: 0 0 20px rgba(241, 196, 15, 0.8);
}

.rule-intro {
    font-size: 1.8rem;
    color: #ecf0f1;
    margin-bottom: 50px;
    max-width: 600px;
}

.start-btn {
    padding: 15px 50px;
    font-size: 1.5rem;
    font-weight: bold;
    background: linear-gradient(135deg, #f1c40f, #f39c12);
    border: none;
    border-radius: 30px;
    color: #2c3e50;
    cursor: pointer;
    transition: all 0.3s;
    animation: pulse 2s infinite;
}

.start-btn:hover {
    transform: scale(1.1);
    box-shadow: 0 0 30px rgba(241, 196, 15, 0.8);
}

/* Round Transition */
.transition-overlay {
    cursor: pointer;
    background: rgba(0, 0, 0, 0.7);
}

.transition-content {
    text-align: center;
    animation: fadeInScale 0.3s ease;
}

.round-text {
    font-size: 3rem;
    margin: 0 0 20px 0;
    color: #3498db;
    text-shadow: 0 0 15px rgba(52, 152, 219, 0.8);
}

.continue-hint {
    font-size: 1.2rem;
    color: #bdc3c7;
    opacity: 0.8;
}

@keyframes fadeInScale {
    from {
        opacity: 0;
        transform: scale(0.8);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

@keyframes pulse {
    0%, 100% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.05);
    }
}
</style>
