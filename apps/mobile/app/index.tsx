import { Redirect } from 'expo-router';

export default function Index(): JSX.Element {
  // TODO Phase 1: Replace with auth state check
  return <Redirect href="/(auth)/login" />;
}
