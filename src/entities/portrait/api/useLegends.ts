import { ref } from 'vue';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/shared/firebase.client';
import type { Person } from '../model/portrait.types';

export const useLegends = () => {
    const legends = ref<Person[]>([]);
    const isLoading = ref(false);
    const error = ref<string | null>(null);

    const fetchLegends = async () => {
        isLoading.value = true;
        error.value = null;
        try {
            const legendsCol = collection(db, 'legends');
            const snapshot = await getDocs(legendsCol);
            legends.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Person[];
        } catch (e: any) {
            console.error("Error fetching legends:", e);
            error.value = e.message;
        } finally {
            isLoading.value = false;
        }
    };

    const getLegendById = async (id: string): Promise<Person | null> => {
        isLoading.value = true;
        error.value = null;
        try {
            const docRef = doc(db, 'legends', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return {
                    id: docSnap.id,
                    ...docSnap.data()
                } as Person;
            } else {
                return null;
            }
        } catch (e: any) {
            console.error("Error fetching legend:", e);
            error.value = e.message;
            return null;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        legends,
        isLoading,
        error,
        fetchLegends,
        getLegendById
    };
};
