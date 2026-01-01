/**
 * 规则 3: 记忆挑战 (Memory Test)
 * - 普通模式：数字闪烁3秒后消失，凭记忆点击指定的3个数字
 * - Boss模式：记住5个数字
 */

import { RuleBase, ChallengeData } from './RuleBase';
import { RoundConfig, RuleType } from '../data/LevelManager';

export class MemoryTestRule extends RuleBase {
    readonly type: RuleType = 'memory_test';
    
    generateChallenge(config: RoundConfig, hideWrongCount: number = 0): ChallengeData {
        const { gridSize, valueRange } = config;
        const totalCells = gridSize.rows * gridSize.cols;
        
        // 生成随机数字
        const items = this.generateRandomNumbers(totalCells, valueRange.min, valueRange.max, true);
        
        // 随机选择3个需要记忆的数字
        const memoryCount = 3;
        const memoryIndices = this.selectRandomIndices(totalCells, memoryCount);
        
        const ruleText = `记住闪烁的 ${memoryCount} 个数字！`;
        
        return {
            items,
            correctIndices: memoryIndices,
            ruleText,
            memoryPhase: true  // 标记为记忆模式
        };
    }
    
    generateBossChallenge(config: RoundConfig, stage: number): ChallengeData {
        const { gridSize, valueRange } = config;
        const totalCells = gridSize.rows * gridSize.cols;
        
        // Boss模式：记住5个数字
        const items = this.generateRandomNumbers(totalCells, valueRange.min, valueRange.max, true);
        const memoryCount = 5;
        const memoryIndices = this.selectRandomIndices(totalCells, memoryCount);
        
        const ruleText = `🔥 Boss: 记住闪烁的 ${memoryCount} 个数字！`;
        
        return {
            items,
            correctIndices: memoryIndices,
            ruleText,
            memoryPhase: true
        };
    }
    
    checkAnswer(userInput: number[], challenge: ChallengeData): boolean {
        // 检查用户选择的所有数字是否都在正确列表中
        if (userInput.length !== challenge.correctIndices.length) {
            return false;
        }
        
        // 创建Set以忽略顺序
        const correctSet = new Set(challenge.correctIndices);
        const userSet = new Set(userInput);
        
        if (userSet.size !== correctSet.size) return false;
        
        for (const idx of userSet) {
            if (!correctSet.has(idx)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 随机选择N个不重复的索引
     */
    private selectRandomIndices(max: number, count: number): number[] {
        const indices: number[] = [];
        const available = Array.from({ length: max }, (_, i) => i);
        
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * available.length);
            indices.push(available[randomIndex]);
            available.splice(randomIndex, 1);
        }
        
        return indices;
    }
}
