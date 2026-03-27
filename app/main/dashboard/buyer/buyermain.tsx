import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../../supabase";

interface Pembelian {
  id_pembelian: string;
  id_kwitansi : string;
  nama_pembeli: string;
  hasil_perhitungan_benur_manual: number;
  jumlah_benur_yang_dibeli: number;
  hasil_perhitungan_benur: number | null;
  metode_pembayaran: string | null;
  tanggal_mengambil_orderan: string;
  tanggal_pembelian: string;
  keterangan: string | null;
  nomor_telepon?: string | null;
  status?: string | null;
  nama_penjual?: string | null;
  lokasi_tujuan?: string | null;
  penjual_dipilih?: string | null;
}

interface Profil {
  id_registrasi: string;
  nama_lengkap: string;
  email: string;
  role: string;
}

export default function BuyerMain() {
  const router = useRouter();
  const [profil, setProfil] = useState<Profil | null>(null);
  const [orders, setOrders] = useState<Pembelian[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBenur, setTotalBenur] = useState(0);
  const [totalPengeluaran, setTotalPengeluaran] = useState(0);

  useEffect(() => {
  const loadData = async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      Alert.alert("Belum login");
      router.replace("/auth/login");
      return;
    }

    // 1. Ambil profil pengguna
    const { data: profilData } = await supabase
      .from("registrasi")
      .select("id_registrasi, nama_lengkap, email, role")
      .eq("email", auth.user.email)
      .single();

    if (!profilData) {
      Alert.alert("Error", "Gagal memuat profil pengguna");
      setLoading(false);
      return;
    }

    setProfil(profilData);

    // 2. Ambil data pembelian (riwayat)
    const { data: pembelianData, error: pembelianError } = await supabase
      .from("pembelian")
      .select("*")
      .eq("nama_pembeli", profilData.nama_lengkap)
      .order("tanggal_pembelian", { ascending: false });

    if (pembelianError) console.error(pembelianError);
    setOrders(pembelianData || []);

    // 3. Ambil data kwitansi untuk total benur
    const { data: kwitansiData } = await supabase
      .from("kwitansi")
      .select("hasil_perhitungan_final, harga_benur_total")
      .eq("nama_pembeli", profilData.nama_lengkap);

    const totalBnr = kwitansiData?.reduce((sum, item) => sum + (item.hasil_perhitungan_final ?? 0), 0) ?? 0;
    const totalRp = kwitansiData?.reduce((sum, item) => sum + (item.harga_benur_total ?? 0), 0) ?? 0;

    setTotalBenur(totalBnr);
    setTotalPengeluaran(totalRp);

    // 4. Hitung total benur
    const total = kwitansiData?.reduce(
      (sum, item) => sum + (item.hasil_perhitungan_final ?? 0),
      0
    ) ?? 0;

    setTotalBenur(total);
    setLoading(false);
  };

  loadData();

  const channel = supabase
    .channel("buyer-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "pembelian" }, loadData)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0a84ff" />
        <Text>Memuat data...</Text>
      </View>
    );

  async function handleHapusOrder(id_pembelian: string) {
    Alert.alert("Hapus Pesanan", "Apakah Anda yakin ingin menghapus pesanan ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya, Hapus",
        onPress: async () => {
          // Hapus dari orders dulu (karena ada foreign key)
          await supabase.from("orders").delete().eq("id_pembelian", id_pembelian);

          // Hapus dari pembelian
          const { error } = await supabase.from("pembelian").delete().eq("id_pembelian", id_pembelian);

          if (error) {
            console.error(error);
            Alert.alert("Gagal", "Tidak dapat menghapus pesanan.");
          } else {
            Alert.alert("✅ Berhasil", "Pesanan dihapus dari riwayat.");
            // Refresh data
            const { data: pembelianData } = await supabase
              .from("pembelian")
              .select("*")
              .eq("nama_pembeli", profil?.nama_lengkap)
              .order("tanggal_pembelian", { ascending: false });
            setOrders(pembelianData || []);
          }
        },
      },
    ]);
  }
  // function getJumlahBenur(item: Pembelian) {
  //   if (item.hasil_perhitungan_benur) return item.hasil_perhitungan_benur;
  //   if (item.hasil_perhitungan_benur_manual) return item.hasil_perhitungan_benur_manual;
  //   return 0;
  // }

  return (
    <FlatList
      data={orders}
      keyExtractor={(item, index) => (item.id_pembelian ? item.id_pembelian.toString() : `no-id-${index}`)}
      ListHeaderComponent={
        <View key="header">
          {/* HEADER */}
          <LinearGradient colors={["#0a84ff", "#60a5fa"]} style={styles.header}>
            <View style={styles.headerContent}>
              <Ionicons name="person-circle-outline" size={60} color="white" />
              <View>
                <Text style={styles.headerText}>Halo, {profil?.nama_lengkap ?? "Buyer"} 👋</Text>
                <Text style={styles.headerSub}>Selamat datang di SOPP-BENUR CAK</Text>
                <Text style={styles.headerSub}>Anda Sekarang berada di Dashboard Pembelian</Text>
              </View>
            </View>
          </LinearGradient>
          {/* SUMMARY */}
          <View style={styles.summaryRow}>
            <View style={styles.cardStat}>
              <Text style={styles.statLabel}>Total Pembelian</Text>
              <Text style={styles.statValue}>{orders.length}</Text>
            </View>
            <View style={styles.cardStat}>
              <Text style={styles.statLabel}>Total Benur Dibeli</Text>
              <Text style={styles.statValue}>{totalBenur} ekor</Text>
            </View>
          </View>
          {/* SUMMARY INFORMATION - INTERAKTIF */}
          <View style={styles.summaryContainer}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => router.push("/main/dashboard/buyer/report_detail_buyer" as any)} 
              style={styles.summaryCardMain}
            >
              <View style={styles.summaryHeaderRow}>
                <Text style={styles.summaryTitle}>Informasi Pembelian</Text>
                <Ionicons name="chevron-forward" size={18} color="#64748b" />
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Transaksi</Text>
                  <Text style={[styles.statBoxValue, { color: "#0a84ff" }]}>{orders.length}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Pengeluaran</Text>
                  <Text style={[styles.statBoxValue, { color: "#10b981" }]}>
                    Rp {totalPengeluaran >= 1000000 
                      ? (totalPengeluaran / 1000000).toFixed(1) + 'jt' 
                      : totalPengeluaran.toLocaleString('id-ID')}
                  </Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>Total Benur</Text>
                  <Text style={[styles.statBoxValue, { color: "#f59e0b" }]}>
                    {totalBenur >= 1000 ? (totalBenur/1000).toFixed(1) + 'rb' : totalBenur}
                  </Text>
                </View>
              </View>
              
              <View style={styles.detailsDivider}>
                <Text style={styles.detailHint}>Klik untuk lihat grafik riwayat belanja →</Text>
              </View>
            </TouchableOpacity>
          </View>
          {/* TOMBOL */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/main/dashboard/buyer/buyerform")}
          >
            <Ionicons name="add-circle-outline" size={20} color="white" />
            <Text style={styles.buttonText}>Buat Pembelian Baru</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Riwayat Pembelian</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.cardOrder} key={item.id_pembelian}>
          <Text style={styles.cardTitle}>{item.nama_pembeli}</Text>
          <Text>🦐 Jumlah : {item.jumlah_benur_yang_dibeli} ekor</Text>
          <Text>💳 Metode : {item.metode_pembayaran ?? "-"}</Text>
          <Text>📅 Tanggal : {new Date(item.tanggal_pembelian).toLocaleString("id-ID")}</Text>
          {item.status && (
            <Text style={{ color: item.status === "belum_diambil" ? "#e11d48" : "#16a34a" }}>
              Status : {item.status}
            </Text>
          )}
          <Text>🙎🏻‍♂️ Pembeli : {item.penjual_dipilih}</Text>
          {item.status === "dibatalkan oleh penjual" && (
            <View style={{ marginTop: 10 }}>
              <Text style={{ color: "#ef4444", marginBottom: 6, fontWeight: "500" }}>
                ❌ Pesanan dibatalkan oleh penjual: {item.penjual_dipilih ?? "Tidak diketahui"}
              </Text>
              <TouchableOpacity
                style={styles.orderButton}
                onPress={() => handleHapusOrder(item.id_pembelian)}
              >
                <Ionicons name="trash-outline" size={20} color="white" />
                <Text style={styles.orderButtonText}>Hapus Pesanan</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      ListFooterComponent={
        <View key="footer">
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: "#10b981", marginBottom: 30 }]}
            onPress={() => router.push("/main/dashboard/kwitansi/list_kwitansi_buyer")}
          >
            <Ionicons name="receipt-outline" size={20} color="white" />
            <Text style={styles.buttonText}>Lihat Kwitansi Pembelian</Text>
          </TouchableOpacity>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingVertical: 24, paddingHorizontal: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerText: { color: "white", fontSize: 20, fontWeight: "bold" },
  headerSub: { color: "white", fontSize: 12, opacity: 0.9 },
  summaryRow: { flexDirection: "row", justifyContent: "space-around", marginVertical: 16 },
  cardStat: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    width: "45%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  statLabel: { color: "#64748b", fontSize: 13 },
  statValue: { fontSize: 18, fontWeight: "bold", color: "#0f172a" },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: "#0a84ff",
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  buttonText: { color: "white", fontWeight: "bold" },
  sectionTitle: { marginLeft: 16, marginTop: 10, fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  cardOrder: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTitle: { fontWeight: "bold", fontSize: 15, marginBottom: 4 },
  orderButton: {
  backgroundColor: "#ef4444",
  paddingVertical: 10,
  borderRadius: 8,
  alignItems: "center",
},
orderButtonText: {
  color: "white",
  fontWeight: "bold",},
  summaryContainer: { marginHorizontal: 16, marginBottom: 10 },
  summaryCardMain: { backgroundColor: 'white', borderRadius: 15, padding: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  summaryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { flex: 1, alignItems: 'center' },
  statBoxLabel: { fontSize: 10, color: '#64748b', marginBottom: 4 },
  statBoxValue: { fontSize: 14, fontWeight: 'bold' },
  detailsDivider: { marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', alignItems: 'center' },
  detailHint: { fontSize: 11, color: '#0a84ff', fontStyle: 'italic' },
});
