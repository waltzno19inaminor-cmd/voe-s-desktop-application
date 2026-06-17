<template>
  <article>
    <h2 class="text-base font-serif mb-6 tracking-wide text-[#050505] dark:text-[#dcdcdc]">
      Knowledge Network
    </h2>

    <div class="h-[24rem] w-full border nier-border-primary bg-[#fafafa] dark:bg-[#181818] rounded-lg relative overflow-hidden shrink-0" ref="container">
      <div v-if="!sigmaReady" class="absolute inset-0 flex items-center justify-center text-[11px] text-[#6f6f6f]">
        Building your connected research threads...
      </div>
    </div>

    <p class="text-xs leading-relaxed text-[#666] dark:text-[#8c8c8c] mt-6">
      This network visualizes relationships between your theses,
      macro observations, trade reviews and long-form research notes.
      Each node represents a documented idea.
    </p>

    <p class="text-xs leading-relaxed text-[#7c7c7c] mt-4">
      Over time, it becomes a structural map of your evolving market reasoning.
    </p>
  </article>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRouter } from 'vue-router';
import Graph from 'graphology';
import Sigma from 'sigma';
import type { Thread } from '~/entities/thread/model/thread.types';
import type { ThreadLink } from '~/entities/threadLink/model/threadLink.types';
import { randomOffset } from '~/utils/random';
import { isDark } from '~/composables/changeTheme';

const props = defineProps<{
    threads: Thread[];
    links: ThreadLink[];
    currentUserId: string;
}>();

const router = useRouter();
const container = ref<HTMLDivElement | null>(null);
let sigmaInstance: Sigma | null = null;
const sigmaReady = ref(false);

const initGraph = () => {
  if (!container.value) return;

  if (sigmaInstance) {
    sigmaInstance.kill();
    sigmaInstance = null;
    sigmaReady.value = false;
  }

  const graph = new Graph();

  props.threads.forEach((thread) => {
    graph.addNode(thread.id, {
      label: thread.title,
      x: randomOffset(5),
      y: randomOffset(5),
      size: 10,
      color: '#555',
      url: `/forum/thread/${thread.id}`
    });
  });

  props.links.forEach((link) => {
    if (
        props.threads.find(t => t.id === link.fromThreadId) &&
        props.threads.find(t => t.id === link.toThreadId)
    ) {
        if(!graph.hasEdge(link.fromThreadId, link.toThreadId)) {
             graph.addEdge(link.fromThreadId, link.toThreadId);
        }
    }
  });

  sigmaInstance = new Sigma(graph, container.value, {
    renderLabels: true,
    defaultDrawNodeHover: (context, data, settings) => {
        const color = '#666';
        context.fillStyle = color;
        context.beginPath();
        context.arc(data.x, data.y, data.size, 0, Math.PI * 2, true);
        context.closePath();
        context.fill();
    },
  });


  sigmaInstance.on('enterNode', () => {
    if (!container.value) return;
    container.value.style.cursor = 'pointer';
  });

  sigmaInstance.on('leaveNode', () => {
    if (!container.value) return;
    container.value.style.cursor = 'default';
  });

  // DRAG AND DROP LOGIC
  let draggedNode: string | null = null;
  let isDragging = false;
  let lastDragAt = 0;

  sigmaInstance.on("downNode", (e) => {
    isDragging = true;
    draggedNode = e.node;
    sigmaInstance?.getCamera().disable();
  });

  sigmaInstance.getMouseCaptor().on("mousemove", (e) => {
    if (!isDragging || !draggedNode || !sigmaInstance) return;

    lastDragAt = Date.now();
    const pos = sigmaInstance.viewportToGraph(e);
    graph.setNodeAttribute(draggedNode, "x", pos.x);
    graph.setNodeAttribute(draggedNode, "y", pos.y);

    e.preventSigmaDefault();
    e.original.preventDefault();
    e.original.stopPropagation();
  });

  sigmaInstance.getMouseCaptor().on("mouseup", () => {
    if (draggedNode) {
      sigmaInstance?.getCamera().enable();
    }
    isDragging = false;
  });

  sigmaInstance.on('doubleClickNode', ({ node }) => {
    const nodeData = graph.getNodeAttributes(node);
    if (nodeData.url) {
      router.push(nodeData.url);
    }
  });

  applyThemeSettings();
  sigmaReady.value = true;
};

const applyThemeSettings = () => {
  if (!sigmaInstance) return;
  sigmaInstance.setSettings({
    labelColor: {
      color: isDark.value ? '#ffffff' : '#000000'
    },
    defaultEdgeColor: isDark.value ? '#333' : '#777'
  });
  sigmaInstance.refresh();
};

onMounted(() => {
    isDark.value = document.documentElement.classList.contains('dark');
    setTimeout(() => {
         initGraph();
    }, 100);
});

onBeforeUnmount(() => {
  sigmaInstance?.kill();
});

watch(() => [props.threads, props.links], () => {
    initGraph();
}, { deep: true });

watch(isDark, () => {
    applyThemeSettings();
});

</script>
