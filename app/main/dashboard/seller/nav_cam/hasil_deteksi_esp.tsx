import { ReactNativeZoomableView } from '@dudigital/react-native-zoomable-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Button, Image, StyleSheet, Text, View } from "react-native";

export default function HasilDeteksiESP() {
  const router = useRouter();
  const { imageUri, jumlah } = useLocalSearchParams();

  const handleUseResult = async () => {
    const jumlahFinal = Number(jumlah) || 0;
    try {
      const existingData = await AsyncStorage.getItem('sellerform2_data');
      let data = existingData ? JSON.parse(existingData) : {};

      data.hasilOtomatis = jumlahFinal;
      data.jumlahBenur = jumlahFinal;

      await AsyncStorage.setItem('sellerform2_data', JSON.stringify(data));

      router.replace({
        pathname: '/main/dashboard/seller/sellerform2',
        params: { hasilAI: String(jumlahFinal) }
      });
    } catch (e) {
      console.log("Gagal simpan:", e);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Hasil ESP32", headerTitleAlign: "center" }} />
      <Text style={styles.title}>Hasil Deteksi ESP32</Text>

      <View style={styles.imageContainer}>
        <ReactNativeZoomableView maxZoom={10} minZoom={1} bindToBorders={true}>
          <Image source={{ uri: String(imageUri) }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
        </ReactNativeZoomableView>
      </View>

      <View style={styles.resultBox}>
        <Text style={styles.resultTitle}>JUMLAH TERDETEKSI:</Text>
        <Text style={styles.resultValue}>{jumlah} Ekor</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Ya, Gunakan Hasil Ini" onPress={handleUseResult} />
        <View style={{ height: 10 }} />
        <Button title="Ambil Ulang" onPress={() => router.back()} color="red" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  imageContainer: { height: 350, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#ddd' },
  resultBox: { marginVertical: 20, padding: 15, backgroundColor: '#eff6ff', borderRadius: 10, alignItems: 'center', borderWidth: 2, borderColor: '#3b82f6' },
  resultTitle: { color: '#1e40af', fontWeight: '600', fontSize: 12 },
  resultValue: { fontSize: 28, fontWeight: 'bold', color: '#1d4ed8' },
  buttonContainer: { marginTop: 5 }
});