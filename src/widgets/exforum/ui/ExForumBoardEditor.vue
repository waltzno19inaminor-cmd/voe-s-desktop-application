<template>
  <div
    ref="boardStageRef"
    class="absolute inset-0 z-[100] overflow-hidden bg-[radial-gradient(circle,rgba(0,0,0,0.1)_1px,transparent_1.6px)] bg-[length:28px_28px] text-[#2c2c2a]"
    :class="
      isSpacePressed
        ? 'cursor-grab active:cursor-grabbing'
        : activeBoardTool === 'pencil'
        ? 'cursor-none'
        : activeBoardTool
        ? 'cursor-crosshair'
        : 'cursor-grab active:cursor-grabbing'
    "
    @pointermove="handleBoardHover"
    @pointerdown="startBoardPan"
  >
    <!-- Hidden File Input for Image Upload -->
    <input
      ref="globalImageInput"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleGlobalImageUpload"
    />

    <!-- Darkening overlay -->
    <div class="absolute inset-0 bg-black/10 pointer-events-none"></div>

    <!-- Freehand Board Drawing Layer -->
    <canvas
      ref="boardDrawingCanvasRef"
      class="absolute inset-0 z-20 h-full w-full pointer-events-none"
    ></canvas>



    <!-- Board World (Pan Only) -->
    <div
      ref="boardWorldRef"
      class="absolute left-0 top-0 origin-top-left z-10"
      :style="[boardWorldStyle, boardTransformStyle]"
      @pointerleave="boardDrawing.isBoardDrawingCursorVisible.value = false"
    >
      <svg class="pointer-events-none absolute left-0 top-0 h-full w-full overflow-visible text-black/40">
        <path
          v-for="connection in boardConnections"
          :key="connection.id"
          :d="getBoardConnectionPath(connection)"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
          vector-effect="non-scaling-stroke"
          class="opacity-75"
        />
        <path
          v-if="activeBoardWire"
          :d="getActiveBoardWirePath()"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-dasharray="4 8"
          vector-effect="non-scaling-stroke"
          class="opacity-70"
        />
      </svg>

      <article
        v-for="node in boardNodes"
        :key="node.id"
        data-board-node
        :data-node-id="node.id"
        class="absolute box-border overflow-visible bg-white/90 shadow-[0_16px_40px_rgba(0,0,0,0.08)] group/node transition-[border-color,box-shadow,opacity] border"
        :class="[
          selectedBoardNodeId === node.id ? 'border-black/60 ring-2 ring-black/10' : 'border-black/20',
          activeBoardTool === 'pencil' ? 'pointer-events-none select-none' : ''
        ]"
        :style="getBoardNodeStyle(node)"
        @contextmenu.prevent.stop="handleNodeContextMenu($event, node.id)"
      >
        <!-- Drag Handle -->
        <div
          data-board-node-handle
          :data-node-id="node.id"
          class="absolute top-0 left-0 w-full h-4 bg-black/5 hover:bg-black/10 cursor-move opacity-0 group-hover/node:opacity-100 transition-opacity z-10"
        ></div>

        <!-- Text Node -->
        <div v-if="node.type === 'text'" class="flex h-full w-full flex-col relative bg-transparent p-4 pt-6 gap-2">
          <template v-if="!(node as any).isQuestion">
            <div
              :ref="(el) => setTitleEditorRef(el, node.id)"
              :data-title-node-id="node.id"
              contenteditable="true"
              class="relative z-10 font-serif text-xl italic leading-none text-black/80 break-words outline-none bg-transparent cursor-text"
              :data-placeholder="boardUiLabels.untitled"
              @mousedown.stop
              @click.stop
              @focus="selectedBoardNodeId = node.id; activeEditorField = 'title'"
              @input="updateNodeTitle($event, node)"
              @keydown.enter.prevent
            ></div>
            <span
              v-if="isTextNodeTitleEmpty(node)"
              class="pointer-events-none absolute left-4 right-4 top-6 z-0 font-serif text-xl italic leading-none text-black/40"
            >
              {{ boardUiLabels.untitled }}
            </span>
          </template>
          <div
            :ref="(el) => setTextEditorRef(el, node.id)"
            :data-text-node-id="node.id"
            contenteditable="true"
            class="relative z-10 w-full flex-1 font-serif italic bg-transparent outline-none overflow-y-auto cursor-text break-words whitespace-pre-wrap min-h-0 matrix-text-rich"
            :class="(node as any).isQuestion ? 'text-5xl leading-none text-black/80' : 'text-sm leading-relaxed text-black/55'"
            :data-placeholder="(node as any).isQuestion ? boardQuestionPlaceholder : boardTextPlaceholder"
            @mousedown.stop
            @click.stop
            @focus="selectedBoardNodeId = node.id; activeEditorField = 'text'"
            @input="updateNodeText($event, node)"
          ></div>
          <span
            v-if="isTextNodeBodyEmpty(node)"
            class="pointer-events-none absolute left-4 right-4 z-0 font-serif italic"
            :class="(node as any).isQuestion ? 'top-6 text-5xl leading-none text-black/40' : 'top-[58px] text-sm leading-relaxed text-black/25'"
          >
            {{ (node as any).isQuestion ? boardQuestionPlaceholder : boardTextPlaceholder }}
          </span>
        </div>

        <!-- Image Node -->
        <div v-else-if="node.type === 'image'" class="flex h-full flex-col pt-4">
          <img
            v-if="node.src"
            :src="node.src"
            :alt="node.alt"
            class="min-h-0 flex-1 object-contain cursor-pointer hover:opacity-90 transition-opacity"
            draggable="false"
            @click.stop="triggerImageUpload(node.id)"
          />
          <div
            v-else
            class="flex-1 flex flex-col items-center justify-center cursor-pointer border border-dashed border-black/20 m-4 hover:border-black/40 hover:bg-black/5 transition-all"
            @click.stop="triggerImageUpload(node.id)"
          >
            <svg class="w-8 h-8 opacity-40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="square"
                stroke-linejoin="miter"
                stroke-width="1.5"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              ></path>
            </svg>
            <span class="text-[10px] font-mono tracking-[0.2em] uppercase opacity-40 text-center px-4">{{
              boardUiLabels.uploadImage
            }}</span>
          </div>
          <p v-if="node.caption" class="border-t border-black/10 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.28em] text-black/35">
            {{ node.caption }}
          </p>
        </div>

        <!-- Drawing Node -->
        <div
          v-else-if="node.type === 'drawing'"
          class="flex h-full w-full flex-col relative bg-transparent overflow-hidden"
          @dblclick.stop="forumDrawing.openDrawingFullscreen(node)"
        >
          <img
            v-if="node.params?.preview"
            :src="node.params.preview"
            alt=""
            class="absolute inset-0 h-full w-full object-fill pointer-events-none"
            draggable="false"
          />
          <svg
            v-else
            class="absolute inset-0 w-full h-full pointer-events-none text-black"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polyline
              v-for="stroke in node.params?.strokes || []"
              :key="stroke.id"
              :points="forumDrawing.formatDrawingStroke(stroke)"
              fill="none"
              :stroke="stroke.color || 'currentColor'"
              :stroke-width="stroke.size || 2"
              stroke-linecap="round"
              stroke-linejoin="round"
              vector-effect="non-scaling-stroke"
              class="opacity-90"
            />
          </svg>
          <div
            v-if="!node.params?.strokes?.length"
            class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40 text-[10px] font-mono tracking-widest uppercase text-center px-4"
          >
            {{ boardUiLabels.dblClickToDraw }}
          </div>
        </div>

        <!-- Price Node -->
        <div v-else-if="node.type === 'price'" class="flex h-full w-full flex-col items-center justify-center bg-white/80 px-3 font-mono">
          <span class="mb-1 text-[8px] font-black uppercase tracking-[0.2em] text-black/40 pointer-events-none select-none">
            {{
              (node as any).priceKind === 'current'
                ? locale === 'ru'
                  ? 'ТЕКУЩАЯ ЦЕНА'
                  : 'CURRENT PRICE'
                : locale === 'ru'
                ? 'ПРЕДПОЛАГАЕМАЯ ЦЕНА'
                : 'PROJECTED PRICE'
            }}
          </span>
          <div class="flex min-w-0 items-center justify-center gap-2">
            <span v-if="getPriceNodeArrow(node)" class="text-xl font-black leading-none" :class="getPriceNodeValueClass(node)">
              {{ getPriceNodeArrow(node) }}
            </span>
            <input
              :value="(node as any).value"
              inputmode="decimal"
              type="text"
              class="min-w-0 w-full bg-transparent text-center text-2xl font-black leading-none outline-none"
              :class="getPriceNodeValueClass(node)"
              :placeholder="priceNodePlaceholder(node)"
              @pointerdown.stop
              @click.stop
              @input="updatePriceNodeValue($event, node)"
            />
          </div>
        </div>

        <!-- Asset Node -->
        <div v-else-if="node.type === 'asset'" class="flex h-full w-full items-center justify-center bg-white/80 px-3 font-mono">
          <button
            class="flex min-w-0 flex-col items-center justify-center gap-1 text-center outline-none transition-colors"
            :class="(node as any).asset ? 'text-black/80 hover:text-black' : 'text-black/35 hover:text-black/70'"
            @pointerdown.stop
            @click.stop="openAssetPicker(node)"
          >
            <span class="max-w-full truncate text-xl font-black uppercase tracking-widest">
              {{ getAssetNodeLabel(node) }}
            </span>
            <span v-if="getAssetNodeTypeLabel(node)" class="max-w-full truncate text-[8px] font-black uppercase tracking-[0.3em] text-black/35">
              {{ getAssetNodeTypeLabel(node) }}
            </span>
          </button>
        </div>

        <!-- Strategy Node -->
        <div v-else-if="node.type === 'strategy'" class="flex h-full w-full items-center justify-center bg-white/80 px-3 font-mono">
          <button
            class="flex min-w-0 w-full flex-col items-center justify-center gap-3 text-center outline-none transition-colors"
            :class="(node as any).strategyId ? 'text-black/80 hover:text-black' : 'text-black/35 hover:text-black/70'"
            @pointerdown.stop
            @click.stop="openStrategyPicker(node)"
          >
            <span class="max-w-full truncate text-xl font-black uppercase tracking-widest">
              {{ getStrategyNodeLabel(node) }}
            </span>
            <span v-if="getStrategyNodeMetrics(node)" class="grid w-full grid-cols-5 gap-1.5 text-center uppercase">
              <span class="flex min-w-0 flex-col border border-black/10 px-1.5 py-1">
                <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.profitFactorShort }}</small>
                <strong class="truncate text-[14px] font-black text-black/85">{{ formatProfitFactor(getStrategyNodeMetrics(node)!.profitFactor) }}</strong>
              </span>
              <span class="flex min-w-0 flex-col border border-black/10 px-1.5 py-1">
                <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.winRateShort }}</small>
                <strong class="truncate text-[14px] font-black text-black/85">{{ formatCompactNumber(getStrategyNodeMetrics(node)!.winRate, 1) }}%</strong>
              </span>
              <span class="flex min-w-0 flex-col border border-black/10 px-1.5 py-1">
                <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.resultShort }}</small>
                <strong class="truncate text-[14px] font-black" :class="getResultToneClass(getStrategyNodeMetrics(node)!.resultCurrency)">{{ formatSignedCurrency(getStrategyNodeMetrics(node)!.resultCurrency) }}</strong>
              </span>
              <span class="flex min-w-0 flex-col border border-black/10 px-1.5 py-1">
                <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.startShort }}</small>
                <strong class="truncate text-[14px] font-black text-black/85">{{ formatCurrencyValue(getStrategyNodeMetrics(node)!.initialCapital) }}</strong>
              </span>
              <span class="flex min-w-0 flex-col border border-black/10 px-1.5 py-1">
                <small class="text-[8px] font-black tracking-[0.18em] text-black/40">{{ boardUiLabels.endShort }}</small>
                <strong class="truncate text-[14px] font-black" :class="getResultToneClass(getStrategyNodeMetrics(node)!.finalCapital - getStrategyNodeMetrics(node)!.initialCapital)">{{ formatCurrencyValue(getStrategyNodeMetrics(node)!.finalCapital) }}</strong>
              </span>
            </span>
          </button>
        </div>

        <!-- Trade Node -->
        <div v-else-if="node.type === 'trade'" class="flex h-full w-full items-center justify-center bg-white/80 px-3 font-mono">
          <button
            class="flex min-w-0 w-full flex-col justify-center gap-3 text-left outline-none transition-colors"
            :class="(node as any).tradeId ? 'text-black/80 hover:text-black' : 'text-black/35 hover:text-black/70'"
            @pointerdown.stop
            @click.stop="openTradePicker(node)"
          >
            <span class="flex w-full items-start justify-between gap-3">
              <span class="flex min-w-0 flex-col">
                <span class="max-w-full truncate text-xl font-black uppercase tracking-widest">
                  {{ getTradeNodeAssetLabel(node) }}
                </span>
                <span class="max-w-full truncate text-[9px] font-black uppercase tracking-[0.24em]" :class="getTradeNodeVectorClass(node)">
                  {{ getTradeNodeVector(node) }}
                </span>
              </span>
              <span class="max-w-[45%] truncate text-right text-[12px] font-black uppercase tracking-[0.16em]" :class="getTradeNodeResultClass(node)">
                {{ getTradeNodeResult(node) || boardUiLabels.select }}
              </span>
            </span>
            <span class="grid w-full grid-cols-2 gap-1.5 text-center uppercase">
              <span class="flex min-w-0 flex-col border border-black/10 px-1.5 py-1">
                <small class="text-[8px] font-black tracking-[0.16em] text-black/40">{{ boardUiLabels.entryShort }}</small>
                <strong class="truncate text-[11px] font-black text-black/80">{{ getTradeNodeEntryDate(node) }}</strong>
              </span>
              <span class="flex min-w-0 flex-col border border-black/10 px-1.5 py-1">
                <small class="text-[8px] font-black tracking-[0.16em] text-black/40">{{ boardUiLabels.exitShort }}</small>
                <strong class="truncate text-[11px] font-black text-black/80">{{ getTradeNodeExitDate(node) }}</strong>
              </span>
            </span>
          </button>
        </div>

        <!-- Matrix-style ports -->
        <div
          class="absolute top-1/2 -left-[6px] z-30 h-[12px] w-[12px] -translate-y-1/2 rotate-45 border-[2px] border-black bg-white shadow-[0_0_20px_rgba(44,44,42,0.3)] transition-all"
          :class="isHighlightedPassiveBoardPort(node) ? 'opacity-100 scale-125' : 'opacity-0 group-hover/node:opacity-100'"
          @pointerdown.stop.prevent="pickupBoardInput(node, 'left')"
          @pointerup.stop.prevent="dropBoardWire(node, 'left')"
          @dblclick.stop.prevent="clearBoardInput(node)"
        ></div>
        <div
          class="absolute top-1/2 -right-[6px] z-30 h-[12px] w-[12px] -translate-y-1/2 rotate-45 border-[2px] border-black bg-white opacity-0 shadow-[0_0_20px_rgba(44,44,42,0.3)] transition-all hover:bg-black group-hover/node:opacity-100"
          @pointerdown.stop.prevent="startBoardWire(node, 'right', $event)"
          @dblclick.stop.prevent="clearBoardOutput(node)"
        ></div>
        <div
          class="absolute -top-[6px] left-1/2 z-30 h-[12px] w-[12px] -translate-x-1/2 rotate-45 border-[2px] border-black bg-white shadow-[0_0_20px_rgba(44,44,42,0.3)] transition-all"
          :class="isHighlightedPassiveBoardPort(node) ? 'opacity-100 scale-125' : 'opacity-0 group-hover/node:opacity-100'"
          @pointerdown.stop.prevent="pickupBoardInput(node, 'top')"
          @pointerup.stop.prevent="dropBoardWire(node, 'top')"
          @dblclick.stop.prevent="clearBoardInput(node)"
        ></div>
        <div
          class="absolute -bottom-[6px] left-1/2 z-30 h-[12px] w-[12px] -translate-x-1/2 rotate-45 border-[2px] border-black bg-white opacity-0 shadow-[0_0_20px_rgba(44,44,42,0.3)] transition-all hover:bg-black group-hover/node:opacity-100"
          @pointerdown.stop.prevent="startBoardWire(node, 'bottom', $event)"
          @dblclick.stop.prevent="clearBoardOutput(node)"
        ></div>

        <!-- Resize Handle -->
        <div
          data-board-resize
          :data-node-id="node.id"
          class="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover/node:opacity-100 transition-opacity z-10 flex items-end justify-end p-1"
        >
          <div class="w-2 h-2 border-r-2 border-b-2 border-black/40"></div>
        </div>
      </article>
    </div>

    <!-- OFFSCREEN ORIGIN INDICATOR -->
    <div
      v-if="outOfBoundsIndicator"
      class="absolute pointer-events-auto flex flex-col items-center transition-all duration-300 z-[150]"
      :style="{ left: outOfBoundsIndicator.x + 'px', top: outOfBoundsIndicator.y + 'px', transform: 'translate(-50%, -50%)' }"
    >
      <div
        class="w-10 h-10 flex items-center justify-center transition-transform duration-100 cursor-pointer group"
        :style="{ transform: `rotate(${outOfBoundsIndicator.angle}deg)` }"
        @click="focusBoardNode(outOfBoundsIndicator.id)"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="drop-shadow-sm transition-transform group-hover:scale-125 text-black">
          <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <div class="flex flex-col items-center mt-1">
        <span class="text-[8px] font-mono font-bold tracking-widest uppercase truncate max-w-[100px] text-black">{{ outOfBoundsIndicator.name }}</span>
        <span class="text-[7px] font-mono opacity-60 font-bold text-black">{{ outOfBoundsIndicator.dist }}px</span>
      </div>
    </div>

    <!-- Custom Cursor for Board Drawing -->
    <div
      v-if="activeBoardTool === 'pencil' && boardDrawing.isBoardDrawingCursorVisible.value && !isSpacePressed"
      class="absolute rounded-full pointer-events-none z-40 shadow-[0_0_0_1px_rgba(255,255,255,0.8)]"
      :class="boardDrawing.boardDrawingTool.value === 'eraser' ? 'border-2 border-red-500 bg-red-500/10' : 'border-2 border-black bg-black/5'"
      :style="boardDrawing.boardDrawingCursorStyle.value"
    ></div>

    <!-- Tooltip at the top center -->
    <div
      v-if="activeBoardTool && activeBoardTool !== 'pencil'"
      class="pointer-events-none absolute top-8 left-1/2 transform -translate-x-1/2 z-[9999] px-4 py-2 bg-black text-white text-[10px] font-mono tracking-widest uppercase shadow-lg"
    >
      {{ locale === 'ru' ? 'Кликните чтобы добавить' : 'Click to add node' }}
    </div>

    <!-- Left Vertical Toolbar -->
    <div
      data-board-chrome
      class="absolute left-6 top-1/2 z-50 w-fit -translate-y-1/2 cursor-auto"
      @pointerdown.stop
      @pointermove.stop
      @pointerenter="boardDrawing.isBoardDrawingCursorVisible.value = false"
    >
      <ExGenesisHudPanel orientation="vertical">


        <ExGenesisHudButton
          :active="activeBoardTool === 'text'"
          :tooltip="locale === 'ru' ? 'Текст' : 'Text'"
          tooltip-position="right"
          @click.stop="activeBoardTool = activeBoardTool === 'text' ? null : 'text'"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 7V4h16v3M9 20h6M12 4v16" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </ExGenesisHudButton>

        <ExGenesisHudButton
          :active="activeBoardTool === 'image'"
          :tooltip="locale === 'ru' ? 'Изображение' : 'Image'"
          tooltip-position="right"
          @click.stop="activeBoardTool = activeBoardTool === 'image' ? null : 'image'"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke-linecap="round" stroke-linejoin="round" />
            <circle cx="8.5" cy="8.5" r="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <polyline points="21 15 16 10 5 21" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </ExGenesisHudButton>

        <ExGenesisHudButton
          :active="activeBoardTool === 'pencil'"
          :tooltip="locale === 'ru' ? 'Карандаш' : 'Pencil'"
          tooltip-position="right"
          @click.stop="activeBoardTool = activeBoardTool === 'pencil' ? null : 'pencil'"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
        </ExGenesisHudButton>

        <template v-if="articleType !== 'SETUP'">
          <ExGenesisHudButton
            :active="activeBoardTool === 'strategy-node'"
            :tooltip="locale === 'ru' ? 'Стратегия' : 'Strategy'"
            tooltip-position="right"
            @click.stop="activeBoardTool = activeBoardTool === 'strategy-node' ? null : 'strategy-node'"
          >
            <span class="font-mono text-[9px] font-black uppercase tracking-widest text-current">{{ boardUiLabels.strategyTool }}</span>
          </ExGenesisHudButton>

          <ExGenesisHudButton
            :active="activeBoardTool === 'trade-node'"
            :tooltip="locale === 'ru' ? 'Сделка' : 'Trade'"
            tooltip-position="right"
            @click.stop="activeBoardTool = activeBoardTool === 'trade-node' ? null : 'trade-node'"
          >
            <span class="font-mono text-[9px] font-black uppercase tracking-widest text-current">{{ boardUiLabels.tradeTool }}</span>
          </ExGenesisHudButton>
        </template>
      </ExGenesisHudPanel>
    </div>

    <!-- Right Vertical Toolbar (Pencil Settings) -->
    <div
      v-if="activeBoardTool === 'pencil'"
      data-board-chrome
      class="absolute right-6 top-1/2 -translate-y-1/2 z-50 w-12 cursor-auto"
      @pointerdown.stop
      @pointermove.stop
      @pointerenter="boardDrawing.isBoardDrawingCursorVisible.value = false"
    >
      <ExPanel variant="light" :no-padding="true" :show-corners="true" :no-shadow="true" class="flex flex-col items-center py-2 px-1 border-black/20 w-full">
        <!-- Brush Tool -->
        <button
          class="p-2 transition-colors group relative"
          :class="boardDrawing.boardDrawingTool.value === 'pencil' ? 'bg-black/10' : 'hover:bg-black/5'"
          @click="boardDrawing.boardDrawingTool.value = 'pencil'"
        >
          <div class="w-5 h-5 flex items-center justify-center">
            <div class="w-2 h-2 rounded-full bg-black"></div>
          </div>
        </button>

        <div class="w-6 h-px bg-black/10 my-1"></div>

        <!-- Eraser Tool -->
        <button
          class="p-2 transition-colors group relative"
          :class="boardDrawing.boardDrawingTool.value === 'eraser' ? 'bg-black/10' : 'hover:bg-black/5'"
          @click="boardDrawing.boardDrawingTool.value = 'eraser'"
        >
          <div class="w-5 h-5 flex items-center justify-center">
            <div
              class="w-2 h-2 rounded-full border-2"
              :class="boardDrawing.boardDrawingTool.value === 'eraser' ? 'border-black' : 'border-black/60 group-hover:border-black'"
            ></div>
          </div>
        </button>

        <div class="w-6 h-px bg-black/10 my-1"></div>

        <!-- Size Slider (Vertical) -->
        <div class="flex flex-col items-center py-2 w-full gap-2">
          <div class="w-5 h-5 flex items-center justify-center pointer-events-none">
            <div
              class="rounded-full border border-black/40"
              :style="{
                width: `${Math.min(18, Math.max(5, boardDrawing.boardDrawingSize.value))}px`,
                height: `${Math.min(18, Math.max(5, boardDrawing.boardDrawingSize.value))}px`,
                backgroundColor: boardDrawing.boardDrawingColor.value
              }"
            ></div>
          </div>
          <div
            class="relative h-32 w-10 touch-none select-none cursor-ns-resize group/slider"
            @pointerdown.stop.prevent="boardDrawing.startBoardDrawingSizeDrag"
          >
            <div class="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-black/10 rounded-full group-hover/slider:bg-black/20 transition-colors"></div>
            <div
              class="absolute left-1/2 w-2 h-2 bg-white border border-black/30 rounded-full shadow-sm pointer-events-none transition-transform group-active/slider:scale-110"
              :style="{ bottom: `${boardDrawing.boardDrawingSizePercent.value}%`, transform: 'translate(-50%, 50%)' }"
            ></div>
          </div>
        </div>

        <div class="w-6 h-px bg-black/10 my-1"></div>

        <!-- Color Picker -->
        <div class="flex flex-col items-center py-2 w-full">
          <label class="w-5 h-5 rounded-full cursor-pointer border border-black/20 overflow-hidden hover:scale-110 transition-transform relative">
            <input type="color" v-model="boardDrawing.boardDrawingColor.value" class="w-full h-full opacity-0 cursor-pointer absolute inset-0" />
            <div class="w-full h-full" :style="{ backgroundColor: boardDrawing.boardDrawingColor.value }"></div>
          </label>
        </div>
      </ExPanel>
    </div>

    <!-- Bottom Right Actions -->
    <div
      data-board-chrome
      class="absolute bottom-6 right-6 z-50 flex items-center gap-4 cursor-auto"
      @pointerdown.stop
      @pointermove.stop
      @pointerenter="boardDrawing.isBoardDrawingCursorVisible.value = false"
    >
      <template v-if="isEditingArticle">
        <button
          class="px-6 py-3 border border-black/20 bg-white/90 shadow-sm text-[10px] font-mono uppercase tracking-widest hover:border-black/50 hover:bg-white transition-colors"
          @click="emit('cancelEdit')"
        >
          {{ locale === 'ru' ? 'ОТМЕНИТЬ РЕДАКТИРОВАНИЕ' : 'CANCEL EDITING' }}
        </button>
      </template>
      <template v-else>
        <button
          class="article-board-secondary-action px-6 py-3 border border-black/20 bg-white/90 shadow-sm text-[10px] font-mono uppercase tracking-widest"
          @click="emit('back')"
        >
          {{ locale === 'ru' ? 'НАЗАД' : 'BACK' }}
        </button>
        <button
          class="article-board-secondary-action px-6 py-3 border border-black/20 bg-white/90 shadow-sm text-[10px] font-mono uppercase tracking-widest"
          @click="emit('saveDraft')"
        >
          {{ locale === 'ru' ? 'СОХРАНИТЬ ЧЕРНОВИК' : 'SAVE DRAFT' }}
        </button>
      </template>
      <button
        class="px-8 py-3 border border-black/20 bg-black text-white shadow-sm text-[10px] font-mono uppercase tracking-[0.2em] hover:bg-black/80 transition-colors"
        :class="!isSignalBoardValid ? 'cursor-not-allowed opacity-35 hover:bg-black' : ''"
        :disabled="!isSignalBoardValid"
        @click="emit('continue')"
      >
        {{ locale === 'ru' ? 'ПРОДОЛЖИТЬ' : 'CONTINUE' }}
      </button>
    </div>

    <!-- Node Context Menu Overlay -->
    <Teleport to="body">
      <Transition name="fade-slide">
        <div v-if="nodeContextMenu" 
             class="fixed z-[100000000] pointer-events-auto"
             :style="{ left: nodeContextMenu.x + 'px', top: nodeContextMenu.y + 'px' }"
             @pointerdown.stop
             @contextmenu.prevent.stop>
             
            <div class="flex flex-col space-y-1.5">
              <div class="w-2 h-2 bg-black rotate-45 absolute -left-1 -top-1 animate-pulse"></div>

              <div class="group relative pt-2">
                 <button @click="removeBoardNode(nodeContextMenu.nodeId)"
                         class="bg-white border border-red-500/30 px-6 py-3 min-w-[180px] text-left transition-all duration-500 hover:border-red-500 hover:bg-red-500/10 hover:translate-x-4 flex items-center justify-between relative overflow-hidden shadow-[10px_10px_0_rgba(0,0,0,0.1)] text-[#2c2c2a]">
                   <span class="text-[9px] font-mono tracking-[0.5em] uppercase font-black text-red-500 group-hover:text-red-400">{{ boardUiLabels.removeNode }}</span>
                   <span class="text-[7px] font-mono text-red-500 opacity-40">[DEL]</span>
                   <div class="absolute inset-y-0 left-0 w-0 bg-red-500 group-hover:w-1.5 transition-all duration-500"></div>
                 </button>
                 <div class="absolute -bottom-4 left-6 opacity-0 group-hover:opacity-40 transition-all duration-500 pointer-events-none">
                  <span class="text-[7px] font-mono uppercase tracking-[0.3em] text-red-500">{{ boardUiLabels.removeWarning }}</span>
                </div>
              </div>
            </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Modals & Pickers -->
    <ExAssetPickerMenu
      :open="Boolean(activeAssetNodeId)"
      :placeholder="boardUiLabels.searchAssets"
      :no-results-label="boardUiLabels.noAssetsFound"
      @update:open="(value) => { if (!value) closeAssetPicker() }"
      @select="selectBoardAsset"
    />

    <!-- Strategy Picker Modal -->
    <Transition name="fade">
      <div
        v-if="activeStrategyNodeId"
        data-board-chrome
        class="absolute inset-0 z-[90] flex items-center justify-center bg-black/20 px-6 py-8"
        @click.self="closeStrategyPicker"
        @pointerdown.stop
        @pointermove.stop
      >
        <div class="relative flex h-full max-h-[520px] w-[760px] max-w-full flex-col" @click.stop>
          <ExPanel variant="light" :no-padding="true" :show-corners="true" :no-shadow="true" class="flex h-full flex-col border-black/20 bg-white text-black">
            <div class="flex items-center border-b border-black/10 px-6 py-5">
              <div class="flex flex-col gap-1">
                <span class="font-mono text-[9px] font-black uppercase tracking-[0.35em] text-black/35">
                  {{ locale === 'ru' ? 'ЛОКАЛЬНЫЕ СТРАТЕГИИ' : 'LOCAL STRATEGIES' }}
                </span>
                <strong class="font-mono text-xl font-black uppercase tracking-widest">
                  {{ locale === 'ru' ? 'Выберите стратегию' : 'Select strategy' }}
                </strong>
              </div>
            </div>
            <div class="grid grid-cols-[1fr_0.45fr_0.45fr_0.75fr] gap-3 border-b border-black/10 px-6 py-3 font-mono text-[8px] font-black uppercase tracking-[0.25em] text-black/35">
              <span>{{ locale === 'ru' ? 'Стратегия' : 'Strategy' }}</span>
              <span>{{ boardUiLabels.profitFactorShort }}</span>
              <span>{{ boardUiLabels.winRateShort }}</span>
              <span class="text-right">{{ locale === 'ru' ? 'Результат' : 'Result' }}</span>
            </div>
            <div class="flex-1 overflow-y-auto scroll-minimal py-2">
              <button
                v-for="strategy in localStrategies"
                :key="strategy.id"
                class="grid w-full grid-cols-[1fr_0.45fr_0.45fr_0.75fr] items-center gap-3 border-b border-black/5 px-6 py-4 text-left font-mono transition-colors hover:bg-black/5"
                @click="selectBoardStrategy(strategy)"
              >
                <span class="min-w-0">
                  <span class="block truncate text-[13px] font-black uppercase tracking-widest text-black/80">{{ strategy.name }}</span>
                  <span class="mt-1 block text-[8px] uppercase tracking-[0.2em] text-black/30">
                    {{ getStrategyMetrics(strategy).tradesCount }} {{ locale === 'ru' ? 'сделок' : 'trades' }}
                  </span>
                </span>
                <span class="text-[12px] font-black text-black/60">{{ formatProfitFactor(getStrategyMetrics(strategy).profitFactor) }}</span>
                <span class="text-[12px] font-black text-black/60">{{ formatCompactNumber(getStrategyMetrics(strategy).winRate, 1) }}%</span>
                <span class="text-right text-[12px] font-black" :class="getResultToneClass(getStrategyMetrics(strategy).resultCurrency)">
                  {{ formatSignedCurrency(getStrategyMetrics(strategy).resultCurrency) }} ({{ formatSignedPercent(getStrategyMetrics(strategy).resultPercent) }})
                </span>
              </button>
              <div v-if="localStrategies.length === 0" class="flex h-64 items-center justify-center font-mono text-[10px] uppercase tracking-[0.3em] text-black/30">
                {{ boardUiLabels.noStrategiesFound }}
              </div>
            </div>
          </ExPanel>
        </div>
      </div>
    </Transition>

    <!-- Trade Picker Modal -->
    <Transition name="fade">
      <div
        v-if="activeTradeNodeId"
        data-board-chrome
        class="absolute inset-0 z-[90] flex items-center justify-center bg-black/20 px-6 py-8"
        @click.self="closeTradePicker"
        @pointerdown.stop
        @pointermove.stop
      >
        <div class="relative flex h-full max-h-[620px] w-[980px] max-w-full flex-col" @click.stop>
          <ExPanel variant="light" :no-padding="true" :show-corners="true" :no-shadow="true" class="flex h-full flex-col border-black/20 bg-white text-black">
            <div class="flex items-center border-b border-black/10 px-6 py-5">
              <div class="flex flex-col gap-1">
                <span class="font-mono text-[9px] font-black uppercase tracking-[0.35em] text-black/35">
                  {{ locale === 'ru' ? 'EXGENESISLOG // СПИСОК' : 'EXGENESISLOG // LIST' }}
                </span>
                <strong class="font-mono text-xl font-black uppercase tracking-widest">
                  {{ locale === 'ru' ? 'Выберите сделку' : 'Select trade' }}
                </strong>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto scroll-minimal py-2">
              <div v-for="strategy in tradePickerStrategies" :key="strategy.id" class="border-b border-black/5 last:border-0">
                <button
                  class="grid w-full grid-cols-[1fr_0.4fr_0.4fr_0.7fr_auto] items-center gap-3 px-6 py-4 text-left font-mono transition-colors hover:bg-black/5"
                  @click="toggleTradeStrategy(strategy.id)"
                >
                  <span class="min-w-0">
                    <span class="block truncate text-[13px] font-black uppercase tracking-widest text-black/80">{{ strategy.name }}</span>
                    <span class="mt-1 block text-[8px] uppercase tracking-[0.2em] text-black/30">
                      {{ getTradePickerStrategyTrades(strategy.id).length }} {{ locale === 'ru' ? 'сделок' : 'trades' }}
                    </span>
                  </span>
                  <span class="text-[11px] font-black text-black/55">{{ boardUiLabels.profitFactorShort }} {{ formatProfitFactor(getStrategyMetrics(strategy).profitFactor) }}</span>
                  <span class="text-[11px] font-black text-black/55">{{ boardUiLabels.winRateShort }} {{ formatCompactNumber(getStrategyMetrics(strategy).winRate, 1) }}%</span>
                  <span class="text-right text-[11px] font-black" :class="getResultToneClass(getStrategyMetrics(strategy).resultCurrency)">
                    {{ formatSignedCurrency(getStrategyMetrics(strategy).resultCurrency) }} ({{ formatSignedPercent(getStrategyMetrics(strategy).resultPercent) }})
                  </span>
                  <span
                    class="flex h-6 w-6 items-center justify-center border border-black/10 text-[12px] font-black text-black/35 transition-colors"
                    :class="expandedTradeStrategyId === strategy.id ? 'bg-black text-white' : ''"
                  >
                    {{ expandedTradeStrategyId === strategy.id ? '−' : '+' }}
                  </span>
                </button>

                <div v-if="expandedTradeStrategyId === strategy.id" class="border-t border-black/10 bg-black/[0.025]">
                  <div class="grid grid-cols-[1fr_0.8fr_1.35fr_1fr_1fr] gap-2 border-b border-black/10 px-6 py-3 pl-10 font-mono text-[8px] font-black uppercase tracking-[0.25em] text-black/35">
                    <span>{{ boardUiLabels.direction }}</span>
                    <span>{{ boardUiLabels.asset }}</span>
                    <span>{{ boardUiLabels.dates }}</span>
                    <span class="text-right">{{ boardUiLabels.duration }}</span>
                    <span class="text-right">{{ boardUiLabels.result }}</span>
                  </div>
                  <button
                    v-for="trade in getTradePickerStrategyTrades(strategy.id)"
                    :key="trade.id"
                    class="grid w-full grid-cols-[1fr_0.8fr_1.35fr_1fr_1fr] items-center gap-2 border-b border-black/5 px-6 py-3 pl-10 text-left font-mono transition-colors last:border-0 hover:bg-black/5"
                    @click="selectBoardTrade(trade)"
                  >
                    <span class="flex min-w-0 items-center gap-3">
                      <span class="h-1.5 w-1.5 rounded-full" :class="getResultDotClass(getTradeCurrencyProfit(trade))"></span>
                      <span class="truncate text-[12px] font-black uppercase tracking-widest">{{ getTradeSideLabel(trade.side) }}</span>
                    </span>
                    <span class="truncate text-[11px] uppercase tracking-wider text-black/60">{{ trade.asset || boardUiLabels.assetFallback }}</span>
                    <span class="flex min-w-0 flex-col">
                      <span class="truncate text-[9px] uppercase tracking-wider text-black/35">{{ locale === 'ru' ? 'Вход' : 'Entry' }}: {{ formatTradeDate(trade.date) }}</span>
                      <span class="truncate text-[9px] uppercase tracking-wider text-black/35">{{ locale === 'ru' ? 'Выход' : 'Exit' }}: {{ formatTradeDate(trade.dateExit) }}</span>
                    </span>
                    <span class="truncate text-right text-[11px] uppercase tracking-wider text-black/40">{{ formatTradeDuration(trade) }}</span>
                    <span class="truncate text-right text-[12px] font-black tracking-wider" :class="getResultToneClass(getTradeCurrencyProfit(trade))">
                      {{ formatSignedCurrency(getTradeCurrencyProfit(trade)) }} ({{ formatSignedPercent(getTradePercentProfit(trade, trade.strategyId || strategy.id)) }})
                    </span>
                  </button>
                  <div v-if="getTradePickerStrategyTrades(strategy.id).length === 0" class="px-10 py-8 text-center font-mono text-[9px] uppercase tracking-[0.25em] text-black/25">
                    {{ boardUiLabels.noTradesInStrategy }}
                  </div>
                </div>
              </div>
              <div v-if="tradePickerStrategies.length === 0" class="flex h-64 items-center justify-center font-mono text-[10px] uppercase tracking-[0.3em] text-black/30">
                {{ boardUiLabels.noTradesFound }}
              </div>
            </div>
          </ExPanel>
        </div>
      </div>
    </Transition>

    <!-- Fullscreen Drawing Editor -->
    <Transition name="fade">
      <ExDrawingPanel
        v-if="forumDrawing.activeDrawingNode.value"
        :drawing="forumDrawing"
        @close="forumDrawing.closeDrawingFullscreen"
        @clear="forumDrawing.clearDrawingFullscreen"
      />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'
