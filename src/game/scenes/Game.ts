import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { LevelManager, LevelConfig, RoundConfig, ThemeConfig } from '../data/LevelManager';
import { ComboManager } from '../data/ComboManager';
import { PerkManager } from '../data/PerkManager';
import { GameDataManager } from '../data/GameData';
import { RuleFactory } from '../rules/RuleFactory';
import { ChallengeData } from '../rules/RuleBase';

/**
 * 游戏主场景（完全重写版）
 * 实现设计文档的核心机制：
 * - 3回合/关结构
 * - 全局倒计时
 * - 连击系统
 * - Perk系统集成
 */
export class Game extends Scene {
    // 管理器
    private comboManager: ComboManager;
    private perkManager: PerkManager;
    private dataManager: GameDataManager;
    
    // 关卡状态
    private currentLevel: number = 1;
    private currentRound: number = 1;
    private roundsCompleted: number = 0;
    private levelConfig: LevelConfig;
    private currentRoundConfig: RoundConfig;
    private currentChallenge: ChallengeData;
    
    // 时间系统
    private globalTime: number = 60;
    private isPlaying: boolean = false;
    
    // 本关统计
    private mistakesThisLevel: number = 0;
    private mistakesThisRound: number = 0;
    
    // UI对象
    private gridGroup: Phaser.GameObjects.Group;
    
    // 粒子效果
    private particleEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
    
    constructor() {
        super('Game');
    }
    
    create() {
        // 初始化管理器
        this.comboManager = ComboManager.getInstance();
        this.perkManager = PerkManager.getInstance();
        this.dataManager = GameDataManager.getInstance();
        
        // 重置状态
        this.comboManager.reset();
        this.perkManager.reset();
        
        // 初始化时间（应用Perk加成）
        const baseTime = 60;
        const timeBonus = this.perkManager.getInitialTimeBonus();
        this.globalTime = baseTime + timeBonus;
        
        // 初始化关卡
        this.currentLevel = 1;
        this.currentRound = 1;
        this.roundsCompleted = 0;
        this.mistakesThisLevel = 0;
        
        // 创建粒子系统
        this.particleEmitter = this.add.particles(0, 0, 'star', {
            lifespan: 800,
            speed: { min: 150, max: 350 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 1, end: 0 },
            gravityY: 200,
            emitting: false
        });
        this.particleEmitter.setDepth(50);
        
        // 监听Vue事件
        EventBus.on('restart-game', this.restartGame, this);
        EventBus.on('start-level', this.onStartLevel, this);
        EventBus.on('next-round', this.onNextRound, this);
        this.events.on('shutdown', this.shutdown, this);
        
        // 开始第一关
        this.startLevel(this.currentLevel);
        
        EventBus.emit('current-scene-ready', this);
    }
    
    update(time: number, delta: number) {
        if (!this.isPlaying) return;
        
        const dt = delta / 1000;
        
        // 全局倒计时
        this.globalTime -= dt;
        if (this.globalTime <= 0) {
            this.globalTime = 0;
            this.handleGameOver();
            return;
        }
        
        // 更新UI
        this.updateUI();
    }
    
    shutdown() {
        EventBus.off('restart-game', this.restartGame, this);
        EventBus.off('start-level', this.onStartLevel, this);
        EventBus.off('next-round', this.onNextRound, this);
    }
    
    /**
     * 更新UI显示
     */
    private updateUI() {
        // 发送HUD数据到Vue层
        const combo = this.comboManager.getCombo();
        const isFever = combo >= 30;

        EventBus.emit('update-hud', {
            time: this.globalTime,
            combo: combo,
            level: this.currentLevel,
            round: this.currentRound,
            isFever: isFever,
            bossHP: this.levelConfig.isBoss ? (3 - this.roundsCompleted) : null
        });
    }
    
    /**
     * 开始新关卡
     */
    private startLevel(level: number) {
        this.currentLevel = level;
        this.currentRound = 1;
        this.roundsCompleted = 0;
        this.mistakesThisLevel = 0;

        // 获取关卡配置
        this.levelConfig = LevelManager.getLevelConfig(level);

        // 应用主题
        this.applyTheme(this.levelConfig.theme);

        // 显示关卡开始动画
        this.showLevelStart();
    }
    
    /**
     * 显示关卡开始 - 发送事件给Vue层
     */
    private showLevelStart() {
        this.isPlaying = false;
        
        // 生成规则文本
        const round1 = this.levelConfig.rounds[0];
        const ruleText = round1.ruleText;
        
        // 发送关卡介绍事件给Vue
        EventBus.emit('level-intro', {
            level: this.currentLevel,
            isBoss: this.levelConfig.isBoss,
            ruleText: ruleText
        });
        
        // Boss特效
        if (this.levelConfig.isBoss) {
            this.cameras.main.shake(300, 0.01);
        }
    }
    
