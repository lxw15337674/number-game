import Phaser from 'phaser';

/**
 * Particle Limits Configuration
 * Total on-screen limit: ~160 particles
 */
export const PARTICLE_LIMITS = {
    CORRECT_BURST: { perBurst: 30, maxOnScreen: 60 },
    COINS: { perSpray: 20, maxOnScreen: 40 },
    FEVER_RISING: { maxOnScreen: 50 },
    FEVER_FLAME: { maxOnScreen: 10 }
};

/**
 * Animation Timing Constants
 */
export const TIMING = {
    SQUASH_STRETCH: 180,      // Cell click animation
    CORRECT_FLY: 500,         // Number fly to score
    CORRECT_BURST: 500,       // Particle burst duration
    WRONG_SHAKE: 250,         // Screen shake duration
    COIN_SPRAY: 400,          // Coin spray phase
    COIN_COLLECT_DELAY: 500,  // Delay before magnetic pull
    COIN_COLLECT: 600         // Magnetic collection duration
};

/**
 * Easing functions for cartoon feel
 */
export const EASING = {
    BOUNCE_OUT: 'Bounce.easeOut',
    ELASTIC_OUT: 'Elastic.easeOut',
    BACK_OUT: 'Back.easeOut',
    QUAD_OUT: 'Quad.easeOut'
};

export class EffectsManager {
    private scene: Phaser.Scene;

    // Particle emitters
    private starEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
    private feverEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
    private flameEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

    // Coin pool for magnetic collection
    private coinPool: Phaser.GameObjects.Image[] = [];
    private activeCoins: Set<Phaser.GameObjects.Image> = new Set();

    // Fever state
    private feverActive: boolean = false;

