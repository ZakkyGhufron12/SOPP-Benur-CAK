import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { supabase } from "../../../../../supabase"; // Sesuaikan jumlah ../ dengan folder kamu

const Colors = {
  light: {
    background: "#f9fafb",
    card: "#ffffff",
    textPrimary: "#0f172a",
    textSecondary: "#64748b",
    border: "#ccc",
  },
  dark: {
    background: "#111827",
    card: "#1f2937",
    textPrimary: "#f3f4f6",
    textSecondary: "#9ca3af",
    border: "#374151",
  },
};

export default function SellerOrders() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const theme = isDark ? Colors.dark : Colors.light;

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellerProfile, setSellerProfile] = useState<any>(null);

  useEffect(() => {
    loadData();
    // Realtime listener
    const channel = supabase
      .channel("pembelian-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pembelian" },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadData() {
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
      await fetchOrders(profil.nama_lengkap);
    }
    setLoading(false);
  }

  async function fetchOrders(namaSeller?: string) {
    const targetSeller = namaSeller || sellerProfile?.nama_lengkap;
    if (!targetSeller) return;

    const { data } = await supabase
      .from("pembelian")
      .select("*")
      .eq("status", "belum_diambil")
      .eq("penjual_dipilih", targetSeller)
      .order("tanggal_pembelian", { ascending: true });

    setOrders(data || []);
  }

  async function handleAmbilOrder(order: any) {
    const sellerNama = sellerProfile?.nama_lengkap || "tidak_diketahui";

    Alert.alert("Ambil Pesanan", `Ambil pesanan ${order.nama_pembeli}?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Ya, Ambil",
        onPress: async () => {
          // Update status pembelian
          await supabase
            .from("pembelian")
            .update({ status: "diambil", diambil_oleh: sellerNama })
            .eq("id_pembelian", order.id_pembelian);

          // Update stok di tabel stok_benur
          const { data: stokData } = await supabase
            .from("stok_benur")
            .select("id_stok, stok_sisa")
            .eq("nama_penjual", sellerNama)
            .single();

          if (stokData) {
            const stokBaru = stokData.stok_sisa - order.jumlah_benur_yang_dibeli;
            await supabase
              .from("stok_benur")
              .update({ stok_sisa: stokBaru })
              .eq("id_stok", stokData.id_stok);
          }
          
          fetchOrders();
          router.push({
            pathname: "/main/dashboard/seller/sellerform",
            params: { id_pembelian: order.id_pembelian },
          });
        },
      },
    ]);
  }

  async function handleBatalkanOrder(order: any) {
    Alert.alert("Batalkan Pesanan", `Batalkan pesanan dari ${order.nama_pembeli}?`, [
      { text: "Tidak", style: "cancel" },
      {
        text: "Ya, Batalkan",
        onPress: async () => {
          const { error } = await supabase
            .from("pembelian")
            .update({ status: "dibatalkan oleh penjual" })
            .eq("id_pembelian", order.id_pembelian);

          if (error) {
            Alert.alert("Gagal", "Tidak dapat membatalkan pesanan.");
          } else {
            Alert.alert("✅ Berhasil", "Pesanan telah dibatalkan.");
            fetchOrders();
          }
        },
      },
    ]);
  }

  if (loading) return (
    <View style={[styles.center, { backgroundColor: theme.background }]}>
      <ActivityIndicator size="large" color="#0a84ff" />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: 'Orderan Masuk',
          headerTitleAlign: 'center',
          // Menambahkan tombol kembali secara manual jika bawaan tidak berfungsi
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={{ marginLeft: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />
      {orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={64} color={theme.textSecondary} style={{opacity: 0.5}} />
          <Text style={[styles.empty, { color: theme.textSecondary }]}>Tidak ada pesanan saat ini 🎉</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          contentContainerStyle={{ padding: 16 }}
          keyExtractor={(item) => item.id_pembelian}
          renderItem={({ item }) => (
            <View style={[styles.cardOrder, { backgroundColor: theme.card }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{item.nama_pembeli}</Text>
                <Text style={styles.dateText}>{new Date(item.tanggal_pembelian).toLocaleDateString()}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Ionicons name="boat-outline" size={16} color={theme.textSecondary} />
                <Text style={{ color: theme.textSecondary }}>{item.jumlah_benur_yang_dibeli} ekor</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Ionicons name="card-outline" size={16} color={theme.textSecondary} />
                <Text style={{ color: theme.textSecondary }}>{item.metode_pembayaran ?? "-"}</Text>
              </View>

              {item.lokasi_tujuan && (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={16} color={theme.textSecondary} />
                  <Text style={{ color: theme.textSecondary }}>{item.lokasi_tujuan}</Text>
                </View>
              )}

              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={styles.orderButton}
                  onPress={() => handleAmbilOrder(item)}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                  <Text style={styles.orderButtonText}>Ambil Pesanan</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.orderButtonCancel}
                  onPress={() => handleBatalkanOrder(item)}
                >
                  <Ionicons name="close-circle-outline" size={20} color="white" />
                  <Text style={styles.orderButtonText}>Batalkan</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerTitleContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: 50, 
    paddingBottom: 20, 
    paddingHorizontal: 16 
  },
  backButton: { marginRight: 16 },
  title: { fontSize: 22, fontWeight: "bold" },
  
  cardOrder: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  cardTitle: { fontWeight: "bold", fontSize: 17 },
  dateText: { fontSize: 11, color: '#94a3b8' },
  
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  
  buttonGroup: { flexDirection: 'row', gap: 10, marginTop: 15 },
  orderButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0a84ff",
    padding: 12,
    borderRadius: 10,
    justifyContent: "center",
    gap: 6,
  },
  orderButtonCancel: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ef4444",
    padding: 12,
    borderRadius: 10,
    justifyContent: "center",
    gap: 6,
  },
  orderButtonText: { color: "white", fontWeight: "bold", fontSize: 13 },
  empty: { textAlign: "center", marginTop: 10, fontSize: 16 },
});