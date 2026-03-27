import { Stack, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { supabase } from "../../../../supabase";

const screenWidth = Dimensions.get("window").width;

export default function ReportDetailBuyer() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rawKwitansi, setRawKwitansi] = useState<any[]>([]);
  const [mode, setMode] = useState<'harian' | 'pekanan' | 'bulanan' | 'tahunan'>('harian');

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
        .select("harga_benur_total, tanggal_pembelian, hasil_perhitungan_final")
        .eq("nama_pembeli", profil.nama_lengkap)
        .order("tanggal_pembelian", { ascending: true });

      if (data) setRawKwitansi(data);
    }
    setLoading(false);
  }

  const chartData = useMemo(() => {
    if (!rawKwitansi || rawKwitansi.length === 0) return { labels: ["-"], values: [0] };

    const grouped: Record<string, number> = {};
    rawKwitansi.forEach((item) => {
      const d = new Date(item.tanggal_pembelian);
      let key = mode === 'harian' ? `${d.getDate()}/${d.getMonth() + 1}` :
                mode === 'bulanan' ? ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][d.getMonth()] :
                mode === 'tahunan' ? `${d.getFullYear()}` : `M-${Math.ceil(d.getDate() / 7)}`;
      
      grouped[key] = (grouped[key] || 0) + (item.harga_benur_total || 0);
    });

    return {
      labels: Object.keys(grouped).slice(-7),
      values: Object.values(grouped).slice(-7)
    };
  }, [rawKwitansi, mode]);

  const totalBelanja = rawKwitansi.reduce((sum, item) => sum + (item.harga_benur_total || 0), 0);
  const totalEkor = rawKwitansi.reduce((sum, item) => sum + (item.hasil_perhitungan_final || 0), 0);

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'Analisis Belanja', headerTitleAlign: 'center' }} />
      
      <View style={styles.content}>
        <View style={styles.modeContainer}>
          {['harian', 'pekanan', 'bulanan', 'tahunan'].map((m) => (
            <TouchableOpacity key={m} onPress={() => setMode(m as any)} style={[styles.modeButton, mode === m && styles.modeButtonActive]}>
              <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{m.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? <ActivityIndicator size="large" color="#0a84ff" /> : (
          <>
            <View style={styles.chartWrapper}>
              <Text style={styles.chartTitle}>Grafik Pengeluaran ({mode})</Text>
              <LineChart
                data={{ labels: chartData.labels, datasets: [{ data: chartData.values }] }}
                width={screenWidth - 32} height={220} chartConfig={chartConfig} bezier fromZero withInnerLines={false}
                yLabelsOffset={1000}
                decorator={() => chartData.values.map((val, i) => {
                  const x = ((i * (screenWidth - 70)) / (chartData.labels.length - 1)) + 35;
                  const y = 190 - (val / (Math.max(...chartData.values, 1))) * 140;
                  return (
                    <View key={i} style={[styles.labelKotak, { left: x - 20, top: y - 35 }]}>
                      <Text style={styles.labelText}>{val >= 1000 ? (val/1000).toFixed(0)+'rb' : val}</Text>
                    </View>
                  );
                })}
              />
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Total Pengeluaran</Text>
                <Text style={[styles.infoValue, {color: '#10b981'}]}>Rp {totalBelanja.toLocaleString('id-ID')}</Text>
              </View>
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Total Benur</Text>
                <Text style={[styles.infoValue, {color: '#f59e0b'}]}>{totalEkor.toLocaleString('id-ID')} ekor</Text>
              </View>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const chartConfig = {
  backgroundGradientFrom: "#fff", backgroundGradientTo: "#fff",
  color: (opacity = 1) => `rgba(10, 132, 255, ${opacity})`,
  labelColor: () => `#64748b`, strokeWidth: 3,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16 },
  modeContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 20 },
  modeButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  modeButtonActive: { backgroundColor: '#fff', elevation: 2 },
  modeText: { fontSize: 10, color: '#64748b', fontWeight: 'bold' },
  modeTextActive: { color: '#0a84ff' },
  chartWrapper: { backgroundColor: '#fff', borderRadius: 20, padding: 15, elevation: 3 },
  chartTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 15 },
  summaryGrid: { flexDirection: "row", gap: 12, marginTop: 20 },
  infoCard: { flex: 1, backgroundColor: "#fff", padding: 15, borderRadius: 15, elevation: 2 },
  infoLabel: { fontSize: 11, color: "#64748b" },
  infoValue: { fontSize: 14, fontWeight: "bold", marginTop: 4 },
  labelKotak: { position: 'absolute', alignItems: 'center', backgroundColor: 'white', padding: 2, borderRadius: 4, elevation: 3, borderWidth: 1, borderColor: '#e2e8f0', minWidth: 40 },
  labelText: { fontSize: 9, color: '#0a84ff', fontWeight: 'bold' },
});