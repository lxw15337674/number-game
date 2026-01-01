/**
 * 规则 1: 找数字 (Find Number)
 * - 普通模式：找出最大/最小的数字
 * - Boss模式：按顺序找出前N大/小的数字
 */

import { RuleBase, ChallengeData } from './RuleBase';
import { RoundConfig, RuleType } from '../data/LevelManager';

export class FindNumberRule extends RuleBase {
    readonly type: RuleType = 'find_number';
    
    generateChallenge(config: RoundConfig, hideWrongCount: number = 0): ChallengeData {
        const { gridSize, valueRange } = config;
        const totalCells = gridSize.rows * gridSize.cols;
        
        // 生成随机数字
        const items = this.generateRandomNumbers(totalCells, valueRange.min, valueRange.max, false);
        
        // 随机选择找最大或最小
        const findMax = this.randomBool();
        
        // 找到正确答案的索引
        const correctIndex = findMax 
            ? this.findNthLargestIndex(items, 1)
            : this.findNthSmallestIndex(items, 1);
        
        const ruleText = findMax ? '找出最大的数字' : '找出最小的数字';
        
        return {
            items,
            correctIndices: [correctIndex],
            ruleText
        };
    }
    
    generateBossChallenge(config: RoundConfig, stage: number): ChallengeData {
        const { gridSize, valueRange } = config;
        const totalCells = gridSize.rows * gridSize.cols;
        
        // 生成随机数字
        const items = this.generateRandomNumbers(totalCells, valueRange.min, valueRange.max, false);
        
        // Boss需要按顺序找出前3大（或前3小）
        const findMax = this.randomBool();
        
        // 找到第stage大/小的数字
        const correctIndex = findMax
            ? this.findNthLargestIndex(items, stage)
            : this.findNthSmallestIndex(items, stage);
        
        const ruleText = findMax
            ? `🔥 Boss: 找出第 ${stage} 大的数字！`
            : `🔥 Boss: 找出第 ${stage} 小的数字！`;
        
        return {
            items,
            correctIndices: [correctIndex],
            ruleText
        };
    }
    
    checkAnswer(userInput: number, challenge: ChallengeData): boolean {
        return challenge.correctIndices.includes(userInput);
    }
}
