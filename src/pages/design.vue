<template>
  <div class="design-gradflow-page ethereal-void h-screen relative overflow-y-auto transition-all duration-1000"
       :class="[isDark ? 'is-dark dark theme-dark' : 'theme-light']">
    
    <!-- SYSTEM BACKGROUND -->
    <GradflowBackground preset="mystic" :config="gradflowConfig" />
    <DesignVignette :is-dark="isDark" />


    <div class="relative z-10 p-16 bg-transparent text-theme-text min-h-screen">
      <!-- HEADER -->
      <header class="mb-24 flex flex-col items-start text-theme-text">
        <div class="flex items-center space-x-4 mb-4">
          <div class="w-3 h-3 bg-theme-text rotate-45"></div>
          <h1 class="text-[10px] font-mono tracking-[0.8em] uppercase font-black opacity-40 text-theme-text">System_Design_Laboratory</h1>
        </div>
        <p class="text-4xl font-mono font-black uppercase tracking-tighter text-theme-text">Archival_Core_v1.0</p>
        <div class="h-px w-64 bg-theme-border mt-8"></div>
      </header>

      <div class="grid grid-cols-1 gap-24 max-w-6xl">
        
        <!-- SECTION 1: DESIGN TOKENS -->
        <section class="flex flex-col space-y-12">
          <div class="flex items-center space-x-6">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">01 // DNA_Tokens</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div v-for="token in colorTokens" :key="token.name" class="flex flex-col space-y-3">
               <div class="h-24 w-full border border-theme-border relative overflow-hidden" :style="{ backgroundColor: token.value }">
                  <div class="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent"></div>
               </div>
               <span class="text-[9px] font-mono tracking-widest uppercase opacity-40">{{ token.name }}</span>
               <span class="text-[11px] font-mono uppercase">{{ token.value }}</span>
            </div>
          </div>
        </section>

        <!-- SECTION 2: TYPOGRAPHY -->
        <section class="flex flex-col space-y-12">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">02 // Typography_Scale</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="space-y-12 border-l border-theme-border pl-12">
            <div class="flex flex-col space-y-2">
              <span class="text-[8px] font-mono opacity-30 uppercase tracking-[0.5em] text-theme-text">H1 // Cinematic_Header</span>
              <h2 class="text-6xl font-light font-serif tracking-[0.4em] dark:opacity-100 uppercase drop-shadow-sm leading-relaxed text-theme-text">Strategic_Protocol</h2>
            </div>
            
            <div class="flex flex-col space-y-2">
              <span class="text-[8px] font-mono opacity-30 uppercase tracking-[0.5em] text-theme-text">H2 // Technical_Module</span>
              <h3 class="text-2xl font-mono font-black uppercase tracking-[0.2em] text-theme-text">Archival_Node_042</h3>
            </div>

            <div class="flex flex-col space-y-2">
              <span class="text-[8px] font-mono opacity-30 uppercase tracking-[0.5em] text-theme-text">Body // Narrative_Data</span>
              <p class="max-w-xl text-sm font-mono leading-relaxed opacity-70 text-theme-text">
                The Genesis Matrix facilitates high-frequency tactical execution by decoupling neural processing from market volatility. 
                Protocols are enforced through a rigid archival hierarchy.
              </p>
            </div>

            <div class="flex flex-col space-y-2">
              <span class="text-[8px] font-mono opacity-30 uppercase tracking-[0.5em] text-theme-text">Small // System_Telemetry</span>
              <p class="text-[9px] font-mono uppercase tracking-[0.4em] font-black opacity-40 text-theme-text">
                Session_Time: 04:22:19 // Link_Status: OPTIMAL
              </p>
            </div>
          </div>
        </section>

        <!-- SECTION 3: EXBUTTON_MATRIX -->
        <section class="flex flex-col space-y-12">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">03 // ExButton_Matrix</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
            
            <!-- GHOST VARIANT -->
            <div class="flex flex-col space-y-6">
              <span class="text-[8px] font-mono opacity-30 uppercase tracking-[0.5em] text-theme-text">Variant // Ghost</span>
              <ExButton variant="ghost">Execute_Ghost</ExButton>
            </div>

            <!-- SOLID VARIANT -->
            <div class="flex flex-col space-y-6">
              <span class="text-[8px] font-mono opacity-30 uppercase tracking-[0.5em] text-theme-text">Variant // Solid</span>
              <ExButton variant="solid">Commit_Solid</ExButton>
            </div>

            <!-- TACTICAL VARIANT -->
            <div class="flex flex-col space-y-6">
              <span class="text-[8px] font-mono opacity-30 uppercase tracking-[0.5em] text-theme-text">Variant // Tactical</span>
              <ExButton variant="tactical">Link_Tactical</ExButton>
            </div>

          </div>
        </section>

        <!-- SECTION 4: EXPANEL_ARCHIVE -->
        <section class="flex flex-col space-y-12">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">04 // ExPanel_Archive</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <!-- STANDARD VARIANT -->
            <div class="flex flex-col space-y-6">
              <span class="text-[9px] font-mono tracking-[0.4em] opacity-40 uppercase">Variant: Standard (Heavy)</span>
              <ExPanel title="ARCHIVAL_REGISTRY_v1.1" telemetry="0x4F92" variant="standard">
                <div class="space-y-4 font-mono text-[11px] leading-relaxed opacity-80 uppercase tracking-widest nier-text-primary">
                  <p>Establishing secure connection to tactical node...</p>
                  <p class="text-blue-500">>> Authenticated: [REDACTED]</p>
                  <div class="h-1 bg-black/10 dark:bg-white/10 w-full overflow-hidden">
                    <div class="h-full bg-blue-500 w-2/3 animate-pulse"></div>
                  </div>
                </div>
              </ExPanel>
            </div>

            <!-- LIGHT VARIANT -->
            <div class="flex flex-col space-y-6">
              <span class="text-[9px] font-mono tracking-[0.4em] opacity-40 uppercase">Variant: Light (Minimalist)</span>
              <ExPanel title="TELEMETRY_FEED_SUB" telemetry="LIVE_STREAM" variant="light">
                <div class="space-y-4 font-mono text-[11px] leading-relaxed opacity-80 uppercase tracking-widest nier-text-primary">
                  <div class="grid grid-cols-2 gap-4">
                    <div class="border nier-border-primary p-4">
                      <span class="block opacity-40 text-[8px] mb-2">Sync_Rate</span>
                      <span class="text-lg font-black">98.2%</span>
                    </div>
                    <div class="border nier-border-primary p-4">
                      <span class="block opacity-40 text-[8px] mb-2">Latency</span>
                      <span class="text-lg font-black">42ms</span>
                    </div>
                  </div>
                </div>
              </ExPanel>
            </div>
          </div>
        </section>

        <!-- SECTION 5: EXINPUT_REGISTRY -->
        <section class="flex flex-col space-y-12">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">05 // ExInput_Registry</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl">
            <!-- Standard Input -->
            <div class="flex flex-col space-y-4">
              <span class="text-[8px] font-mono opacity-30 uppercase tracking-[0.5em] text-theme-text">Type // Standard_Registry</span>
              <div class="relative group">
                <span class="absolute left-0 top-1/2 -translate-y-1/2 text-[9px] font-mono opacity-30 group-focus-within:opacity-100 transition-opacity uppercase tracking-widest px-4">Search_</span>
                <input type="text" placeholder="INDEX_KEYWORD" 
                       class="w-full bg-theme-bg border border-theme-border py-4 pl-24 pr-4 text-[11px] font-mono tracking-widest focus:outline-none focus:border-theme-text transition-all text-theme-text placeholder:opacity-20 uppercase" />
              </div>
            </div>

            <!-- Tactical Input (Underlined) -->
            <div class="flex flex-col space-y-4">
              <span class="text-[8px] font-mono opacity-30 uppercase tracking-[0.5em] text-theme-text">Type // Tactical_Terminal</span>
              <div class="relative group border-b border-theme-border focus-within:border-theme-text transition-colors duration-500">
                <input type="text" placeholder="ENTER_PROTOCOL_COMMAND" 
                       class="w-full bg-transparent py-4 px-2 text-[11px] font-mono tracking-[0.4em] focus:outline-none text-theme-text placeholder:opacity-20 uppercase" />
                <div class="absolute bottom-0 left-0 w-0 h-0.5 bg-theme-text group-focus-within:w-full transition-all duration-700 ease-[var(--nier-ease)]"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- SECTION 6: EXDIVIDER_LATTICE -->
        <section class="flex flex-col space-y-12 pb-24">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">06 // ExDivider_Lattice</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="space-y-12">
            <!-- Simple Divider -->
            <div class="flex flex-col space-y-4">
              <span class="text-[8px] font-mono opacity-30 uppercase tracking-[0.5em] text-theme-text">Style // Linear_Archive</span>
              <div class="h-px w-full bg-theme-border"></div>
            </div>

            <!-- Tactical Divider -->
            <div class="flex flex-col space-y-4">
              <span class="text-[8px] font-mono opacity-30 uppercase tracking-[0.5em] text-theme-text">Style // Tactical_Bracing</span>
              <div class="flex items-center">
                <div class="h-px flex-grow bg-theme-border"></div>
                <div class="px-6 flex items-center space-x-2">
                  <div class="w-1 h-1 bg-theme-text rotate-45 opacity-20"></div>
                  <div class="w-1.5 h-1.5 bg-theme-text rotate-45"></div>
                  <div class="w-1 h-1 bg-theme-text rotate-45 opacity-20"></div>
                </div>
                <div class="h-px flex-grow bg-theme-border"></div>
              </div>
            </div>

            <!-- Double "Newspaper" Divider -->
            <div class="flex flex-col space-y-4">
              <span class="text-[8px] font-mono opacity-30 uppercase tracking-[0.5em] text-theme-text">Style // Masterclass_Double</span>
              <div class="border-t-4 border-double border-theme-border py-1"></div>
            </div>
          </div>
        </section>
        <!-- SECTION 7: EXTAG_METADATA -->
        <section class="flex flex-col space-y-12">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">07 // ExTag_Metadata</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="flex flex-wrap gap-6">
            <!-- Ghost Tag -->
            <div class="px-3 py-1 border border-theme-border flex items-center space-x-3">
              <div class="w-1 h-1 bg-theme-accent"></div>
              <span class="text-[9px] font-mono uppercase tracking-[0.2em] text-theme-text">Protocol</span>
            </div>

            <!-- Solid Tag -->
            <div class="px-3 py-1 bg-theme-text text-theme-bg flex items-center space-x-3">
              <span class="text-[9px] font-mono uppercase tracking-[0.2em] font-black">Setups</span>
            </div>

            <!-- Outline Tag -->
            <div class="px-3 py-1 border border-theme-text/40 flex items-center space-x-3 group hover:border-theme-text transition-colors duration-300 cursor-default">
              <span class="text-[9px] font-mono uppercase tracking-[0.2em] text-theme-text opacity-60 group-hover:opacity-100 transition-opacity">Research</span>
            </div>
          </div>
        </section>

        <!-- SECTION 8: EXIDENTITY_REGISTRY -->
        <section class="flex flex-col space-y-12 pb-32">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">08 // ExIdentity_Registry</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-2xl">
            <!-- Basic Identity -->
            <div class="flex items-center space-x-4 group cursor-default">
              <div class="w-10 h-10 border border-theme-border relative overflow-hidden flex items-center justify-center bg-theme-text/5">
                <div class="w-4 h-4 border border-theme-text opacity-20 rotate-45 group-hover:rotate-[135deg] transition-transform duration-700"></div>
                <div class="absolute inset-0 bg-gradient-to-tr from-theme-text/10 to-transparent"></div>
              </div>
              <div class="flex flex-col">
                <span class="text-[11px] font-mono uppercase tracking-widest text-theme-text font-black">Operator_0x4F</span>
                <span class="text-[8px] font-mono uppercase tracking-[0.3em] opacity-30 text-theme-text">Rank: Architect</span>
              </div>
            </div>

            <!-- Detailed Identity -->
            <div class="flex items-center space-x-4 p-4 border border-theme-border bg-theme-text/[0.02]">
              <div class="w-12 h-12 bg-theme-text flex items-center justify-center">
                 <span class="text-theme-bg font-mono font-black text-xl">E</span>
              </div>
              <div class="flex flex-col">
                <div class="flex items-center space-x-2">
                  <span class="text-[11px] font-mono uppercase tracking-widest text-theme-text">Eve_System</span>
                  <div class="w-1.5 h-1.5 bg-theme-accent rounded-full animate-pulse"></div>
                </div>
                <span class="text-[8px] font-mono uppercase tracking-[0.3em] opacity-40 text-theme-text">Master_Core // Reified</span>
              </div>
            </div>
          </div>
        </section>

        <!-- SECTION 9: EXTOOLTIP_DIAGNOSTIC -->
        <section class="flex flex-col space-y-12 pb-48">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">09 // ExTooltip_Diagnostic</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="flex flex-wrap gap-24">
            <!-- Basic Tooltip -->
            <div class="relative group">
              <div class="px-6 py-2 border border-theme-border text-[10px] font-mono uppercase tracking-[0.4em] text-theme-text cursor-default">
                Hover_Trigger
              </div>
              
              <!-- THE TOOLTIP -->
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-500 pointer-events-none z-50">
                <div class="bg-theme-bg border border-theme-text/20 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.3)] min-w-[200px] flex flex-col space-y-2 text-theme-text">
                  <div class="flex items-center justify-between border-b border-theme-border pb-2">
                    <span class="text-[8px] font-mono uppercase tracking-[0.3em] font-black">Registry_Info</span>
                    <div class="w-1.5 h-1.5 bg-theme-accent rotate-45"></div>
                  </div>
                  <p class="text-[10px] font-mono leading-relaxed opacity-70">
                    Tactical data node reified at current cursor coordinates.
                  </p>
                </div>
                <!-- Tooltip Stem -->
                <div class="w-2 h-2 bg-theme-bg border-r border-b border-theme-text/20 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
              </div>
            </div>

            <!-- Tactical Tooltip (Nier Style) -->
            <div class="relative group">
              <div class="px-6 py-2 bg-theme-text text-theme-bg text-[10px] font-mono uppercase tracking-[0.4em] font-black cursor-default">
                Protocol_Link
              </div>
              
              <!-- THE TOOLTIP -->
              <div class="absolute bottom-full left-0 mb-4 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-700 pointer-events-none z-50">
                <div class="bg-theme-bg border-2 border-theme-text p-6 shadow-[20px_20px_0_rgba(0,0,0,0.1)] min-w-[260px] relative text-theme-text">
                  <!-- Corner Brackets -->
                  <div class="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-theme-text"></div>
                  <div class="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-theme-text"></div>
                  
                  <div class="flex flex-col space-y-4">
                    <h4 class="text-[11px] font-mono font-black uppercase tracking-[0.5em] text-theme-text">Link_Status: Alpha</h4>
                    <div class="h-px w-full bg-theme-border"></div>
                    <p class="text-[9px] font-mono leading-loose uppercase tracking-widest opacity-60">
                      Warning: Structural integrity of current node is at 84%. 
                      Immediate reification required.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>
        <!-- SECTION 10: EXACTIVITY_PROTOTYPE -->
        <section class="flex flex-col space-y-12 pb-64">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">10 // ExActivity_Log_Reified</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <ExActivityMonitor />
        </section>
        <!-- SECTION 11: EXGENESIS_MENU_LATTICE -->
        <section class="flex flex-col space-y-12 pb-64">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">11 // ExGenesis_Menu_Lattice</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="h-[600px] border border-theme-border relative overflow-hidden bg-theme-text/[0.01]">
            <ExGenesisMenu />
          </div>
        </section>
        <!-- SECTION 12: EXINITIALIZATION_SEQUENCE -->
        <section class="flex flex-col space-y-12 pb-64">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">12 // ExInitialization_Sequence</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="flex flex-col items-start space-y-6">
            <ExText variant="body">
              The initialization sequence provides a high-fidelity atmospheric entry point for the application. 
              It features simulated boot telemetry and rigid assembly animations.
            </ExText>
            <ExButton variant="solid" @click="showInitPreview = true">
              Preview_Sequence
            </ExButton>
          </div>

          <!-- The Overlay (Only visible during preview) -->
          <ExInitialization v-if="showInitPreview" @initiate="showInitPreview = false" />
        </section>
        <!-- SECTION 14: EXCONDITION_CREATOR_SYSTEM -->
        <section class="flex flex-col space-y-12 pb-64">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">14 // ExCondition_Creator_System</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="flex flex-col lg:flex-row gap-16 items-start">
             <!-- EDITOR PANEL -->
             <ExPanel class="w-full max-w-xl" noPadding variant="light">
                <template #header>
                   IDENTIFY_NEW_PROTOCOL // CONDITION_CREATOR
                </template>

                <div class="p-10 flex flex-col space-y-10">
                   <!-- Field: Name -->
                   <div class="flex flex-col space-y-4">
                      <div class="flex items-center justify-between">
                         <ExText variant="telemetry" class="opacity-40">Protocol_Identity</ExText>
                         <span class="text-[8px] font-mono opacity-20 uppercase tracking-widest">REQ_001</span>
                      </div>
                      <ExInput v-model="customCondition.name" placeholder="ENTER_CONDITION_NAME..." variant="standard" class="!py-5 !pl-6 !text-lg" />
                   </div>

                   <!-- Field: Description -->
                   <div class="flex flex-col space-y-4">
                      <div class="flex items-center justify-between">
                         <ExText variant="telemetry" class="opacity-40">Narrative_Registry</ExText>
                         <span class="text-[8px] font-mono opacity-20 uppercase tracking-widest">REQ_002</span>
                      </div>
                      <div class="relative group">
                         <textarea 
                           v-model="customCondition.description"
                           placeholder="DESCRIBE_THE_TACTICAL_SIGNIFICANCE_OF_THIS_CONDITION..."
                           class="w-full h-32 bg-theme-bg border border-theme-border p-6 text-xs font-mono tracking-widest focus:outline-none focus:border-theme-text transition-all text-theme-text placeholder:opacity-20 uppercase resize-none leading-relaxed"
                         ></textarea>
                         <!-- Gothic Corners for Textarea -->
                         <ExGothicCorners variant="light" :opacity="0.2" class="group-focus-within:opacity-80 transition-opacity duration-500" />
                      </div>
                   </div>

                   <!-- Field: Color Swatch -->
                   <div class="flex flex-col space-y-4">
                      <ExText variant="telemetry" class="opacity-40 mb-2">Chromatic_Index</ExText>
                      <div class="flex flex-wrap gap-4">
                         <button v-for="color in ['#ffffff', '#fb7185', '#38bdf8', '#10b981', '#f59e0b', '#a78bfa']" 
                                 :key="color"
                                 @click="customCondition.color = color"
                                 class="w-10 h-10 border relative group transition-all hover:scale-110"
                                 :class="customCondition.color === color ? 'border-theme-text scale-110' : 'border-theme-border'"
                                 :style="{ backgroundColor: color }">
                            <div class="absolute inset-0 border-2 border-theme-bg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div class="absolute -inset-1 border border-theme-text opacity-0 group-hover:opacity-100 transition-opacity"
                                 :class="{ 'opacity-100': customCondition.color === color }"></div>
                         </button>
                      </div>
                   </div>

                   <!-- Footer Actions -->
                   <div class="pt-10 border-t border-theme-border flex items-center justify-between">
                      <div class="flex items-center space-x-3 opacity-20 group cursor-pointer hover:opacity-100 transition-opacity">
                         <div class="w-1.5 h-1.5 border border-theme-text rotate-45"></div>
                         <span class="text-[9px] font-mono uppercase tracking-[0.3em]">Discard_Draft</span>
                      </div>
                      <ExButton variant="tactical">Initialize_Protocol</ExButton>
                   </div>
                </div>
             </ExPanel>

             <!-- INFORMATIONAL ASIDE & PREVIEW -->
             <div class="flex flex-col space-y-12 max-w-sm pt-8">
                <!-- LIVE PREVIEW SECTION -->
                <div class="flex flex-col space-y-6">
                   <ExText variant="telemetry" class="opacity-40">Protocol_Visualization_Preview</ExText>
                   <div class="relative w-48 h-48 border border-theme-border bg-theme-text/[0.01] flex items-center justify-center overflow-hidden group">
                      <!-- Grid hint -->
                      <div class="absolute inset-0 opacity-10 pointer-events-none" 
                           style="background-image: radial-gradient(circle, var(--theme-text) 1px, transparent 1px); background-size: 20px 20px;"></div>
                      
                      <!-- THE NODE PREVIEW -->
                      <div class="relative w-16 h-16 border-[2px] flex items-center justify-center bg-theme-bg transition-all duration-700 group-hover:scale-110"
                           :style="{ borderColor: customCondition.color, boxShadow: `0 0 30px ${customCondition.color}20` }">
                         <div class="absolute inset-0 opacity-[0.03]" :style="{ backgroundColor: customCondition.color }"></div>
                         <!-- Dynamic Text Identification -->
                         <div class="flex flex-col items-center">
                            <span class="text-[20px] font-mono font-black tracking-tighter uppercase transition-all duration-500"
                                  :style="{ color: customCondition.color }">
                               {{ customCondition.name.slice(0, 3) || 'IDN' }}
                            </span>
                         </div>

                         <!-- Connection points -->
                         <div class="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 border-2 bg-theme-bg rotate-45 transition-colors duration-500"
                              :style="{ borderColor: customCondition.color }"></div>
                         <div class="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 border-2 bg-theme-bg rotate-45 transition-colors duration-500"
                              :style="{ borderColor: customCondition.color }"></div>

                         <!-- Subtle Glow layer based on picked color -->
                         <div class="absolute -inset-2 border opacity-10 transition-colors duration-500" :style="{ borderColor: customCondition.color }"></div>
                      </div>

                      <div class="absolute bottom-4 left-0 w-full flex justify-center">
                         <span class="text-[7px] font-mono uppercase tracking-[0.4em] opacity-30">Render_Matrix_v1.0</span>
                      </div>
                   </div>
                </div>

                <div class="flex items-center space-x-4">
                   <div class="w-px h-12 bg-theme-text"></div>
                   <ExText variant="body" class="italic opacity-80 leading-relaxed">
                      "Each custom condition is a reified sequence within the Genesis Matrix. Precision in nomenclature ensures structural integrity."
                   </ExText>
                </div>
                
                <div class="p-6 border border-theme-border bg-theme-text/[0.02] flex flex-col space-y-4">
                   <span class="text-[9px] font-mono uppercase tracking-widest font-black opacity-50">System_Requirements</span>
                   <ul class="space-y-2">
                      <li v-for="req in ['Unique Identifier', 'Valid Telemetry Link', 'Archive Priority']" :key="req" class="flex items-center space-x-3">
                         <div class="w-1 h-1 bg-theme-text opacity-40"></div>
                         <span class="text-[8px] font-mono uppercase tracking-widest opacity-40">{{ req }}</span>
                      </li>
                   </ul>
                </div>
             </div>
          </div>
        </section>

        <!-- SECTION 15: EXTRADE_ANALYSIS_DASHBOARD -->
        <section class="flex flex-col space-y-12 pb-64">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">15 // ExTrade_Analysis_Dashboard</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="flex flex-col space-y-8">
            <ExText variant="body" class="max-w-2xl">
              The Trade Analysis Dashboard provides a high-fidelity diagnostic breakdown of execution performance. 
              It synthesizes temporal data, strategic compliance, and historical percentile ranking into a single tactical interface.
            </ExText>
            
            <ExTradeAnalysisPanel />
          </div>
        </section>

        <!-- SECTION 16: EXTRADE_SHARE_CARD_PREVIEW -->
        <section class="flex flex-col space-y-12 pb-64">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">16 // ExTrade_Share_Card_Preview</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="flex flex-col space-y-8">
            <ExText variant="body" class="max-w-2xl">
              The Share Card is a high-fidelity visual export designed for rapid tactical dissemination. 
              It synthesizes core metrics into a cinematic 16:9 archival template.
            </ExText>
            
            <!-- THE CARD DESIGN (TRUE 1200x675 RESOLUTION) -->
            <ExTradeShareCardPreview
              efficiency="78"
              protocol="Day Trading"
              duration="56.5 Hours"
              entry-price="$150.00"
              exit-price="$162.50"
              emotional-state="Optimal"
              net-result="+$1,250.00"
              asset="BTC/USD"
              :username="authStore.user?.displayName || authStore.user?.email || 'Operator_0x4F'"
              :account-type="authStore.user?.type || 'common'"
            />
        </div>
      </section>

        <!-- SECTION 17: EXIMAGEARCHIVE_SYSTEM -->
        <section class="flex flex-col space-y-12 pb-64">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">17 // ExImageArchive_System</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
             <div class="flex flex-col space-y-8">
                <ExText variant="body">
                  The Image Archive System provides high-fidelity storage and tactical manipulation of visual evidence. 
                  Each slot features scanning animations and rigid action triggers.
                </ExText>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <ExImageArchiveSlot 
                    id="0x4F"
                    :image-url="demoImageUrl"
                    timestamp="09.05.2026 // 19:58"
                    @edit="isEditorOpen = true; isPreviewMode = false"
                    @fullscreen="isEditorOpen = true; isPreviewMode = true"
                    @remove="() => {}"
                  />
                  <div class="border-2 border-dashed border-theme-border flex flex-col items-center justify-center p-12 space-y-4 opacity-40 hover:opacity-100 transition-opacity cursor-pointer group">
                     <div class="w-12 h-12 border border-theme-text flex items-center justify-center rotate-45 group-hover:rotate-[135deg] transition-transform duration-700">
                        <span class="rotate-[-45deg] group-hover:rotate-[-135deg] transition-transform duration-700 text-2xl">+</span>
                     </div>
                     <span class="text-[9px] font-mono uppercase tracking-[0.4em] font-black">Allocate_Slot</span>
                  </div>
                </div>
             </div>

             <div class="flex flex-col space-y-8 p-8 border border-theme-border bg-theme-text/[0.02]">
                <div class="flex items-center space-x-4">
                  <div class="w-1 h-12 bg-theme-accent"></div>
                  <div class="flex flex-col">
                    <span class="text-[11px] font-mono font-black uppercase tracking-widest">Reification_Protocol</span>
                    <span class="text-[8px] font-mono opacity-40 uppercase tracking-widest">Status: Operational</span>
                  </div>
                </div>
                <ExText variant="small" class="leading-relaxed opacity-60">
                  Visual data is reified into the Genesis Matrix using high-frequency temporal markers. 
                  The editor allows for tactical annotation and structural highlighting.
                </ExText>
                <ExButton variant="tactical" @click="isEditorOpen = true; isPreviewMode = false">
                   Initialize_Editor
                </ExButton>
             </div>
          </div>

          <!-- FULLSCREEN EDITOR OVERLAY -->
          <ExImageEditor 
            :key="isEditorOpen ? (isPreviewMode ? 'preview' : 'edit') : 'closed'"
            :is-open="isEditorOpen"
            :image-url="demoImageUrl"
            :preview-mode="isPreviewMode"
            @close="isEditorOpen = false"
          />
        </section>

        <!-- SECTION 19: EXTACTICAL_NODE_MAP -->
        <section class="flex flex-col space-y-12 pb-64">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">19 // ExTactical_Node_Map_System</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="flex flex-col items-center justify-center p-24 border border-dashed border-theme-border bg-theme-text/[0.02] space-y-8 text-theme-text">
            <div class="relative w-24 h-24 flex items-center justify-center">
               <div class="absolute inset-0 border border-theme-text opacity-20 rotate-45 animate-spin-slow"></div>
               <div class="absolute inset-2 border border-theme-text opacity-40 rotate-[15deg] animate-spin-slow-reverse"></div>
               <div class="w-2 h-2 bg-theme-text"></div>
            </div>
            
            <div class="flex flex-col items-center text-center space-y-4 max-w-md">
              <ExHeading level="h3" class="tracking-[0.4em]">NODE_MAP_VISUALIZATION</ExHeading>
              <ExText variant="body" class="opacity-60 text-sm">
                A high-fidelity mapping system for tactical scenarios. Visualizes the interconnected relationship between entry/exit protocols and their constituent conditions.
              </ExText>
            </div>

            <ExButton variant="tactical" @click="showNodeMap = true" class="!px-12 !py-4">
              Launch_Node_Map_Fullscreen
            </ExButton>
          </div>
        </section>

        <!-- SECTION 20: EXTACTICAL_STABILITY_INDEX -->
        <section class="flex flex-col space-y-12 pb-64">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">20 // ExTactical_Stability_Index</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="flex flex-col lg:flex-row gap-24 items-center">
            <!-- THE CIRCULAR GAUGE -->
            <div class="relative w-64 h-64 flex items-center justify-center shrink-0">
               <!-- Atmosphere Glow -->
               <div class="absolute inset-0 rounded-full transition-all duration-1000 opacity-20 blur-3xl scale-150" :class="emotionalStatus.color"></div>
               
               <!-- Rotating Outer Ring -->
               <div class="absolute inset-0 rounded-full border border-theme-border-strong border-dashed animate-[spin_30s_linear_infinite]"></div>
               <div class="absolute inset-8 rounded-full border border-theme-border opacity-40 -rotate-45"></div>
               
               <!-- The Core Gauge -->
               <div class="relative w-44 h-44 rounded-full flex flex-col items-center justify-center overflow-hidden transition-all duration-700 hover:scale-110 shadow-2xl z-10"
                    :class="emotionalStatus.color">
                  <!-- Noise Overlay -->
                  <div class="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
                  
                  <span class="text-6xl font-serif italic nier-text-primary leading-none drop-shadow-md">{{ testEmotionalRank }}</span>
                  <span class="text-[11px] font-mono font-black uppercase tracking-[0.3em] nier-text-primary mt-2 opacity-80">{{ emotionalStatus.label }}</span>
                  
                  <!-- Scanning effect -->
                  <div class="absolute inset-0 bg-white/10 animate-[scan_4s_linear_infinite] pointer-events-none"></div>
               </div>

               <!-- HUD Brackets around the gauge -->
               <div class="absolute -inset-4 border-l border-t border-theme-border w-12 h-12"></div>
               <div class="absolute -inset-4 bottom-auto left-auto border-r border-t border-theme-border w-12 h-12"></div>
               <div class="absolute -inset-4 top-auto right-auto border-l border-b border-theme-border w-12 h-12"></div>
               <div class="absolute -inset-4 top-auto left-auto border-r border-b border-theme-border w-12 h-12"></div>
            </div>

            <div class="flex flex-col space-y-8 max-w-sm">
              <div class="flex flex-col space-y-2">
                 <ExHeading level="h3" variant="module">Neural_Equilibrium_Metric</ExHeading>
                 <ExText variant="body" class="opacity-60">
                   A high-fidelity circular diagnostic that synthesizes tactical efficiency, strategic adherence, and cognitive stability into a single unified index.
                 </ExText>
              </div>

              <!-- Testing Slider -->
              <div class="pt-8 flex flex-col space-y-4 border-t border-theme-border">
                 <div class="flex justify-between items-center">
                    <span class="text-[8px] font-mono opacity-30 uppercase tracking-[0.5em]">Simulation_Control</span>
                    <span class="text-[8px] font-mono opacity-30 uppercase tracking-[0.5em] font-black text-theme-text">{{ testEmotionalRank }}%</span>
                 </div>
                 <input type="range" v-model="testEmotionalRank" min="0" max="100" class="w-full accent-theme-text opacity-40 hover:opacity-100 transition-opacity cursor-pointer" />
              </div>
            </div>
          </div>
        </section>

        <!-- SECTION 21: EXVERTICAL_TRADE_LIST_SYSTEM -->
        <section class="flex flex-col space-y-12 pb-64">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">21 // ExVertical_Trade_List_System</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="flex flex-col space-y-8">
            <ExText variant="body" class="max-w-2xl">
              The Vertical Trade List System provides a high-fidelity archival registry of tactical executions paired with an expandable, fully custom multi-dimensional filtering console.
            </ExText>
            
            <ExVerticalTradeList />
          </div>
        </section>

        <!-- SECTION 22: OPEN_STRATEGY_METRICS -->
        <section class="flex flex-col space-y-12 pb-64">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">22 // Open_Strategy_Metrics</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="flex flex-col space-y-8">
            <ExText variant="body" class="max-w-2xl">
              A high-fidelity strategy diagnostics panel for the ExEquityCurve3D viewer. 
              Surfaces all critical performance, risk, and ratio metrics in a structured, scannable layout with live color-coded evaluations.
            </ExText>

            <OpenStrategyMetrics
              :is-dark="isDark"
              strategy-name="Genesis_Protocol_Alpha"
              :is-live="true"
              :metrics="mockMetricsConfigs"
              :values="mockMetricsValues"
              @edit="handleEditMetrics"
            />
          </div>
        </section>

        <!-- SECTION 23: EXREPORT_FORM -->
        <section class="flex flex-col space-y-12 pb-64">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">23 // ExReport_Form</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="flex flex-col lg:flex-row gap-16 items-start">
             <ExPanel class="w-full max-w-xl" noPadding variant="light">
                <template #header>
                   TRANSMIT_REPORT // ARCHIVAL_NODE
                </template>

                <div class="p-10 flex flex-col space-y-10">
                   <!-- Field: Type -->
                   <div class="flex flex-col space-y-4">
                      <div class="flex items-center justify-between">
                         <ExText variant="telemetry" class="opacity-40">Report_Classification</ExText>
                         <span class="text-[8px] font-mono opacity-20 uppercase tracking-widest">REQ_001</span>
                      </div>
                      <div class="flex space-x-8">
                         <label class="flex items-center space-x-3 cursor-pointer group">
                            <input type="radio" name="report_type" value="Problem" class="peer sr-only" checked />
                            <div class="w-4 h-4 border border-theme-border peer-checked:border-theme-text peer-checked:bg-theme-text flex items-center justify-center transition-all">
                               <div class="w-1.5 h-1.5 bg-theme-bg opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                            </div>
                            <span class="text-[11px] font-mono tracking-widest uppercase text-theme-text opacity-60 peer-checked:opacity-100 transition-opacity">Problem</span>
                         </label>
                         <label class="flex items-center space-x-3 cursor-pointer group">
                            <input type="radio" name="report_type" value="Idea" class="peer sr-only" />
                            <div class="w-4 h-4 border border-theme-border peer-checked:border-theme-text peer-checked:bg-theme-text flex items-center justify-center transition-all">
                               <div class="w-1.5 h-1.5 bg-theme-bg opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                            </div>
                            <span class="text-[11px] font-mono tracking-widest uppercase text-theme-text opacity-60 peer-checked:opacity-100 transition-opacity">Idea</span>
                         </label>
                      </div>
                   </div>

                   <!-- Field: Title -->
                   <div class="flex flex-col space-y-4">
                      <div class="flex items-center justify-between">
                         <ExText variant="telemetry" class="opacity-40">Nomenclature</ExText>
                         <span class="text-[8px] font-mono opacity-20 uppercase tracking-widest">REQ_002</span>
                      </div>
                      <ExInput placeholder="ENTER_REPORT_TITLE..." variant="standard" class="!py-5 !pl-6 !text-lg" />
                   </div>

                   <!-- Field: Description -->
                   <div class="flex flex-col space-y-4">
                      <div class="flex items-center justify-between">
                         <ExText variant="telemetry" class="opacity-40">Narrative_Log</ExText>
                         <span class="text-[8px] font-mono opacity-20 uppercase tracking-widest">REQ_003</span>
                      </div>
                      <div class="relative group">
                         <textarea 
                           placeholder="DESCRIBE_THE_PROBLEM_OR_IDEA_IN_DETAIL..."
                           class="w-full h-40 bg-theme-bg border border-theme-border p-6 text-xs font-mono tracking-widest focus:outline-none focus:border-theme-text transition-all text-theme-text placeholder:opacity-20 uppercase resize-none leading-relaxed"
                         ></textarea>
                         <ExGothicCorners variant="light" :opacity="0.2" class="group-focus-within:opacity-80 transition-opacity duration-500" />
                      </div>
                   </div>

                   <!-- Footer Actions -->
                   <div class="pt-10 border-t border-theme-border flex items-center justify-between">
                      <div class="flex items-center space-x-3 opacity-20 group cursor-pointer hover:opacity-100 transition-opacity">
                         <div class="w-1.5 h-1.5 border border-theme-text rotate-45"></div>
                         <span class="text-[9px] font-mono uppercase tracking-[0.3em]">Discard_Draft</span>
                      </div>
                      <ExButton variant="solid">Transmit_Data</ExButton>
                   </div>
                </div>
             </ExPanel>
          </div>
        </section>

        <!-- SECTION 24: COMPLIANCE_STATUS -->
        <section class="flex flex-col space-y-12 pb-64">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">24 // Compliance_Status</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="flex flex-col space-y-8">
            <ExText variant="body" class="max-w-2xl">
              Compliance status telemetry showing adherence to predefined risk and style parameters.
            </ExText>

            <OpenStrategyMetrics
              :is-dark="isDark"
              strategy-name="Protocol_Compliance"
              :is-live="true"
              :minimal="true"
              :metrics="mockComplianceConfigs"
              :values="mockComplianceValues"
              @edit="handleEditMetrics"
            />
          </div>
        </section>

        <!-- SECTION 25: EXPROFILE_SETTINGS_PREVIEW -->
        <section class="flex flex-col space-y-12 pb-64">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">25 // ExProfile_Settings_Matrix</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <ExProfileSettings />
        </section>

        <!-- SECTION 26: PROFILE_PAGE_BLUEPRINT -->
        <section class="flex flex-col space-y-12 pb-80">
          <div class="flex items-center space-x-6 text-theme-text">
            <span class="text-[10px] font-mono tracking-[0.4em] opacity-30 uppercase">26 // Profile_Page_Blueprint</span>
            <div class="flex-grow h-px bg-theme-border"></div>
          </div>

          <div class="flex flex-col space-y-6 max-w-6xl">
            <ExText variant="body" class="max-w-3xl opacity-70">
              A minimal profile page with a left menu and a single clean content area works best here: familiar, quiet, and easy to scan.
            </ExText>

            <div class="grid grid-cols-1 lg:grid-cols-[240px_1fr] border border-theme-border bg-theme-bg shadow-[0_20px_60px_rgba(0,0,0,0.14)] overflow-hidden min-h-[640px]">
              <aside class="border-b lg:border-b-0 lg:border-r border-theme-border p-6 lg:p-8 bg-theme-text/[0.015]">
                <div class="flex items-center gap-3 pb-6 border-b border-theme-border">
                  <div class="w-10 h-10 rounded-full border border-theme-border bg-theme-text text-theme-bg flex items-center justify-center font-serif italic text-lg">
                    {{ profileInitial }}
                  </div>
                  <div class="flex flex-col">
                    <span class="text-[9px] font-mono uppercase tracking-[0.35em] opacity-35">Profile</span>
                    <span class="text-[10px] font-mono uppercase tracking-[0.25em] opacity-50">Settings</span>
                  </div>
                </div>

                <nav class="mt-6 flex flex-col gap-2">
                  <button
                    v-for="tab in profileTabs"
                    :key="tab.key"
                    type="button"
                    @click="activeProfileTab = tab.key"
                    class="flex items-center justify-between px-4 py-3 border text-left transition-colors duration-300 text-theme-text"
                    :class="activeProfileTab === tab.key ? 'border-theme-text bg-theme-text/[0.06] shadow-[inset_3px_0_0_var(--theme-text)]' : 'border-transparent bg-transparent hover:border-theme-border hover:bg-theme-text/[0.02]'"
                  >
                    <span class="text-[10px] font-mono uppercase tracking-[0.3em] font-black text-theme-text">{{ tab.label }}</span>
                    <span class="text-[8px] font-mono uppercase tracking-[0.22em] text-theme-text" :class="activeProfileTab === tab.key ? 'opacity-60' : 'opacity-35'">
                      {{ tab.note }}
                    </span>
                  </button>
                </nav>

                <div class="mt-8 pt-6 border-t border-theme-border space-y-2">
                  <div class="text-[8px] font-mono uppercase tracking-[0.35em] opacity-30">Signed in as</div>
                  <div class="text-[10px] font-mono tracking-[0.12em] text-theme-text break-all">
                    {{ profileEmail }}
                  </div>
                </div>
              </aside>

              <main class="p-6 lg:p-10 min-h-[560px]">
                <div v-if="activeProfileTab === 'profile'" class="max-w-2xl space-y-8">
                  <div class="space-y-2">
                    <span class="text-[10px] font-mono uppercase tracking-[0.35em] opacity-35">Account</span>
                    <h3 class="text-3xl lg:text-4xl font-serif tracking-[0.05em] text-theme-text leading-tight">
                      Personal details
                    </h3>
                    <p class="text-sm leading-7 opacity-65 text-theme-text max-w-lg">
                      Keep the core identity fields visible and unobtrusive.
                    </p>
                  </div>

                  <div class="space-y-5">
                    <div class="space-y-2">
                      <span class="text-[9px] font-mono uppercase tracking-[0.35em] opacity-35">Display name</span>
                      <div class="px-4 py-3 border border-theme-border bg-theme-bg font-mono tracking-[0.12em] text-theme-text">
                        {{ profileDisplayName }}
                      </div>
                    </div>

                    <div class="space-y-2">
                      <span class="text-[9px] font-mono uppercase tracking-[0.35em] opacity-35">Email address</span>
                      <div class="px-4 py-3 border border-theme-border bg-theme-bg font-mono tracking-[0.08em] text-theme-text break-all">
                        {{ profileEmail }}
                      </div>
                    </div>

                    <div class="space-y-2">
                      <span class="text-[9px] font-mono uppercase tracking-[0.35em] opacity-35">Description</span>
                      <textarea
                        v-model="profileDescriptionDraft"
                        rows="5"
                        placeholder="Short description about the user"
                        class="w-full px-4 py-3 border border-theme-border bg-theme-bg text-[13px] leading-7 text-theme-text placeholder:opacity-25 focus:outline-none focus:border-theme-text resize-none"
                      ></textarea>
                    </div>

                  </div>
                </div>

                <div v-else class="max-w-2xl space-y-8">
                  <div class="space-y-2">
                    <span class="text-[10px] font-mono uppercase tracking-[0.35em] opacity-35">Appearance</span>
                    <h3 class="text-3xl lg:text-4xl font-serif tracking-[0.05em] text-theme-text leading-tight">
                      App theme
                    </h3>
                    <p class="text-sm leading-7 opacity-65 text-theme-text max-w-lg">
                      Minimal theme controls with a few restrained accent choices.
                    </p>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      v-for="mode in appearanceModes"
                      :key="mode.key"
                      type="button"
                      class="p-4 border text-left transition-colors duration-300 text-theme-text"
                      :class="mode.active ? 'border-theme-text bg-theme-text/[0.06] shadow-[inset_3px_0_0_var(--theme-text)]' : 'border-theme-border bg-theme-bg hover:border-theme-text/40'"
                    >
                      <span class="block text-[9px] font-mono uppercase tracking-[0.35em] font-black text-theme-text">{{ mode.label }}</span>
                      <span class="block text-[8px] font-mono uppercase tracking-[0.25em] mt-2 text-theme-text" :class="mode.active ? 'opacity-60' : 'opacity-40'">
                        {{ mode.note }}
                      </span>
                    </button>
                  </div>

                  <div class="space-y-4">
                    <div class="flex items-center justify-between">
                      <span class="text-[9px] font-mono uppercase tracking-[0.35em] opacity-40">Accent</span>
                      <span class="text-[8px] font-mono uppercase tracking-[0.25em] opacity-30">Presets</span>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div v-for="tone in appearanceTones" :key="tone.name" class="flex flex-col gap-2">
                        <div class="h-12 border border-theme-border bg-theme-bg" :style="{ backgroundColor: tone.value }"></div>
                        <span class="text-[8px] font-mono uppercase tracking-[0.18em] opacity-50">{{ tone.name }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="space-y-4 pt-2">
                    <div class="flex items-center justify-between">
                      <span class="text-[9px] font-mono uppercase tracking-[0.35em] opacity-40">Background image</span>
                      <span class="text-[8px] font-mono uppercase tracking-[0.25em] opacity-30">Upload</span>
                    </div>

                    <label class="block border border-theme-border bg-theme-bg px-4 py-4 cursor-pointer hover:border-theme-text/40 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        class="hidden"
                        @change="handleBackgroundUpload"
                      />
                      <div class="flex items-center justify-between gap-4">
                        <div class="flex flex-col space-y-1 min-w-0">
                          <span class="text-[10px] font-mono uppercase tracking-[0.3em] text-theme-text font-black">Choose image</span>
                          <span class="text-[8px] font-mono uppercase tracking-[0.25em] opacity-35 truncate">
                            {{ backgroundFileName || 'No file selected' }}
                          </span>
                        </div>
                        <span class="px-3 py-1 border border-theme-border text-[8px] font-mono uppercase tracking-[0.25em] opacity-60 shrink-0">
                          Browse
                        </span>
                      </div>
                    </label>

                    <div class="border border-theme-border overflow-hidden bg-theme-bg">
                      <div class="px-4 py-3 border-b border-theme-border flex items-center justify-between">
                        <span class="text-[9px] font-mono uppercase tracking-[0.35em] opacity-40">Preview</span>
                        <span class="text-[8px] font-mono uppercase tracking-[0.25em] opacity-30">Wallpaper</span>
                      </div>
                      <div
                        class="h-28 bg-cover bg-center bg-theme-bg"
                        :style="backgroundImageStyle"
                      >
                        <div class="h-full w-full bg-theme-bg/35"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </section>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useStrategyTradesStore } from '~/features/store/useStrategyTrades'
