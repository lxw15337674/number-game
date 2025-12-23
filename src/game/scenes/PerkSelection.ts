import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import { PerkManager, PerkType, PerkConfig } from '../data/PerkManager';

/**
 * Perk选择场景
 * Boss关卡后显示，玩家从3个选项中选择1个
 */
export class PerkSelection extends Scene {
    private perkManager: PerkManager;
    private perkOptions: PerkConfig[] = [];
    private selectedPerk: PerkType | null = null;
    
    constructor() {
        super('PerkSelection');
    }
    
    init(data: { fromLevel: number }) {
        // 可以根据关卡数调整Perk选项
    }
    
    create() {
        this.perkManager = PerkManager.getInstance();
        
        const { width, height } = this.scale;
        
        // 半透明背景
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.9);
        
        // 标题
        const title = this.add.text(width / 2, 100, '🎁 选择你的强化！', {
            fontSize: '48px',
            color: '#ffaa00',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // 获取3个随机Perk选项
        this.perkOptions = this.perkManager.generatePerkOptions(3);
        
        // 显示3个选项卡片
        this.createPerkCards();
        
        EventBus.emit('current-scene-ready', this);
    }
    
    /**
     * 创建Perk选择卡片
     */
    private createPerkCards() {
        const { width, height } = this.scale;
        const cardWidth = 250;
        const cardHeight = 300;
        const spacing = 30;
        const startX = (width - (cardWidth * 3 + spacing * 2)) / 2;
        const startY = height / 2 - 50;
        
        this.perkOptions.forEach((perk, index) => {
            const x = startX + index * (cardWidth + spacing);
            this.createPerkCard(x, startY, cardWidth, cardHeight, perk, index);
        });
    }
    
    /**
     * 创建单个Perk卡片
     */
    private createPerkCard(
        x: number,
        y: number,
        width: number,
        height: number,
        perk: PerkConfig,
        index: number
    ) {
        const container = this.add.container(x, y);
        
        // 卡片背景
        const bg = this.add.rectangle(0, 0, width, height, perk.isPermanent ? 0x2a2a4e : 0x4e2a2a)
            .setStrokeStyle(3, perk.isPermanent ? 0xffaa00 : 0xff6666)
            .setInteractive({ useHandCursor: true })
            .setOrigin(0);
        
        // 标签（永久/临时）
        const label = perk.isPermanent ? '⭐ 永久' : '⚡ 临时';
        const labelText = this.add.text(width / 2, 30, label, {
            fontSize: '18px',
            color: perk.isPermanent ? '#ffaa00' : '#ff6666',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Perk名称
        const nameText = this.add.text(width / 2, 80, perk.name, {
            fontSize: '28px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // Perk描述
        const descText = this.add.text(width / 2, height / 2, perk.description, {
            fontSize: '16px',
            color: '#cccccc',
            align: 'center',
            wordWrap: { width: width - 40 }
        }).setOrigin(0.5);
        
        // 选择按钮
        const buttonBg = this.add.rectangle(width / 2, height - 40, width - 40, 50, 0x00aa00)
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5);
        
        const buttonText = this.add.text(width / 2, height - 40, '选择', {
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // 添加到容器
        container.add([bg, labelText, nameText, descText, buttonBg, buttonText]);
        
        // 悬停效果
        bg.on('pointerover', () => {
            bg.setFillStyle(perk.isPermanent ? 0x3a3a6e : 0x6e3a3a);
            this.tweens.add({
                targets: container,
                scale: 1.05,
                duration: 200
            });
        });
        
        bg.on('pointerout', () => {
            bg.setFillStyle(perk.isPermanent ? 0x2a2a4e : 0x4e2a2a);
            this.tweens.add({
                targets: container,
                scale: 1,
                duration: 200
            });
        });
        
        // 点击选择
        const selectPerk = () => {
            this.selectedPerk = perk.type;
            this.applySelectedPerk(perk);
        };
        
        buttonBg.on('pointerdown', selectPerk);
        buttonText.on('pointerdown', selectPerk);
        bg.on('pointerdown', selectPerk);
    }
    
    /**
     * 应用选择的Perk
     */
    private applySelectedPerk(perk: PerkConfig) {
        // 应用Perk
        this.perkManager.applyPerk(perk.type);
        
        // 显示确认动画
        this.showConfirmation(perk);
        
        // 延迟后返回游戏
        this.time.delayedCall(1500, () => {
            // 返回Game场景并继续下一关
            EventBus.emit('perk-selected', { perk });
            this.scene.stop();
            this.scene.resume('Game');
        });
    }
    
    /**
     * 显示确认动画
     */
    private showConfirmation(perk: PerkConfig) {
        const { width, height } = this.scale;
        
        // 闪光效果
        this.cameras.main.flash(300, 255, 215, 0);
        
        // 确认文本
        const confirmText = this.add.text(width / 2, height - 100, `✓ 获得：${perk.name}`, {
            fontSize: '36px',
            color: '#00ff00',
            fontStyle: 'bold'
        }).setOrigin(0.5).setAlpha(0).setDepth(1000);
        
        this.tweens.add({
            targets: confirmText,
            alpha: 1,
            scale: { from: 0.5, to: 1.2 },
            duration: 500,
            yoyo: true
        });
    }
}
