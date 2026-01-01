import { EventBus } from '../EventBus';

/**
 * Perk类型枚举
 */
export enum PerkType {
    // 永久升级 (Permanent Upgrades)
    GREEDY_HAND = 'greedy_hand',           // 贪婪之手：金币奖励 +%
    TIME_MASTER = 'time_master',           // 时间大师：初始时间 +秒
    SHIELD = 'shield',                     // 护盾：每关抵挡一次错误
    PERFECT_REWARD = 'perfect_reward',     // 完美奖励：无错关卡 +时间
    WINNING_STREAK = 'winning_streak',     // 连胜加成：无错关卡 +金币
    VISUAL_AID = 'visual_aid',             // 视觉辅助：隐藏错误选项
    
    // 临时强化 (Temporary Perks)
    TEMP_TIME_BONUS = 'temp_time_bonus',   // 连续三关无错 +时间
    TEMP_COIN_BONUS = 'temp_coin_bonus',   // 连续三关无错 +金币
    TEMP_SHIELD = 'temp_shield',           // 抵挡N次错误
    TEMP_HIDE_WRONG = 'temp_hide_wrong',   // 下一关隐藏错误选项
    TEMP_COINS = 'temp_coins'              // 直接给金币
}

/**
 * Perk配置接口
 */
export interface PerkConfig {
    type: PerkType;
    name: string;
    description: string;
    isPermanent: boolean;
    value?: number;  // 具体数值（可配置）
}

/**
 * 临时Perk状态
 */
interface TempPerkState {
    type: PerkType;
    remainingUses?: number;    // 剩余使用次数
    duration?: number;          // 持续关卡数
    activated: boolean;         // 是否已激活
}

/**
 * Perk系统管理器
 */
export class PerkManager {
    private static instance: PerkManager;
    
    // 永久Perks
    private permanentPerks: Set<PerkType> = new Set();
    
    // 临时Perks
    private temporaryPerks: Map<PerkType, TempPerkState> = new Map();
    
    // 状态追踪
    private perfectLevels: number = 0;      // 连续完美关卡数
    private shieldUsedThisLevel: boolean = false;
    
    // Perk配置
    private readonly PERK_CONFIGS: Map<PerkType, PerkConfig> = new Map([
        // 永久升级
        [PerkType.GREEDY_HAND, {
            type: PerkType.GREEDY_HAND,
            name: '贪婪之手',
            description: '关卡金币奖励 +50%',
            isPermanent: true,
            value: 50
        }],
        [PerkType.TIME_MASTER, {
            type: PerkType.TIME_MASTER,
            name: '时间大师',
            description: '初始时间 +15秒',
            isPermanent: true,
            value: 15
        }],
        [PerkType.SHIELD, {
            type: PerkType.SHIELD,
            name: '护盾',
            description: '每关抵挡一次错误点击的惩罚',
            isPermanent: true
        }],
        [PerkType.PERFECT_REWARD, {
            type: PerkType.PERFECT_REWARD,
            name: '完美奖励',
            description: '每关没有点击错误，额外 +5秒',
            isPermanent: true,
            value: 5
        }],
        [PerkType.WINNING_STREAK, {
            type: PerkType.WINNING_STREAK,
            name: '连胜加成',
            description: '每关没有点击错误，金币 +30%',
            isPermanent: true,
            value: 30
        }],
        [PerkType.VISUAL_AID, {
            type: PerkType.VISUAL_AID,
            name: '视觉辅助',
            description: '以后每关隐藏 2个错误选项',
            isPermanent: true,
            value: 2
        }],
        
        // 临时强化
        [PerkType.TEMP_TIME_BONUS, {
            type: PerkType.TEMP_TIME_BONUS,
            name: '时间加速',
            description: '连续三关无错，增加 +10秒',
            isPermanent: false,
            value: 10
        }],
        [PerkType.TEMP_COIN_BONUS, {
            type: PerkType.TEMP_COIN_BONUS,
            name: '黄金三连',
            description: '连续三关无错，金币 +100%',
            isPermanent: false,
            value: 100
        }],
        [PerkType.TEMP_SHIELD, {
            type: PerkType.TEMP_SHIELD,
            name: '临时护盾',
            description: '抵挡 3次错误点击惩罚',
            isPermanent: false,
            value: 3
        }],
        [PerkType.TEMP_HIDE_WRONG, {
            type: PerkType.TEMP_HIDE_WRONG,
            name: '透视眼',
            description: '下一关隐藏 3个错误选项',
            isPermanent: false,
            value: 3
        }],
        [PerkType.TEMP_COINS, {
            type: PerkType.TEMP_COINS,
            name: '意外之财',
            description: '立即获得 100金币',
            isPermanent: false,
            value: 100
        }]
    ]);

