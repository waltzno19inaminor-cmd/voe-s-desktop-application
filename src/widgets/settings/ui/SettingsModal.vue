<template>
  <div 
    class="fixed inset-0 z-[99999] overflow-y-auto font-sans text-slate-900 dark:text-white/90 selection:bg-amber-100 dark:selection:bg-amber-900/30 transition-colors duration-500"
    :style="{ backgroundColor: 'var(--content-bg)' }"
  >
    <!-- Ambient Background Layer for Settings -->
    <div 
      v-if="themeStore.settings.isImageBg && themeStore.settings.bgImage"
      class="fixed inset-0 pointer-events-none transition-all duration-[800ms] ease-in-out bg-center bg-cover"
      :style="{ 
        backgroundImage: 'var(--bg-image)', 
        filter: 'blur(var(--bg-image-blur)) brightness(var(--bg-image-brightness))',
        opacity: 'var(--bg-image-opacity)',
        zIndex: 0
      }"
    ></div>

    <div class="relative z-10 max-w-[1400px] mx-auto px-6 md:px-12 py-12 md:py-24 flex flex-col md:flex-row gap-16 md:gap-24">
      
      <!-- Left Sidebar Navigation -->
      <aside class="w-full md:w-64 flex-shrink-0">
        <div class="mb-12">
          <p class="text-[10px] uppercase tracking-[0.4em] font-bold text-slate-400 dark:text-slate-500 mb-6 px-4">Workspace</p>
          <h1 class="text-3xl font-serif italic mb-2 px-4">Settings</h1>
        </div>
        
        <nav class="space-y-2">
          <button 
            @click="activeSection = 'appearance'"
            class="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 group"
            :class="activeSection === 'appearance' ? 'bg-black/[0.03] dark:bg-white/[0.05] nier-text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white/60'"
          >
            <div class="flex items-center gap-4">
              <svg class="w-4 h-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <span class="text-[13px] font-medium tracking-tight">Appearance</span>
            </div>
            <div v-if="activeSection === 'appearance'" class="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
          </button>
          
          <!-- Placeholder for other sections to illustrate the sidebar concept -->
          <button class="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-300 dark:text-slate-700 cursor-not-allowed group">
            <svg class="w-4 h-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span class="text-[13px] font-medium tracking-tight opacity-50">Security & Privacy</span>
          </button>
          <button class="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-300 dark:text-slate-700 cursor-not-allowed group">
            <svg class="w-4 h-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span class="text-[13px] font-medium tracking-tight opacity-50">Account Architecture</span>
          </button>
        </nav>
        
        <div class="mt-24 px-4">
          <button @click="closeSettings" class="group flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] font-bold text-slate-400 hover:text-black dark:hover:text-white transition-all duration-500">
            <svg class="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 19l-7-7 7-7" />
            </svg>
            Exit Terminal
          </button>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="flex-grow max-w-3xl">
        <Transition name="fade-slide" mode="out-in">
          <div v-if="activeSection === 'appearance'" key="appearance" class="space-y-16">
            
            <header>
              <h2 class="text-[10px] uppercase tracking-[0.5em] font-bold text-amber-600/60 dark:text-amber-500/60 mb-2">Interface Aesthetic</h2>
              <p class="text-xs text-slate-400 dark:text-slate-500 font-serif italic">"Precision in architecture, elegance in performance."</p>
            </header>

            <!-- Preset Themes -->
            <section>
              <div class="flex items-center justify-between mb-8">
                <h3 class="text-[11px] uppercase tracking-[0.3em] font-bold">Curated Signatures</h3>
              </div>
              
              <div class="grid grid-cols-2 lg:grid-cols-3 gap-6">
                <button 
                  v-for="preset in presets" 
                  :key="preset.name"
                  @click="applyPreset(preset)"
                  class="group relative text-left p-6 rounded-[2.5rem] transition-all duration-700 border border-black/[0.03] dark:border-white/[0.03] bg-white/[0.2] dark:bg-white/[0.01] hover:bg-white/80 dark:hover:bg-white/[0.04] backdrop-blur-3xl overflow-hidden"
                  :class="{ 'ring-1 ring-amber-500/30 scale-[1.02] shadow-2xl shadow-amber-500/5': themeStore.settings.themeName === preset.name }"
                >
                  <div class="flex justify-between items-start mb-6">
                    <span class="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60 group-hover:opacity-100 transition-opacity">{{ preset.name }}</span>
                    <div v-if="themeStore.settings.themeName === preset.name" class="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                  </div>
                  
                  <div 
                    class="w-full aspect-[2/1] rounded-2xl relative overflow-hidden shadow-inner transition-transform duration-700 group-hover:scale-[1.05]"
                    :style="getPresetPreviewStyle(preset)"
                  >
                    <!-- Abstract UI Mockup Elements -->
                    <div class="absolute inset-x-0 h-4 bg-black/5 dark:bg-white/5 backdrop-blur-sm"></div>
                    <div class="absolute bottom-2 left-2 w-1/3 h-2 rounded-full bg-white/10 dark:bg-black/10"></div>
                  </div>
                </button>
              </div>
            </section>

            <!-- Custom Customization -->
            <section class="space-y-12">
              <div class="border-t border-black/[0.05] dark:border-white/[0.05] pt-12">
                <div class="flex items-center justify-between mb-10">
                  <h3 class="text-[11px] uppercase tracking-[0.3em] font-bold">Manual Calibration</h3>
                  <button 
                    @click="toggleGradient"
                    class="text-[9px] uppercase tracking-[0.2em] px-6 py-2.5 rounded-full border border-black/[0.05] dark:border-white/[0.05] transition-all duration-500"
                    :class="themeStore.settings.isGradient ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg shadow-black/10' : 'text-slate-400 hover:text-black dark:hover:text-white hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'"
                  >
                    {{ themeStore.settings.isGradient ? 'Dynamic Gradient' : 'Solid Canvas' }}
                  </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <!-- Header & Footer Controls -->
                  <div class="space-y-6">
                    <div class="flex items-center justify-between px-2 mb-4">
                      <label class="block text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Navigation Layers</label>
                      <div class="flex items-center gap-6">
                        <button 
                          @click="themeStore.unifyColors"
                          class="text-[9px] uppercase tracking-[0.2em] text-amber-500/80 hover:text-amber-500 transition-colors flex items-center gap-2"
                        >
                          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          Unify Layers
                        </button>
                        <button 
                          @click="themeStore.setTheme({ 
                            useHeaderBlur: !themeStore.settings.useHeaderBlur, 
                            themeName: themeStore.settings.themeName === 'Default' ? 'Custom' : themeStore.settings.themeName 
                          })"
                          class="flex items-center gap-3 group"
                        >
                        <span class="text-[9px] uppercase tracking-[0.2em] text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors">{{ themeStore.settings.useHeaderBlur ? 'Glassmorphism' : 'Solid Layer' }}</span>
                        <div 
                          class="w-8 h-4 rounded-full relative transition-colors duration-500 border border-black/[0.05] dark:border-white/[0.1]"
                          :class="themeStore.settings.useHeaderBlur ? 'bg-amber-500/60' : 'bg-black/5 dark:bg-white/5'"
                        >
                          <div 
                            class="absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-all duration-500"
                            :class="themeStore.settings.useHeaderBlur ? 'left-4.5' : 'left-1'"
                          ></div>
                        </div>
                      </button>
                    </div>
                  </div>
                  <div class="p-4 rounded-3xl bg-black/[0.02] dark:bg-white/[0.01] border border-black/[0.03] dark:border-white/[0.03] flex items-center justify-between group hover:bg-white/50 dark:hover:bg-white/[0.03] transition-all duration-500">
                      <span class="text-xs font-serif italic text-slate-600 dark:text-slate-400">Header Signature</span>
                      <div class="w-10 h-10 rounded-full border border-black/[0.05] dark:border-white/[0.1] p-1.5 shadow-sm group-hover:shadow-md transition-all">
                        <div class="w-full h-full rounded-full relative overflow-hidden" :style="{ backgroundColor: themeStore.settings.headerBg }">
                          <input type="color" v-model="themeStore.settings.headerBg" @input="() => { themeStore.settings.themeName = 'Custom'; themeStore.applyTheme() }" @change="themeStore.save()" class="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer opacity-0" />
                        </div>
                      </div>
                    </div>
                    <div class="p-4 rounded-3xl bg-black/[0.02] dark:bg-white/[0.01] border border-black/[0.03] dark:border-white/[0.03] flex items-center justify-between group hover:bg-white/50 dark:hover:bg-white/[0.03] transition-all duration-500">
                      <span class="text-xs font-serif italic text-slate-600 dark:text-slate-400">Footer Signature</span>
                      <div class="w-10 h-10 rounded-full border border-black/[0.05] dark:border-white/[0.1] p-1.5 shadow-sm group-hover:shadow-md transition-all">
                        <div class="w-full h-full rounded-full relative overflow-hidden" :style="{ backgroundColor: themeStore.settings.footerBg }">
                          <input type="color" v-model="themeStore.settings.footerBg" @input="() => { themeStore.settings.themeName = 'Custom'; themeStore.applyTheme() }" @change="themeStore.save()" class="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer opacity-0" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Canvas Controls -->
                  <div class="space-y-6">
                    <label class="block text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-4 px-2">Atmosphere</label>
                    
                    <!-- Solid Color Case -->
                    <div v-if="!themeStore.settings.isGradient" class="p-8 rounded-[2.5rem] bg-black/[0.02] dark:bg-white/[0.01] border border-black/[0.03] dark:border-white/[0.03] flex flex-col items-center gap-8 group hover:bg-white/50 dark:hover:bg-white/[0.03] transition-all duration-500">
                      <div class="flex flex-col items-center gap-4">
                        <div class="w-16 h-16 rounded-3xl p-1.5 border border-black/[0.05] dark:border-white/[0.1] shadow-2xl shadow-black/5 rotate-3 group-hover:rotate-0 transition-transform duration-700">
                          <div class="w-full h-full rounded-2xl relative overflow-hidden" :style="{ backgroundColor: themeStore.settings.contentBg }">
                            <input type="color" v-model="themeStore.settings.contentBg" @input="() => { themeStore.settings.themeName = 'Custom'; themeStore.applyTheme() }" @change="themeStore.save()" class="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer opacity-0" />
                          </div>
                        </div>
                        <span class="text-[9px] uppercase tracking-[0.2em] font-bold text-slate-400">Primary Tone</span>
                      </div>
                    </div>

                    <!-- Gradient Case -->
                    <div v-else class="p-8 rounded-[2.5rem] bg-black/[0.02] dark:bg-white/[0.01] border border-black/[0.03] dark:border-white/[0.03] space-y-8 group hover:bg-white/50 dark:hover:bg-white/[0.03] transition-all duration-500">
                      <div class="flex justify-around gap-8">
                        <div class="flex flex-col items-center gap-3">
                          <div class="w-12 h-12 rounded-2xl p-1 border border-black/[0.05] dark:border-white/[0.1] shadow-xl shadow-black/5">
                            <div class="w-full h-full rounded-xl relative overflow-hidden" :style="{ backgroundColor: themeStore.settings.gradientStart }">
                              <input type="color" v-model="themeStore.settings.gradientStart" @input="() => { themeStore.settings.themeName = 'Custom'; themeStore.applyTheme() }" @change="themeStore.save()" class="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer opacity-0" />
                            </div>
                          </div>
                          <span class="text-[8px] uppercase tracking-[0.1em] text-slate-400">Origin</span>
                        </div>
                        <div class="flex flex-col items-center gap-3">
                          <div class="w-12 h-12 rounded-2xl p-1 border border-black/[0.05] dark:border-white/[0.1] shadow-xl shadow-black/5">
                            <div class="w-full h-full rounded-xl relative overflow-hidden" :style="{ backgroundColor: themeStore.settings.gradientEnd }">
                              <input type="color" v-model="themeStore.settings.gradientEnd" @input="() => { themeStore.settings.themeName = 'Custom'; themeStore.applyTheme() }" @change="themeStore.save()" class="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer opacity-0" />
                            </div>
                          </div>
                          <span class="text-[8px] uppercase tracking-[0.1em] text-slate-400">Horizon</span>
                        </div>
                      </div>
                      
                      <div class="space-y-4 px-2">
                        <div class="flex justify-between items-center">
                          <span class="text-[9px] uppercase tracking-[0.2em] text-slate-400">Rotation Angle</span>
                          <span class="text-[10px] font-mono opacity-60">{{ themeStore.settings.gradientAngle }}°</span>
                        </div>
                        <input 
                          type="range" 
                          v-model.number="themeStore.settings.gradientAngle" 
                          min="0" 
                          max="360" 
                          @input="themeStore.applyTheme()"
                          @change="themeStore.save()"
                          class="w-full h-[2px] bg-black/[0.05] dark:bg-white/[0.1] rounded-full appearance-none cursor-pointer accent-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- Visual System -->
                  <div class="space-y-6">
                    <div class="flex items-center justify-between px-2 mb-4">
                      <label class="block text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Visual System</label>
                      <div class="flex items-center gap-6">
                        <button 
                          @click="() => {
                            const newState = !themeStore.settings.isImageBg;
                            if (!newState && themeStore.settings.themeName === 'Custom') {
                              themeStore.resetToDefault();
                            } else {
                              themeStore.setTheme({ 
                                isImageBg: newState, 
                                themeName: 'Custom' 
                              });
                            }
                          }"
                          class="flex items-center gap-3 group"
                        >
                          <span class="text-[9px] uppercase tracking-[0.2em] text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors">Ambient Image</span>
                          <div class="w-8 h-4 rounded-full relative transition-colors duration-500 border border-black/[0.05] dark:border-white/[0.1]" :class="themeStore.settings.isImageBg ? 'bg-amber-500/60' : 'bg-black/5 dark:bg-white/5'">
                            <div class="absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-all duration-500" :class="themeStore.settings.isImageBg ? 'left-4.5' : 'left-1'"></div>
                          </div>
                        </button>
                        <button 
                          @click="themeStore.toggleDark"
                          class="flex items-center gap-3 group"
                        >
                          <span class="text-[9px] uppercase tracking-[0.2em] text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors">{{ themeStore.settings.isDark ? 'Dark Mode' : 'Light Mode' }}</span>
                          <div class="w-8 h-4 rounded-full relative transition-colors duration-500 border border-black/[0.05] dark:border-white/[0.1]" :class="themeStore.settings.isDark ? 'bg-amber-500/60' : 'bg-black/5 dark:bg-white/5'">
                            <div class="absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-all duration-500" :class="themeStore.settings.isDark ? 'left-4.5' : 'left-1'"></div>
                          </div>
                        </button>
                      </div>
                    </div>

                    <!-- Ambient Image Controls -->
                    <Transition name="fade-slide">
                      <div v-if="themeStore.settings.isImageBg" class="p-8 rounded-[2.5rem] bg-black/[0.02] dark:bg-white/[0.01] border border-black/[0.03] dark:border-white/[0.03] space-y-10 group hover:bg-white/50 dark:hover:bg-white/[0.03] transition-all duration-500">
                        <!-- Image Upload/Preview -->
                        <div class="flex items-center gap-8">
                          <div class="relative w-24 h-24 rounded-3xl overflow-hidden border border-black/[0.05] dark:border-white/[0.1] bg-black/5 dark:bg-white/5 flex items-center justify-center shadow-inner group">
                            <div v-if="isUploading" class="absolute inset-0 z-20 bg-white/40 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center">
                              <div class="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            
                            <img v-if="themeStore.settings.bgImage && !isUploading" :src="themeStore.settings.bgImage" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <svg v-else-if="!isUploading" class="w-8 h-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <input 
                              type="file" 
                              class="absolute inset-0 opacity-0 cursor-pointer z-30" 
                              accept="image/*"
                              :disabled="isUploading"
                              @change="handleImageUpload" 
                            />
                          </div>
                          <div class="flex-1 space-y-2">
                             <span class="text-[10px] uppercase tracking-[0.2em] font-bold">
                               <template v-if="isUploading">Processing Atmosphere...</template>
                               <template v-else>Atmospheric Horizon</template>
                             </span>
                             <p class="text-[9px] text-slate-400 dark:text-slate-500 italic max-w-xs">Upload a signature image to define the app's emotional depth. Recommended: Abstract or Landscapes.</p>
                             <button 
                                v-if="themeStore.settings.bgImage"
                                @click="themeStore.setTheme({ bgImage: '', themeName: 'Custom' })"
                                class="text-[9px] uppercase tracking-[0.1em] text-rose-500/80 hover:text-rose-500 transition-colors"
                             >
                               Remove Horizon
                             </button>
                          </div>
                        </div>

                        <!-- Range Sliders -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                          <div class="space-y-4">
                            <div class="flex justify-between items-center">
                              <span class="text-[9px] uppercase tracking-[0.2em] text-slate-400">Diffusion (Blur)</span>
                              <span class="text-[10px] font-mono opacity-60">{{ themeStore.settings.bgImageBlur }}px</span>
                            </div>
                            <input 
                              type="range" 
                              v-model.number="themeStore.settings.bgImageBlur" 
                              min="0" 
                              max="100" 
                              @input="themeStore.applyTheme()"
                              @change="themeStore.save()"
                              class="w-full h-[2px] bg-black/[0.05] dark:bg-white/[0.1] rounded-full appearance-none cursor-pointer accent-amber-500"
                            />
                          </div>
                          
                          <div class="space-y-4">
                            <div class="flex justify-between items-center">
                              <span class="text-[9px] uppercase tracking-[0.2em] text-slate-400">Atmosphere Density</span>
                              <span class="text-[10px] font-mono opacity-60">{{ themeStore.settings.bgImageOpacity }}%</span>
                            </div>
                            <input 
                              type="range" 
                              v-model.number="themeStore.settings.bgImageOpacity" 
                              min="0" 
                              max="100" 
                              @input="themeStore.applyTheme()"
                              @change="themeStore.save()"
                              class="w-full h-[2px] bg-black/[0.05] dark:bg-white/[0.1] rounded-full appearance-none cursor-pointer accent-amber-500"
                            />
                          </div>

                          <div class="space-y-4">
                            <div class="flex justify-between items-center">
                              <span class="text-[9px] uppercase tracking-[0.2em] text-slate-400">Luminance</span>
                              <span class="text-[10px] font-mono opacity-60">{{ themeStore.settings.bgImageBrightness }}%</span>
                            </div>
                            <input 
                              type="range" 
                              v-model.number="themeStore.settings.bgImageBrightness" 
                              min="0" 
                              max="200" 
                              @input="themeStore.applyTheme()"
                              @change="themeStore.save()"
                              class="w-full h-[2px] bg-black/[0.05] dark:bg-white/[0.1] rounded-full appearance-none cursor-pointer accent-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    </Transition>
                  </div>
                </div>
              </div>
            </section>
            
            <!-- Dynamic Widget Preview -->
            <section class="space-y-10">
              <div class="border-t border-black/[0.05] dark:border-white/[0.05] pt-12">
                <header class="mb-8 px-2">
                  <h3 class="text-[11px] uppercase tracking-[0.3em] font-bold">Aesthetic Preview</h3>
                  <p class="text-[9px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mt-2">Observe real-time interaction with trading architecture</p>
                </header>
                
                <div class="p-1 rounded-[2rem] bg-black/[0.01] dark:bg-white/[0.01] border border-black/[0.03] dark:border-white/[0.03] overflow-hidden shadow-sm">
                  <TradingViewNews />
                </div>
              </div>
            </section>

            <footer class="pt-24 border-t border-black/[0.05] dark:border-white/[0.05] flex justify-between items-center opacity-40 hover:opacity-100 transition-opacity duration-700">
              <p class="text-[9px] uppercase tracking-[0.4em] font-bold">Structural Persistence &middot; MMXXVI</p>
              <button 
                @click="themeStore.resetToDefault()"
                class="text-[9px] uppercase tracking-[0.3em] font-bold text-rose-500/80 hover:text-rose-500 transition-colors flex items-center gap-3"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Restore Defaults
              </button>
            </footer>
          </div>
        </Transition>
      </main>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useThemeStore, type ThemeSettings } from '~/features/store/useTheme'
