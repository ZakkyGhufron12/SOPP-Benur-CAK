import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

export default function KameraOtomatisESP() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const ipStream = "https://habibiws-sopbenur.hf.space/live_view";
  const STORAGE_KEY = 'sellerform2_data'; // Samakan dengan sellerform2.tsx

  const handleCapture = async () => {
    try {
      setLoading(true);

      // 1. Trigger ESP32
      const triggerResponse = await fetch("https://habibiws-sopbenur.hf.space/trigger_capture", { method: "POST" });
      const triggerData = await triggerResponse.json();

      if (triggerData.status !== "success") {
        Alert.alert("Gagal", "Gagal menghubungi ESP32");
        setLoading(false);
        return;
      }

      // 2. Polling hasil
      let attempts = 0;
      let result: any = null;
      while (attempts < 30) {
        const res = await fetch("https://habibiws-sopbenur.hf.space/get_latest_result");
        result = await res.json();
        if (result.status === "success") break;
        await new Promise(r => setTimeout(r, 1000));
        attempts++;
      }

      if (result && result.status === "success") {
        const jumlah = result?.total_detections ?? result?.object_counts?.Benur ?? 0;

        // langsung mengarah ke hasil_deteksi_esp (File baru di bawah)
        router.push({
          pathname: './main/dashboard/seller/nav_cam/hasil_deteksi_esp',
          params: {
            imageUri: result?.image_base64 ? `data:image/jpeg;base64,${result.image_base64}` : null,
            jumlah: String(jumlah),
          },
        });
      } else {
        Alert.alert("Timeout", "ESP32 tidak merespons gambar.");
      }
    } catch (err) {
      Alert.alert("Error", "Koneksi ke server AI terputus.");
    } finally {
      setLoading(false);
    }
  };

  const [webviewUri, setWebviewUri] = useState(ipStream);

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#fff'}}>
      <Stack.Screen options={{ title: "Kamera ESP32 (Umum)", headerTitleAlign: "center" }} />
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl 
            refreshing={false} 
            onRefresh={() => setWebviewUri(`${ipStream}?t=${new Date().getTime()}`)} 
          />
        }
      >
        <Text style={styles.desc}>Gunakan kamera ini untuk pembeli tanpa akun</Text>
        <View style={styles.streamBox}>
          <WebView source={{ uri: webviewUri }} style={{ flex: 1 }} />
        </View>
        
        <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} disabled={loading}>
          <Text style={styles.captureText}>{loading ? "⏳ Sedang Menghitung..." : "📸 Ambil & Deteksi Benur"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  desc: { textAlign: 'center', margin: 10, color: '#666', fontStyle: 'italic' },
  streamBox: { width: '90%', height: 300, alignSelf: 'center', borderRadius: 15, overflow: 'hidden', backgroundColor: '#000', borderWidth: 2, borderColor: '#ccc' },
  captureBtn: { backgroundColor: '#ea3221', padding: 15, margin: 25, borderRadius: 12, alignItems: 'center', elevation: 5 },
  captureText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});