import GradflowBackground from '~/widgets/style/ui/GradflowBackground.vue'
import DesignVignette from '~/widgets/style/ui/DesignVignette.vue'
import ExPanel from '~/shared/ui/ExPanel.vue'
import ExButton from '~/shared/ui/ExButton.vue'
import ExHeading from '~/shared/ui/ExHeading.vue'
import ExText from '~/shared/ui/ExText.vue'
import ExInput from '~/shared/ui/ExInput.vue'
import ExTooltip from '~/shared/ui/ExTooltip.vue'
import ExGenesisMenu from '~/widgets/genesis/ui/common/ExGenesisMenu.vue'
import ExInitialization from '~/widgets/workspace/ui/init/ExInitialization.vue'
import ExDashboard from '~/widgets/dashboard/ui/main/ExDashboard.vue'
import ExTradeAnalysisPanel from '~/widgets/genesis/ui/analytics/ExTradeAnalysisPanel.vue'
import ExImageArchiveSlot from '~/widgets/genesis/ui/common/ExImageArchiveSlot.vue'
import ExImageEditor from '~/widgets/genesis/ui/common/ExImageEditor.vue'
import ExTacticalNodeMap from '~/widgets/genesis/ui/analytics/ExTacticalNodeMap.vue'
import ExVerticalTradeList from '~/widgets/genesis/ui/diary/ExVerticalTradeList.vue'
import OpenStrategyMetrics from '~/widgets/genesis/ui/analytics/ExStrategyMetricsPanel.vue'
import ExActivityMonitor from '~/widgets/dashboard/ui/activity/ExActivityMonitor.vue'
import ExTradeShareCardPreview from '~/widgets/genesis/ui/common/ExTradeShareCardPreview.vue'
import ExProfileSettings from '~/widgets/profile/ui/ExProfileSettings.vue'
import { useAuthStore } from '~/entities/user/auth.store'

