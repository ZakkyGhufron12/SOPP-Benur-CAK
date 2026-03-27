import { Stack, useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function AutoCam() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Pilih Metode Pengambilan",
          headerTitleAlign: "center",
        }}
      />

      <Text style={styles.title}>Pilih Metode Pengambilan Gambar</Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#0077FF" }]}
        onPress={() => router.push("./nav_cam/kamera_otomatis")}
      >
        <Text style={styles.buttonText}>📡 Gunakan Alat Camera ESP32</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#00C851" }]}
        onPress={() => router.push("./nav_cam/kamera_otomatis2")}
      >
        <Text style={styles.buttonText}>📱 Gunakan Kamera HP</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", gap: 20, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 30 },
  button: {
    padding: 18,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
