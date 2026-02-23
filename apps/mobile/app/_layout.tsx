import { Stack } from 'expo-router';

export default function RootLayout(): JSX.Element {
  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(trainer)" options={{ headerShown: false }} />
      <Stack.Screen name="(client)" options={{ headerShown: false }} />
    </Stack>
  );
}
