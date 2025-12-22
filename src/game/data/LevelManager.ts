import Phaser from 'phaser';

export type GameMode = 'single' | 'pair';

export interface LevelConfig {
    id: number;
    mode: GameMode;
    rule: string;
    gridSize: { rows: number, cols: number };
    bonusTime: number;
    isBoss: boolean;
    theme: ThemeConfig;
}

export interface ThemeConfig {
    name: string;
    bgColor: number;
    textColor: string;
    accentColor: string;
}

const THEMES: Record<string, ThemeConfig> = {
    CYBER: { name: '赛博空间', bgColor: 0x000b1e, textColor: '#00d2ff', accentColor: '#ff00ff' },
    STEAM: { name: '机械工厂', bgColor: 0x2c1e14, textColor: '#e67e22', accentColor: '#f1c40f' },
    OCEAN: { name: '深海迷航', bgColor: 0x001f3f, textColor: '#7fdbff', accentColor: '#39cccc' },
    LAVA:  { name: '熔岩炼狱', bgColor: 0x1a0500, textColor: '#ff4136', accentColor: '#ff851b' },
    VOID:  { name: '无尽虚空', bgColor: 0x0b0014, textColor: '#b10dc9', accentColor: '#f012be' }
};

export class LevelManager {
    
    public static getThemeForLevel(level: number): ThemeConfig {
        if (level <= 5) return THEMES.CYBER;
        if (level <= 10) return THEMES.STEAM;
        if (level <= 15) return THEMES.OCEAN;
        if (level <= 20) return THEMES.LAVA;
        return THEMES.VOID;
    }

    public static getLevelConfig(level: number): LevelConfig {
        const theme = this.getThemeForLevel(level);
        const isBoss = level % 5 === 0;

        // Static levels 1-20
        if (level <= 20) {
            return this.getStaticLevel(level, isBoss, theme);
        }

        // Dynamic levels 21+
        return this.generateDynamicLevel(level, isBoss, theme);
    }

    private static getStaticLevel(level: number, isBoss: boolean, theme: ThemeConfig): LevelConfig {
        const configs: Record<number, Partial<LevelConfig>> = {
            1: { mode: 'single', rule: 'max', gridSize: { rows: 3, cols: 3 }, bonusTime: 10 },
            2: { mode: 'single', rule: 'min', gridSize: { rows: 3, cols: 4 }, bonusTime: 10 },
            3: { mode: 'single', rule: 'odd', gridSize: { rows: 4, cols: 4 }, bonusTime: 12 },
            4: { mode: 'single', rule: 'even', gridSize: { rows: 4, cols: 4 }, bonusTime: 12 },
            5: { mode: 'single', rule: 'max', gridSize: { rows: 5, cols: 5 }, bonusTime: 20 }, // BOSS 1

            6: { mode: 'single', rule: 'equation_add', gridSize: { rows: 4, cols: 4 }, bonusTime: 15 },
            7: { mode: 'single', rule: 'equation_sub', gridSize: { rows: 4, cols: 5 }, bonusTime: 15 },
            10: { mode: 'single', rule: 'equation_add', gridSize: { rows: 6, cols: 6 }, bonusTime: 25 }, // BOSS 2

            11: { mode: 'pair', rule: 'pair_sum', gridSize: { rows: 5, cols: 5 }, bonusTime: 20 },
            15: { mode: 'pair', rule: 'pair_product', gridSize: { rows: 6, cols: 6 }, bonusTime: 30 }, // BOSS 3
        };

        const base = configs[level] || configs[1]; // Fallback
        return {
            id: level,
            mode: base.mode || 'single',
            rule: base.rule || 'max',
            gridSize: base.gridSize || { rows: 5, cols: 5 },
            bonusTime: base.bonusTime || 10,
            isBoss: isBoss,
            theme: theme
        };
    }

    private static generateDynamicLevel(level: number, isBoss: boolean, theme: ThemeConfig): LevelConfig {
        const rules = ['max', 'min', 'odd', 'even', 'equation_add', 'pair_sum', 'pair_product'];
        const rule = Phaser.Utils.Array.GetRandom(rules);
        
        // Increase grid size over time
        const difficultyIndex = Math.floor((level - 21) / 10);
        const rows = Math.min(8, 5 + difficultyIndex);
        const cols = Math.min(8, 5 + difficultyIndex);

        // Decay bonus time
        const bonusTime = Math.max(5, 15 - (level - 21) * 0.2);

        return {
            id: level,
            mode: (rule.startsWith('pair') ? 'pair' : 'single') as GameMode,
            rule: rule,
            gridSize: { rows, cols },
            bonusTime: Math.floor(bonusTime),
            isBoss: isBoss,
            theme: theme
        };
    }
}
