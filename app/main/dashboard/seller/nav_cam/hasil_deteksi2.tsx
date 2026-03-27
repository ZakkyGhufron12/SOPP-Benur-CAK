import { ReactNativeZoomableView } from '@dudigital/react-native-zoomable-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Alert, Button, Image, StyleSheet, Text, View } from "react-native";

export default function HasilDeteksi() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id_pembelian = Array.isArray(params.id_pembelian) 
    ? params.id_pembelian[0] 
    : params.id_pembelian;

  const { imageUri, jumlah } = params;

  const handleUseResult = async () => {
    const jumlahFinal = Number(jumlah) || 0;
    if (!id_pembelian) {
        Alert.alert("Error", "Kehilangan ID Pembelian. Silakan ulangi proses dari awal.");
        return; 
    }
    try {
        const existingData = await AsyncStorage.getItem('sellerform_data');
        let data = existingData ? JSON.parse(existingData) : {};
        
        // update data di storage
        data.id_pembelian = id_pembelian; 
        data.hasilOtomatis = jumlahFinal;
        data.jumlahBenur = jumlahFinal; // update jumlah benur juga jika ingin auto-fill

        await AsyncStorage.setItem('sellerform_data', JSON.stringify(data));

    } catch (e) {
        console.log("Gagal simpan hasil:", e);
    }
    const existingData = await AsyncStorage.getItem('sellerform_data');
    let data = existingData ? JSON.parse(existingData) : {};
    const idPembelian = data.id_pembelian;
    // pakai replace biar tidak dobel halaman
    router.replace({
      pathname: '/main/dashboard/seller/sellerform',
      params: { 
        hasilAI: String(jumlahFinal), 
        id_pembelian: id_pembelian // <--- INI KUNCINYA
      }
    });
    };

  const handleRetake = () => {
    router.replace({
        pathname: '/main/dashboard/seller/nav_cam/kamera_otomatis3',
        params: { id_pembelian: id_pembelian }
    });
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
          <ReactNativeZoomableView
          maxZoom={10.0}      
          minZoom={1.0}       
          zoomStep={0.5}      
          initialZoom={1}
          bindToBorders={true}
          style={{ padding: 10 }}
          >
          <Image
          source={{ uri: String(imageUri) }}
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
    // efek bayangan 
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