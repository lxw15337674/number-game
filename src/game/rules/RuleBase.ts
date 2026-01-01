/**
 * 规则生成器抽象基类
 * 所有规则类型都继承此类
 */

import { RoundConfig, RuleType } from '../data/LevelManager';

/**
 * 挑战数据接口
 */
export interface ChallengeData {
    items: (number | string)[];  // 网格中的内容（数字或算式）
    correctIndices: number[];    // 正确答案的索引（可能多个）
    targetValue?: number;        // 目标值
    ruleText: string;           // 规则描述文本
    memoryPhase?: boolean;       // 是否为记忆阶段
    sequenceMode?: boolean;      // 是否为排序模式
    requiredSequence?: number[]; // 需要的排序序列
}

/**
 * 规则生成器抽象类
 */
export abstract class RuleBase {
    abstract readonly type: RuleType;
    
    /**
     * 生成挑战数据
     * @param config 回合配置
     * @param hideWrongCount 需要隐藏的错误选项数量（Perk效果）
     */
    abstract generateChallenge(config: RoundConfig, hideWrongCount?: number): ChallengeData;
    
    /**
     * 检查答案是否正确
     * @param userInput 用户输入（点击的索引或序列）
     * @param challenge 挑战数据
     */
    abstract checkAnswer(userInput: any, challenge: ChallengeData): boolean;
    
    /**
     * 生成Boss挑战
     * @param config 回合配置
     * @param stage Boss阶段 (1-3)
     */
    abstract generateBossChallenge(config: RoundConfig, stage: number): ChallengeData;
    
    /**
     * 辅助方法：生成指定范围内的随机数数组
     */
    protected generateRandomNumbers(
        count: number,
        min: number,
        max: number,
        unique: boolean = false
    ): number[] {
        const numbers: number[] = [];
        const used = new Set<number>();
        
        for (let i = 0; i < count; i++) {
            let num: number;
            do {
                num = Math.floor(Math.random() * (max - min + 1)) + min;
            } while (unique && used.has(num) && used.size < (max - min + 1));
            
            numbers.push(num);
            if (unique) used.add(num);
        }
        
        return numbers;
    }
    
    /**
     * 辅助方法：找到数组中第N大的数的索引
     */
    protected findNthLargestIndex(numbers: number[], n: number): number {
        // 创建索引数组
        const indices = numbers.map((_, i) => i);
        
        // 按数值降序排序索引
        indices.sort((a, b) => numbers[b] - numbers[a]);
        
        // 返回第N大的索引（n从1开始）
        return indices[n - 1];
    }
    
    /**
     * 辅助方法：找到数组中第N小的数的索引
     */
    protected findNthSmallestIndex(numbers: number[], n: number): number {
        const indices = numbers.map((_, i) => i);
        indices.sort((a, b) => numbers[a] - numbers[b]);
        return indices[n - 1];
    }
    
    /**
     * 辅助方法：随机选择布尔值
     */
    protected randomBool(): boolean {
        return Math.random() < 0.5;
    }
}
