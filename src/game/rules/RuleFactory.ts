/**
 * 规则工厂 - 管理所有规则类型的创建
 */

import { RuleBase, ChallengeData } from './RuleBase';
import { FindNumberRule } from './FindNumberRule';
import { MathChallengeRule } from './MathChallengeRule';
import { MemoryTestRule } from './MemoryTestRule';
import { SequenceOrderRule } from './SequenceOrderRule';
import { InverseLogicRule } from './InverseLogicRule';
import { RuleType, RoundConfig } from '../data/LevelManager';

export class RuleFactory {
    private static rules: Map<RuleType, RuleBase> = new Map([
        ['find_number', new FindNumberRule()],
        ['math_challenge', new MathChallengeRule()],
        ['memory_test', new MemoryTestRule()],
        ['sequence_order', new SequenceOrderRule()],
        ['inverse_logic', new InverseLogicRule()]
    ]);
    
    /**
     * 根据规则类型获取规则实例
     */
    public static getRule(ruleType: RuleType): RuleBase {
        const rule = this.rules.get(ruleType);
        if (!rule) {
            throw new Error(`Unknown rule type: ${ruleType}`);
        }
        return rule;
    }
    
    /**
     * 生成挑战数据
     */
    public static generateChallenge(config: RoundConfig, hideWrongCount: number = 0): ChallengeData {
        const rule = this.getRule(config.ruleType);
        
        if (config.isBoss && config.bossStage) {
            return rule.generateBossChallenge(config, config.bossStage);
        } else {
            return rule.generateChallenge(config, hideWrongCount);
        }
    }
    
    /**
     * 检查答案
     */
    public static checkAnswer(ruleType: RuleType, userInput: any, challenge: ChallengeData): boolean {
        const rule = this.getRule(ruleType);
        return rule.checkAnswer(userInput, challenge);
    }
}
