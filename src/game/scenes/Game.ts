import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import Phaser from 'phaser';
import { GameDataManager } from '../data/GameData';
import { LevelManager, LevelConfig, ThemeConfig } from '../data/LevelManager';

export class Game extends Scene
{
    // Managers
    dataManager: GameDataManager;
    
    // Level State
    currentLevel: number = 1;
    levelConfig: LevelConfig;
    bossHP: number = 0; // For Boss Battles (3 stages)
    
    // Gameplay Stats (Time Relay)
    globalTime: number = 0;
    energy: number = 0;
    isFever: boolean = false;
    feverTimer: number = 0;
    isPlaying: boolean = false; // Controls input and timer

    // Objects
    gridGroup: Phaser.GameObjects.Group;
    readyGroup: Phaser.GameObjects.Group; // For the "Get Ready" text
    readyTimer: Phaser.Time.TimerEvent | null = null;
    particleEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
    
    // Perk modifiers
    perkTimeThief: boolean = false;
    perkEnergyMaster: boolean = false;
    perkShieldActive: boolean = false;
    usedShieldThisLevel: boolean = false;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.dataManager = GameDataManager.getInstance();
        
        // Initialize global relay time
        this.globalTime = this.dataManager.getInitialTime();
        this.energy = 0;
        this.currentLevel = 1;

        // Particles
        this.particleEmitter = this.add.particles(0, 0, 'star', {
            lifespan: 800,
            speed: { min: 150, max: 350 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 1, end: 0 },
            gravityY: 200,
            emitting: false
        });

        this.readyGroup = this.add.group();

        EventBus.on('restart-game', this.resetChallenge, this);
        EventBus.on('apply-perk', this.applyPerk, this);

        // Clean up listeners when scene is destroyed
        this.events.on('shutdown', this.shutdown, this);

        this.startLevel();

