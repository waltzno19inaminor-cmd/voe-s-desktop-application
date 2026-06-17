import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

export default {
    darkMode: 'class',
    content: [
        './src/app.vue',
        './src/pages/**/*.{vue,js,ts}',
        './src/widgets/**/*.{vue,js,ts}',
        './src/features/**/*.{vue,js,ts}',
        './src/entities/**/*.{vue,js,ts}',
        './src/shared/**/*.{vue,js,ts}'
    ],
    theme: {
        extend: {
            colors: {
                'theme': {
                    'bg': 'rgb(var(--theme-bg-rgb) / <alpha-value>)',
                    'panel': 'rgb(var(--theme-panel-rgb) / <alpha-value>)',
                    'text': 'rgb(var(--theme-text-rgb) / <alpha-value>)',
                    'border': 'rgb(var(--theme-border-rgb) / <alpha-value>)',
                    'accent': 'rgb(var(--theme-accent-rgb) / <alpha-value>)',
                },
                'nier': {
                    'black': '#0a0a0a',
                    'white': '#FFFFFF',
                    'text': {
                        'light': '#2c2c2a',
                        'dark': '#ffffff'
                    },
                    'border': {
                        'light': 'rgba(0, 0, 0, 0.1)',
                        'dark': 'rgba(255, 255, 255, 0.1)'
                    }
                }
            },
            backgroundImage: {
                'pattern-light': "url('/assets/pattern.png')",
                'pattern-dark': "url('/public/assets/pattern-dark.png')",
            }
        }
    },
    plugins: [
        plugin(function({ addUtilities }) {
            addUtilities({
                '.nier-text-primary': {
                    'color': 'var(--theme-text)',
                },
                '.nier-text-secondary': {
                    'color': 'var(--theme-muted)',
                },
                '.nier-text-inverted': {
                    'color': 'var(--theme-bg)',
                },
                '.nier-bg-primary': {
                    'background-color': 'var(--theme-bg)',
                },
                '.nier-bg-panel': {
                    'background-color': 'var(--theme-panel)',
                },
                '.nier-bg-inverted': {
                    'background-color': 'var(--theme-text)',
                },
                '.nier-border-primary': {
                    'border-color': 'var(--theme-border)',
                },
                '.theme-grid': {
                    'background-image': 'radial-gradient(var(--theme-grid-dot) 1px, transparent 1px)',
                    'background-size': '24px 24px',
                    'background-position': 'center',
                },
            })
        })
    ]
} satisfies Config
