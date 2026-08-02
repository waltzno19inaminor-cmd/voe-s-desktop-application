<template>
  <span class="user-status-badge" :class="`user-status-badge--${status.visualPreset}`">
    {{ status.name }}
  </span>
</template>

<script setup lang="ts">
import type { UserProfileStatus } from '~/entities/user/model/user-status.types'

defineProps<{
  status: UserProfileStatus
}>()
</script>

<style scoped>
.user-status-badge {
  display: inline-flex !important;
  min-width: 0;
  max-width: 100%;
  align-items: center;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.22);
  padding: 0.28rem 0.5rem 0.25rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.58rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  line-height: 1;
  margin-top: 0 !important;
  opacity: 1 !important;
  text-transform: uppercase;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.user-status-badge--0 {
  border-color: rgba(255, 255, 255, 0.78);
  background: linear-gradient(112deg, #070707 0%, #221338 32%, #75628d 49%, #24123a 68%, #080808 100%);
  background-size: 240% 100%;
  color: #fff;
  box-shadow: 0 0 18px rgba(233, 219, 255, 0.38);
  animation: status-monarch 4.8s ease-in-out infinite;
}

.user-status-badge--1 {
  border-color: rgba(135, 206, 255, 0.56);
  background: linear-gradient(112deg, #09131d 0%, #164f79 47%, #a9dfff 100%);
  background-size: 180% 100%;
  color: #f7fcff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
  animation: status-prism 6.4s ease-in-out infinite;
}

.user-status-badge--2 {
  border-color: rgba(234, 157, 92, 0.52);
  background: linear-gradient(112deg, #24110a 0%, #8b3c1b 52%, #e0a15a 100%);
  color: #fff9f1;
  box-shadow: inset 0 1px 0 rgba(255, 225, 190, 0.2);
}

.user-status-badge--3 {
  border-color: rgba(126, 147, 166, 0.42);
  background: linear-gradient(112deg, #1a2128 0%, #35424e 100%);
  color: #eaf0f5;
}

@keyframes status-monarch {
  0%,
  100% {
    background-position: 0% 50%;
    box-shadow: 0 0 11px rgba(233, 219, 255, 0.2);
  }
  50% {
    background-position: 100% 50%;
    box-shadow: 0 0 24px rgba(255, 255, 255, 0.55);
  }
}

@keyframes status-prism {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}
</style>