const authStore = useAuthStore()
const isDark = ref(true)
const showInitPreview = ref(false)
const isEditorOpen = ref(false)
const isPreviewMode = ref(false)
const showNodeMap = ref(false)
const demoImageUrl = '/assets/ui/tactical_chart_preview.png'

const gradflowConfig = {
  color1: { r: 2, g: 145, b: 135 },
  color2: { r: 165, g: 249, b: 193 },
  color3: { r: 153, g: 151, b: 231 },
  speed: 0.8,
  scale: 2,
  type: 'smoke' as const,
  noise: 0.16
}

const handleEditMetrics = () => {
}

import type { MetricConfig } from '~/widgets/genesis/ui/analytics/ExStrategyMetricsPanel.vue'

const mockMetricsConfigs: MetricConfig[] = [
  {
    key: 'winRate',
    label: 'Win_Rate',
    sub: 'Total win %',
    desc: 'Percentage of winning trades.',
    formula: 'wins / total',
    valStr: (m) => `${m.winRate}%`,
    colorClass: () => '',
    colorVal: (m, isDark) => m.winRate >= 50 ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626'),
    evalStr: (m) => m.winRate >= 50 ? 'Passing' : 'Failing',
    evalClass: () => '',
    benchmarks: [],
    category: 'Primary'
  },
  {
    key: 'profitFactor',
    label: 'Profit_Factor',
    sub: 'Gross Win / Gross Loss',
    desc: 'Ratio of gross profit to gross loss.',
    formula: 'profit / loss',
    valStr: (m) => `${m.profitFactor}`,
    colorClass: () => '',
    colorVal: (m, isDark) => m.profitFactor >= 1.5 ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#ffffff' : '#000000'),
    evalStr: (m) => m.profitFactor >= 1.5 ? 'Elite' : 'Average',
    evalClass: () => '',
    benchmarks: [],
    category: 'Primary'
  },
  {
    key: 'maxDrawdown',
    label: 'Max_Drawdown',
    sub: 'Peak to Valley',
    desc: 'Maximum percentage drop from peak equity.',
    formula: 'max drop',
    valStr: (m) => `${m.maxDrawdown}%`,
    colorClass: () => '',
    colorVal: (m, isDark) => isDark ? '#f87171' : '#dc2626',
    evalStr: (m) => 'Risk',
    evalClass: () => '',
    benchmarks: [],
    category: 'Advanced'
  },
  {
    key: 'sharpeRatio',
    label: 'Sharpe_Ratio',
    sub: 'Risk Adjusted Return',
    desc: 'Return per unit of risk.',
    formula: 'return / risk',
    valStr: (m) => `${m.sharpeRatio}`,
    colorClass: () => '',
    colorVal: (m, isDark) => m.sharpeRatio >= 1.0 ? (isDark ? '#34d399' : '#059669') : (isDark ? '#ffffff' : '#000000'),
    evalStr: (m) => m.sharpeRatio >= 1.0 ? 'Good' : 'Poor',
    evalClass: () => '',
    benchmarks: [],
    category: 'Expert'
  }
]

