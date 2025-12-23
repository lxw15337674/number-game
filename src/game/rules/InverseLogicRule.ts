/**
 * 规则 5: 逆向思维 (Inverse Logic)
 * - 普通模式：找出第二大/第二小的数字
 * - Boss模式：依次找出第2、第3、第4大/小的数字
 */

import { RuleBase, ChallengeData } from './RuleBase';
import { RoundConfig, RuleType } from '../data/LevelManager';

export class InverseLogicRule extends RuleBase {
    readonly type: RuleType = 'inverse_logic';
    
    generateChallenge(config: RoundConfig, hideWrongCount: number = 0): ChallengeData {
        const { gridSize, valueRange } = config;
        const totalCells = gridSize.rows * gridSize.cols;
        
        // 生成随机数字
        const items = this.generateRandomNumbers(totalCells, valueRange.min, valueRange.max, false);
        
        // 随机选择第二大或第二小
        const findLargest = this.randomBool();
        
        // 找到第二大/第二小的索引
        const correctIndex = findLargest
            ? this.findNthLargestIndex(items, 2)
            : this.findNthSmallestIndex(items, 2);
        
        const ruleText = findLargest ? '找出第 2 大的数字' : '找出第 2 小的数字';
        
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
        
        // Boss: 第2、第3、第4大
        const rank = stage + 1;  // stage 1->2, 2->3, 3->4
        const findLargest = this.randomBool();
        
        const correctIndex = findLargest
            ? this.findNthLargestIndex(items, rank)
            : this.findNthSmallestIndex(items, rank);
        
        const ruleText = findLargest
            ? `🔥 Boss: 找出第 ${rank} 大的数字！`
            : `🔥 Boss: 找出第 ${rank} 小的数字！`;
        
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
