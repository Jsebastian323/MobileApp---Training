import { StyleSheet, Text, View } from 'react-native';

export default function ClientDashboard(): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Client Dashboard</Text>
      <Text style={styles.subtitle}>Coming Soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 8, color: '#666' },
});
