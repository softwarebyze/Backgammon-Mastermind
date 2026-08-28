import { Redirect } from 'expo-router';

/** Game options used to duplicate Settings. One settings home. */
export default function GameOptionsRedirect() {
  return <Redirect href="/settings" />;
}
