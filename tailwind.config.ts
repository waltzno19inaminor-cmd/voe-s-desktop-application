import type { Config } from 'tailwindcss'

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
            backgroundImage: {
                'pattern-light': "url('/assets/pattern.png')",
                'pattern-dark': "url('/public/assets/pattern-dark.png')",
            }
        }
    },
    plugins: []
} satisfies Config