    private constructor() {}

    public static getInstance(): PerkManager {
        if (!PerkManager.instance) {
            PerkManager.instance = new PerkManager();
        }
        return PerkManager.instance;
    }

    /**
     * 应用Perk
     */
    public applyPerk(perkType: PerkType): void {
        const config = this.PERK_CONFIGS.get(perkType);
        if (!config) return;

        if (config.isPermanent) {
            this.permanentPerks.add(perkType);
        } else {
            this.applyTemporaryPerk(perkType, config);
        }

        EventBus.emit('perk-applied', { type: perkType, config });
    }

    /**
     * 应用临时Perk
     */
    private applyTemporaryPerk(perkType: PerkType, config: PerkConfig): void {
        switch (perkType) {
            case PerkType.TEMP_TIME_BONUS:
            case PerkType.TEMP_COIN_BONUS:
                // 需要连续三关无错才触发，先设置监听状态
                this.temporaryPerks.set(perkType, {
                    type: perkType,
                    duration: 3,
                    activated: false
                });
                break;
                
            case PerkType.TEMP_SHIELD:
                this.temporaryPerks.set(perkType, {
                    type: perkType,
                    remainingUses: config.value || 3,
                    activated: true
                });
                break;
                
            case PerkType.TEMP_HIDE_WRONG:
                this.temporaryPerks.set(perkType, {
                    type: perkType,
                    remainingUses: 1, // 下一关使用
                    activated: true
                });
                break;
                
            case PerkType.TEMP_COINS:
                // 立即生效
                EventBus.emit('add-coins', config.value || 100);
                break;
        }
    }

    /**
     * 检查是否拥有Perk
     */
    public hasPerk(perkType: PerkType): boolean {
        return this.permanentPerks.has(perkType) || this.temporaryPerks.has(perkType);
    }

    /**
     * 检查是否拥有激活的临时Perk
     */
    public hasActiveTempPerk(perkType: PerkType): boolean {
        const perk = this.temporaryPerks.get(perkType);
        return perk !== undefined && perk.activated;
    }

    /**
     * 获取时间加成（初始时间）
     */
    public getInitialTimeBonus(): number {
        if (this.permanentPerks.has(PerkType.TIME_MASTER)) {
            return this.PERK_CONFIGS.get(PerkType.TIME_MASTER)?.value || 15;
        }
        return 0;
    }

    /**
     * 获取金币倍数加成
     */
    public getCoinMultiplier(): number {
        let multiplier = 1.0;
        
        // 永久：贪婪之手
        if (this.permanentPerks.has(PerkType.GREEDY_HAND)) {
            multiplier += 0.5; // +50%
        }
        
        return multiplier;
    }

    /**
     * 检查护盾是否可用（永久或临时）
     */
    public canUseShield(): boolean {
        // 永久护盾：每关一次
        if (this.permanentPerks.has(PerkType.SHIELD) && !this.shieldUsedThisLevel) {
            return true;
        }
        
        // 临时护盾：检查剩余次数
        const tempShield = this.temporaryPerks.get(PerkType.TEMP_SHIELD);
        if (tempShield && tempShield.remainingUses && tempShield.remainingUses > 0) {
            return true;
        }
        
        return false;
    }

    /**
     * 使用护盾
     */
    public useShield(): boolean {
        // 优先使用临时护盾
        const tempShield = this.temporaryPerks.get(PerkType.TEMP_SHIELD);
        if (tempShield && tempShield.remainingUses && tempShield.remainingUses > 0) {
            tempShield.remainingUses--;
            if (tempShield.remainingUses <= 0) {
                this.temporaryPerks.delete(PerkType.TEMP_SHIELD);
            }
            EventBus.emit('shield-used', { type: 'temporary' });
            return true;
        }
        
        // 使用永久护盾
        if (this.permanentPerks.has(PerkType.SHIELD) && !this.shieldUsedThisLevel) {
            this.shieldUsedThisLevel = true;
            EventBus.emit('shield-used', { type: 'permanent' });
            return true;
        }
        
        return false;
    }

