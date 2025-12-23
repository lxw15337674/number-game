/**
 * LevelManager - 关卡管理器（重写版）
 * 支持：
 * - 每关3个回合结构
 * - 5种规则类型
 * - Boss关卡（每5关）
 * - 主题切换
 */

export type RuleType = 'find_number' | 'math_challenge' | 'memory_test' | 'sequence_order' | 'inverse_logic';

/**
 * 主题配置
 */
export interface ThemeConfig {
    name: string;
    bgColor: number;
    textColor: string;
    accentColor: string;
}

/**
 * 回合配置
 */
export interface RoundConfig {
    roundNumber: number;        // 回合号 (1-3)
    gridSize: { rows: number; cols: number };
    ruleType: RuleType;
    isBoss: boolean;
    bossStage?: number;         // Boss阶段 (1-3)
    valueRange: { min: number; max: number };
}

/**
 * 关卡配置（包含3个回合）
 */
export interface LevelConfig {
    level: number;
    rounds: RoundConfig[];      // 3个回合配置
    isBoss: boolean;
    theme: ThemeConfig;
    bonusTime: number;          // 通关奖励时间
}

/**
 * 主题定义
 */
const THEMES: Record<string, ThemeConfig> = {
    CYBER: { 
        name: '赛博空间', 
        bgColor: 0x000b1e, 
        textColor: '#00d2ff', 
        accentColor: '#ff00ff' 
    },
    STEAM: { 
        name: '机械工厂', 
        bgColor: 0x2c1e14, 
        textColor: '#e67e22', 
        accentColor: '#f1c40f' 
    },
    MEMORY: { 
        name: '记忆迷宫', 
        bgColor: 0x2d0a3d, 
        textColor: '#e91e63', 
        accentColor: '#ff6ec7' 
    },
    ORDER: { 
        name: '排序工坊', 
        bgColor: 0x0d3d2d, 
        textColor: '#00ff9f', 
        accentColor: '#39cccc' 
    },
    VOID: { 
        name: '无尽虚空', 
        bgColor: 0x0b0014, 
        textColor: '#b10dc9', 
        accentColor: '#f012be' 
    }
};

export class LevelManager {
    
    /**
     * 获取关卡完整配置（包含3个回合）
     */
    public static getLevelConfig(level: number): LevelConfig {
        const isBoss = this.isBossLevel(level);
        const theme = this.getThemeForLevel(level);
        const ruleType = this.getRuleTypeForLevel(level);
        
        // 生成3个回合配置
        const rounds: RoundConfig[] = [];
        for (let roundNum = 1; roundNum <= 3; roundNum++) {
            rounds.push(this.generateRoundConfig(level, roundNum, ruleType, isBoss));
        }
        
        return {
            level,
            rounds,
            isBoss,
            theme,
            bonusTime: 10  // 每关完成奖励10秒
        };
    }

    /**
     * 生成单个回合配置
     */
    private static generateRoundConfig(
        level: number, 
        roundNumber: number, 
        ruleType: RuleType,
        isBoss: boolean
    ): RoundConfig {
        const gridSize = this.getGridSize(level);
        const valueRange = this.getValueRange(level);
        
        return {
            roundNumber,
            gridSize,
            ruleType,
            isBoss,
            bossStage: isBoss ? roundNumber : undefined,
            valueRange
        };
    }

    /**
     * 判断是否为Boss关卡
     */
    public static isBossLevel(level: number): boolean {
        return level % 5 === 0;
    }

    /**
     * 获取关卡主题
     */
    public static getThemeForLevel(level: number): ThemeConfig {
        if (level <= 5) return THEMES.CYBER;
        if (level <= 10) return THEMES.STEAM;
        if (level <= 15) return THEMES.MEMORY;
        if (level <= 20) return THEMES.ORDER;
        return THEMES.VOID;
    }

    /**
     * 获取关卡规则类型
     * 按设计文档：
     * L1-5: 找数字
     * L6-10: 算式挑战
     * L11-15: 记忆挑战
     * L16-20: 排序题
     * L21+: 随机混合
     */
    public static getRuleTypeForLevel(level: number): RuleType {
        if (level <= 5) {
            return 'find_number';
        } else if (level <= 10) {
            return 'math_challenge';
        } else if (level <= 15) {
            return 'memory_test';
        } else if (level <= 20) {
            return 'sequence_order';
        } else {
            // L21+ 随机混合所有规则
            const rules: RuleType[] = [
                'find_number',
                'math_challenge',
                'memory_test',
                'sequence_order',
                'inverse_logic'
            ];
            return rules[Math.floor(Math.random() * rules.length)];
        }
    }

    /**
     * 获取网格大小（根据难度）
     */
    private static getGridSize(level: number): { rows: number; cols: number } {
        if (level <= 3) {
            return { rows: 3, cols: 3 };  // 3x3 = 9
        } else if (level <= 6) {
            return { rows: 3, cols: 4 };  // 3x4 = 12
        } else if (level <= 10) {
            return { rows: 4, cols: 4 };  // 4x4 = 16
        } else if (level <= 15) {
            return { rows: 4, cols: 5 };  // 4x5 = 20
        } else if (level <= 20) {
            return { rows: 5, cols: 5 };  // 5x5 = 25
        } else if (level <= 30) {
            return { rows: 5, cols: 6 };  // 5x6 = 30
        } else {
            return { rows: 6, cols: 6 };  // 6x6 = 36
        }
    }

    /**
     * 获取数值范围（根据难度）
     */
    private static getValueRange(level: number): { min: number; max: number } {
        if (level <= 5) {
            return { min: 1, max: 50 };
        } else if (level <= 10) {
            return { min: 1, max: 99 };
        } else if (level <= 20) {
            return { min: 1, max: 199 };
        } else {
            return { min: 1, max: 999 };
        }
    }

    /**
     * 获取规则描述文本
     */
    public static getRuleText(ruleType: RuleType, isBoss: boolean = false, stage?: number): string {
        if (isBoss && stage) {
            return this.getBossRuleText(ruleType, stage);
        }
        
        switch (ruleType) {
            case 'find_number':
                return '找出最大的数字';
            case 'math_challenge':
                return '找出等于目标值的算式';
            case 'memory_test':
                return '记住闪烁的数字';
            case 'sequence_order':
                return '按从小到大依次点击';
            case 'inverse_logic':
                return '找出第二大的数字';
            default:
                return '完成挑战';
        }
    }

    /**
     * 获取Boss规则文本
     */
    private static getBossRuleText(ruleType: RuleType, stage: number): string {
        switch (ruleType) {
            case 'find_number':
                return `找出第 ${stage} 大的数字！`;
            case 'math_challenge':
                return `Boss挑战 ${stage}/3: 找出算式！`;
            case 'memory_test':
                return `Boss挑战: 记住 5 个数字！`;
            case 'sequence_order':
                return `Boss挑战: 排序 5 个数字！`;
            case 'inverse_logic':
                return `找出第 ${stage + 1} 大的数字！`;
            default:
                return `Boss 阶段 ${stage}/3`;
        }
    }

    /**
     * 获取所有可用的主题
     */
    public static getAllThemes(): ThemeConfig[] {
        return Object.values(THEMES);
    }

    /**
     * 获取所有规则类型
     */
    public static getAllRuleTypes(): RuleType[] {
        return [
            'find_number',
            'math_challenge',
            'memory_test',
            'sequence_order',
            'inverse_logic'
        ];
    }
}