        EventBus.emit('current-scene-ready', this);
    }

    shutdown() {
        EventBus.off('restart-game', this.resetChallenge, this);
        EventBus.off('apply-perk', this.applyPerk, this);
        if (this.readyTimer) this.readyTimer.remove();
    }

    update(time: number, delta: number)
    {
        if (!this.isPlaying) return; // Pause logic during "Get Ready"

        const dt = delta / 1000;

        // 1. Time Relay Logic
        if (!this.isFever) {
            this.globalTime -= dt;
            if (this.globalTime <= 0) {
                this.globalTime = 0;
                this.handleGameOver();
            }
        } else {
            // Fever timer
            this.feverTimer -= dt;
            if (this.feverTimer <= 0) {
                this.stopFever();
            }
        }

        // 2. Energy Decay
        if (!this.isFever && this.energy > 0) {
            this.energy -= 2 * dt; // -2 energy per second
            if (this.energy < 0) this.energy = 0;
        }

        // Emit stats for HUD
        EventBus.emit('update-hud', {
            time: this.globalTime,
            energy: this.energy,
            level: this.currentLevel,
            isFever: this.isFever,
            bossHP: this.levelConfig.isBoss ? this.bossHP : null
        });
    }

    resetChallenge() {
        this.globalTime = this.dataManager.getInitialTime();
        this.energy = 0;
        this.currentLevel = 1;
        this.startLevel();
    }

    startLevel() {
        this.isPlaying = false;
        this.levelConfig = LevelManager.getLevelConfig(this.currentLevel);
        this.usedShieldThisLevel = false;

        // Boss Logic
        if (this.levelConfig.isBoss) {
            this.bossHP = 3;
        } else {
            this.bossHP = 0;
        }

        this.applyTheme(this.levelConfig.theme);
        
        // 1. Clear previous
        if (this.gridGroup) this.gridGroup.clear(true, true);
        this.readyGroup.clear(true, true);

        // 2. Generate Data first
        const { rows, cols } = this.levelConfig.gridSize;
        const totalItems = rows * cols;
        const levelData = this.generateLevelData(totalItems);

        // 3. Show "Get Ready" Screen
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        const bg = this.add.rectangle(cx, cy, this.scale.width, 200, 0x000000, 0.8);
        const titleText = this.add.text(cx, cy - 40, `第 ${this.currentLevel} 关`, { fontSize: '32px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5);
        const ruleText = this.add.text(cx, cy + 20, levelData.ruleText, { fontSize: '48px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        const skipHint = this.add.text(cx, cy + 70, '( 点击跳过 )', { fontSize: '18px', color: '#aaaaaa' }).setOrigin(0.5);
        
        this.readyGroup.add(bg);
        this.readyGroup.add(titleText);
        this.readyGroup.add(ruleText);
        this.readyGroup.add(skipHint);

        // Update HUD rule text as well
        EventBus.emit('update-rule', levelData.ruleText);

        const startFullLevel = () => {
            if (this.readyTimer) this.readyTimer.remove();
            this.input.off('pointerdown', startFullLevel);
            this.readyGroup.clear(true, true);
            this.buildGrid(levelData);
            this.isPlaying = true;
        };

        // 4. Wait, then start (or click to skip)
        this.input.once('pointerdown', startFullLevel);
        this.readyTimer = this.time.delayedCall(2000, startFullLevel);
    }

    applyTheme(theme: ThemeConfig) {
        if (!this.cameras || !this.cameras.main) return;
        this.cameras.main.setBackgroundColor(theme.bgColor);
    }

    // --- Grid Generation ---

    buildGrid(data: { content: any[], correctIndices: number[] }) {
        this.gridGroup = this.add.group();

        const { rows, cols } = this.levelConfig.gridSize;
        const totalItems = rows * cols;

        // 3. Render Grid (Fixed Spacing & Centered)
        const FIXED_SPACING_X = 100;
        const FIXED_SPACING_Y = 80;
        
        const gridWidth = (cols - 1) * FIXED_SPACING_X;
        const gridHeight = (rows - 1) * FIXED_SPACING_Y;

        // Center the whole grid on screen
        const startX = (this.scale.width - gridWidth) / 2;
        const startY = (this.scale.height - gridHeight) / 2 + 50; // Shifted down for HUD

        let counter = 0;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (counter >= totalItems) break;

                const targetX = startX + c * FIXED_SPACING_X;
                const targetY = startY + r * FIXED_SPACING_Y;
                
                const contentStr = data.content[counter].toString();
                const fontSize = contentStr.length > 3 ? '22px' : '36px';

                // Start at center, invisible
                const text = this.add.text(this.scale.width / 2, this.scale.height / 2, contentStr, {
                    fontFamily: 'Arial',
                    fontSize: fontSize,
                    color: '#ffffff',
                    fontStyle: 'bold'
                }).setOrigin(0.5).setInteractive();

                text.setScale(0);
                text.setAlpha(0);
                
                // Store metadata
                text.setData('index', counter);
                text.setData('isCorrect', data.correctIndices.includes(counter));
                text.setData('targetX', targetX);
                text.setData('targetY', targetY);

                text.on('pointerdown', () => {
                    if (this.isPlaying) this.handleItemClick(text);
                });

                text.on('pointerover', () => {
                    if (this.isPlaying && this.selectedItem !== text) {
                        text.setColor('#ffff00');
                    }
                });

                text.on('pointerout', () => {
                    if (this.isPlaying && this.selectedItem !== text) {
                        text.setColor('#ffffff');
                    }
                });

                this.gridGroup.add(text);
                counter++;
            }
        }

        // Entrance
        this.tweens.add({
            targets: this.gridGroup.getChildren(),
            x: (t: any) => t.getData('targetX'),
            y: (t: any) => t.getData('targetY'),
            scale: 1,
            alpha: 1,
            duration: 500,
            ease: 'Back.out'
        });
    }

    // --- Gameplay Logic ---

    selectedItem: any = null;

    handleItemClick(text: Phaser.GameObjects.Text) {
        const isCorrect = text.getData('isCorrect');
        
        if (this.levelConfig.mode === 'single') {
            if (isCorrect) {
                this.processCorrectHit(text);
            } else {
                this.processWrongHit(text);
            }
        } else {
            // Pair Mode
            if (this.selectedItem === text) {
                text.setColor('#ffffff');
                this.selectedItem = null;
                return;
            }
            if (!this.selectedItem) {
                this.selectedItem = text;
                text.setColor('#00d2ff');
                return;
            }
            
            // Second item
            const pairMatch = text.getData('isCorrect') && this.selectedItem.getData('isCorrect');
            
            if (pairMatch) {
                this.processCorrectHit(this.selectedItem, text);
            } else {
                this.processWrongHit(text, this.selectedItem);
            }
            this.selectedItem = null;
        }
    }

    processCorrectHit(...targets: Phaser.GameObjects.Text[]) {
        this.isPlaying = false; // Lock input immediately to prevent double-click or mis-touch

        targets.forEach(t => {
            t.setColor('#00ff00');
            this.particleEmitter.explode(20, t.x, t.y);
        });

        // Add Energy
        this.addEnergy(10);

        if (this.levelConfig.isBoss) {
            this.bossHP--;
            if (this.bossHP > 0) {
                // Next stage of boss
                this.time.delayedCall(500, () => {
                    const { rows, cols } = this.levelConfig.gridSize;
                    const newData = this.generateLevelData(rows * cols);
                    
                    // Update rule text just in case
                    EventBus.emit('update-rule', newData.ruleText);
                    
                    this.gridGroup.clear(true, true);
                    this.buildGrid(newData);
                    this.isPlaying = true; // Re-enable input after boss stage transition
                });
                return;
            }
        }

        // Win Level
        this.winLevel();
    }

    processWrongHit(...targets: Phaser.GameObjects.Text[]) {
        if (this.perkShieldActive && !this.usedShieldThisLevel) {
            this.usedShieldThisLevel = true;
            this.showFloatingText(targets[0].x, targets[0].y, 'SHIELDED', '#3498db');
            return;
        }

        // Penalty
        const penalty = this.dataManager.getPenaltyTime();
        this.globalTime -= penalty;
        this.energy = Math.max(0, this.energy - 50);
        this.cameras.main.shake(200, 0.01);
        
        targets.forEach(t => {
            t.setColor('#ff0000');
            this.tweens.add({ targets: t, x: '+=5', yoyo: true, repeat: 3, duration: 50 });
        });

        this.showFloatingText(targets[0].x, targets[0].y, `-${penalty}s`, '#ff0000');
    }

    addEnergy(amount: number) {
        if (this.isFever) return;
        
        const mult = this.perkEnergyMaster ? 1.5 : 1.0;
        this.energy += amount * mult;
        
        if (this.energy >= 100) {
            this.energy = 100;
            this.startFever();
        }
    }

    startFever() {
        this.isFever = true;
        this.feverTimer = 8; // 8 seconds
        this.cameras.main.flash(500, 255, 215, 0);
    }

    stopFever() {
        this.isFever = false;
        this.energy = 0;
    }

    winLevel() {
        // Bonus Time
        let bonus = this.levelConfig.bonusTime;
        if (this.perkTimeThief) bonus += 1;
        this.globalTime += bonus;

        // Coins
        const baseCoins = this.levelConfig.isBoss ? 50 : 10;
        const mult = this.dataManager.getCoinMultiplier();
        const finalCoins = Math.floor(baseCoins * mult * (this.isFever ? 2 : 1));
        this.dataManager.addCoins(finalCoins);

        this.showFloatingText(this.scale.width/2, this.scale.height/2, `+${bonus}s`, '#00ff00');

        this.time.delayedCall(800, () => {
            if (this.currentLevel % 5 === 0) {
                // Trigger Perk Selection every 5 levels
                EventBus.emit('show-perks');
            } else {
                this.nextLevel();
            }
        });
    }

    nextLevel() {
        this.currentLevel++;
        this.startLevel();
    }

    handleGameOver() {
        this.dataManager.updateMaxLevel(this.currentLevel);
        EventBus.emit('game-over', { level: this.currentLevel });
        this.scene.pause();
    }

    // --- Helpers ---

    showFloatingText(x: number, y: number, msg: string, col: string) {
        const t = this.add.text(x, y, msg, { font: 'bold 32px Arial', color: col }).setOrigin(0.5);
        this.tweens.add({ targets: t, y: y - 100, alpha: 0, duration: 800, onComplete: () => t.destroy() });
    }

    generateLevelData(count: number) {
        const rule = this.levelConfig.rule;
        const mode = this.levelConfig.mode;
        let content: (string | number)[] = [];
        let correctIndices: number[] = [];
        let ruleText = '';

        // Helper to get random unique indices
        const getIndices = (n: number) => {
            const arr: number[] = [];
            while(arr.length < n) {
                const r = Phaser.Math.Between(0, count - 1);
                if(!arr.includes(r)) arr.push(r);
            }
            return arr;
        };

        const prefix = this.levelConfig.isBoss ? 'BOSS: ' : '';

        if (mode === 'single') {
            correctIndices = getIndices(1);
            
            if (rule === 'max') {
                ruleText = prefix + '找出最大的数字';
                const maxVal = Phaser.Math.Between(800, 999);
                for(let i=0; i<count; i++) {
                    content.push(correctIndices.includes(i) ? maxVal : Phaser.Math.Between(10, maxVal - 50));
                }
            } 
            else if (rule === 'min') {
                ruleText = prefix + '找出最小的数字';
                const minVal = Phaser.Math.Between(1, 50);
                for(let i=0; i<count; i++) {
                    content.push(correctIndices.includes(i) ? minVal : Phaser.Math.Between(minVal + 50, 999));
                }
            }
            else if (rule === 'odd') {
                ruleText = prefix + '找出唯一的奇数';
                for(let i=0; i<count; i++) {
                    let n = Phaser.Math.Between(10, 99);
                    if (correctIndices.includes(i)) {
                        if (n % 2 === 0) n++;
                    } else {
                        if (n % 2 !== 0) n++;
                    }
                    content.push(n);
                }
            }
            else if (rule === 'even') {
                ruleText = prefix + '找出唯一的偶数';
                for(let i=0; i<count; i++) {
                    let n = Phaser.Math.Between(10, 99);
                    if (correctIndices.includes(i)) {
                        if (n % 2 !== 0) n++;
                    } else {
                        if (n % 2 === 0) n++;
                    }
                    content.push(n);
                }
            }
            else if (rule.startsWith('equation')) {
                const isAdd = rule === 'equation_add';
                const target = Phaser.Math.Between(10, 30);
                
                ruleText = prefix + `找出结果为 ${target} 的算式`;

                for(let i=0; i<count; i++) {
                    if (correctIndices.includes(i)) {
                        // Correct equation
                        if (isAdd) {
                            const a = Phaser.Math.Between(1, target-1);
                            content.push(`${a} + ${target-a}`);
                        } else {
                            const b = Phaser.Math.Between(1, 10);
                            content.push(`${target+b} - ${b}`);
                        }
                    } else {
                        // Wrong equation
                        let res = target;
                        while(res === target) res = Phaser.Math.Between(5, 40);
                        
                        if (isAdd) {
                            const a = Phaser.Math.Between(1, res > 1 ? res-1 : 1);
                            content.push(`${a} + ${res-a}`);
                        } else {
                            const b = Phaser.Math.Between(1, 10);
                            content.push(`${res+b} - ${b}`);
                        }
                    }
                }
            }
        } 
        else if (mode === 'pair') {
            correctIndices = getIndices(2);
            // Fill with placeholders first
            content = Array(count).fill(0);

            if (rule === 'pair_sum') {
                const target = Phaser.Math.Between(20, 50);
                ruleText = prefix + `找出相加为 ${target} 的两数`;

                const val1 = Phaser.Math.Between(1, target-1);
                content[correctIndices[0]] = val1;
                content[correctIndices[1]] = target - val1;

                // Fill distractors
                for(let i=0; i<count; i++) {
                    if (!correctIndices.includes(i)) {
                        content[i] = Phaser.Math.Between(1, target + 20);
                    }
                }
            }
            else if (rule === 'pair_product') {
                const a = Phaser.Math.Between(2, 9);
                const b = Phaser.Math.Between(2, 9);
                const target = a * b;
                ruleText = prefix + `找出相乘为 ${target} 的两数`;

                content[correctIndices[0]] = a;
                content[correctIndices[1]] = b;

                for(let i=0; i<count; i++) {
                    if (!correctIndices.includes(i)) {
                        content[i] = Phaser.Math.Between(1, 81);
                    }
                }
            }
        }

        return { content, correctIndices, ruleText };
    }

    getCorrectIndices() { return this.levelConfig.isBoss ? [0] : [0]; } // Simplified logic, actual indices are stored in text data

    applyPerk(perkId: string) {
        if (!this.scene || !this.sys || !this.sys.isActive()) return;

        if (perkId === 'time_thief') this.perkTimeThief = true;
        if (perkId === 'energy_master') this.perkEnergyMaster = true;
        if (perkId === 'shield') this.perkShieldActive = true;
        
        // Resume game
        this.nextLevel();
    }
}