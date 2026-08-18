import { defineStore } from 'pinia'
import { getAuth, signOut } from 'firebase/auth'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null as null | {
            uid: string;
            email: string | null;
            displayName: string | null;
            photoURL: string | null;
            avatarUrl?: string | null;
            joinedAt: string | null;
            followed?: string[];
            followers?: number;
            type?: string;
            expiresAt?: any;
        },
        loading: false as boolean,
        error: null as null | string,
        authReady: false as boolean,
        isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    }),
    getters: {
    isAuthenticated: (state) => !!state.user
  },
    actions: {
        async setUser(user: null | {
            uid: string,
            email: string | null,
            displayName: string | null,
            photoURL: string | null,
            avatarUrl?: string | null,
            joinedAt: any;
            type?: string;
            expiresAt?: any;
        }) {
            if (!user) {
                this.user = null;
                return;
            }
            let computedType = user.type || 'common';
            let expiresAt = user.expiresAt;
            let finalDisplayName = user.displayName;
            let finalPhotoURL = user.photoURL;
            let finalAvatarUrl = user.avatarUrl || null;

            // Make the Firebase-persisted identity available immediately.
            // Firestore enriches it when online, but must not block offline entry.
            this.user = {
                ...user,
                displayName: finalDisplayName,
                photoURL: finalPhotoURL,
                avatarUrl: finalAvatarUrl,
                type: computedType,
                expiresAt
            };

            try {
                const { doc, getDoc } = await import('firebase/firestore')
                const { db } = await import('~/shared/firebase.client')
                const userSnap = await getDoc(doc(db, 'users', user.uid))
                if (userSnap.exists()) {
                    const data = userSnap.data()
                    computedType = data.type || data.role || 'common'
                    
                    // Check expiration if present
                    if (data.expiresAt) {
                        let expiresAtMs = 0
                        if (typeof data.expiresAt.toMillis === 'function') {
                            expiresAtMs = data.expiresAt.toMillis()
                        } else if (data.expiresAt instanceof Date) {
                            expiresAtMs = data.expiresAt.getTime()
                        } else if (typeof data.expiresAt === 'number') {
                            expiresAtMs = data.expiresAt
                        } else if (typeof data.expiresAt === 'string') {
                            expiresAtMs = new Date(data.expiresAt).getTime()
                        }
                        
                        // If the current time is past the expiration time, downgrade to common
                        if (expiresAtMs > 0 && Date.now() > expiresAtMs) {
                            computedType = 'common'
                        }
                    }

                    expiresAt = data.expiresAt;
                    
                    if (data.displayName) finalDisplayName = data.displayName
                    if (data.photoURL) finalPhotoURL = data.photoURL
                }
            } catch (err) {
                console.error('Failed to fetch user Firestore doc:', err)
            }

            // Do not let a late Firestore response restore a user after logout
            // or overwrite a newer Firebase session.
            if (this.user?.uid !== user.uid) return;

            this.user = {
                ...user,
                displayName: finalDisplayName,
                photoURL: finalPhotoURL,
                avatarUrl: finalAvatarUrl,
                type: computedType,
                expiresAt
            };
        },
        clearUser() {
            const auth = getAuth()
            signOut(auth)
        },
        setLoading(value: boolean) {
            this.loading = value;
        },
        setError(value: string | null) {
            this.error = value;
        },
        setAuthReady(value: boolean) {
            this.authReady = value;
        },
        setOffline(value: boolean) {
            this.isOffline = value;
        },
        setAvatarUrl(uid: string, avatarUrl: string | null) {
            if (this.user?.uid !== uid) return;
            this.user.avatarUrl = avatarUrl;
        }
    }
})