const mockMetricsValues = {
  winRate: 64.3,
  profitFactor: 2.56,
  maxDrawdown: -8.4,
  sharpeRatio: 1.82
}

const mockComplianceConfigs: MetricConfig[] = [
  {
    key: 'riskPerTrade',
    label: 'Risk_Per_Trade',
    sub: 'Compliance',
    desc: 'Adherence to max risk per trade.',
    formula: 'actual / limit',
    valStr: (m) => `${m.riskPerTrade}%`,
    colorClass: () => '',
    colorVal: (m, isDark) => m.riskPerTrade === 100 ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626'),
    evalStr: (m) => m.riskPerTrade === 100 ? 'Optimal' : 'Violation',
    evalClass: () => '',
    benchmarks: [],
    category: 'Compliance'
  },
  {
    key: 'riskPerSession',
    label: 'Risk_Per_Session',
    sub: 'Compliance',
    desc: 'Adherence to session risk limits.',
    formula: 'actual / limit',
    valStr: (m) => `${m.riskPerSession}%`,
    colorClass: () => '',
    colorVal: (m, isDark) => m.riskPerSession >= 80 ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626'),
    evalStr: (m) => m.riskPerSession >= 80 ? 'Optimal' : 'Violation',
    evalClass: () => '',
    benchmarks: [],
    category: 'Compliance'
  },
  {
    key: 'tradingStyle',
    label: 'Trading_Style',
    sub: 'Compliance',
    desc: 'Adherence to defined trading style.',
    formula: 'actual / limit',
    valStr: (m) => `${m.tradingStyle}%`,
    colorClass: () => '',
    colorVal: (m, isDark) => m.tradingStyle >= 90 ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#f87171' : '#dc2626'),
    evalStr: (m) => m.tradingStyle >= 90 ? 'Aligned' : 'Drifting',
    evalClass: () => '',
    benchmarks: [],
    category: 'Compliance'
  }
]