    /**
     * Vue通知：用户点击开始关卡
     */
    private onStartLevel = () => {
        this.initRound(1);
    }
    
    /**
     * Vue通知：用户点击进入下一回合
     */
    private onNextRound = () => {
        this.initRound(this.currentRound);
    }
    
    /**
     * 初始化回合
     */
    private initRound(roundNumber: number) {
        this.currentRound = roundNumber;
        this.mistakesThisRound = 0;

        // 获取回合配置
        this.currentRoundConfig = this.levelConfig.rounds[roundNumber - 1];

        // 获取Perk隐藏选项数
        const hideWrongCount = this.perkManager.getHideWrongCount();

        // 使用规则工厂生成挑战
        this.currentChallenge = RuleFactory.generateChallenge(this.currentRoundConfig, hideWrongCount);

        // 发送规则文字到Vue层
        EventBus.emit('update-rule', this.currentChallenge.ruleText);

        // 构建网格
        this.buildGrid();

        // 开始游戏
        this.isPlaying = true;
    }
    
    /**
     * 构建网格
     */
    private buildGrid() {
        // 清除旧网格
        if (this.gridGroup) {
            this.gridGroup.clear(true, true);
        }
        
        this.gridGroup = this.add.group();
        
        const { rows, cols } = this.currentRoundConfig.gridSize;
        const { items, correctIndices } = this.currentChallenge;
        
        // 计算网格布局
        const cellSize = 80;
        const spacing = 10;
        const gridWidth = cols * (cellSize + spacing) - spacing;
        const gridHeight = rows * (cellSize + spacing) - spacing;
        
        const startX = (this.scale.width - gridWidth) / 2;
        const startY = (this.scale.height - gridHeight) / 2 + 50;
        
        // 创建网格单元
        let index = 0;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (index >= items.length) break;
                
                const x = startX + col * (cellSize + spacing);
                const y = startY + row * (cellSize + spacing);
                const value = items[index];
                const isCorrect = correctIndices.includes(index);
                
                this.createGridCell(x, y, cellSize, value, isCorrect, index);
                index++;
            }
        }
        
        // 确保网格可见
        this.gridGroup.setVisible(true);
    }
    
    /**
     * 创建网格单元
     */
    private createGridCell(
        x: number, 
        y: number, 
        size: number, 
        value: number | string, 
        isCorrect: boolean,
        index: number
    ) {
        // 背景
        const bg = this.add.rectangle(x, y, size, size, 0x1a1a2e)
            .setStrokeStyle(2, 0x16213e)
            .setInteractive({ useHandCursor: true })
            .setOrigin(0);
        
        // 文本（支持数字和字符串）
        const displayText = typeof value === 'string' ? value : value.toString();
        const fontSize = typeof value === 'string' ? '20px' : '28px';  // 算式用较小字体
        
        const text = this.add.text(x + size / 2, y + size / 2, displayText, {
            fontSize: fontSize,
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // 点击事件
        bg.on('pointerover', () => {
            bg.setFillStyle(0x2a2a4e);
        });
        
        bg.on('pointerout', () => {
            bg.setFillStyle(0x1a1a2e);
        });
        
        bg.on('pointerdown', () => {
            this.handleCellClick(isCorrect, index, bg, text);
        });
        
        this.gridGroup.add(bg);
        this.gridGroup.add(text);
    }
    
    /**
     * 处理单元格点击
     */
    private handleCellClick(
        isCorrect: boolean,
        cellIndex: number,
        bg: Phaser.GameObjects.Rectangle,
        text: Phaser.GameObjects.Text
    ) {
        if (!this.isPlaying) return;
        
        // 使用规则工厂检查答案（简化版，后续可扩展为支持序列模式）
        if (isCorrect) {
            this.handleCorrectAnswer(bg, text);
        } else {
            this.handleWrongAnswer(bg, text);
        }
    }
    
    /**
     * 处理正确答案
     */
    private handleCorrectAnswer(
        bg: Phaser.GameObjects.Rectangle,
        text: Phaser.GameObjects.Text
    ) {
        // 增加连击
        this.comboManager.addCombo();
        
        // 视觉反馈
        bg.setFillStyle(0x00ff00);
        this.playSuccessEffect(bg.x + bg.width / 2, bg.y + bg.height / 2);
        
        // 声音（如果有）
        // this.sound.play('success');
        
        // 暂停游戏
        this.isPlaying = false;
        
        // 延迟后进入下一回合
        this.time.delayedCall(500, () => {
            this.onRoundComplete();
        });
    }
    
    /**
     * 处理错误答案
     */
    private handleWrongAnswer(
        bg: Phaser.GameObjects.Rectangle,
        text: Phaser.GameObjects.Text
    ) {
        // 检查护盾
        if (this.perkManager.canUseShield()) {
            this.perkManager.useShield();
            // 显示护盾效果
            bg.setFillStyle(0xffaa00);
            this.cameras.main.flash(100, 255, 255, 0);
            return;
        }
        
        // 扣除时间
        this.globalTime -= 5;
        this.mistakesThisLevel++;
        this.mistakesThisRound++;
        
        // 重置连击
        this.comboManager.resetCombo();
        
        // 视觉反馈
        bg.setFillStyle(0xff0000);
        this.cameras.main.shake(200, 0.005);
        
        // 显示-5秒
        this.showTimeDecrement(bg.x + bg.width / 2, bg.y);
        
        // 恢复颜色
        this.time.delayedCall(300, () => {
            bg.setFillStyle(0x1a1a2e);
        });
    }
    
    /**
     * 回合完成
     */
    private onRoundComplete() {
        this.roundsCompleted++;
        
        if (this.roundsCompleted >= 3) {
            // 3回合完成，关卡完成
            this.onLevelComplete();
        } else {
            // 进入下一回合
            this.playRoundTransition(this.roundsCompleted + 1);
        }
    }
    
    /**
     * 播放回合过渡 - 发送事件给Vue层
     */
    private playRoundTransition(nextRound: number) {
        // 暂停游戏
        this.isPlaying = false;
        
        // 保存下一回合数
        this.currentRound = nextRound;
        
        // 发送回合过渡事件给Vue
        EventBus.emit('round-transition', {
            round: nextRound,
            total: 3
        });
    }
    
    /**
     * 关卡完成
     */
    private onLevelComplete() {
        this.isPlaying = false;
        
        // 时间奖励
        this.globalTime += this.levelConfig.bonusTime;
        
        // Perk奖励
        const isPerfect = this.mistakesThisLevel === 0;
        const perkRewards = this.perkManager.onLevelEnd(isPerfect);
        this.globalTime += perkRewards.timeBonus;
        
        // 显示完成动画
        this.showLevelComplete();
    }
    
    /**
     * 显示关卡完成动画
     */
    private showLevelComplete() {
        const { width, height } = this.scale;
        
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
            .setDepth(200);
        
        const text = this.add.text(width / 2, height / 2, '✓ 关卡完成!\n+10秒', {
            fontSize: '42px',
            color: '#00ff00',
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5).setDepth(201);
        
        // 特效
        this.cameras.main.flash(200, 0, 255, 0, false);
        
        // 延迟后进入下一关或Boss奖励
        this.time.delayedCall(1500, () => {
            overlay.destroy();
            text.destroy();
            
            if (this.levelConfig.isBoss) {
                // Boss关卡，显示Perk选择（Phase 3实现）
                this.showPerkSelection();
            } else {
                // 进入下一关
                this.startLevel(this.currentLevel + 1);
            }
        });
    }
    
    /**
     * 显示Perk选择
     */
    private showPerkSelection() {
        // 暂停当前场景
        this.scene.pause();
        
        // 启动Perk选择场景
        this.scene.launch('PerkSelection', { fromLevel: this.currentLevel });
        
        // 监听Perk选择完成
        EventBus.once('perk-selected', () => {
            // 继续下一关
            this.startLevel(this.currentLevel + 1);
        });
    }
    
    /**
     * 游戏结束
     */
    private handleGameOver() {
        this.isPlaying = false;

        // 发送游戏结束事件给 Vue 显示弹窗
        EventBus.emit('game-over', {
            level: this.currentLevel,
            maxCombo: this.comboManager.getMaxCombo(),
            timeLeft: 0
        });

        // 不切换场景，保持在 Game 场景等待重启
    }
    
    /**
     * 重新开始游戏
     */
    private restartGame() {
        this.scene.restart();
    }
    
    /**
     * 应用主题
     */
    private applyTheme(theme: ThemeConfig) {
        this.cameras.main.setBackgroundColor(theme.bgColor);
    }

    /**
     * 播放成功特效
     */
    private playSuccessEffect(x: number, y: number) {
        this.particleEmitter.setPosition(x, y);
        this.particleEmitter.explode(20);
    }
    
    /**
     * 显示时间减少动画
     */
    private showTimeDecrement(x: number, y: number) {
        const text = this.add.text(x, y, '-5秒', {
            fontSize: '32px',
            color: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(300);
        
        this.tweens.add({
            targets: text,
            y: y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => text.destroy()
        });
    }
}
