import { router } from 'expo-router';

/** Pop if there is history; otherwise go home so refresh never dead-ends. */
export function goBackOrHome(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/');
}
