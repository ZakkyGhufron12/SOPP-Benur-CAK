import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Alert, Button, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function KameraOtomatis() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasilAI, setHasilAI] = useState<string | null>(null);
  const id_pembelian = Array.isArray(params.id_pembelian) 
    ? params.id_pembelian[0] 
    : params.id_pembelian;

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>Izinkan akses kamera untuk melanjutkan</Text>
        <Button title="Izinkan" onPress={requestPermission} />
      </View>
    );
  }

  const handleCapture = async () => {
    try {
      setLoading(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 1.0,
        base64: false,
      });

      // BAGIAN RESIZE & COMPRESS GAMBAR
      const resized = await ImageManipulator.manipulateAsync(
        photo.uri,
        //[{ resize: { width: 1800 } }],
        [], // bisa coba 480 / 800 juga
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Preview pakai gambar yang sudah dikecilkan
      setPreview(resized.uri);

      const formData = new FormData();
      formData.append('file', {
        uri: resized.uri,        // PAKAI YANG SUDAH DI-RESIZE
        name: 'benur.jpg',
        type: 'image/jpeg'
      } as any);

      // Tambahan debug: biar tahu apa respons aslinya
      const response = await fetch(
        'https://habibiws-sopbenur.hf.space/detect',
        { method: 'POST', body: formData }
      );

      const raw = await response.text();
      console.log("====== RAW RESPONSE DARI AI ======");
      console.log(raw);

      let result: any = null;
      try {
        result = JSON.parse(raw);
      } catch (err) {
        console.log("JSON PARSE ERROR:", err);
      }

      console.log("====== PARSED JSON ======");
      console.log(result);

      // logic lama tetap: cek apakah ada `result.count`
      const jumlah =
        result?.total_detections ??
        result?.object_counts?.Benur ??
        null;

      if (jumlah !== null) {
        setHasilAI(String(jumlah));

        // Simpan ke AsyncStorage agar sellerform2 bisa baca
        try {
          //const existingData = await AsyncStorage.getItem('sellerform2_data');
          //let data = existingData ? JSON.parse(existingData) : {};
          //data.hasilOtomatis = jumlah;
          //data.jumlahBenur = jumlah;
          //await AsyncStorage.setItem('sellerform2_data', JSON.stringify(data));
        } catch (e) {
          console.log("Gagal simpan hasil AI ke storage:", e);
        }

        //router.back(); // Kembali ke form
        router.push({
        pathname: '/main/dashboard/seller/nav_cam/hasil_deteksi2',
        params: {
          imageUri: result?.image_base64
            ? `data:image/jpeg;base64,${result.image_base64}`
            : null,
          jumlah: String(jumlah),
          id_pembelian: id_pembelian,
        },
      });
      }

    } catch (e) {
      console.log("ERROR HANDLE CAPTURE:", e);
      Alert.alert('Error', 'Gagal mengambil gambar atau mengirim ke server.');
    } finally {
      setLoading(false);
    }
  };

  const getTargetPath = (formName: string | undefined) => {
    switch (formName) {
      case 'sellerform': return '/main/dashboard/seller/sellerform';
      case 'sellerform2': return '/main/dashboard/seller/sellerform2';
      default: return '/main/dashboard/seller/sellerform2';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Kamera Otomatis (HP) 2',
          headerTitleAlign: 'center',
        }}
      />

      {!preview && (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        />
      )}

      {preview && (
        <Image source={{ uri: preview }} style={styles.preview} />
      )}

      <Button
        title={loading ? '⏳ Memproses...' : 'Ambil Gambar & Kirim ke AI'}
        disabled={loading}
        onPress={handleCapture}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff', gap: 10 },
  camera: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  preview: { flex: 1, borderRadius: 12 },
});
