import { EventBus } from '../EventBus';

export interface UpgradeStats {
    maxTimeLevel: number;    // Upgrade for Initial Time
    coinGainLevel: number;   // Upgrade for Coin Multiplier
    penaltyLevel: number;    // Upgrade for reducing penalty
}

export interface Inventory {
    revive: number;
    headstart: number;
    emergency: number;
}

export interface UserSaveData {
    coins: number;
    maxReachedLevel: number; // Highest level ever reached (for leaderboards/unlocks)
    upgrades: UpgradeStats;
    inventory: Inventory;
}

const DEFAULT_SAVE: UserSaveData = {
    coins: 0,
    maxReachedLevel: 1,
    upgrades: {
        maxTimeLevel: 0,
        coinGainLevel: 0,
        penaltyLevel: 0
    },
    inventory: {
        revive: 0,
        headstart: 0,
        emergency: 0
    }
};

const SAVE_KEY = 'number_game_roguelite_v1';

export class GameDataManager {
    private static instance: GameDataManager;
    private data: UserSaveData;

    private constructor() {
        this.load();
    }

    public static getInstance(): GameDataManager {
        if (!GameDataManager.instance) {
            GameDataManager.instance = new GameDataManager();
        }
        return GameDataManager.instance;
    }

    // --- Core Persistence ---

    private load() {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
            try {
                this.data = { ...DEFAULT_SAVE, ...JSON.parse(raw) };
            } catch (e) {
                console.error('Failed to parse save data', e);
                this.data = { ...DEFAULT_SAVE };
            }
        } else {
            this.data = { ...DEFAULT_SAVE };
        }
    }

    public save() {
        localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
        EventBus.emit('data-updated', this.data);
    }

    // --- Getters ---

    public get coins(): number { return this.data.coins; }
    public get maxLevel(): number { return this.data.maxReachedLevel; }
    public get upgrades(): UpgradeStats { return this.data.upgrades; }
    public get inventory(): Inventory { return this.data.inventory; }

    // --- Actions ---

    public addCoins(amount: number) {
        this.data.coins += amount;
        this.save();
    }

    public spendCoins(amount: number): boolean {
        if (this.data.coins >= amount) {
            this.data.coins -= amount;
            this.save();
            return true;
        }
        return false;
    }

    public updateMaxLevel(level: number) {
        if (level > this.data.maxReachedLevel) {
            this.data.maxReachedLevel = level;
            this.save();
        }
    }

    // --- Upgrade System ---

    // Config for upgrade costs and effects
    public static readonly UPGRADE_CONFIG = {
        maxTime: { baseCost: 100, costScale: 1.5, baseValue: 60, step: 10, maxLevel: 10 },
        coinGain: { baseCost: 150, costScale: 2.0, baseValue: 1.0, step: 0.2, maxLevel: 5 },
        penalty: { baseCost: 200, costScale: 1.8, baseValue: 10, step: -1, maxLevel: 5 } // Reduces penalty from 10s down to 5s
    };

    public getUpgradeCost(type: keyof UpgradeStats): number {
        const level = this.data.upgrades[type];
        const config = type === 'maxTimeLevel' ? GameDataManager.UPGRADE_CONFIG.maxTime :
                       type === 'coinGainLevel' ? GameDataManager.UPGRADE_CONFIG.coinGain :
                       GameDataManager.UPGRADE_CONFIG.penalty;
        
        if (level >= config.maxLevel) return -1; // Maxed out
        
        return Math.floor(config.baseCost * Math.pow(config.costScale, level));
    }

    public buyUpgrade(type: keyof UpgradeStats): boolean {
        const cost = this.getUpgradeCost(type);
        if (cost === -1) return false;

        if (this.spendCoins(cost)) {
            this.data.upgrades[type]++;
            this.save();
            return true;
        }
        return false;
    }

    // --- Derived Stats (for Gameplay) ---

    public getInitialTime(): number {
        const lvl = this.data.upgrades.maxTimeLevel;
        return GameDataManager.UPGRADE_CONFIG.maxTime.baseValue + (lvl * GameDataManager.UPGRADE_CONFIG.maxTime.step);
    }

    public getCoinMultiplier(): number {
        const lvl = this.data.upgrades.coinGainLevel;
        return GameDataManager.UPGRADE_CONFIG.coinGain.baseValue + (lvl * GameDataManager.UPGRADE_CONFIG.coinGain.step);
    }

    public getPenaltyTime(): number {
        const lvl = this.data.upgrades.penaltyLevel;
        return GameDataManager.UPGRADE_CONFIG.penalty.baseValue + (lvl * GameDataManager.UPGRADE_CONFIG.penalty.step);
    }
}
