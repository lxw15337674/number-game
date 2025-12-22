import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import Phaser from 'phaser';

type GameMode = 'single' | 'pair';

type GameLevelData = {
    mode: GameMode;
    content: (number | string)[]; // Display text: can be "12" or "3+5"
    correctIndices: number[];     // Array of valid indices (length 1 for single, 2 for pair)
    ruleText: string;
};

export class Game extends Scene
{
    gridGroup: Phaser.GameObjects.Group;
    startTime: number;
    particleEmitter: Phaser.GameObjects.Particles.ParticleEmitter;
    currentLevelData: GameLevelData;
    
    // State for Pair Mode
    selectedItem: Phaser.GameObjects.Text | null = null;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.cameras.main.setBackgroundColor(0x2d2d2d);
        
        // Initialize Particle Emitter
        this.particleEmitter = this.add.particles(0, 0, 'star', {
            lifespan: 800,
            speed: { min: 150, max: 350 },
            scale: { start: 0.6, end: 0 },
            alpha: { start: 1, end: 0 },
            gravityY: 200,
            rotating: { min: 0, max: 360 },
            emitting: false
        });

        // Listen for restart events from Vue
        EventBus.on('restart-game', this.startGame, this);

        this.startGame();

        EventBus.emit('current-scene-ready', this);
    }

    startGame() {
        // Cleanup
        if (this.gridGroup) {
            this.gridGroup.clear(true, true);
        }
        this.selectedItem = null;
        this.gridGroup = this.add.group();
        this.startTime = Date.now();

        // 1. Grid Config
        const isPortrait = this.scale.height > this.scale.width;
        // Slightly denser grid for more challenge
        let cols = isPortrait ? 5 : 8; 
        let rows = isPortrait ? 8 : 5;
        const totalItems = cols * rows;

        // 2. Generate Data
        this.currentLevelData = this.generateLevelData(totalItems);

        // Update UI
        EventBus.emit('update-rule', this.currentLevelData.ruleText);

        // 3. Render Grid
        const marginX = 50;
        const marginY = 160; 
        const availableWidth = this.scale.width - (marginX * 2);
        const availableHeight = this.scale.height - (marginY * 2);
        
        const spacingX = availableWidth / (cols - 1 || 1);
        const spacingY = availableHeight / (rows - 1 || 1);

        const startX = marginX;
        const startY = marginY;

        let counter = 0;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (counter >= totalItems) break;

                const targetX = startX + c * spacingX;
                const targetY = startY + r * spacingY;
                
                const contentStr = this.currentLevelData.content[counter].toString();
                // Dynamic font size: smaller for equations
                const fontSize = contentStr.length > 3 ? '24px' : '40px';

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
                text.setData('targetX', targetX);
                text.setData('targetY', targetY);

                text.on('pointerdown', () => {
                    this.handleNumberClick(text);
                });

                text.on('pointerover', () => {
                    if (this.selectedItem !== text) {
                        text.setColor('#ffff00'); // Hover yellow
                    }
                });

                text.on('pointerout', () => {
                    if (this.selectedItem !== text) {
                        text.setColor('#ffffff');
                    }
                });

                this.gridGroup.add(text);
                counter++;
            }
        }

        // Entrance Animation
        this.tweens.add({
            targets: this.gridGroup.getChildren(),
            x: (target: any) => target.getData('targetX'),
            y: (target: any) => target.getData('targetY'),
            scale: 1,
            alpha: 1,
            duration: 600,
            delay: this.tweens.stagger(30, { grid: [rows, cols], from: 'center' }),
            ease: 'Back.out'
        });
    }

    generateLevelData(count: number): GameLevelData {
        // Rule Pool: Mixed 'single' and 'pair' logic
        const rules = [
            'max', 'min', 'odd', 'even', // Classic
            'equation_add', 'equation_sub', // Math Single
            'pair_sum', 'pair_product'      // Math Pair
        ];
        
        const selectedRule = Phaser.Utils.Array.GetRandom(rules);
        
        let content: (number | string)[] = [];
        let correctIndices: number[] = [];
        let ruleText = '';
        let mode: GameMode = 'single';

        // Helper to get random indices
        const getUniqueIndices = (n: number) => {
            const arr: number[] = [];
            while(arr.length < n) {
                const r = Phaser.Math.Between(0, count - 1);
                if(arr.indexOf(r) === -1) arr.push(r);
            }
            return arr;
        };

        switch (selectedRule) {
            case 'max':
                mode = 'single';
                ruleText = '找出最大的数字!';
                correctIndices = getUniqueIndices(1);
                const maxVal = Phaser.Math.Between(800, 999);
                for(let i=0; i<count; i++) {
                    content.push(correctIndices.includes(i) ? maxVal : Phaser.Math.Between(10, maxVal - 50));
                }
                break;

            case 'min':
                mode = 'single';
                ruleText = '找出最小的数字!';
                correctIndices = getUniqueIndices(1);
                const minVal = Phaser.Math.Between(1, 50);
                for(let i=0; i<count; i++) {
                    content.push(correctIndices.includes(i) ? minVal : Phaser.Math.Between(minVal + 50, 999));
                }
                break;

            case 'odd':
                mode = 'single';
                ruleText = '找出唯一的奇数!';
                correctIndices = getUniqueIndices(1);
                for(let i=0; i<count; i++) {
                    let n = Phaser.Math.Between(10, 99);
                    if (correctIndices.includes(i)) {
                        if (n % 2 === 0) n++;
                    } else {
                        if (n % 2 !== 0) n++;
                    }
                    content.push(n);
                }
                break;

            case 'even':
                mode = 'single';
                ruleText = '找出唯一的偶数!';
                correctIndices = getUniqueIndices(1);
                for(let i=0; i<count; i++) {
                    let n = Phaser.Math.Between(10, 99);
                    if (correctIndices.includes(i)) {
                        if (n % 2 !== 0) n++;
                    } else {
                        if (n % 2 === 0) n++;
                    }
                    content.push(n);
                }
                break;

            case 'equation_add':
                mode = 'single';
                const targetAdd = Phaser.Math.Between(10, 30);
                ruleText = `找出结果为 ${targetAdd} 的算式!`;
                correctIndices = getUniqueIndices(1);
                for(let i=0; i<count; i++) {
                    if (correctIndices.includes(i)) {
                        const a = Phaser.Math.Between(1, targetAdd - 1);
                        content.push(`${a} + ${targetAdd - a}`);
                    } else {
                        // Distractors
                        let res = targetAdd;
                        while(res === targetAdd) res = Phaser.Math.Between(5, 40);
                        const a = Phaser.Math.Between(1, res > 1 ? res - 1 : 1);
                        content.push(`${a} + ${res - a}`);
                    }
                }
                break;

            case 'equation_sub':
                mode = 'single';
                const targetSub = Phaser.Math.Between(5, 20);
                ruleText = `找出结果为 ${targetSub} 的算式!`;
                correctIndices = getUniqueIndices(1);
                for(let i=0; i<count; i++) {
                    if (correctIndices.includes(i)) {
                        const b = Phaser.Math.Between(1, 20);
                        content.push(`${targetSub + b} - ${b}`);
                    } else {
                        let res = targetSub;
                        while(res === targetSub) res = Phaser.Math.Between(1, 30);
                        const b = Phaser.Math.Between(1, 20);
                        content.push(`${res + b} - ${b}`);
                    }
                }
                break;

            case 'pair_sum':
                mode = 'pair';
                const sumTarget = Phaser.Math.Between(20, 50);
                ruleText = `找到相加等于 ${sumTarget} 的两个数!`;
                correctIndices = getUniqueIndices(2);
                
                const val1 = Phaser.Math.Between(1, sumTarget - 1);
                const val2 = sumTarget - val1;

                // Fill array with placeholders first
                for(let i=0; i<count; i++) content.push(0);

                // Place correct pair
                content[correctIndices[0]] = val1;
                content[correctIndices[1]] = val2;

                // Fill distractors
                for(let i=0; i<count; i++) {
                    if (!correctIndices.includes(i)) {
                        let n = Phaser.Math.Between(1, sumTarget + 10);
                        // Avoid accidentally creating another valid pair with existing numbers if possible
                        // For simplicity, just random is fine for now, edge cases rare enough
                        content[i] = n;
                    }
                }
                break;

            case 'pair_product':
                mode = 'pair';
                // Use simple multiplication tables (2..9) * (2..9)
                const factorA = Phaser.Math.Between(2, 9);
                const factorB = Phaser.Math.Between(2, 9);
                const prodTarget = factorA * factorB;
                
                ruleText = `找到积等于 ${prodTarget} 的两个数!`;
                correctIndices = getUniqueIndices(2);
                
                // Fill placeholders
                for(let i=0; i<count; i++) content.push(0);
                
                content[correctIndices[0]] = factorA;
                content[correctIndices[1]] = factorB;

                for(let i=0; i<count; i++) {
                    if (!correctIndices.includes(i)) {
                        let n = Phaser.Math.Between(1, 81);
                        // Avoid simple duplicates of factors if possible to reduce confusion
                        content[i] = n;
                    }
                }
                break;
        }

        return { mode, content, correctIndices, ruleText };
    }

    handleNumberClick(text: Phaser.GameObjects.Text) {
        const index = text.getData('index');
        const isCorrectIndex = this.currentLevelData.correctIndices.includes(index);

        if (this.currentLevelData.mode === 'single') {
            // --- Single Mode Logic ---
            if (isCorrectIndex) {
                this.handleWin([text]);
            } else {
                this.handlePenalty(text);
            }
        } else {
            // --- Pair Mode Logic ---
            
            // 1. Deselect if clicking the same item
            if (this.selectedItem === text) {
                this.selectedItem = null;
                text.setColor('#ffffff');
                return;
            }

            // 2. Select first item
            if (!this.selectedItem) {
                this.selectedItem = text;
                text.setColor('#00aaff'); // Selection Blue
                return;
            }

            // 3. Second item clicked
            const firstIdx = this.selectedItem.getData('index');
            const secondIdx = index;

            // Check if BOTH are in the correct indices list
            // Note: correctIndices has exactly 2 elements. We need to check if {firstIdx, secondIdx} == correctIndices set
            const required = this.currentLevelData.correctIndices;
            const hasFirst = required.includes(firstIdx);
            const hasSecond = required.includes(secondIdx);

            if (hasFirst && hasSecond) {
                this.handleWin([this.selectedItem, text]);
            } else {
                // Wrong Pair
                this.handlePenalty(text, this.selectedItem);
                
                // Reset Selection
                this.selectedItem.setColor('#ffffff');
                text.setColor('#ffffff'); // Will be red briefly from handlePenalty but then reset
                this.selectedItem = null;
            }
        }
    }

    handleWin(targets: Phaser.GameObjects.Text[]) {
        // Victory Effects
        targets.forEach(t => {
            t.setColor('#00ff00');
            this.particleEmitter.explode(40, t.x, t.y);
            
            this.tweens.add({
                targets: t,
                scale: 2,
                angle: 360,
                duration: 500,
                ease: 'Back.out'
            });
        });

        // Show Text
        const centerObj = targets[0]; // Anchor text
        this.showFloatingText(centerObj.x, centerObj.y - 50, 'Correct!', '#00ff00');

        // End Game Delay
        this.time.delayedCall(600, () => {
            const endTime = Date.now();
            const duration = (endTime - this.startTime) / 1000;
            EventBus.emit('game-solved', { duration });
        });
    }

    handlePenalty(target: Phaser.GameObjects.Text, secondaryTarget?: Phaser.GameObjects.Text) {
        EventBus.emit('time-penalty', 5);
        this.cameras.main.shake(200, 0.01);
        this.showFloatingText(target.x, target.y - 40, '+5s', '#ff0000');

        const targets = [target];
        if (secondaryTarget) targets.push(secondaryTarget);

        targets.forEach(t => {
            t.setColor('#ff0000');
            this.tweens.add({
                targets: t,
                alpha: 0.5,
                scale: 1.2,
                duration: 100,
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                    t.setColor('#ffffff');
                    t.setAlpha(1);
                    t.setScale(1);
                }
            });
        });
    }

    showFloatingText(x: number, y: number, message: string, color: string) {
        const floatText = this.add.text(x, y, message, {
            fontFamily: 'Arial Black',
            fontSize: '24px',
            color: color,
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.tweens.add({
            targets: floatText,
            y: y - 50,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                floatText.destroy();
            }
        });
    }

    changeScene ()
    {
        // Not used currently
    }
}