const mockComplianceValues = {
  riskPerTrade: 100,
  riskPerSession: 85,
  tradingStyle: 92
}

const customCondition = ref({
  name: 'Protocol_ID',
  description: '',
  color: '#ffffff'
})

const mockScenarioData = {
  entry: {
    id: 'entry_alpha',
    name: 'Tactical_Entry_Scenario',
    conditions: [
      { id: 'c1', name: 'Market_Structure_Break', active: true },
      { id: 'c2', name: 'VWAP_Reclamation', active: true },
      { id: 'c3', name: 'Delta_Divergence_Confirmed', active: true },
      { id: 'c4', name: 'Higher_Timeframe_Alignment', active: true },
      { id: 'c5', name: 'Liquidity_Grab_Detected', active: true },
      { id: 'c6', name: 'Volume_Profile_POC_Test', active: true },
      { id: 'c7', name: 'Orderflow_Imbalance', active: true },
      { id: 'c8', name: 'Session_High_Rejection', active: true }
    ]
  },
  exit: {
    id: 'exit_omega',
    name: 'Profit_Target_Omega',
    conditions: [
      { id: 'e1', name: 'Take_Profit_Hit', active: true },
      { id: 'e2', name: 'Momentum_Stalling', active: true },
      { id: 'e3', name: 'Counter_Trend_Absorption', active: true },
      { id: 'e4', name: 'Time_Stop_Reached', active: true }
    ]
  }
}

