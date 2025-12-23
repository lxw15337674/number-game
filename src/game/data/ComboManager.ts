import { EventBus } from '../EventBus';

/**
 * 连击系统管理器
 * 负责管理连击计数、倍数计算和里程碑事件
 */
export class ComboManager {
    private static instance: ComboManager;
    
    private currentCombo: number = 0;
    private maxCombo: number = 0;
    
    // 连击阈值配置
    private readonly COMBO_THRESHOLDS = {
        LEVEL_1: 10,   // 第一档
        LEVEL_2: 20,   // 第二档
        LEVEL_3: 30,   // 第三档
        LEVEL_4: 50    // 第四档
    };

    private constructor() {}

    public static getInstance(): ComboManager {
        if (!ComboManager.instance) {
            ComboManager.instance = new ComboManager();
        }
        return ComboManager.instance;
    }

    /**
     * 增加连击数
     */
    public addCombo(): void {
        this.currentCombo++;
        
        if (this.currentCombo > this.maxCombo) {
            this.maxCombo = this.currentCombo;
        }

        // 检查是否达到里程碑
        this.checkMilestone();

        EventBus.emit('combo-updated', {
            combo: this.currentCombo,
            maxCombo: this.maxCombo,
            multiplier: this.getCoinMultiplier(),
            effectLevel: this.getEffectLevel()
        });
    }

    /**
     * 重置连击数
     */
    public resetCombo(): void {
        const wasCombo = this.currentCombo > 0;
        this.currentCombo = 0;
        
        if (wasCombo) {
            EventBus.emit('combo-broken', {
                maxCombo: this.maxCombo
            });
        }

        EventBus.emit('combo-updated', {
            combo: 0,
            maxCombo: this.maxCombo,
            multiplier: 1,
            effectLevel: 0
        });
    }

    /**
     * 获取当前连击数
     */
    public getCombo(): number {
        return this.currentCombo;
    }

    /**
     * 获取历史最高连击
     */
    public getMaxCombo(): number {
        return this.maxCombo;
    }

    /**
     * 重置最高连击记录（新游戏开始时）
     */
    public resetMaxCombo(): void {
        this.maxCombo = 0;
    }

    /**
     * 获取金币倍数（基于连击数）
     * 根据设计文档：10/20/30/50连击时增加金币获取
     */
    public getCoinMultiplier(): number {
        if (this.currentCombo >= this.COMBO_THRESHOLDS.LEVEL_4) {
            return 3.0; // 50+ 连击：3倍
        } else if (this.currentCombo >= this.COMBO_THRESHOLDS.LEVEL_3) {
            return 2.5; // 30+ 连击：2.5倍
        } else if (this.currentCombo >= this.COMBO_THRESHOLDS.LEVEL_2) {
            return 2.0; // 20+ 连击：2倍
        } else if (this.currentCombo >= this.COMBO_THRESHOLDS.LEVEL_1) {
            return 1.5; // 10+ 连击：1.5倍
        }
        return 1.0; // 无倍数
    }

    /**
     * 获取特效等级（用于视觉反馈）
     * 0: 无特效
     * 1: 小特效 (10+)
     * 2: 中特效 (20+)
     * 3: 大特效 (30+)
     * 4: 超级特效 (50+)
     */
    public getEffectLevel(): number {
        if (this.currentCombo >= this.COMBO_THRESHOLDS.LEVEL_4) return 4;
        if (this.currentCombo >= this.COMBO_THRESHOLDS.LEVEL_3) return 3;
        if (this.currentCombo >= this.COMBO_THRESHOLDS.LEVEL_2) return 2;
        if (this.currentCombo >= this.COMBO_THRESHOLDS.LEVEL_1) return 1;
        return 0;
    }

    /**
     * 检查连击里程碑
     */
    private checkMilestone(): void {
        const combo = this.currentCombo;
        
        // 只在恰好达到里程碑时触发
        if (combo === this.COMBO_THRESHOLDS.LEVEL_1 ||
            combo === this.COMBO_THRESHOLDS.LEVEL_2 ||
            combo === this.COMBO_THRESHOLDS.LEVEL_3 ||
            combo === this.COMBO_THRESHOLDS.LEVEL_4) {
            
            EventBus.emit('combo-milestone', {
                combo: combo,
                level: this.getEffectLevel(),
                multiplier: this.getCoinMultiplier()
            });
        }
    }

    /**
     * 获取连击状态信息（用于UI显示）
     */
    public getComboInfo() {
        return {
            current: this.currentCombo,
            max: this.maxCombo,
            multiplier: this.getCoinMultiplier(),
            effectLevel: this.getEffectLevel(),
            nextMilestone: this.getNextMilestone()
        };
    }

    /**
     * 获取下一个里程碑
     */
    private getNextMilestone(): number {
        const thresholds = [10, 20, 30, 50];
        for (const threshold of thresholds) {
            if (this.currentCombo < threshold) {
                return threshold;
            }
        }
        return 100; // 超过50后，下一个目标可以是100
    }

    /**
     * 完全重置（新游戏）
     */
    public reset(): void {
        this.currentCombo = 0;
        this.maxCombo = 0;
    }
}