    /**
     * 获取隐藏错误选项数量
     */
    public getHideWrongCount(): number {
        let count = 0;
        
        // 永久：视觉辅助
        if (this.permanentPerks.has(PerkType.VISUAL_AID)) {
            count += this.PERK_CONFIGS.get(PerkType.VISUAL_AID)?.value || 2;
        }
        
        // 临时：透视眼
        const tempHide = this.temporaryPerks.get(PerkType.TEMP_HIDE_WRONG);
        if (tempHide && tempHide.remainingUses && tempHide.remainingUses > 0) {
            count += this.PERK_CONFIGS.get(PerkType.TEMP_HIDE_WRONG)?.value || 3;
            // 使用后减少次数
            tempHide.remainingUses--;
            if (tempHide.remainingUses <= 0) {
                this.temporaryPerks.delete(PerkType.TEMP_HIDE_WRONG);
            }
        }
        
        return count;
    }

    /**
     * 关卡结束时调用
     */
    public onLevelEnd(isPerfect: boolean): { timeBonus: number; coinBonus: number } {
        let timeBonus = 0;
        let coinBonus = 0;
        
        // 重置护盾使用标志
        this.shieldUsedThisLevel = false;
        
        if (isPerfect) {
            this.perfectLevels++;
            
            // 永久：完美奖励
            if (this.permanentPerks.has(PerkType.PERFECT_REWARD)) {
                timeBonus += this.PERK_CONFIGS.get(PerkType.PERFECT_REWARD)?.value || 5;
            }
            
            // 永久：连胜加成
            if (this.permanentPerks.has(PerkType.WINNING_STREAK)) {
                coinBonus += (this.PERK_CONFIGS.get(PerkType.WINNING_STREAK)?.value || 30) / 100;
            }
            
            // 临时：连续三关检查
            if (this.perfectLevels >= 3) {
                // 时间加成
                const tempTime = this.temporaryPerks.get(PerkType.TEMP_TIME_BONUS);
                if (tempTime && !tempTime.activated) {
                    timeBonus += this.PERK_CONFIGS.get(PerkType.TEMP_TIME_BONUS)?.value || 10;
                    this.temporaryPerks.delete(PerkType.TEMP_TIME_BONUS);
                }
                
                // 金币加成
                const tempCoin = this.temporaryPerks.get(PerkType.TEMP_COIN_BONUS);
                if (tempCoin && !tempCoin.activated) {
                    coinBonus += (this.PERK_CONFIGS.get(PerkType.TEMP_COIN_BONUS)?.value || 100) / 100;
                    this.temporaryPerks.delete(PerkType.TEMP_COIN_BONUS);
                }
            }
        } else {
            // 非完美，重置连续计数
            this.perfectLevels = 0;
        }
        
        return { timeBonus, coinBonus };
    }

    /**
     * 生成Perk选项（Boss后选择）
     */
    public generatePerkOptions(count: number = 3): PerkConfig[] {
        const allPerks = Array.from(this.PERK_CONFIGS.values());
        
        // 过滤已拥有的永久Perks
        const availablePerks = allPerks.filter(perk => {
            if (perk.isPermanent && this.permanentPerks.has(perk.type)) {
                return false;
            }
            return true;
        });
        
        // 随机选择
        const options: PerkConfig[] = [];
        const shuffled = [...availablePerks].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
            options.push(shuffled[i]);
        }
        
        return options;
    }

    /**
     * 获取所有激活的Perks
     */
    public getActivePerks(): { permanent: PerkConfig[]; temporary: PerkConfig[] } {
        const permanent: PerkConfig[] = [];
        const temporary: PerkConfig[] = [];
        
        this.permanentPerks.forEach(type => {
            const config = this.PERK_CONFIGS.get(type);
            if (config) permanent.push(config);
        });
        
        this.temporaryPerks.forEach((state, type) => {
            const config = this.PERK_CONFIGS.get(type);
            if (config) temporary.push(config);
        });
        
        return { permanent, temporary };
    }

    /**
     * 重置（新游戏）
     */
    public reset(): void {
        this.temporaryPerks.clear();
        this.perfectLevels = 0;
        this.shieldUsedThisLevel = false;
    }

    /**
     * 完全重置（包括永久Perks，用于测试）
     */
    public fullReset(): void {
        this.reset();
        this.permanentPerks.clear();
    }
}