const colorTokens = [
  { name: 'Nier_Black', value: '#0a0a0a' },
  { name: 'Nier_White', value: '#ffffff' },
  { name: 'Accent_Sky', value: '#38bdf8' },
  { name: 'Accent_Emerald', value: '#10b981' },
  { name: 'Accent_Amber', value: '#f59e0b' },
  { name: 'Accent_Rose', value: '#fb7185' },
]

const profileDisplayName = computed(() => authStore.user?.displayName?.trim() || 'Operator_0x4F')
const profileEmail = computed(() => authStore.user?.email?.trim() || 'operator@genesis.app')
const profileInitial = computed(() => (profileDisplayName.value[0] || 'O').toUpperCase())

const activeProfileTab = ref<'profile' | 'appearance'>('profile')

const profileTabs = [
  { key: 'profile', label: 'Profile', note: 'Core' },
  { key: 'appearance', label: 'Appearance', note: 'Theme' }
] as const

const profileDescriptionDraft = ref(
  authStore.user?.displayName
    ? `${authStore.user.displayName} keeps the profile minimal, readable, and aligned with the app's overall tone.`
    : 'Keep the profile minimal, readable, and aligned with the app\'s overall tone.'
)

const appearanceModes = computed(() => [
  { key: 'dark', label: 'Dark', note: 'Active', active: isDark.value },
  { key: 'light', label: 'Light', note: 'Available', active: !isDark.value },
  { key: 'system', label: 'System', note: 'Auto', active: false }
])

