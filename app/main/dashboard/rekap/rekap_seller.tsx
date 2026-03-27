import * as FileSystem from 'expo-file-system/legacy';
import { Stack, useRouter } from "expo-router";
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as XLSX from 'xlsx';
import { supabase } from '../../../../supabase';

export default function RekapSeller() {
  const router = useRouter();
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'harian' | 'pekanan' | 'bulanan' | 'tahunan'>('harian')
  const chartRef = useRef<View>(null)
  const [chartReady, setChartReady] = useState(false);
  const [exporting, setExporting] = useState(false)
  const REAN_VALUE = 5000;

  const screenWidth = Dimensions.get('window').width

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      Alert.alert('Error', 'Gagal memuat data pengguna.')
      setLoading(false)
      return
    }

    const email = userData.user.email

    const { data: profile, error: profileError } = await supabase
      .from('registrasi')
      .select('id_registrasi, nama_lengkap')
      .eq('email', email)
      .single()

    if (profileError || !profile) {
      Alert.alert('Error', 'Data profil tidak ditemukan.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('kwitansi')
      .select(`
        id_kwitansi,
        nama_pembeli,
        nama_penjual,
        harga_benur,
        harga_benur_total,
        metode_pembayaran,
        status_transaksi,
        tanggal_pembelian,
        nomor_telepon_pembeli,
        nomor_telepon_penjual,
        hasil_perhitungan_benur,
        hasil_perhitungan_benur_manual
      `)
        .eq('nama_penjual', profile.nama_lengkap) // fokus hanya penjual login
        //.or(`id_penjual.eq.${profile.id_registrasi},and(nama_penjual.eq.${profile.nama_lengkap},not(id_penjual.is.null))`)
        .not('id_penjual','is', null)
        .order('tanggal_pembelian', { ascending: false })

    if (error) {
      console.error(error)
      Alert.alert('Error', 'Gagal mengambil data rekap')
      setLoading(false)
      return
    }

    setData(data)
    setLoading(false)
  }

  function formatTanggal(tanggal: string) {
    if (!tanggal) return ''
    const d = new Date(tanggal)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function formatRupiah(num: number | string) {
    if (!num) return 'Rp.0'
    return 'Rp. ' + parseInt(num as string).toLocaleString('id-ID')
  }

  function groupData(data: any[], mode: 'harian' | 'pekanan' | 'bulanan' | 'tahunan') {
    if (!data || data.length === 0) return { labels: [], values: [] }

    const sortedData = [...data].sort(
      (a, b) => new Date(a.tanggal_pembelian).getTime() - new Date(b.tanggal_pembelian).getTime()
    )

    const grouped: Record<string, number> = {}

    sortedData.forEach((item) => {
      const d = new Date(item.tanggal_pembelian)
      let key = ''

      if (mode === 'harian') {
        key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
      } else if (mode === 'pekanan') {
        const firstDay = new Date(d.getFullYear(), 0, 1)
        const week = Math.ceil(((d.getTime() - firstDay.getTime()) / 86400000 + firstDay.getDay() + 1) / 7)
        key = `Minggu ${week} (${d.getFullYear()})`
      } else if (mode === 'bulanan') {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
        key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
      } else if (mode === 'tahunan') {
        key = `${d.getFullYear()}`
      }

      grouped[key] = (grouped[key] || 0) + (item.harga_benur_total || 0)
    })

    const labels = Object.keys(grouped)
    const values = Object.values(grouped)

    return { labels, values }
  }

  const { labels, values } = useMemo(() => groupData(data, mode), [data, mode])

  function convertToCSV(data: any[]) {
    if (!data || data.length === 0) return ''

    const header = [
      'No',
      'Tanggal Pembelian',
      'Nama Pembeli',
      'Nama Penjual',
      'Harga Benur',
      'Total Harga',
      'Metode Pembayaran',
      'Status Transaksi',
      'Nomor Telepon Pembeli',
      'Nomor Telepon Penjual',
      'Hasil Perhitungan Manual',
      'Hasil Perhitungan Otomatis',
    ]
    const sortedData = [...data].sort(
      (a, b) => new Date(a.tanggal_pembelian).getTime() - new Date(b.tanggal_pembelian).getTime()
    )
    const rows = sortedData.map((row, i) => [
      i + 1,
      formatTanggal(row.tanggal_pembelian),
      row.nama_pembeli,
      row.nama_penjual,
      formatRupiah(row.harga_benur),
      formatRupiah(row.harga_benur_total),
      row.metode_pembayaran,
      row.status_transaksi,
      row.nomor_telepon_pembeli,
      row.nomor_telepon_penjual,
      row.hasil_perhitungan_benur_manual || '-',
      row.hasil_perhitungan_benur || '-',
    ])

    const csv = [header.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    return csv
  }

  async function exportToCSV() {
    if (data.length === 0) {
      Alert.alert('Kosong', 'Tidak ada data untuk diekspor.')
      return
    }

    const csv = convertToCSV(data)
    const fileUri = `${(FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory}rekap_penjualan.csv`

    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: 'utf8' })

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri)
    } else {
      Alert.alert('Fitur tidak tersedia', 'Fitur sharing tidak tersedia di perangkat ini.')
    }
  }

  // fungsi baru untuk : Export ke Excel + Sheet Grafik Data
  async function exportToExcel() {
    try {
      if (data.length === 0) {
        Alert.alert('Kosong', 'Tidak ada data untuk diekspor.');
        return;
      }

      setExporting(true);

      // penyiapkan sheet utama (Rekap Transaksi)
      const header = [
        'No', 'Tanggal Pembelian', 'Nama Pembeli', 'Nama Penjual',
        'Harga Benur', 'Total Harga', 'Metode Pembayaran', 'Status Transaksi',
        'Nomor Telepon Pembeli', 'Nomor Telepon Penjual', 'Hasil Manual', 'Hasil Otomatis',
      ];
      const sortedData = [...data].sort(
        (a, b) => new Date(a.tanggal_pembelian).getTime() - new Date(b.tanggal_pembelian).getTime()
      )
      const rows = sortedData.map((row, i) => [
        i + 1,
        formatTanggal(row.tanggal_pembelian),
        row.nama_pembeli,
        row.nama_penjual,
        row.harga_benur,
        row.harga_benur_total,
        row.metode_pembayaran,
        row.status_transaksi,
        row.nomor_telepon_pembeli,
        row.nomor_telepon_penjual,
        row.hasil_perhitungan_benur_manual || '-',
        row.hasil_perhitungan_benur || '-',
      ]);

      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Penjualan');

      // siapkan sheet kedua untuk data grafik
      const grafikHeader = ['Tanggal Pembelian', 'Total Penjualan (Rp)'];
      const grafikRows = data
        .sort((a, b) => new Date(a.tanggal_pembelian).getTime() - new Date(b.tanggal_pembelian).getTime())
        .map((item) => [formatTanggal(item.tanggal_pembelian), item.harga_benur_total || 0]);

      const wsGrafik = XLSX.utils.aoa_to_sheet([
        ['Data untuk Grafik Penjualan'],
        ['Tips: Pilih tabel di bawah dengan blok tabel mulai "Periode" sampai angka total penjualan terbawah'],
        ['Lalu klik Insert > Cari "Chart" > Pilih Line (Pilih bebas, Rekomendasi "Line saja")'],
        [],
        [],
        grafikHeader,
        ...grafikRows,
      ]);

      // sesuaikan lebar kolom
      wsGrafik['!cols'] = [{ wch: 25 }, { wch: 20 }];

      XLSX.utils.book_append_sheet(wb, wsGrafik, 'Data Grafik');

      // simpan workbook ke file
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileUri = `${FileSystem.cacheDirectory}rekap_penjualan.xlsx`;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // share file
      await Sharing.shareAsync(fileUri, {
        dialogTitle: 'Bagikan Rekap Penjualan & Data Grafik',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Gagal membuat file Excel.');
    } finally {
      setExporting(false);
    }
  }

  function formatToRupiahShort(value: number) {
    if (value >= 1_000_000) return `Rp. ${(value / 1_000_000).toFixed(1)}Jt`
    if (value >= 1_000) return `Rp. ${(value / 1_000).toFixed(0)}Rb`
    return `Rp. ${value.toLocaleString('id-ID')}`
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 10 }}>
      <Stack.Screen
        options={{
          title: 'Rekap Penjualan',
          //headerBackTitle: 'Kembali',
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity
              style={{ paddingHorizontal: 10 }}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>KEMBALI</Text>
            </TouchableOpacity>
            ),
        }}
      />
      {/* Tombol Mode */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        {['harian', 'pekanan', 'bulanan', 'tahunan'].map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => setMode(m as any)}
            style={{
              backgroundColor: mode === m ? '#007AFF' : '#e0e0e0',
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 10
            }}
          >
            <Text style={{ color: mode === m ? '#fff' : '#000', fontWeight: 'bold', fontSize: 12 }}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List Transaksi */}
      {loading ? (
        <ActivityIndicator size="large" color="blue" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, i) => item.id_kwitansi?.toString() || `index-${i}`}
          renderItem={({ item, index }) => (
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 14,
                marginBottom: 10,
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>
                {index + 1}. {item.nama_pembeli}
              </Text>

              <Text style={{ marginBottom: 2 }}>💰 Total: {formatRupiah(item.harga_benur_total)}</Text>
              <Text style={{ marginBottom: 2 }}>💳 {item.metode_pembayaran}</Text>
              <Text style={{ marginBottom: 2 }}>📦 Status: {item.status_transaksi}</Text>
              <Text style={{ marginBottom: 2 }}>
                ✍ Perhitungan Manual: {item.hasil_perhitungan_benur_manual ?? '-'} 
                {item.hasil_perhitungan_benur_manual
                  ? ` ekor (${(item.hasil_perhitungan_benur_manual / REAN_VALUE).toFixed(2)} rean)` 
                  : ''}
              </Text>
              <Text style={{ marginBottom: 2 }}>
                🤖 Perhitungan Otomatis: {item.hasil_perhitungan_benur ?? '-'} 
                {item.hasil_perhitungan_benur
                  ? ` ekor (${(item.hasil_perhitungan_benur / REAN_VALUE).toFixed(2)} rean)` 
                  : ''}
              </Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
                🗓 {formatTanggal(item.tanggal_pembelian)}
              </Text>
            </View>
          )}
        />
      )}

      {/* Grafik penjualan */}
        <View
          style={{ alignItems: 'center', marginTop: 20 }}
        >
          <View
            collapsable={false} // penting untuk Android
            ref={chartRef}
            onLayout={() => setChartReady(true)}
          >
            <View style={{ width: screenWidth - 30, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ fontWeight: 'bold' }}>Harga Terjual</Text>
              <Text style={{ fontWeight: 'bold' }}>Periode</Text>
            </View>

            {values.length > 0 ? (
              <LineChart
                data={{
                  labels: labels,
                  datasets: [{ data: values }],
                }}
                width={screenWidth - 30}
                height={220}
                yLabelsOffset={9999}
                withInnerLines={false}
                fromZero
                withVerticalLabels={false}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#f7f7f7',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(0, 0, 255, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  propsForDots: { r: '4', strokeWidth: '1', stroke: '#007bff' },
                }}
                bezier
                decorator={() =>
                  values.map((value, index) => {
                    const x = (index * (screenWidth - 60)) / (values.length - 1)
                    const yMax = Math.max(...values)
                    const y = 220 - (value / yMax) * 180

                    return (
                      <View key={index} style={{ position: 'absolute', left: x, top: y - 35, alignItems: 'center' }}>
                        {/* Label Rupiah */}
                        <Text style={{ fontSize: 10, color: 'blue', fontWeight: '600' }}>
                          {formatToRupiahShort(value)}
                        </Text>

                        {/* Label Tanggal */}
                        <Text style={{ fontSize: 8, color: '#333', marginTop: 2 }}>
                          {labels[index]}
                        </Text>
                      </View>
                    )
                  })
                }
                style={{ marginVertical: 8, borderRadius: 8 }}
              />
            ) : (
              <Text style={{ color: 'gray', marginTop: 10 }}>Belum ada data untuk ditampilkan</Text>
            )}
          </View>
        </View>

      {/* Tombol Export */}
      <TouchableOpacity
        style={{
          backgroundColor: '#007AFF',
          padding: 12,
          borderRadius: 10,
          alignItems: 'center',
          marginTop: 10,
        }}
        onPress={exportToCSV}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>📦 Export ke CSV</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: exporting ? '#aaa' : '#28a745',
          padding: 12,
          borderRadius: 10,
          alignItems: 'center',
          marginTop: 10,
        }}
        onPress={exportToExcel}
        disabled={exporting}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
          {exporting ? '⏳ Sedang Mengekspor...' : '📊 Export ke Excel & Grafik'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}
