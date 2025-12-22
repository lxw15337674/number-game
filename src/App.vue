<script setup lang="ts">
import Phaser from 'phaser';
import { ref, onMounted, onUnmounted } from 'vue';
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

// Modals
const showPerks = ref(false);
const showGameOver = ref(false);
const showShop = ref(false);
const finalCoins = ref(0);
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
        // Visual feedback could be added here
    } else {
        alert('金币不足或已满级');
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
        
        // Dynamic max time estimation for progress bar
        if (data.time > maxTime.value) maxTime.value = data.time;
    });

    EventBus.on('update-rule', (rule: string) => {
        currentRuleText.value = rule;
    });

    EventBus.on('show-perks', () => {
        // Pick 3 random perks
        randomPerks.value = perks.sort(() => 0.5 - Math.random()).slice(0, 3);
        showPerks.value = true;
    });

    EventBus.on('game-over', (data: any) => {
        reachedLevel.value = data.level;
        // Estimate earned logic or sync from GameData if needed
        finalCoins.value = 0; // Just placeholder, actual balance is in HUD
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
    <div class="game-container" :class="{ 'fever-active': isFever }">
        <!-- HUD -->
        <div class="hud">
            <div class="stats-left">
                <div class="level-info">第 {{ currentLevel }} 关</div>
                <div class="boss-hp" v-if="bossHP !== null">
                    BOSS HP: 
                    <span v-for="i in 3" :key="i" class="hp-dot" :class="{ active: i <= bossHP }"></span>
                </div>
            </div>

            <div class="rule-display">{{ currentRuleText }}</div>

            <div class="stats-right">
                <div class="coin-display">🪙 {{ userCoins }}</div>
                <div class="bar-container time-bar">
                    <div class="bar-fill" :style="{ width: (globalTime / maxTime * 100) + '%' }"></div>
                    <span class="bar-text">时间: {{ Math.ceil(globalTime) }}s</span>
                </div>
                <div class="bar-container energy-bar">
                    <div class="bar-fill" :style="{ width: energy + '%' }"></div>
                    <span class="bar-text">能量: {{ Math.floor(energy) }}%</span>
                </div>
            </div>
        </div>

        <PhaserGame ref="phaserRef" />

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
        </div>

        <!-- Game Over -->
        <div v-if="showGameOver" class="modal-overlay">
            <div class="modal-content result-modal">
                <h2 class="death-title">挑战结束</h2>
                <div class="result-stats">
                    <p>到达关卡: <strong>{{ reachedLevel }}</strong></p>
                    <p>当前金币: <span class="coin-text">🪙 {{ userCoins }}</span></p>
                </div>
                <div class="action-buttons">
                    <button class="menu-btn" @click="restartGame">再次挑战</button>
                    <button class="shop-btn" @click="openShop">强化中心</button>
                </div>
            </div>
        </div>

        <!-- Shop Modal -->
        <div v-if="showShop" class="modal-overlay">
            <div class="modal-content shop-modal">
                <h2>强化中心</h2>
                <div class="coin-header">🪙 {{ userCoins }}</div>
                
                <div class="upgrade-list">
                    <div class="upgrade-item">
                        <div class="up-info">
                            <h3>⏳ 时间沙漏</h3>
                            <p>初始时间: {{ upgradeInfo.maxTime.val }}s</p>
                        </div>
                        <button class="buy-btn" @click="buyUpgrade('maxTimeLevel')">
                            LV {{ upgradeInfo.maxTime.level }} <br>
                            💰 {{ upgradeInfo.maxTime.cost === -1 ? 'MAX' : upgradeInfo.maxTime.cost }}
                        </button>
                    </div>

                    <div class="upgrade-item">
                        <div class="up-info">
                            <h3>💰 招财猫</h3>
                            <p>金币倍率: x{{ upgradeInfo.coinGain.val.toFixed(1) }}</p>
                        </div>
                        <button class="buy-btn" @click="buyUpgrade('coinGainLevel')">
                            LV {{ upgradeInfo.coinGain.level }} <br>
                            💰 {{ upgradeInfo.coinGain.cost === -1 ? 'MAX' : upgradeInfo.coinGain.cost }}
                        </button>
                    </div>

                    <div class="upgrade-item">
                        <div class="up-info">
                            <h3>🛡️ 冷静思维</h3>
                            <p>错误惩罚: -{{ upgradeInfo.penalty.val }}s</p>
                        </div>
                        <button class="buy-btn" @click="buyUpgrade('penaltyLevel')">
                            LV {{ upgradeInfo.penalty.level }} <br>
                            💰 {{ upgradeInfo.penalty.cost === -1 ? 'MAX' : upgradeInfo.penalty.cost }}
                        </button>
                    </div>
                </div>

                <button class="close-btn" @click="closeShop">开始挑战</button>
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
    background-color: #0b0014;
    transition: box-shadow 0.3s;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.game-container.fever-active {
    box-shadow: inset 0 0 100px #f1c40f;
}

.hud {
    position: absolute;
    top: 0;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 15px 30px;
    background: linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 100%);
    z-index: 10;
    box-sizing: border-box;
    pointer-events: none;
}

.rule-display {
    font-size: 2rem;
    font-weight: bold;
    color: #f1c40f;
    text-shadow: 0 0 10px rgba(241, 196, 15, 0.8);
    margin-top: 10px;
    text-align: center;
}

.stats-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.coin-display {
    font-size: 1.5rem;
    color: #f1c40f;
    margin-bottom: 5px;
    font-weight: bold;
    text-shadow: 1px 1px 2px black;
}

.bar-container {
    width: 220px;
    height: 28px;
    background: rgba(0,0,0,0.6);
    border-radius: 14px;
    margin-bottom: 8px;
    position: relative;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.2);
}