import { useExForumBoardEditor } from '../model/useExForumBoardEditor'
import ExAssetPickerMenu from '~/shared/ui/ExAssetPickerMenu.vue'
import ExPanel from '~/shared/ui/ExPanel.vue'
import ExGenesisHudPanel from '~/widgets/genesis/ui/common/ExGenesisHudPanel.vue'
import ExGenesisHudButton from '~/widgets/genesis/ui/common/ExGenesisHudButton.vue'
import ExDrawingPanel from '~/shared/ui/ExDrawingPanel.vue'
import { useForumDrawing } from '../model/useForumDrawing'
import type {
  JournalArticleBoardConnection,
  JournalArticleBoardNode
} from '~/entities/journal-article/types/journal-article.types'

const props = withDefaults(
  defineProps<{
    boardNodes: JournalArticleBoardNode[]
    boardConnections: JournalArticleBoardConnection[]
    boardStrokes: any[]
    articleType: string
    locale: 'ru' | 'en'
    isEditingArticle?: boolean
  }>(),
  {
    isEditingArticle: false
  }
)

const emit = defineEmits<{
  (e: 'update:boardNodes', val: JournalArticleBoardNode[]): void
  (e: 'update:boardConnections', val: JournalArticleBoardConnection[]): void
  (e: 'update:boardStrokes', val: any[]): void
  (e: 'back'): void
  (e: 'saveDraft'): void
  (e: 'continue'): void
  (e: 'cancelEdit'): void
}>()

