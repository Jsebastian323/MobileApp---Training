import { Stack } from 'expo-router';

export default function ClientLayout(): JSX.Element {
  return <Stack screenOptions={{ headerShown: false }} />;
}
