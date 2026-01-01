/**
 * 临时规则生成器（简化版）
 * Phase 2 将替换为完整的规则系统
 */

import { RoundConfig } from '../data/LevelManager';

export interface ChallengeData {
    items: number[];            // 网格中的数字
    correctIndex: number;       // 正确答案的索引
    targetValue?: number;       // 目标值（用于某些规则）
    ruleText: string;          // 规则描述
}

/**
 * 临时规则生成器 - 只实现最基础的"找最大数"
 */
export class TempRuleGenerator {
    
    public static generateChallenge(config: RoundConfig): ChallengeData {
        const { gridSize, ruleType, isBoss, bossStage, valueRange } = config;
        const totalCells = gridSize.rows * gridSize.cols;
        
        // 目前只实现find_number规则
        if (ruleType === 'find_number') {
            return this.generateFindNumberChallenge(totalCells, valueRange, isBoss, bossStage);
        }
        
        // 其他规则暂时返回简单的找最大数
        return this.generateFindNumberChallenge(totalCells, valueRange, false);
    }
    
    private static generateFindNumberChallenge(
        count: number, 
        valueRange: { min: number; max: number },
        isBoss: boolean,
        bossStage?: number
    ): ChallengeData {
        // 生成随机数字数组
        const items: number[] = [];
        for (let i = 0; i < count; i++) {
            const num = Math.floor(Math.random() * (valueRange.max - valueRange.min + 1)) + valueRange.min;
            items.push(num);
        }
        
        // 找最大值的索引
        let maxIndex = 0;
        let maxValue = items[0];
        for (let i = 1; i < items.length; i++) {
            if (items[i] > maxValue) {
                maxValue = items[i];
                maxIndex = i;
            }
        }
        
        let ruleText = '找出最大的数字';
        if (isBoss && bossStage) {
            ruleText = `Boss ${bossStage}/3: 找出最大的数字！`;
        }
        
        return {
            items,
            correctIndex: maxIndex,
            ruleText
        };
    }
}
