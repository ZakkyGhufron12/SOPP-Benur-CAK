import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme
} from "react-native";
import { supabase } from "../../../../supabase";

const Colors = {
  light: {
    background: "#f9fafb",
    card: "#ffffff",
    textPrimary: "#0f172a",
    textSecondary: "#64748b",
    border: "#e2e8f0",
  },
  dark: {
    background: "#111827",
    card: "#1f2937",
    textPrimary: "#f3f4f6",
    textSecondary: "#9ca3af",
    border: "#374151",
  },
};

export default function SellerMain() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const [loading, setLoading] = useState(true);
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [stokSisa, setStokSisa] = useState<number>(0);
  const [stokInput, setStokInput] = useState<string>("");
  const [orderCount, setOrderCount] = useState(0);
  const [topBuyers, setTopBuyers] = useState<any[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    const { data: profil } = await supabase
      .from("registrasi")
      .select("nama_lengkap")
      .eq("email", user.email)
      .single();

    if (profil) {
      setSellerProfile(profil);
      await Promise.all([
        fetchStok(profil.nama_lengkap),
        fetchOrderCount(profil.nama_lengkap),
        fetchTopBuyers(profil.nama_lengkap),
      ]);
    }
    setLoading(false);
  }

  // Menghitung jumlah pesanan yang belum diambil untuk badge tombol
  async function fetchOrderCount(namaPenjual: string) {
    const { count } = await supabase
      .from("pembelian")
      .select("*", { count: 'exact', head: true })
      .eq("status", "belum_diambil")
      .eq("penjual_dipilih", namaPenjual);
    setOrderCount(count || 0);
  }

  async function fetchStok(namaPenjual: string) {
    const { data } = await supabase
      .from("stok_benur")
      .select("stok_sisa")
      .eq("nama_penjual", namaPenjual)
      .maybeSingle();
    setStokSisa(data?.stok_sisa || 0);
  }
  const [showDetails, setShowDetails] = useState(false);
    const [summary, setSummary] = useState({
      totalTransaksi: 0,
      totalPendapatan: 0,
      totalPelanggan: 0
    });
  // LOGIKA REKAP DATA: Mengambil dari tabel kwitansi
  async function fetchTopBuyers(namaPenjual: string) {
    const { data, error } = await supabase
      .from("kwitansi")
      .select("nama_pembeli, hasil_perhitungan_final, harga_benur_total")
      .eq("nama_penjual", namaPenjual);

    if (data) {
      let totalRp = 0;
      let totalTx = data.length;
      
      const recap = data.reduce((acc: any, item: any) => {
        const name = item.nama_pembeli || "Anonim";
        totalRp += Number(item.harga_benur_total || 0);
        
        if (!acc[name]) {
          acc[name] = { nama: name, totalBenur: 0, totalRupiah: 0, kaliBeli: 0 };
        }
        acc[name].totalBenur += Number(item.hasil_perhitungan_final || 0);
        acc[name].totalRupiah += Number(item.harga_benur_total || 0);
        acc[name].kaliBeli += 1;
        return acc;
      }, {});

      const sortedRecap = Object.values(recap).sort((a: any, b: any) => b.totalRupiah - a.totalRupiah);
      
      setTopBuyers(sortedRecap);
      // Simpan ke state summary
      setSummary({
        totalTransaksi: totalTx,
        totalPendapatan: totalRp,
        totalPelanggan: sortedRecap.length
      });
    }
  }

  const handleTambahStok = async () => {
    if (!stokInput) return Alert.alert("Masukkan jumlah stok!");
    const namaPenjual = sellerProfile.nama_lengkap;
    
    // ... (Logika update stok sama seperti kode awalmu) ...
    const { data: existingStok } = await supabase.from("stok_benur").select("*").eq("nama_penjual", namaPenjual).maybeSingle();
    if (existingStok) {
      await supabase.from("stok_benur").update({
        stok_sisa: existingStok.stok_sisa + parseInt(stokInput),
        stok_awal: existingStok.stok_awal + parseInt(stokInput),
        updated_at: new Date(),
      }).eq("id_stok", existingStok.id_stok);
    } else {
      await supabase.from("stok_benur").insert({
        nama_penjual: namaPenjual, stok_awal: parseInt(stokInput), stok_sisa: parseInt(stokInput),
      });
    }
    Alert.alert("✅ Stok berhasil diperbarui!");
    setStokInput("");
    fetchStok(namaPenjual);
  };

  if (loading) return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color="#0a84ff" />
    </View>
  );
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER */}
      <LinearGradient colors={["#0a84ff", "#60a5fa"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Ionicons name="storefront-outline" size={42} color="white" />
          <View>
            <Text style={styles.headerText}>Halo, {sellerProfile?.nama_lengkap} 👋</Text>
            <Text style={styles.headerSub}>Panel Kendali Penjual</Text>
          </View>
        </View>
      </LinearGradient>

      {/* TOMBOL PESANAN MASUK (PINDAHAN) */}
      <TouchableOpacity 
        style={styles.orderNotificationCard}
        onPress={() => router.push("/main/dashboard/seller/orders" as any)} // Tambahkan 'as any'
      >
        <View style={styles.orderNotifLeft}>
          <View style={styles.iconBadgeContainer}>
            <Ionicons name="mail-unread-outline" size={28} color="#0a84ff" />
            {orderCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{orderCount}</Text></View>}
          </View>
          <View>
            <Text style={[styles.notifTitle, { color: theme.textPrimary }]}>Pesanan Masuk</Text>
            <Text style={{ color: theme.textSecondary }}>{orderCount} pesanan menunggu diambil</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      </TouchableOpacity>

      {/* STOK BENUR */}
      <View style={[styles.cardStat, { backgroundColor: theme.card }]}>
        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>📦 Stok Benur Saat Ini</Text>
        <Text style={[styles.statValue, { color: theme.textPrimary }]}>{stokSisa.toLocaleString()} <Text style={{fontSize: 14}}>Ekor</Text></Text>
        <View style={styles.stokRow}>
          <TextInput
            placeholder="Tambah unit stok..."
            placeholderTextColor={theme.textSecondary}
            keyboardType="numeric"
            value={stokInput}
            onChangeText={setStokInput}
            style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: isDark ? '#374151' : '#f1f5f9' }]}
          />
          <TouchableOpacity style={styles.smallButton} onPress={handleTambahStok}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      {/* SECTION SUMMARY CARDS */}
      <View style={styles.summaryContainer}>
        <TouchableOpacity 
          activeOpacity={0.8}
          // SEKARANG PINDAH KE HALAMAN DETAIL SAAT DIKLIK
          onPress={() => router.push("/main/dashboard/seller/report_detail" as any)} 
          style={[styles.summaryCardMain, { backgroundColor: theme.card }]}
        >
          <View style={styles.summaryHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Informasi Penjualan</Text>
            {/* Icon ganti jadi panah kanan karena sekarang fungsinya pindah halaman */}
            <Ionicons 
              name="chevron-forward" 
              size={20} 
              color={theme.textSecondary} 
            />
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>Total Transaksi</Text>
              <Text style={[styles.statBoxValue, { color: "#0a84ff" }]}>{summary.totalTransaksi}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>Pendapatan</Text>
              <Text style={[styles.statBoxValue, { color: "#10b981" }]}>
                Rp {summary.totalPendapatan >= 1000000 
                  ? (summary.totalPendapatan / 1000000).toFixed(1) + 'jt' 
                  : summary.totalPendapatan.toLocaleString('id-ID')}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxLabel}>Pelanggan</Text>
              <Text style={[styles.statBoxValue, { color: "#f59e0b" }]}>{summary.totalPelanggan}</Text>
            </View>
          </View>
          
          <View style={styles.detailsDivider}>
            <Text style={[styles.detailHint, { color: theme.textSecondary }]}>
              Klik untuk lihat grafik analitik lengkap →
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      
      {/* REKAP PELANGGAN TERBANYAK */}
      <View style={[styles.sectionHeader]}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          🏆 Top Pembeli Sampai Saat Ini :
        </Text>
      </View>

      <View style={[styles.recapCard, { backgroundColor: theme.card }]}>
        {/* Berikan tinggi maksimal agar area ini bisa di-scroll sendiri */}
        <ScrollView 
          style={{ maxHeight: 300 }} 
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
        >
          {topBuyers.length === 0 ? (
            <Text style={{ color: theme.textSecondary, textAlign: 'center', padding: 20 }}>
              Belum ada data transaksi.
            </Text>
          ) : (
            topBuyers.map((item, index) => (
              <View 
                key={index} 
                style={[
                  styles.recapItem, 
                  { 
                    borderBottomColor: theme.border, 
                    borderBottomWidth: index === topBuyers.length - 1 ? 0 : 1 
                  }
                ]}
              >
                <View style={[styles.recapRank, { backgroundColor: index === 0 ? '#ffd700' : '#f1f5f9' }]}>
                  <Text style={[styles.rankText, { color: index === 0 ? '#000' : '#64748b' }]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.buyerName, { color: theme.textPrimary }]}>{item.nama}</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{item.kaliBeli}x Transaksi</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: "#10b981", fontWeight: 'bold' }}>
                    Rp {item.totalRupiah.toLocaleString('id-ID')}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 11 }}>
                    {item.totalBenur.toLocaleString('id-ID')} ekor
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* ACTION BUTTONS */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: "#10b981" }]}
          onPress={() => router.push("/main/dashboard/kwitansi/list_kwitansi_seller")}
        >
          <Ionicons name="receipt-outline" size={20} color="white" />
          <Text style={styles.buttonText}>Riwayat Kwitansi</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: "#0a84ff" }]}
          onPress={() => router.push("/main/dashboard/seller/sellerform2")}
        >
          <Ionicons name="add-circle-outline" size={20} color="white" />
          <Text style={styles.buttonText}>Penjualan Langsung</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  headerContent: { flexDirection: "row", alignItems: "center", gap: 15 },
  headerText: { color: "white", fontSize: 22, fontWeight: "bold" },
  headerSub: { color: "white", fontSize: 14, opacity: 0.8 },
  
  // Notif Style
  orderNotificationCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 15,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  orderNotifLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  iconBadgeContainer: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#eef6ff', justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#ef4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  notifTitle: { fontWeight: 'bold', fontSize: 16 },

  // Recap Style
  sectionHeader: { marginHorizontal: 16, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "bold" },
  recapCard: { marginHorizontal: 16, borderRadius: 15, padding: 10, elevation: 2 },
  recapItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  recapRank: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  rankText: { fontWeight: 'bold', color: '#64748b' },
  buyerName: { fontWeight: '600', fontSize: 14 },

  cardStat: { margin: 16, padding: 20, borderRadius: 15, elevation: 3 },
  statLabel: { fontSize: 13, fontWeight: '600', marginBottom: 5 },
  statValue: { fontSize: 28, fontWeight: "bold", marginBottom: 15 },
  stokRow: { flexDirection: "row", alignItems: "center" },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, marginRight: 10 },
  smallButton: { backgroundColor: "#0a84ff", borderRadius: 10, width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },

  bottomButtons: { margin: 16, gap: 12, flexDirection: 'row' },
  primaryButton: { flex: 1, flexDirection: "row", padding: 15, borderRadius: 12, justifyContent: "center", alignItems: "center", gap: 8, elevation: 2 },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 13 },
  summaryContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  summaryCardMain: {
    borderRadius: 15,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 10,
  },
  statBoxLabel: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
    fontWeight: '600'
  },
  statBoxValue: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  detailsDivider: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center'
  },
  detailHint: {
    fontSize: 12,
    fontStyle: 'italic'
  },
});