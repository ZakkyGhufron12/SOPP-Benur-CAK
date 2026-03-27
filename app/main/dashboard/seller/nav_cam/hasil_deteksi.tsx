import { ReactNativeZoomableView } from '@dudigital/react-native-zoomable-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Button, Image, StyleSheet, Text, View } from "react-native";

export default function HasilDeteksi() {
  const router = useRouter();
  const { imageUri, jumlah } = useLocalSearchParams();
  console.log("Jumlah dari params:", jumlah, typeof jumlah);

  const handleUseResult = async () => {
    const jumlahFinal = Number(jumlah) || 0;

    try {
        const existingData = await AsyncStorage.getItem('sellerform2_data');
        let data = existingData ? JSON.parse(existingData) : {};

        data.hasilOtomatis = jumlahFinal;
        data.jumlahBenur = jumlahFinal;

        console.log("SIAP DIKIRIM:", {
        jumlah,
        jumlahFinal,
        data
        });

        await AsyncStorage.setItem('sellerform2_data', JSON.stringify(data));

    } catch (e) {
        console.log("Gagal simpan hasil:", e);
    }

    router.push({
      pathname: '/main/dashboard/seller/sellerform2',
      params: { hasilAI: String(jumlahFinal) }
    });
    };

  const handleRetake = () => {
    router.replace('/main/dashboard/seller/nav_cam/kamera_otomatis2');
    };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
        title: "Hasil Deteksi Benur",
        headerTitleAlign: "center",
        }}
      />
      <Text style={styles.title}>Hasil Deteksi Benur</Text>

      {imageUri && (
        <View style={styles.imageContainer}>
          
          {/* 3. bagian zoomable */}
          <ReactNativeZoomableView
            maxZoom={10.0}       // Bisa zoom sampai 10x (Benur butuh zoom gede)
            minZoom={1.0}        // Minimal 1x
            zoomStep={0.5}       // Kecepatan zoom
            initialZoom={1}
            bindToBorders={true} // Agar gambar tidak "kabur" keluar kotak saat digeser
            style={{ padding: 10 }}
          >
            <Image
              source={{ uri: String(imageUri) }}
              // Pakai 'contain' agar gambar utuh terlihat semua
              style={{ width: '100%', height: '100%', resizeMode: 'contain' }} 
            />
          </ReactNativeZoomableView>

        </View>
      )}
      <View style={styles.resultBox}>
        <Text style={styles.resultTitle}>Hasil Perhitungan:</Text>
        <Text style={styles.resultValue}>{jumlah} Ekor</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Yakin Pakai Hasil Ini" onPress={handleUseResult} />
        <View style={{ height: 10 }} />
        <Button title="Ambil Gambar Ulang" onPress={handleRetake} color="red" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... style container, title, imageContainer biarkan tetap sama ...
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  
  // Style Image Container kamu yang lama
  imageContainer: {
    height: 400,
    width: '100%', 
    marginVertical: 15,
    borderRadius: 12, 
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd'
  },

  // style baru
  resultBox: {
    backgroundColor: '#eff6ff', // (Background)
    borderColor: '#3b82f6',     // (Garis Pinggir)
    borderWidth: 2,             // Ketebalan garis
    borderRadius: 5,           // Sudut melengkung
    //paddingVertical: 5,        // Jarak atas-bawah di dalam kotak
    //paddingHorizontal: 5,
    marginHorizontal: 50,
    alignItems: 'center',       // Teks rata tengah
    justifyContent: 'center',
    // Efek bayangan dikit biar timbul
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4, 
  },
  resultTitle: {
    fontSize: 14,
    color: '#1e40af',           // Biru tua
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase', // Huruf besar semua biar rapi
    letterSpacing: 1,
  },
  resultValue: {
    fontSize: 20,               // Angka dibuat BESAR
    fontWeight: 'bold',
    color: '#1d4ed8',           // Biru lebih tebal
  },
  
  buttonContainer: { marginTop: 10 }, // Sedikit dirapikan
});