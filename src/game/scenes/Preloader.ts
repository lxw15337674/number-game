import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  We loaded this image in our Boot Scene, so we can display it here
        this.add.image(512, 384, 'background');

        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512-230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('assets');

        this.load.image('logo', 'logo.png');
        this.load.image('star', 'star.png');

        // Generate procedural textures for effects
        this.generateEffectTextures();
    }

    generateEffectTextures()
    {
        // Generate coin texture (golden circle with highlight)
        const coinGraphics = this.make.graphics({ x: 0, y: 0 });
        coinGraphics.fillStyle(0xffd700);
        coinGraphics.fillCircle(16, 16, 14);
        coinGraphics.fillStyle(0xffec8b);
        coinGraphics.fillCircle(12, 12, 6);
        coinGraphics.lineStyle(2, 0xb8860b);
        coinGraphics.strokeCircle(16, 16, 14);
        coinGraphics.generateTexture('coin', 32, 32);
        coinGraphics.destroy();

        // Generate particle texture (soft glow circle)
        const particleGraphics = this.make.graphics({ x: 0, y: 0 });
        particleGraphics.fillStyle(0xffffff);
        particleGraphics.fillCircle(8, 8, 8);
        // Add gradient-like effect with alpha circles
        particleGraphics.fillStyle(0xffffff, 0.6);
        particleGraphics.fillCircle(8, 8, 6);
        particleGraphics.fillStyle(0xffffff, 0.3);
        particleGraphics.fillCircle(8, 8, 4);
        particleGraphics.generateTexture('particle', 16, 16);
        particleGraphics.destroy();
    }

    create ()
    {
        //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
        //  For example, you can define global animations here, so we can use them in other scenes.

        //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
        this.scene.start('MainMenu');
    }
}
