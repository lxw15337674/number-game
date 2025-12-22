import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import Phaser from 'phaser';

export class Game extends Scene
{
    gridGroup: Phaser.GameObjects.Group;
    targetNumber: number;
    fakeNumber: number;
    startTime: number;
    particleEmitter: Phaser.GameObjects.Particles.ParticleEmitter;

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
        // Clear previous grid if any
        if (this.gridGroup) {
            this.gridGroup.clear(true, true);
        }

        this.gridGroup = this.add.group();
        this.startTime = Date.now();

        const rows = 10;
        const cols = 10;
        const startX = 150; // Adjusted for better centering
        const startY = 100;
        const spacingX = 80;
        const spacingY = 60;

        const errorIndex = Phaser.Math.Between(0, 99);
        this.targetNumber = errorIndex + 1;
        this.fakeNumber = Phaser.Math.Between(101, 999);

        let counter = 1;
        const screenCenterX = this.scale.width / 2;
        const screenCenterY = this.scale.height / 2;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const targetX = startX + c * spacingX;
                const targetY = startY + r * spacingY;
                
                let numToShow = counter;
                let isWrong = false;

                if (counter - 1 === errorIndex) {
                    numToShow = this.fakeNumber;
                    isWrong = true;
                }

                // Start at center, invisible
                const text = this.add.text(screenCenterX, screenCenterY, numToShow.toString(), {
                    fontFamily: 'Arial',
                    fontSize: '32px',
                    color: '#ffffff',
                    fontStyle: 'bold'
                }).setOrigin(0.5).setInteractive();

                text.setScale(0);
                text.setAlpha(0);
                text.setData('isWrong', isWrong);
                text.setData('targetX', targetX);
                text.setData('targetY', targetY);

                text.on('pointerdown', () => {
                    this.handleNumberClick(text);
                });

                text.on('pointerover', () => {
                    text.setColor('#ffff00');
                });

                text.on('pointerout', () => {
                    text.setColor('#ffffff');
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
            delay: this.tweens.stagger(20, { grid: [rows, cols], from: 'center' }),
            ease: 'Back.out'
        });
    }

    handleNumberClick(text: Phaser.GameObjects.Text) {
        const isWrong = text.getData('isWrong');
        const { x, y } = text;

        if (isWrong) {
            // Victory Effects
            text.setColor('#00ff00');
            
            // Explosion
            this.particleEmitter.explode(40, x, y);

            // Text Celebration Animation
            this.tweens.add({
                targets: text,
                scale: 2,
                angle: 360,
                duration: 500,
                ease: 'Back.out',
                onComplete: () => {
                    const endTime = Date.now();
                    const duration = (endTime - this.startTime) / 1000;
                    EventBus.emit('game-solved', { duration });
                }
            });

            // Floating "Found It!" text
            this.showFloatingText(x, y - 50, 'Found It!', '#00ff00');

        } else {
            // Wrong Guess Effects
            
            // Emit Penalty
            EventBus.emit('time-penalty', 5);

            // Camera Shake
            this.cameras.main.shake(200, 0.01);
            
            // Floating "+5s" text
            this.showFloatingText(x, y - 40, '+5s', '#ff0000');

            // Red Flash
            text.setColor('#ff0000');
            this.tweens.add({
                targets: text,
                alpha: 0.5,
                scale: 1.2,
                duration: 100,
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                    text.setColor('#ffffff');
                    text.setAlpha(1);
                    text.setScale(1);
                }
            });
        }
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