import TradingViewNews from '~/widgets/dashboard/ui/TradingViewNews.vue'
import { closeSettings } from '~/widgets/settings/model/useSettings'

const themeStore = useThemeStore()
const activeSection = ref('appearance')
const isUploading = ref(false)

interface Preset extends ThemeSettings {
  name: string
}

const presets: Preset[] = [
  {
    name: 'Default',
    headerBg: 'transparent',
    footerBg: 'transparent',
    contentBg: '#FFFFFF',
    isGradient: false,
    gradientAngle: 135,
    gradientStart: '#FFFFFF',
    gradientEnd: '#e2e8f0',
    themeName: 'Default',
    isDark: false,
    useHeaderBlur: true,
    bgImage: '',
    bgImageBlur: 0,
    bgImageOpacity: 50,
    bgImageBrightness: 100,
    isImageBg: false
  },
  {
    name: 'Midnight',
    headerBg: '#050505cc',
    footerBg: '#050505',
    contentBg: '#0a0a0a',
    isGradient: true,
    gradientAngle: 135,
    gradientStart: '#111827',
    gradientEnd: '#000000',
    themeName: 'Midnight',
    isDark: true,
    useHeaderBlur: true,
    bgImage: '',
    bgImageBlur: 0,
    bgImageOpacity: 50,
    bgImageBrightness: 100,
    isImageBg: false
  },
  {
    name: 'Forest',
    headerBg: '#022c22cc',
    footerBg: '#022c22',
    contentBg: '#064e3b',
    isGradient: true,
    gradientAngle: 135,
    gradientStart: '#065f46',
    gradientEnd: '#022c22',
    themeName: 'Forest',
    isDark: true,
    useHeaderBlur: true,
    bgImage: '',
    bgImageBlur: 0,
    bgImageOpacity: 50,
    bgImageBrightness: 100,
    isImageBg: false
  },
  {
    name: 'Ocean',
    headerBg: '#172554cc',
    footerBg: '#172554',
    contentBg: '#1e3a8a',
    isGradient: true,
    gradientAngle: 135,
    gradientStart: '#1e40af',
    gradientEnd: '#172554',
    themeName: 'Ocean',
    isDark: true,
    useHeaderBlur: true,
    bgImage: '',
    bgImageBlur: 0,
    bgImageOpacity: 50,
    bgImageBrightness: 100,
    isImageBg: false
  },
  {
    name: 'Onyx',
    headerBg: '#000000cc',
    footerBg: '#000000',
    contentBg: '#050505',
    isGradient: false,
    gradientAngle: 135,
    gradientStart: '#050505',
    gradientEnd: '#000000',
    themeName: 'Onyx',
    isDark: true,
    useHeaderBlur: true,
    bgImage: '',
    bgImageBlur: 0,
    bgImageOpacity: 50,
    bgImageBrightness: 100,
    isImageBg: false
  }
]

function getPresetPreviewStyle(preset: Preset) {
  if (preset.isGradient) {
    return {
      background: `linear-gradient(${preset.gradientAngle}deg, ${preset.gradientStart}, ${preset.gradientEnd})`
    }
  }
  return {
    backgroundColor: preset.contentBg
  }
}

function applyPreset(preset: Preset) {
  themeStore.setTheme({
    ...preset,
    themeName: preset.name
  })
}

function toggleGradient() {
  themeStore.setTheme({
    isGradient: !themeStore.settings.isGradient,
    themeName: 'Custom'
  })
}

function handleImageUpload(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  isUploading.value = true
  const reader = new FileReader()
  reader.onload = (event) => {
    const base64 = event.target?.result as string
    themeStore.setTheme({
      bgImage: base64,
      isImageBg: true,
      themeName: 'Custom'
    })
    isUploading.value = false
  }
  reader.onerror = () => {
    isUploading.value = false
  }
  reader.readAsDataURL(file)
}
</script>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(15px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-15px);
}

input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: #f59e0b;
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid white;
  box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
  transition: all 0.3s ease;
}

.dark input[type="range"]::-webkit-slider-thumb {
  border-color: #050505;
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}
</style>
