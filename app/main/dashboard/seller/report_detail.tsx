import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from 'expo-file-system/legacy';
import { Stack, useRouter } from "expo-router";
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import * as XLSX from 'xlsx';
import { supabase } from "../../../../supabase";

const screenWidth = Dimensions.get("window").width;

export default function ReportDetail() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rawKwitansi, setRawKwitansi] = useState<any[]>([]);
  const [mode, setMode] = useState<'harian' | 'pekanan' | 'bulanan' | 'tahunan'>('harian');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAnalyticalData();
  }, []);

  async function fetchAnalyticalData() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data: profil } = await supabase
      .from("registrasi")
      .select("nama_lengkap")
      .eq("email", userData.user?.email)
      .single();

    if (profil) {
      const { data } = await supabase
        .from("kwitansi")
        .select("*")
        .eq("nama_penjual", profil.nama_lengkap)
        .order("tanggal_pembelian", { ascending: false });

      if (data) setRawKwitansi(data);
    }
    setLoading(false);
  }

  // --- LOGIKA ANALITIK ---
  const stats = useMemo(() => {
    if (rawKwitansi.length === 0) return { metode: "-", total: 0 };

    const counts: Record<string, number> = {};
    rawKwitansi.forEach(item => {
      const m = item.metode_pembayaran || "Lainnya";
      counts[m] = (counts[m] || 0) + 1;
    });

    const topMetode = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    return { metode: topMetode, total: rawKwitansi.length };
  }, [rawKwitansi]);

  const chartData = useMemo(() => {
    if (rawKwitansi.length === 0) return { labels: ["-"], values: [0] };
    const sorted = [...rawKwitansi].sort((a, b) => new Date(a.tanggal_pembelian).getTime() - new Date(b.tanggal_pembelian).getTime());
    const grouped: Record<string, number> = {};

    sorted.forEach((item) => {
      const d = new Date(item.tanggal_pembelian);
      let key = "";
      if (mode === 'harian') key = `${d.getDate()}/${d.getMonth() + 1}`;
      else if (mode === 'pekanan') key = `M-${Math.ceil(d.getDate() / 7)}`;
      else if (mode === 'bulanan') key = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][d.getMonth()];
      else key = `${d.getFullYear()}`;
      grouped[key] = (grouped[key] || 0) + (item.harga_benur_total || 0);
    });

    return { labels: Object.keys(grouped).slice(-6), values: Object.values(grouped).slice(-6) };
  }, [rawKwitansi, mode]);

  // --- FORMATTER ---
  const formatTanggal = (t: string) => {
    const d = new Date(t);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const formatRupiah = (num: any) => 'Rp ' + parseInt(num || 0).toLocaleString('id-ID');
  const formatToRupiahShort = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}Jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}Rb` : v.toString();

  // --- FUNGSI EXPORT (SAMA DENGAN REKAP_SELLER) ---
  const getHeaderExport = () => [
    'No', 'Tanggal Pembelian', 'Nama Pembeli', 'Nama Penjual', 'Harga Benur', 
    'Total Harga', 'Metode Pembayaran', 'Status Transaksi', 'Hasil Manual', 'Hasil Otomatis'
  ];

  const getRowsExport = () => [...rawKwitansi].reverse().map((row, i) => [
    i + 1, formatTanggal(row.tanggal_pembelian), row.nama_pembeli, row.nama_penjual,
    row.harga_benur, row.harga_benur_total, row.metode_pembayaran, row.status_transaksi,
    row.hasil_perhitungan_benur_manual || '-', row.hasil_perhitungan_benur || '-'
  ]);

  async function exportToCSV() {
    if (rawKwitansi.length === 0) return Alert.alert('Kosong', 'Tidak ada data.');
    const csv = [getHeaderExport().join(';'), ...getRowsExport().map(r => r.join(';'))].join('\n');
    const fileUri = `${FileSystem.cacheDirectory}rekap_analitik.csv`;
    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: 'utf8' });
    await Sharing.shareAsync(fileUri);
  }

  async function exportToExcel() {
    try {
      if (rawKwitansi.length === 0) return Alert.alert('Kosong', 'Tidak ada data.');
      setExporting(true);
      const wb = XLSX.utils.book_new();
      
      // Sheet 1: Data Utama
      const ws = XLSX.utils.aoa_to_sheet([getHeaderExport(), ...getRowsExport()]);
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Transaksi');

      // Sheet 2: Data Grafik
      const gHeader = ['Periode', 'Total Penjualan'];
      const gRows = Object.entries(chartData.labels).map((_, i) => [chartData.labels[i], chartData.values[i]]);
      const wsG = XLSX.utils.aoa_to_sheet([['DATA GRAFIK'], gHeader, ...gRows]);
      XLSX.utils.book_append_sheet(wb, wsG, 'Analisis Grafik');

      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileUri = `${FileSystem.cacheDirectory}rekap_analitik.xlsx`;
      await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(fileUri);
    } catch (e) {
      Alert.alert('Error', 'Gagal membuat Excel.');
    } finally { setExporting(false); }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Laporan Detail', 
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/main/dashboard/seller/sellermain" as any);
                }
              }} 
              style={{ marginLeft: 10}}
            >
              <Ionicons name="arrow-back" size={24} color="#0f172a" />
            </TouchableOpacity>
          ),
        }}/>
      <FlatList
        data={rawKwitansi}
        keyExtractor={(item) => item.id_kwitansi}
        ListHeaderComponent={
          <View style={styles.content}>
            {/* SUMMARY CARDS */}
            <View style={styles.summaryGrid}>
              <View style={styles.infoCard}>
                <Ionicons name="card" size={20} color="#0a84ff" />
                <Text style={styles.infoLabel}>Metode Terpopuler</Text>
                <Text style={styles.infoValue}>{stats.metode}</Text>
              </View>
              <View style={styles.infoCard}>
                <Ionicons name="stats-chart" size={20} color="#10b981" />
                <Text style={styles.infoLabel}>Total Transaksi</Text>
                <Text style={styles.infoValue}>{stats.total} Kali</Text>
              </View>
            </View>

            {/* MODE SELECTOR */}
            <View style={styles.modeContainer}>
              {['harian', 'pekanan', 'bulanan', 'tahunan'].map((m) => (
                <TouchableOpacity key={m} onPress={() => setMode(m as any)} style={[styles.modeButton, mode === m && styles.modeButtonActive]}>
                  <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{m.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* CHART */}
            <View style={styles.chartWrapper}>
              <Text style={styles.chartTitle}>Grafik Pendapatan</Text>
              <LineChart
                data={{ labels: chartData.labels, datasets: [{ data: chartData.values }] }}
                width={screenWidth - 60} height={220} chartConfig={chartConfig} bezier fromZero withInnerLines={false}
                yLabelsOffset={1000}
                decorator={() => chartData.values.map((val, i) => {
                  const x = ((i * (screenWidth - 100)) / (chartData.labels.length - 1)) + 45;
                  const y = 180 - (val / (Math.max(...chartData.values, 1))) * 140;
                  return (
                    <View key={i} style={[styles.labelKotak, { left: x - 20, top: y - 35 }]}>
                      <Text style={styles.labelText}>{formatToRupiahShort(val)}</Text>
                    </View>
                  );
                })}
              />
            </View>

            {/* EXPORT BUTTONS */}
            <View style={styles.exportRow}>
              <TouchableOpacity onPress={exportToExcel} style={[styles.exportBtn, { backgroundColor: '#10b981' }]}>
                <Ionicons name="document-text" size={18} color="white" />
                <Text style={styles.exportBtnText}>{exporting ? 'Wait...' : 'Excel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={exportToCSV} style={[styles.exportBtn, { backgroundColor: '#3b82f6' }]}>
                <Ionicons name="code-working" size={18} color="white" />
                <Text style={styles.exportBtnText}>CSV</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.listTitle}>Daftar Transaksi Terakhir</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.nama_pembeli}</Text>
              <Text style={styles.itemDate}>{formatTanggal(item.tanggal_pembelian)} • {item.metode_pembayaran}</Text>
            </View>
            <Text style={styles.itemPrice}>{formatRupiah(item.harga_benur_total)}</Text>
          </View>
        )}
        ListEmptyComponent={loading ? <ActivityIndicator color="#0a84ff" /> : <Text style={{textAlign:'center', marginTop:20}}>Belum ada data</Text>}
      />
    </View>
  );
}

const chartConfig = {
  backgroundGradientFrom: "#fff", backgroundGradientTo: "#fff",
  color: (opacity = 1) => `rgba(10, 132, 255, ${opacity})`,
  labelColor: () => `#64748b`, strokeWidth: 2,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 20 },
  summaryGrid: { flexDirection: "row", gap: 12, marginBottom: 20 },
  infoCard: { flex: 1, backgroundColor: "#fff", padding: 15, borderRadius: 15, elevation: 3, alignItems: 'center' },
  infoLabel: { fontSize: 10, color: "#64748b", marginTop: 5 },
  infoValue: { fontSize: 14, fontWeight: "bold", color: "#0f172a" },
  modeContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 20 },
  modeButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  modeButtonActive: { backgroundColor: '#fff', elevation: 2 },
  modeText: { fontSize: 10, color: '#64748b', fontWeight: 'bold' },
  modeTextActive: { color: '#0a84ff' },
  chartWrapper: { backgroundColor: '#fff', borderRadius: 20, padding: 15, elevation: 3, marginBottom: 20 },
  chartTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 15 },
  labelKotak: { position: 'absolute', alignItems: 'center', backgroundColor: 'white', padding: 4, borderRadius: 6, elevation: 4, borderWidth: 1, borderColor: '#e2e8f0', minWidth: 45 },
  labelText: { fontSize: 9, color: '#0a84ff', fontWeight: 'bold' },
  exportRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  exportBtn: { flex: 1, flexDirection: 'row', padding: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8 },
  exportBtnText: { color: 'white', fontWeight: 'bold' },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
  itemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 10, marginHorizontal: 20, elevation: 1 },
  itemName: { fontWeight: 'bold', color: '#334155', fontSize: 14 },
  itemDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  itemPrice: { fontWeight: 'bold', color: '#10b981', fontSize: 14 }
});