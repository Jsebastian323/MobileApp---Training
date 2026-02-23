import { StyleSheet, Text, View } from 'react-native';

export default function LoginScreen(): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Training Platform</Text>
      <Text style={styles.subtitle}>Login — Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 16, marginTop: 8, color: '#666' },
});
