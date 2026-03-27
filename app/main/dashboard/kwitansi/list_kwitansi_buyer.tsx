import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { supabase } from "../../../../supabase";

export default function ListKwitansiBuyer() {
  const router = useRouter();
  const [kwitansiList, setKwitansiList] = useState<any[]>([]);
  const [namaPembeli, setNamaPembeli] = useState<string>("");
  const REAN_VALUE = 5000;

  // Handle tombol back
  useEffect(() => {
    const backAction = () => {
      router.push("/(tabs)/home");
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    loadKwitansiBuyer();
  }, []);

  async function loadKwitansiBuyer() {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return;

    // Ambil nama pembeli dari tabel registrasi
    const { data: profil } = await supabase
      .from("registrasi")
      .select("nama_lengkap")
      .eq("email", user.email)
      .single();

    if (!profil) {
      console.warn("⚠️ Profil tidak ditemukan untuk user ini");
      return;
    }

    setNamaPembeli(profil.nama_lengkap);

    // Ambil semua kwitansi berdasarkan nama pembeli
    const { data, error } = await supabase
      .from("kwitansi")
      .select(`
        id_kwitansi,
        nama_pembeli,
        nama_penjual,
        harga_benur_total,
        metode_pembayaran,
        hasil_perhitungan_benur,
        hasil_perhitungan_benur_manual,
        tanggal_mengambil_orderan
      `)
      .eq("nama_pembeli", profil.nama_lengkap)
      .order("tanggal_mengambil_orderan", { ascending: false });

    if (error) {
      console.error("Gagal load kwitansi:", error.message);
      return;
    }

    setKwitansiList(data || []);
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "List Kwitansi Pembelian",
          headerTitleAlign: "center",
          headerLeft: () => (
            <TouchableOpacity style={{ paddingHorizontal: 10 }} onPress={() => router.push("/(tabs)/home")}>
              <Text style={{ color: "#007AFF", fontWeight: "bold" }}>KEMBALI</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <Text style={styles.title}>🧾 Daftar Kwitansi Anda</Text>

      <FlatList
        data={kwitansiList}
        keyExtractor={(item) => item.id_kwitansi.toString()}
        renderItem={({ item }) => {
          const jumlahBenur = item.hasil_perhitungan_benur_manual ??
                              item.hasil_perhitungan_benur ??
                              null;

          const jumlahRean = jumlahBenur ? (jumlahBenur / REAN_VALUE).toFixed(2) : null;

          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📌 Transaksi</Text>

              <View style={styles.row}>
                <Text style={styles.label}>🧑‍🌾 Penjual</Text>
                <Text style={styles.value}>{item.nama_penjual}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>💰 Total Harga</Text>
                <Text style={styles.value}>Rp {item.harga_benur_total}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>🦐 Jumlah Benur</Text>
                <Text style={styles.value}>
                  {jumlahBenur ? `${jumlahBenur} ekor (${jumlahRean} rean)` : "-"}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>📅 Tanggal</Text>
                <Text style={styles.value}>{new Date(item.tanggal_mengambil_orderan).toLocaleString()}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>💳 Metode</Text>
                <Text style={styles.value}>{item.metode_pembayaran}</Text>
              </View>

              <TouchableOpacity style={styles.button} onPress={() => router.push(`/main/dashboard/kwitansi/id_pembelian?id=${item.id_kwitansi}`)}>
                <Text style={styles.buttonText}>Lihat Rincian</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f7fa" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 15, textAlign: "center" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  cardTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10 },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },

  value: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#222",
  },

  button: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#007AFF",
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
});
