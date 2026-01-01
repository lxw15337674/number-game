/**
 * 规则 2: 算式挑战 (Math Challenge)
 * - 普通模式：找出计算结果等于目标值的算式
 * - Boss模式：连续3次找出不同的算式
 */

import { RuleBase, ChallengeData } from './RuleBase';
import { RoundConfig, RuleType } from '../data/LevelManager';

type Operator = '+' | '-' | '×' | '÷';

export class MathChallengeRule extends RuleBase {
    readonly type: RuleType = 'math_challenge';
    
    private readonly operators: Operator[] = ['+', '-', '×'];  // 暂不实现除法避免小数
    
    generateChallenge(config: RoundConfig, hideWrongCount: number = 0): ChallengeData {
        const { gridSize, valueRange } = config;
        const totalCells = gridSize.rows * gridSize.cols;
        
        // 生成目标值（较小的范围更容易）
        const targetValue = Math.floor(Math.random() * 50) + 10;
        
        // 生成一个正确的算式
        const correctEquation = this.generateCorrectEquation(targetValue, valueRange);
        
        // 生成其他错误的算式
        const items: string[] = [];
        let correctIndex = Math.floor(Math.random() * totalCells);
        
        for (let i = 0; i < totalCells; i++) {
            if (i === correctIndex) {
                items.push(correctEquation);
            } else {
                items.push(this.generateWrongEquation(targetValue, valueRange));
            }
        }
        
        const ruleText = `找出等于 ${targetValue} 的算式`;
        
        return {
            items,
            correctIndices: [correctIndex],
            targetValue,
            ruleText
        };
    }
    
    generateBossChallenge(config: RoundConfig, stage: number): ChallengeData {
        // Boss模式：目标值更大，算式更复杂
        const { gridSize, valueRange } = config;
        const totalCells = gridSize.rows * gridSize.cols;
        
        const targetValue = Math.floor(Math.random() * 100) + 20;
        const correctEquation = this.generateCorrectEquation(targetValue, valueRange);
        
        const items: string[] = [];
        let correctIndex = Math.floor(Math.random() * totalCells);
        
        for (let i = 0; i < totalCells; i++) {
            if (i === correctIndex) {
                items.push(correctEquation);
            } else {
                items.push(this.generateWrongEquation(targetValue, valueRange));
            }
        }
        
        const ruleText = `🔥 Boss ${stage}/3: 找出等于 ${targetValue} 的算式！`;
        
        return {
            items,
            correctIndices: [correctIndex],
            targetValue,
            ruleText
        };
    }
    
    checkAnswer(userInput: number, challenge: ChallengeData): boolean {
        return challenge.correctIndices.includes(userInput);
    }
    
    /**
     * 生成一个结果等于目标值的算式
     */
    private generateCorrectEquation(target: number, valueRange: { min: number; max: number }): string {
        const operator = this.operators[Math.floor(Math.random() * this.operators.length)];
        
        let a: number, b: number;
        
        switch (operator) {
            case '+':
                // a + b = target
                a = Math.floor(Math.random() * (target - 1)) + 1;
                b = target - a;
                break;
                
            case '-':
                // a - b = target
                b = Math.floor(Math.random() * (valueRange.max - target)) + 1;
                a = target + b;
                break;
                
            case '×':
                // a × b = target
                // 找target的因子
                const factors = this.findFactors(target);
                if (factors.length > 0) {
                    const pair = factors[Math.floor(Math.random() * factors.length)];
                    a = pair[0];
                    b = pair[1];
                } else {
                    // 如果是质数，退化为加法
                    a = Math.floor(Math.random() * (target - 1)) + 1;
                    b = target - a;
                    return `${a}+${b}`;
                }
                break;
                
            default:
                a = 1;
                b = target - 1;
        }
        
        return `${a}${operator}${b}`;
    }
    
    /**
     * 生成一个结果不等于目标值的算式
     */
    private generateWrongEquation(target: number, valueRange: { min: number; max: number }): string {
        const operator = this.operators[Math.floor(Math.random() * this.operators.length)];
        
        let a = Math.floor(Math.random() * 50) + 1;
        let b = Math.floor(Math.random() * 50) + 1;
        
        let result = 0;
        switch (operator) {
            case '+': result = a + b; break;
            case '-': result = a - b; break;
            case '×': result = a * b; break;
        }
        
        // 确保结果不等于目标值
        if (result === target) {
            b += 1;
        }
        
        return `${a}${operator}${b}`;
    }
    
    /**
     * 找出一个数的所有因子对
     */
    private findFactors(n: number): [number, number][] {
        const factors: [number, number][] = [];
        for (let i = 1; i <= Math.sqrt(n); i++) {
            if (n % i === 0) {
                factors.push([i, n / i]);
            }
        }
        return factors;
    }
}
