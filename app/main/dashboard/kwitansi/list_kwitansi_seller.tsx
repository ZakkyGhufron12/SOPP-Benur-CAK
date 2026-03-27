import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../../../supabase";

export default function KwitansiList() {
  const router = useRouter();
  const [penjualan, setPenjualan] = useState<any[]>([]);
  const [namaPenjual, setNamaPenjual] = useState<string>("");
  const REAN_VALUE = 5000;

  useEffect(() => {
  const backAction = () => {
    router.push("/(tabs)/home");
    return true; // cegah default behavior
  };

  const backHandler = BackHandler.addEventListener(
    "hardwareBackPress",
    backAction
  );

  return () => backHandler.remove();
  }, []);
    useEffect(() => {
      loadPenjualan();
    }, []);

  async function loadPenjualan() {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return;

    const { data: profil } = await supabase
      .from("registrasi")
      .select("nama_lengkap")
      .eq("email", user.email)
      .single();

    if (!profil) {
      console.warn("⚠️ Profil tidak ditemukan untuk user ini");
      return;
    }

    // simpan ke state (untuk ditampilkan di UI kalau mau)
    setNamaPenjual(profil.nama_lengkap);

    // pakai variabel lokal langsung untuk query
    const { data: kwitansiList, error } = await supabase
      .from("kwitansi")
      .select(`
        id_kwitansi,
        nama_pembeli,
        nama_penjual,
        hasil_perhitungan_benur,
        hasil_perhitungan_benur_manual,
        harga_benur_total,
        metode_pembayaran,
        tanggal_mengambil_orderan
      `)
      .eq("nama_penjual", profil.nama_lengkap)
      .order("tanggal_mengambil_orderan", { ascending: false });

    if (error) {
      console.error("Gagal load kwitansi:", error.message);
      return;
    }

    setPenjualan(kwitansiList || []); // update state untuk FlatList
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "List Kwitansi",
          headerTitleAlign: "center",
          headerLeft: () => (
            <TouchableOpacity style={{ paddingHorizontal: 10 }} onPress={() => router.push("/(tabs)/home")}>
              <Text style={{ color: "#007AFF", fontWeight: "bold" }}>KEMBALI</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <Text style={styles.title}>🧾 Daftar Penjualan Anda</Text>

      <FlatList
        data={penjualan}
        contentContainerStyle={{ paddingBottom: 80 }}
        keyExtractor={(item) => item.id_kwitansi.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>👤 {item.nama_pembeli}</Text>

            <View style={styles.row}>
              <Text style={styles.label}>💰 Total Harga:</Text>
              <Text style={styles.value}>Rp {Number(item.harga_benur_total).toLocaleString("id-ID")}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>🦐 Jumlah Benur:</Text>
              <Text style={styles.value}>
                {item.hasil_perhitungan_benur_manual ??
                  item.hasil_perhitungan_benur ??
                  "-"} ekor
                {item.hasil_perhitungan_benur_manual || item.hasil_perhitungan_benur ? 
                  ` (${((item.hasil_perhitungan_benur_manual ?? item.hasil_perhitungan_benur) / REAN_VALUE).toFixed(2)} rean)` 
                  : ""}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>📅 Tanggal:</Text>
              <Text style={styles.value}>
                {new Date(item.tanggal_mengambil_orderan).toLocaleString()}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={() =>
                router.push(`/main/dashboard/kwitansi/id_penjualan?id=${item.id_kwitansi}`)
              }
            >
              <Text style={styles.buttonText}>Lihat Kwitansi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#FF9500" }]}
              onPress={() =>
                router.push(`/main/dashboard/kwitansi/edit?id=${item.id_kwitansi}`)
              }
            >
              <Text style={styles.buttonText}>Edit Transaksi</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f0f4f8" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15, textAlign: "center" },

  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  cardTitle: { fontSize: 18, fontWeight: "600", marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label: { fontSize: 14, color: "#555" },
  value: { fontSize: 14, fontWeight: "600" },

  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: { color: "white", fontWeight: "bold", textAlign: "center" },
});
