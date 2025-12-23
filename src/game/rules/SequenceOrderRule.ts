/**
 * 规则 4: 排序题 (Sequence Order)
 * - 普通模式：按从小到大依次点击3个数字
 * - Boss模式：按从小到大依次点击5个数字
 */

import { RuleBase, ChallengeData } from './RuleBase';
import { RoundConfig, RuleType } from '../data/LevelManager';

export class SequenceOrderRule extends RuleBase {
    readonly type: RuleType = 'sequence_order';
    
    generateChallenge(config: RoundConfig, hideWrongCount: number = 0): ChallengeData {
        const { gridSize, valueRange } = config;
        const totalCells = gridSize.rows * gridSize.cols;
        
        // 生成随机数字
        const items = this.generateRandomNumbers(totalCells, valueRange.min, valueRange.max, false);
        
        // 找出前3小的数字的索引（按顺序）
        const sortedIndices = this.getSortedIndices(items, 3, false);
        
        const ruleText = '按从小到大依次点击 3 个数';
        
        return {
            items,
            correctIndices: sortedIndices,
            ruleText,
            sequenceMode: true,
            requiredSequence: sortedIndices
        };
    }
    
    generateBossChallenge(config: RoundConfig, stage: number): ChallengeData {
        const { gridSize, valueRange } = config;
        const totalCells = gridSize.rows * gridSize.cols;
        
        // Boss模式：排序5个数字
        const items = this.generateRandomNumbers(totalCells, valueRange.min, valueRange.max, false);
        const sortedIndices = this.getSortedIndices(items, 5, false);
        
        const ruleText = '🔥 Boss: 按从小到大依次点击 5 个数！';
        
        return {
            items,
            correctIndices: sortedIndices,
            ruleText,
            sequenceMode: true,
            requiredSequence: sortedIndices
        };
    }
    
    checkAnswer(userInput: number[], challenge: ChallengeData): boolean {
        if (!challenge.requiredSequence) return false;
        
        // 检查用户点击顺序是否与要求的序列匹配
        if (userInput.length !== challenge.requiredSequence.length) {
            return false;
        }
        
        for (let i = 0; i < userInput.length; i++) {
            if (userInput[i] !== challenge.requiredSequence[i]) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 获取排序后的索引
     * @param numbers 数字数组
     * @param count 需要多少个
     * @param descending 是否降序
     */
    private getSortedIndices(numbers: number[], count: number, descending: boolean): number[] {
        // 创建带索引的数组
        const indexed = numbers.map((num, idx) => ({ num, idx }));
        
        // 排序
        indexed.sort((a, b) => descending ? b.num - a.num : a.num - b.num);
        
        // 返回前count个的索引
        return indexed.slice(0, count).map(item => item.idx);
    }
}
