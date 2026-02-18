<template>
  <div class="flex min-h-screen px-6 backdrop-blur-lg">
    <div
      v-if="error"
      class="text-red-400 fixed top-0 left-1/2 -translate-x-1/2 rounded-lg px-10 py-6 mt-4 tracking-widest font-serif"
    >
      {{ error }}
    </div>

    <div
      class="w-full max-w-md rounded-xl mx-auto my-auto dark:bg-[#121212] px-8 py-12"
    >
      <h1
        class="mb-2 text-2xl font-serif tracking-wide text-[#121212] dark:text-white"
      >
        Create account
      </h1>

      <p class="mb-8 text-sm text-[#666] dark:text-[#aaa]">
        Access a private space for thoughtful market discussion.
      </p>

      <form @submit.prevent="register" class="space-y-6">
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
            v-model="email"
            required
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
            v-model="password"
            required
            class="rounded-md border border-black/20 dark:border-white/20 bg-transparent px-4 py-3 text-sm text-[#121212] dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="passwordConfirm"
            class="text-xs uppercase tracking-widest text-[#555] dark:text-[#aaa]"
          >
            Confirm password
          </label>
          <input
            id="passwordConfirm"
            type="password"
            v-model="passwordConfirm"
            required
            class="rounded-md border border-black/20 dark:border-white/20 bg-transparent px-4 py-3 text-sm text-[#121212] dark:text-white focus:outline-none focus:border-black dark:focus:border-white"
          />
        </div>

        <button
          type="submit"
          class="mt-4 w-full rounded-full border border-black bg-black px-6 py-3 text-sm font-serif uppercase tracking-widest text-white transition hover:bg-transparent hover:text-black dark:border-white dark:bg-white dark:text-black dark:hover:bg-transparent dark:hover:text-white"
        >
          Register
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
        Already have an account?
        <NuxtLink
          to="/login"
          class="underline hover:text-black dark:hover:text-white"
        >
          Sign in
        </NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  createUser,
  confirmPassword,
} from "~/features/auth/register/useRegister";
import { useAuthStore } from "~/entities/user/auth.store";
import { googleLogin } from "~/features/auth/google/useGoogleLogin";

const email = ref("");
const password = ref("");
const passwordConfirm = ref("");
const error = ref<string | null>(null);

const auth = useAuthStore();

const register = async () => {
  if (!confirmPassword(password.value, passwordConfirm.value)) {
    error.value = "Passwords do not match";
    return;
  }

  await createUser(email.value, password.value);

  if (auth.error) {
    error.value = auth.error;
  }
  navigateTo('/')
};

const doGoogleLogin = async () => {
  await googleLogin();
  if (auth.error) {
    error.value = auth.error;
  }
  navigateTo('/')
};

definePageMeta({
  public: true
})

</script>