const appearanceTones = [
  { name: 'Ink', value: 'var(--theme-text)' },
  { name: 'Paper', value: 'var(--theme-bg)' },
  { name: 'Sky', value: 'rgba(56, 189, 248, 0.7)' },
  { name: 'Mint', value: 'rgba(16, 185, 129, 0.7)' }
]

const backgroundImageUrl = ref<string | null>(null)
const backgroundFileName = ref('')

const backgroundImageStyle = computed(() => ({
  backgroundImage: backgroundImageUrl.value ? `url(${backgroundImageUrl.value})` : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0))'
}))

const handleBackgroundUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (backgroundImageUrl.value) {
    URL.revokeObjectURL(backgroundImageUrl.value)
  }

  backgroundImageUrl.value = URL.createObjectURL(file)
  backgroundFileName.value = file.name
}

onBeforeUnmount(() => {
  if (backgroundImageUrl.value) {
    URL.revokeObjectURL(backgroundImageUrl.value)
  }
})

const testEmotionalRank = ref(78)

const emotionalStatus = computed(() => {
  const s = testEmotionalRank.value;
  if (s > 80) return { label: 'OPTIMAL', color: 'bg-emerald-400' };
  if (s > 60) return { label: 'STABLE', color: 'bg-green-300' };
  if (s > 40) return { label: 'NEUTRAL', color: 'bg-yellow-200' };
  if (s > 20) return { label: 'UNSTABLE', color: 'bg-orange-400' };
  return { label: 'CRITICAL', color: 'bg-red-500' };
})

