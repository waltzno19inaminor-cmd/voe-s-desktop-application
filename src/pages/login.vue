<template>
  <div class="flex min-h-screen px-6 backdrop-blur-lg">
    <div
      v-if="error"
      class="text-red-400 fixed top-0 left-1/2 -translate-x-1/2 rounded-lg px-10 py-6 mt-4 tracking-widest font-serif"
    >
      {{ error }}
    </div>

    <div class="w-full max-w-md mx-auto my-auto rounded-xl px-8 py-12">
      <h1
        class="mb-2 text-2xl font-serif tracking-wide text-[#121212] dark:text-white"
      >
        Sign in
      </h1>

      <p class="mb-8 text-sm text-[#666] dark:text-[#aaa]">
        Access your account and continue the discussion.
      </p>

      <form @submit.prevent="login" class="space-y-6">
        <div class="flex flex-col gap-1">
          <label
            for="email"
            class="text-xs uppercase tracking-widest text-[#555] dark:text-[#aaa]"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            v-model="email"
            class="rounded-md border border-black/20 dark:border-white/20 bg-transparent px-4 py-3 text-sm text-[#121212] dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="password"
            class="text-xs uppercase tracking-widest text-[#555] dark:text-[#aaa]"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            v-model="password"
            class="rounded-md border border-black/20 dark:border-white/20 bg-transparent px-4 py-3 text-sm text-[#121212] dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
          />
        </div>

        <div
          class="flex items-center justify-between text-xs text-[#666] dark:text-[#aaa]"
        >
          <label class="flex items-center gap-2">
            <input type="checkbox" class="accent-black dark:accent-white" />
            Remember me
          </label>

          <a
            href="/forgot-password"
            class="underline hover:text-black dark:hover:text-white"
          >
            Forgot password?
          </a>
        </div>

        <button
          type="submit"
          class="mt-4 w-full rounded-full border border-black bg-black px-6 py-3 text-sm font-serif uppercase tracking-widest text-white transition hover:bg-transparent hover:text-black dark:border-white dark:bg-white dark:text-black dark:hover:bg-transparent dark:hover:text-white"
        >
          Sign in
        </button>
      </form>

      <div class="my-8 flex items-center gap-4">
        <div class="h-px w-full bg-black/10 dark:bg-white/10"></div>
        <span class="text-xs text-[#777] dark:text-[#999]">or</span>
        <div class="h-px w-full bg-black/10 dark:bg-white/10"></div>
      </div>

      <button
        @click="doGoogleLogin"
        class="flex w-full items-center justify-center gap-3 rounded-full border border-black/20 dark:border-white/20 px-6 py-3 text-sm transition hover:border-black dark:hover:border-white"
      >
        <Icon name="logos:google-icon" style="color: black" />
        <span class="text-sm text-[#121212] dark:text-white">
          Continue with Google
        </span>
      </button>

      <p class="mt-8 text-center text-xs text-[#666] dark:text-[#aaa]">
        Don’t have an account?
        <a
          href="/register"
          class="underline hover:text-black dark:hover:text-white"
        >
          Create one
        </a>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { loginUser } from "~/features/auth/login/useLogin";
import { useAuthStore } from "~/entities/user/auth.store";
import { googleLogin } from "~/features/auth/google/useGoogleLogin";
import { useRoute } from "vue-router";

const route = useRoute()

const email = ref("");
const password = ref("");
const error = ref<string | null>(null);

const auth = useAuthStore();

const login = async () => {
  await loginUser(email.value, password.value);
  if (auth.error) {
    error.value = auth.error;
  }
  const redirect = route.query.redirect as string
  navigateTo(redirect || '/')
};

const doGoogleLogin = async () => {
  await googleLogin();
  if (auth.error) {
    error.value = auth.error;
  }
  const redirect = route.query.redirect as string
  navigateTo(redirect || '/')
};

definePageMeta({
  public: true
})

</script>
