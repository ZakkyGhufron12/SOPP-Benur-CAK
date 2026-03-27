import * as Clipboard from "expo-clipboard";
import * as Print from "expo-print";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import { Alert, Button, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../../../supabase";

export default function KwitansiDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [kwitansi, setKwitansi] = useState<any>(null);

  useEffect(() => {
    loadKwitansi();
  }, [id]);

  async function loadKwitansi() {
    if (!id) return;
    const { data, error } = await supabase
      .from("kwitansi")
      .select("*")
      .eq("id_kwitansi", id)
      .single();
    if (error) {
      Alert.alert("Error", "Gagal memuat data kwitansi");
      return;
    }
    setKwitansi(data);
  }

  const handleDownloadPDF = async () => {
    if (!kwitansi) return;
    try {
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { text-align: center; }
              .card { border: 1px solid #ccc; border-radius: 10px; padding: 15px; }
              .row { margin-bottom: 8px; }
              .label { font-weight: bold; }
              .value { margin-left: 8px; }
            </style>
          </head>
          <body>
            <h1>Kwitansi Penjualan Udang</h1>
            <div class="card">
              <div class="row"><span class="label">ID Kwitansi:</span> <span class="value">${kwitansi.id_kwitansi}</span></div>
              <div class="row"><span class="label">Penjual:</span> <span class="value">${kwitansi.nama_penjual}</span></div>
              <div class="row"><span class="label">Pembeli:</span> <span class="value">${kwitansi.nama_pembeli}</span></div>
              <div class="row"><span class="label">Jumlah Benur:</span> <span class="value">${kwitansi.hasil_perhitungan_benur_manual ?? kwitansi.hasil_perhitungan_benur ?? "-"}</span></div>
              <div class="row"><span class="label">Harga Total:</span> <span class="value">Rp ${kwitansi.harga_benur_total?.toLocaleString()}</span></div>
              <div class="row"><span class="label">Metode Pembayaran:</span> <span class="value">${kwitansi.metode_pembayaran}</span></div>
              <div class="row"><span class="label">Tanggal Transaksi:</span> <span class="value">${new Date(kwitansi.tanggal_mengambil_orderan).toLocaleString()}</span></div>
              <div class="row"><span class="label">Status:</span> <span class="value">${kwitansi.status_transaksi}</span></div>
              <div class="row"><span class="label">Nomor Telepon Pembeli:</span> <span class="value">${kwitansi.nomor_telepon_pembeli}</span></div>
            </div>
            <p style="text-align:center; margin-top:20px;">Terima kasih telah bertransaksi 🦐</p>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Bagikan atau simpan Kwitansi PDF",
      });
    } catch (err) {
      console.error(err);
      Alert.alert("Gagal", "Tidak dapat membuat file PDF");
    }
  };

  if (!kwitansi) {
    return (
      <View style={styles.center}>
        <Text>Memuat data kwitansi...</Text>
      </View>
    );
  }
  const handleOpenWhatsApp = () => {
    if (!kwitansi?.nomor_telepon_pembeli) {
      Alert.alert("Nomor tidak ada");
      return;
    }

    const nomor = kwitansi.nomor_telepon_pembeli.replace(/^0/, "62");
    const url = `https://wa.me/${nomor}`;

    Linking.openURL(url).catch(() =>
      Alert.alert("Gagal membuka WhatsApp")
    );
  };
  const copyPhoneNumber = async () => {
    if (!kwitansi?.nomor_telepon_pembeli) return;
    await Clipboard.setStringAsync(kwitansi.nomor_telepon_pembeli);
    Alert.alert("Disalin", "Nomor telepon pembeli telah disalin.");
  };
  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "List Kwitansi Pembelian",
          headerTitleAlign: "center",
          headerLeft: () => (
            <TouchableOpacity
              style={{ paddingHorizontal: 10 }}
              onPress={() => router.push('/(tabs)/home')}
            >
              <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>KEMBALI</Text>
          </TouchableOpacity>
          ),
        }}
      />
      <Text style={styles.title}>🧾 Rincian Kwitansi</Text>

      <View style={styles.card}>
        <Text style={styles.label}>🆔 ID Kwitansi:</Text>
        <Text style={styles.value}>{kwitansi.id_kwitansi}</Text>

        <Text style={styles.label}>👤 Pembeli:</Text>
        <Text style={styles.value}>{kwitansi.nama_pembeli}</Text>

        <Text style={styles.label}>🧑‍🌾 Penjual:</Text>
        <Text style={styles.value}>{kwitansi.nama_penjual}</Text>

        <Text style={styles.label}>🦐 Jumlah Benur:</Text>
        <Text style={styles.value}>
          {kwitansi.hasil_perhitungan_benur_manual ??
            kwitansi.hasil_perhitungan_benur ??
            "-"}
        </Text>

        <Text style={styles.label}>💰 Total Harga:</Text>
        <Text style={styles.value}>Rp {kwitansi.harga_benur_total?.toLocaleString()}</Text>

        <Text style={styles.label}>💳 Metode Pembayaran:</Text>
        <Text style={styles.value}>{kwitansi.metode_pembayaran ?? "-"}</Text>

        <Text style={styles.label}>📅 Tanggal Transaksi:</Text>
        <Text style={styles.value}>
          {new Date(kwitansi.tanggal_mengambil_orderan).toLocaleString()}
        </Text>

        <Text style={styles.label}>📞 Nomor Telepon Pembeli:</Text>
        <TouchableOpacity onPress={copyPhoneNumber}>
          <Text style={[styles.value, { color: "blue", textDecorationLine: "underline" }]}>
            {kwitansi.nomor_telepon_pembeli} (Tap untuk copy)
          </Text>
        </TouchableOpacity>

      </View>
      <View style={{ marginTop: 10 }}>
        <Button title="📄 Unduh PDF Kwitansi" onPress={handleDownloadPDF} />
      </View>
      <View style={styles.label}><Text>Ketika Bagikan, Jangan Lupa "Tap Nomor Berwarna Biru"</Text></View>
      <View style={styles.label}><Text>Untuk Salin Nomor Telepon Ke WhatsApp dan hilangkan angka "0"</Text></View>
      <View></View>
      <View style={styles.label}><Text>Contoh :</Text></View>
      <View style={styles.label}><Text>082132744852 menjadi 👉🏻 82132744852</Text></View>
      <View style={{ marginTop: 10 }}>
        <Button
          title="💬 Hubungi Pembeli via WhatsApp"
          color="green"
          onPress={handleOpenWhatsApp}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    backgroundColor: "#f9f9f9",
    marginBottom: 20,
  },
  label: { fontWeight: "bold", marginTop: 8 },
  value: { marginLeft: 5 },
});