const { boardNodes, boardConnections, boardStrokes, articleType, locale, isEditingArticle } = toRefs(props)



const editor = useExForumBoardEditor({
  boardNodes,
  boardConnections,
  boardStrokes,
  articleType,
  locale,
  isEditingArticle
})

const forumDrawing = useForumDrawing()

const {
  boardStageRef,
  boardWorldRef,
  boardDrawingCanvasRef,
  boardWorldStyle,
  boardTransformStyle,
  activeBoardTool,
  isSpacePressed,
  selectedBoardNodeId,
  activeEditorField,
  nodeContextMenu,
  activeBoardWire,
  isHighlightedPassiveBoardPort,
  boardDrawing,
  outOfBoundsIndicator,
  focusBoardNode,
  globalImageInput,
  triggerImageUpload,
  handleGlobalImageUpload,
  startBoardPan,
  handleBoardHover,
  startBoardWire,
  dropBoardWire,
  pickupBoardInput,
  clearBoardInput,
  clearBoardOutput,
  handleNodeContextMenu,
  removeBoardNode,
  setTitleEditorRef,
  setTextEditorRef,
  updateNodeTitle,
  updateNodeText,
  isTextNodeTitleEmpty,
  isTextNodeBodyEmpty,
  getBoardNodeStyle,
  getBoardConnectionPath,
  getActiveBoardWirePath,
  getPriceNodeArrow,
  getPriceNodeValueClass,
  priceNodePlaceholder,
  updatePriceNodeValue,
  getAssetNodeLabel,
  getAssetNodeTypeLabel,
  getStrategyNodeLabel,
  getStrategyNodeMetrics,
  getTradeNodeAssetLabel,
  getTradeNodeVector,
  getTradeNodeVectorClass,
  getTradeNodeResult,
  getTradeNodeResultClass,
  getTradeNodeEntryDate,
  getTradeNodeExitDate,
  activeAssetNodeId,
  openAssetPicker,
  closeAssetPicker,
  selectBoardAsset,
  activeStrategyNodeId,
  openStrategyPicker,
  closeStrategyPicker,
  selectBoardStrategy,
  localStrategies,
  activeTradeNodeId,
  expandedTradeStrategyId,
  openTradePicker,
  closeTradePicker,
  selectBoardTrade,
  tradePickerStrategies,
  getTradePickerStrategyTrades,
  toggleTradeStrategy,
  isSignalBoardValid,
  boardUiLabels,
  boardTextPlaceholder,
  boardQuestionPlaceholder,
  formatProfitFactor,
  formatCompactNumber,
  formatSignedCurrency,
  formatCurrencyValue,
  formatSignedPercent,
  getResultToneClass,
  getResultDotClass,
  getTradeSideLabel,
  formatTradeDate,
  formatTradeDuration,
  getStrategyMetrics,
  getTradeCurrencyProfit,
  getTradePercentProfit
} = editor
</script>
