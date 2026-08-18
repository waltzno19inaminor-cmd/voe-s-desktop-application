// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  srcDir: 'src/',
  ssr: false,
  runtimeConfig: {
    public: {
      payloadManifestUrl: process.env.NUXT_PUBLIC_PAYLOAD_MANIFEST_URL || '',
    },
  },
  devServer: {
    host: '0.0.0.0',
    port: 3000,
  },
  nitro: {
    preset: 'static'
  },
  app: {
    head: {
      script: [
        {
          innerHTML: `
            (function () {
              try {
                var isDark = false;
                var themeStr = localStorage.getItem('user_theme_settings_v1');
                if (themeStr) {
                  try {
                    var theme = JSON.parse(themeStr);
                    if (theme.contentBg === '#E8E0D3' || theme.contentBg === '#e8e0d3' || theme.contentBg === '#f4f4f2' || theme.contentBg === '#F9F6F0' || theme.contentBg === '#f9f6f0') {
                      theme.contentBg = '#FFFFFF';
                    }
                    if (theme.gradientStart === '#E8E0D3' || theme.gradientStart === '#e8e0d3' || theme.gradientStart === '#f4f4f2' || theme.gradientStart === '#F9F6F0' || theme.gradientStart === '#f9f6f0') {
                      theme.gradientStart = '#FFFFFF';
                    }
                    if (theme.themeMode === 'dark') isDark = true;
                    else if (theme.themeMode === 'light') isDark = false;
                    else if (theme.themeMode === 'system') {
                      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    } else if (theme.isDark !== undefined) {
                      isDark = theme.isDark;
                    }
                    
                    if (theme.themeName && theme.themeName !== 'Default') {
                       document.documentElement.style.setProperty('--content-bg', isDark ? '#000000' : (theme.isGradient ? 'linear-gradient(' + theme.gradientAngle + 'deg, ' + theme.gradientStart + ', ' + theme.gradientEnd + ')' : theme.contentBg));
                    }
                  } catch (err) {}
                } else {
                   var darkLocal = localStorage.getItem('dark');
                   if (darkLocal !== null) {
                      isDark = darkLocal === 'true';
                   } else {
                      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                   }
                }

                if (isDark) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.add('theme-dark');
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('theme-light');
                }
              } catch (e) {}
            })();
          `,
          tagPosition: 'head'
        }
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/jor_mac.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap' }
      ]
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  experimental: {
    appManifest: false,
  },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/icon', '@pinia/nuxt'],

  tailwindcss: {
    exposeConfig: true,
    viewer: true,
    configPath: './tailwind.config.ts',
    config: {
      darkMode: 'class',

    }

  },
  ignore: [
    '**/src-tauri/**',
    '**/.output/**',
    '**/.nuxt/**',
    '**/.hotfix-work/**',
    '**/.secrets/**',
    '**/dist/**'
  ],
  vite: {
    server: {
      watch: {
        ignored: [
          '**/src-tauri/**',
          '**/.output/**',
          '**/.nuxt/**',
          '**/.hotfix-work/**',
          '**/.secrets/**',
          '**/dist/**'
        ]
      }
    }
  }
})
