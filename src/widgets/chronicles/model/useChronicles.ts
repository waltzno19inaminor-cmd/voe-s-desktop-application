import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
export const searchQuery = ref('');

export const navigateTo = (path: string) => {
    router.push(path);
}