import { defineStore } from 'pinia'
import { getAuth, signOut } from 'firebase/auth'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null as null | {
            uid: string;
            email: string | null;
            displayName: string | null;
            photoURL: string | null;
            joinedAt: string | null;
        },
        loading: false as boolean,
        error: null as null | string,
        authReady: false as boolean,
    }),
    getters: {
    isAuthenticated: (state) => !!state.user
  },
    actions: {
        setUser(user: null | {
            uid: string,
            email: string | null,
            displayName: string | null,
            photoURL: string | null,
            joinedAt: any;
        }) {
            this.user = user;
           
        },
        clearUser() {
            const auth = getAuth()
            signOut(auth)
        },
        setLoading(value: boolean) {
            this.loading = value;
        },
        setError(value: string) {
            this.error = value;
        },
        setAuthReady(value: boolean) {
            this.authReady = value;
        }
    }
})