    // UI targets for magnetic effects
    private coinTargetX: number = 0;
    private coinTargetY: number = 0;
    private scoreTargetX: number = 0;
    private scoreTargetY: number = 0;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.initEmitters();
        this.initCoinPool();
    }

    /**
     * Set UI target positions for magnetic effects
     */
    public setTargets(coinX: number, coinY: number, scoreX: number, scoreY: number) {
        this.coinTargetX = coinX;
        this.coinTargetY = coinY;
        this.scoreTargetX = scoreX;
        this.scoreTargetY = scoreY;
    }

    private initEmitters() {
        // Star burst emitter for correct answers
        this.starEmitter = this.scene.add.particles(0, 0, 'star', {
            lifespan: 600,
            speed: { min: 150, max: 350 },
            scale: { start: 0.8, end: 0 },
            alpha: { start: 1, end: 0 },
            gravityY: 300,
            rotate: { start: 0, end: 360 },
            emitting: false
        });
        this.starEmitter.setDepth(100);

        // Fever rising particles
        this.feverEmitter = this.scene.add.particles(0, 0, 'particle', {
            x: { min: 0, max: this.scene.scale.width },
            y: this.scene.scale.height + 20,
            lifespan: 3000,
            speedY: { min: -80, max: -150 },
            speedX: { min: -20, max: 20 },
            scale: { start: 0.5, end: 0 },
            alpha: { start: 0.8, end: 0 },
            tint: 0xffd700,
            emitting: false,
            frequency: 60,
            maxParticles: PARTICLE_LIMITS.FEVER_RISING.maxOnScreen
        });
        this.feverEmitter.setDepth(50);

        // Fever flame particles on energy bar
        this.flameEmitter = this.scene.add.particles(0, 0, 'particle', {
            lifespan: 400,
            speedY: { min: -60, max: -120 },
            speedX: { min: -15, max: 15 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 1, end: 0 },
            tint: [0xff4500, 0xff6600, 0xffd700],
            emitting: false,
            frequency: 40,
            maxParticles: PARTICLE_LIMITS.FEVER_FLAME.maxOnScreen
        });
        this.flameEmitter.setDepth(101);
    }

    private initCoinPool() {
        // Pre-create coin sprites for reuse
        for (let i = 0; i < PARTICLE_LIMITS.COINS.maxOnScreen; i++) {
            const coin = this.scene.add.image(0, 0, 'coin');
            coin.setVisible(false);
            coin.setDepth(102);
            this.coinPool.push(coin);
        }
    }

    // =====================
    // P0: Cell Click Effect (Squash & Stretch)
    // =====================

    public playClickEffect(target: Phaser.GameObjects.Text | Phaser.GameObjects.Image) {
        // Kill any existing tweens on this target
        this.scene.tweens.killTweensOf(target);

        // Reset scale
        target.setScale(1, 1);

        // Squash & Stretch sequence
        this.scene.tweens.chain({
            targets: target,
            tweens: [
                // Phase 1: Squash (press down)
                {
                    scaleX: 1.2,
                    scaleY: 0.8,
                    duration: TIMING.SQUASH_STRETCH * 0.2,
                    ease: 'Quad.easeOut'
                },
                // Phase 2: Stretch (bounce up)
                {
                    scaleX: 0.85,
                    scaleY: 1.2,
                    duration: TIMING.SQUASH_STRETCH * 0.3,
                    ease: EASING.BACK_OUT
                },
                // Phase 3: Overshoot
                {
                    scaleX: 1.1,
                    scaleY: 0.95,
                    duration: TIMING.SQUASH_STRETCH * 0.25,
                    ease: 'Quad.easeOut'
                },
                // Phase 4: Settle
                {
                    scaleX: 1,
                    scaleY: 1,
                    duration: TIMING.SQUASH_STRETCH * 0.25,
                    ease: 'Quad.easeInOut'
                }
            ]
        });
    }

    // =====================
    // P0: Correct Answer Effect
    // =====================

    public playCorrectEffect(
        target: Phaser.GameObjects.Text,
        onComplete?: () => void
    ) {
        const startX = target.x;
        const startY = target.y;

        // 1. Particle burst at origin
        this.starEmitter?.explode(
            Math.min(25, PARTICLE_LIMITS.CORRECT_BURST.perBurst),
            startX,
            startY
        );

        // 2. Flash green
        target.setColor('#00ff00');

        // 3. Scale up + glow effect
        this.scene.tweens.add({
            targets: target,
            scaleX: 1.4,
            scaleY: 1.4,
            duration: 150,
            ease: EASING.BACK_OUT,
            onComplete: () => {
                // 4. Fly to score position via bezier curve
                this.flyToTarget(target, this.scoreTargetX, this.scoreTargetY, onComplete);
            }
        });
    }

    private flyToTarget(
        target: Phaser.GameObjects.Text,
        destX: number,
        destY: number,
        onComplete?: () => void
    ) {
        const startX = target.x;
        const startY = target.y;

        // Control point for bezier curve (arc upward)
        const controlX = (startX + destX) / 2;
        const controlY = Math.min(startY, destY) - 100;

        // Custom bezier path
        const path = new Phaser.Curves.QuadraticBezier(
            new Phaser.Math.Vector2(startX, startY),
            new Phaser.Math.Vector2(controlX, controlY),
            new Phaser.Math.Vector2(destX, destY)
        );

        // Animate along path
        const follower = { t: 0 };

        this.scene.tweens.add({
            targets: follower,
            t: 1,
            duration: TIMING.CORRECT_FLY,
            ease: EASING.QUAD_OUT,
            onUpdate: () => {
                const point = path.getPoint(follower.t);
                target.setPosition(point.x, point.y);
                // Scale down as it flies
                const scale = 1.4 - (follower.t * 0.9);
                target.setScale(scale);
                // Fade out
                target.setAlpha(1 - follower.t * 0.8);
            },
            onComplete: () => {
                target.destroy();
                onComplete?.();
            }
        });
    }

    // =====================
    // P0: Wrong Answer Effect
    // =====================

    public playWrongEffect(
        targets: Phaser.GameObjects.Text[],
        camera: Phaser.Cameras.Scene2D.Camera
    ) {
        // 1. Screen shake
        camera.shake(TIMING.WRONG_SHAKE, 0.012);

        // 2. Cell effects
        targets.forEach(target => {
            // Turn red
            target.setColor('#ff0000');

            // Horizontal shake
            const originalX = target.x;
            this.scene.tweens.add({
                targets: target,
                x: originalX + 8,
                duration: 40,
                yoyo: true,
                repeat: 4,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                    target.x = originalX;
                }
            });

            // Show X mark
            this.showWrongMark(target.x, target.y);
        });
    }

    private showWrongMark(x: number, y: number) {
        const mark = this.scene.add.text(x, y, '✕', {
            fontSize: '48px',
            color: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(103);

        // Pop in
        mark.setScale(0);
        this.scene.tweens.add({
            targets: mark,
            scale: 1.2,
            duration: 100,
            ease: EASING.BACK_OUT,
            onComplete: () => {
                // Fade out
                this.scene.tweens.add({
                    targets: mark,
                    scale: 0.8,
                    alpha: 0,
                    duration: 300,
                    delay: 200,
                    onComplete: () => mark.destroy()
                });
            }
        });
    }

    // =====================
    // P1: Coin Spray + Magnetic Collection
    // =====================

    public playCoinSpray(
        originX: number,
        originY: number,
        count: number,
        onCollectComplete?: () => void
    ) {
        const actualCount = Math.min(count, PARTICLE_LIMITS.COINS.perSpray);
        let collectedCount = 0;

        for (let i = 0; i < actualCount; i++) {
            // Get coin from pool
            const coin = this.getAvailableCoin();
            if (!coin) continue;

            coin.setPosition(originX, originY);
            coin.setVisible(true);
            coin.setScale(0.5);
            coin.setAlpha(1);
            this.activeCoins.add(coin);

            // Random spray angle and speed
            const angle = Phaser.Math.FloatBetween(-Math.PI * 0.8, -Math.PI * 0.2);
            const speed = Phaser.Math.FloatBetween(200, 400);
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            // Phase 1: Spray with gravity
            const gravity = 600;
            const sprayTime = TIMING.COIN_SPRAY;

            // Calculate landing position
            const landX = originX + vx * (sprayTime / 1000);
            const landY = originY + vy * (sprayTime / 1000) + 0.5 * gravity * Math.pow(sprayTime / 1000, 2);

            // Spray animation
            this.scene.tweens.add({
                targets: coin,
                x: landX,
                y: landY,
                duration: sprayTime,
                ease: 'Quad.easeOut',
                onUpdate: (tween) => {
                    // Add spin
                    coin.setRotation(tween.progress * Math.PI * 2);
                }
            });

            // Phase 2: Magnetic pull after delay
            this.scene.time.delayedCall(TIMING.COIN_SPRAY + TIMING.COIN_COLLECT_DELAY + i * 30, () => {
                this.magneticPull(coin, () => {
                    collectedCount++;
                    if (collectedCount >= actualCount) {
                        onCollectComplete?.();
                    }
                });
            });
        }
    }

    private getAvailableCoin(): Phaser.GameObjects.Image | null {
        for (const coin of this.coinPool) {
            if (!this.activeCoins.has(coin)) {
                return coin;
            }
        }
        return null;
    }

    private magneticPull(coin: Phaser.GameObjects.Image, onComplete: () => void) {
        // Accelerating pull toward target
        this.scene.tweens.add({
            targets: coin,
            x: this.coinTargetX,
            y: this.coinTargetY,
            scale: 0.2,
            duration: TIMING.COIN_COLLECT,
            ease: 'Quad.easeIn',
            onComplete: () => {
                coin.setVisible(false);
                this.activeCoins.delete(coin);
                onComplete();
            }
        });
    }

    // =====================
    // P1: Fever Mode Effects
    // =====================

    public startFever(energyBarX: number, energyBarY: number) {
        this.feverActive = true;

        // Start rising particles
        this.feverEmitter?.start();

        // Start flame on energy bar
        this.flameEmitter?.setPosition(energyBarX, energyBarY);
        this.flameEmitter?.start();

        // Pulsing gold border effect
        this.startFeverPulse();
    }

    public stopFever() {
        this.feverActive = false;
        this.feverEmitter?.stop();
        this.flameEmitter?.stop();
    }

    private feverPulseTween: Phaser.Tweens.Tween | null = null;
    private feverOverlay: Phaser.GameObjects.Rectangle | null = null;

    private startFeverPulse() {
        // Create edge glow overlay
        if (!this.feverOverlay) {
            this.feverOverlay = this.scene.add.rectangle(
                this.scene.scale.width / 2,
                this.scene.scale.height / 2,
                this.scene.scale.width,
                this.scene.scale.height,
                0xffd700,
                0
            ).setDepth(49);
        }

        // Pulsing glow
        this.feverPulseTween = this.scene.tweens.add({
            targets: this.feverOverlay,
            alpha: 0.15,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    public updateFeverFlame(energyBarX: number, energyBarY: number) {
        if (this.feverActive && this.flameEmitter) {
            this.flameEmitter.setPosition(energyBarX, energyBarY);
        }
    }

    // =====================
    // Floating Text (Enhanced)
    // =====================

    public showFloatingText(
        x: number,
        y: number,
        text: string,
        color: string,
        scale: number = 1
    ) {
        const floatText = this.scene.add.text(x, y, text, {
            fontSize: `${32 * scale}px`,
            color: color,
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(104);

        // Pop in
        floatText.setScale(0);

        this.scene.tweens.add({
            targets: floatText,
            scale: 1,
            duration: 150,
            ease: EASING.BACK_OUT,
            onComplete: () => {
                // Float up and fade
                this.scene.tweens.add({
                    targets: floatText,
                    y: y - 80,
                    alpha: 0,
                    duration: 600,
                    delay: 200,
                    ease: 'Quad.easeOut',
                    onComplete: () => floatText.destroy()
                });
            }
        });
    }

    // =====================
    // Cleanup
    // =====================

    public destroy() {
        this.stopFever();
        this.starEmitter?.destroy();
        this.feverEmitter?.destroy();
        this.flameEmitter?.destroy();
        this.feverPulseTween?.destroy();
        this.feverOverlay?.destroy();

        this.coinPool.forEach(coin => coin.destroy());
        this.coinPool = [];
        this.activeCoins.clear();
    }
}