const strategyStore = useStrategyTradesStore()

onMounted(async () => {
  await strategyStore.init()
})

const diaryHeatmapTrades = computed(() => {
  // Force mock data for testing 30 trades layout
  const useMockData = true 
  let trades: any[] = useMockData ? [] : strategyStore.getTradesForStrategy('MAIN_DIARY')
  
  if (trades.length === 0) {
    const assets = ['NVDA', 'SOL/USD', 'MSFT', 'GOLD', 'AAPL', 'BTC/USD', 'EUR/USD', 'ETH/USD', 'TSLA', 'AMZN', 'NQ1!', 'ES1!', 'GBP/JPY', 'XRP/USD', 'META', 'NFLX', 'AMD', 'SPY', 'QQQ', 'DOGE/USD']
    trades = Array.from({ length: 30 }).map((_, i) => {
      const isWin = Math.random() > 0.45
      const baseSize = Math.floor(Math.random() * 5) + 1
      const size = Math.random() > 0.85 ? baseSize * 4 : baseSize // occasional whales
      const pnl = isWin ? Math.floor(Math.random() * 8000 * size) + 200 : -Math.floor(Math.random() * 5000 * size) - 100
      
      return {
        id: `MOCK-${i+1}`,
        asset: assets[Math.floor(Math.random() * assets.length)],
        side: Math.random() > 0.5 ? 'LONG' : 'SHORT',
        size: size,
        profitInCurrency: pnl,
        date: new Date(2026, 4, 1 + i).toISOString()
      }
    })
  }

  let runningCapital = 10000
  return trades.map((t: any) => {
    const profitInCurrency = t.profitInCurrency !== undefined ? t.profitInCurrency : (t.pnl !== undefined ? t.pnl : (t.result || 0))
    const capAtTrade = runningCapital > 0 ? runningCapital : 1000
    const profitPercent = Math.round((profitInCurrency / capAtTrade) * 10000) / 100
    runningCapital += profitInCurrency

    return {
      id: t.id || Math.random().toString(),
      asset: t.asset || 'UNKNOWN',
      side: t.side ? t.side.toUpperCase() : (t.direction ? t.direction.toUpperCase() : 'LONG'),
      size: t.size !== undefined ? t.size : (t.positionSize || 1),
      profitInCurrency,
      profitPercent,
      dateStr: t.date ? new Date(t.date).toLocaleDateString() : '18.04.2026'
    }
  })
})

const maxDiarySize = computed(() => {
  if (diaryHeatmapTrades.value.length === 0) return 1
  const sizes = diaryHeatmapTrades.value.map(t => t.size || 1)
  return Math.max(...sizes, 1)
})

const getDiaryHeatmapBoxClass = (trade: any) => {
  const pnl = trade.profitInCurrency || 0
  if (pnl > 10000) {
    return 'bg-green-600/90 dark:bg-green-500/85 border-green-700 dark:border-green-400 nier-text-primary font-bold shadow-lg'
  } else if (pnl > 0) {
    return 'bg-green-500/30 dark:bg-green-500/25 border-green-500/50 dark:border-green-400/40 text-green-800 dark:text-green-300'
  } else if (pnl < -10000) {
    return 'bg-red-600/90 dark:bg-red-500/85 border-red-700 dark:border-red-400 nier-text-primary font-bold shadow-lg'
  } else if (pnl < 0) {
    return 'bg-red-500/30 dark:bg-red-500/25 border-red-500/50 dark:border-red-400/40 text-red-800 dark:text-red-300'
  } else {
    return 'bg-black/10 dark:bg-white/10 border-black/20 dark:border-white/20 nier-text-primary opacity-70'
  }
}

const getDiaryHeatmapBoxStyle = (trade: any) => {
  const count = diaryHeatmapTrades.value.length
  if (count === 0) return {}

  const cols = Math.ceil(Math.sqrt(count * (1000 / 600)))
  const basePercent = 100 / cols

  const maxSz = maxDiarySize.value
  const sz = trade.size || 1
  
  const widthFactor = 0.4 + (sz / maxSz) * 1.2
  const flexBasis = `calc(${Math.min(95, basePercent * widthFactor)}% - 12px)`

  return {
    flexGrow: sz,
    flexBasis,
    minHeight: count <= 6 ? '180px' : count <= 15 ? '130px' : count <= 30 ? '90px' : '65px'
  }
}

const selectedDiaryTrade = ref<any | null>(null)

const isSmallTrade = (trade: any) => {
  const maxSz = maxDiarySize.value
  const sz = trade.size || 1
  return (sz / maxSz) <= 0.35 || sz <= 3
}

const getDiaryHeatmapFontClasses = (trade: any) => {
  const maxSz = maxDiarySize.value
  const sz = trade.size || 1
  const ratio = sz / maxSz

  if (ratio <= 0.12 || sz <= 1) {
    // Micro trades: remove all data completely, leave only the block
    return {
      asset: 'hidden',
      side: 'hidden',
      date: 'hidden',
      sizeBadge: 'hidden',
      sizeLabel: 'hidden',
      pnl: 'hidden',
      percent: 'hidden'
    }
  } else if (ratio <= 0.25 || sz <= 2) {
    // Small trades: leave ONLY the name of the asset
    return {
      asset: 'text-xs font-bold truncate block w-full text-center',
      side: 'hidden',
      date: 'hidden',
      sizeBadge: 'hidden',
      sizeLabel: 'hidden',
      pnl: 'hidden',
      percent: 'hidden'
    }
  } else if (ratio <= 0.6 || sz <= 5) {
    return {
      asset: 'text-sm font-black',
      side: 'text-[9px] px-1.5 py-0.5',
      date: 'text-[10px]',
      sizeBadge: 'text-[10px] px-2 py-0.5',
      sizeLabel: 'text-[8px]',
      pnl: 'text-lg md:text-xl font-black',
      percent: 'text-xs'
    }
  } else {
    return {
      asset: 'text-base font-black',
      side: 'text-[10px] px-2 py-0.5',
      date: 'text-[10px]',
      sizeBadge: 'text-[11px] px-2.5 py-1',
      sizeLabel: 'text-[8px]',
      pnl: 'text-xl md:text-2xl font-black',
      percent: 'text-xs'
    }
  }
}


</script>

<style>
/* THEME DEFINITIONS */
.theme-dark {
  --theme-bg: #0a0a0a;
  --theme-text: #ffffff;
  --theme-border: rgba(255, 255, 255, 0.1);
  --theme-border-strong: rgba(255, 255, 255, 0.3);
}

.theme-light {
  --theme-bg: #FFFFFF; /* Snow white */
  --theme-text: #2c2c2a;
  --theme-border: rgba(0, 0, 0, 0.1);
  --theme-border-strong: rgba(0, 0, 0, 0.25);
}

.ethereal-void {
  --bg-primary: #FFFFFF;
  --text-primary: #2C3E50;
  --text-secondary: rgba(44, 62, 80, 0.3);
  --border-primary: rgba(44, 62, 80, 0.1);
  background-color: var(--theme-bg);
  color: var(--theme-text);
  font-family: 'Cormorant Garamond', serif;
}

.design-gradflow-page {
  background-color: transparent !important;
}

.ethereal-void.is-dark {
  --bg-primary: #000000;
  --text-primary: rgba(255, 255, 255, 0.5);
  --border-primary: rgba(255, 255, 255, 0.1);
}

/* Base resets using theme tokens */
body {
  background-color: var(--theme-bg);
  margin: 0;
  -webkit-font-smoothing: antialiased;
  transition: background-color 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.bg-theme-bg { background-color: var(--theme-bg); }
.bg-theme-text { background-color: var(--theme-text); }
.text-theme-text { color: var(--theme-text); }
.border-theme-border { border-color: var(--theme-border); }
.border-theme-text { border-color: var(--theme-text); }

@keyframes scan {
  0% { transform: translateY(-100%); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateY(100%); opacity: 0; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.animate-slide-in {
  animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--theme-border-strong); }
</style>