.bar-fill {
    height: 100%;
    transition: width 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.time-bar .bar-fill { background: linear-gradient(90deg, #e74c3c, #c0392b); }
.energy-bar .bar-fill { background: linear-gradient(90deg, #3498db, #2980b9); }

.bar-text {
    position: absolute;
    width: 100%;
    text-align: center;
    font-size: 1rem;
    line-height: 28px;
    color: white;
    font-weight: bold;
    text-shadow: 1px 1px 2px black;
}

.boss-hp {
    margin-top: 5px;
    font-size: 1rem;
    color: #ff4757;
    font-weight: bold;
}

.hp-dot {
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #333;
    margin-left: 5px;
    border: 2px solid #ff4757;
}

.hp-dot.active {
    background: #ff4757;
    box-shadow: 0 0 10px #ff4757;
}

/* Modal Styles */
.modal-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(5px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
    pointer-events: auto;
}

.modal-content {
    background: #1e272e;
    color: white;
    padding: 40px;
    border-radius: 20px;
    text-align: center;
    border: 1px solid #485460;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    max-width: 600px;
    width: 90%;
}

.perk-list {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 20px;
    margin-top: 30px;
}

.perk-card {
    background: #2f3640;
    padding: 20px;
    border-radius: 15px;
    width: 150px;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
}

.perk-card:hover {
    transform: translateY(-5px);
    background: #353b48;
    border-color: #fbc531;
}

.upgrade-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin: 30px 0;
}

.upgrade-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #2f3640;
    padding: 15px 25px;
    border-radius: 10px;
}

.up-info { text-align: left; }
.up-info h3 { margin: 0 0 5px 0; color: #00d2ff; }
.up-info p { margin: 0; color: #bdc3c7; font-size: 0.9rem; }

.buy-btn {
    background: #44bd32;
    border: none;
    color: white;
    padding: 8px 15px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    min-width: 80px;
}
.buy-btn:hover { background: #4cd137; }

.menu-btn, .shop-btn, .close-btn {
    padding: 12px 30px;
    margin: 10px;
    border-radius: 25px;
    border: none;
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.1s;
}
.menu-btn:active, .shop-btn:active { transform: scale(0.95); }

.menu-btn { background: #00a8ff; color: white; }
.shop-btn { background: #fbc531; color: #2f3640; }
.close-btn { background: #e84118; color: white; width: 100%; margin: 0; margin-top: 10px; }

</style>