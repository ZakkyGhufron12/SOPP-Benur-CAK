import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../../../supabase';

export default function SellerForm() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // 1️⃣ LOGIC PENANGANAN ID (Supaya tidak hilang)
  const id_pembelian_param = Array.isArray(params.id_pembelian) 
    ? params.id_pembelian[0] 
    : params.id_pembelian;

  // State Utama ID
  const [idPembelianState, setIdPembelianState] = useState(id_pembelian_param || '');

  // State Form Lainnya
  const [toko, setToko] = useState('');
  const [harga, setHarga] = useState('');
  const [total, setTotal] = useState('');
  const [jumlahBenur, setJumlahBenur] = useState<number>(0);
  const [hasilManual, setHasilManual] = useState<string>(''); 
  const [hasilOtomatis, setHasilOtomatis] = useState<string>('');
  const [namaPembeli, setNamaPembeli] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [metode, setMetode] = useState('');
  const [nomorPembeli, setNomorPembeli] = useState('');
  const [keterangan, setKeterangan] = useState('');
  
  const [loadingPembeli, setLoadingPembeli] = useState(true);
  
  const REAN_VALUE = 5000;
  const STORAGE_KEY = 'sellerform_data';

  // Handle tombol back Android
  useEffect(() => {
    const confirmCancel = () => {
      Alert.alert(
        "Batalkan Pesanan",
        "Apakah Anda yakin ingin membatalkan pesanan ini?",
        [
          { text: "Tidak", style: "cancel" },
          {
            text: "Ya, Batalkan",
            onPress: async () => {
              if (idPembelianState) {
                await supabase
                  .from("pembelian")
                  .update({ status: "dibatalkan oleh penjual" })
                  .eq("id_pembelian", idPembelianState);
              }
              router.push("/(tabs)/home");
            },
          },
        ]
      );
      return true; // cegah aksi default
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      confirmCancel
    );

    return () => backHandler.remove();
  }, [idPembelianState]);

  // Ambil data pembelian (Menggunakan idPembelianState)
  useEffect(() => {
    const fetchPembelian = async () => {
      if (!idPembelianState) return;
      
      setLoadingPembeli(true);
      console.log('Fetching Data untuk ID:', idPembelianState);

      const { data, error } = await supabase
        .from('pembelian')
        .select('nama_pembeli, jumlah_benur_yang_dibeli, lokasi_tujuan, nomor_telepon, metode_pembayaran')
        .eq('id_pembelian', idPembelianState)
        .maybeSingle();

      if (!error && data) {
        setNamaPembeli(data.nama_pembeli);
        setJumlahBenur(data.jumlah_benur_yang_dibeli);
        setLokasi(data.lokasi_tujuan);
        setNomorPembeli(data.nomor_telepon);
        setMetode(data.metode_pembayaran || '');
      } else {
        console.error('❌ Gagal ambil data pembelian:', error);
      }

      setLoadingPembeli(false); 
    };

    fetchPembelian();
  }, [idPembelianState]);

  // Hitung total otomatis
  useEffect(() => {
    if (harga) {
      const jumlahEkor = hasilManual ? Number(hasilManual) : jumlahBenur;
      const jumlahRean = jumlahEkor / REAN_VALUE;
      const totalHitung = Number(harga || 0) * jumlahRean;
      setTotal(String(totalHitung.toFixed(0)));
    } else {
      setTotal('');
    }
  }, [harga, hasilManual, jumlahBenur]);

  // RESTORE DATA & HANDLER PARAMS (useFocusEffect)
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      (async () => {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        const storedData = jsonValue ? JSON.parse(jsonValue) : {};

        if (isActive) {
          // LOGIC PENTING: Prioritas ID (Params > Storage > Empty)
          const idFinal = id_pembelian_param || storedData.id_pembelian || '';
          
          if (idFinal) {
             setIdPembelianState(idFinal);
          }

          // Handle Hasil AI dari Params
          if (params.hasilAI) {
            const hasilString = Array.isArray(params.hasilAI) ? params.hasilAI[0] : params.hasilAI;
            setHasilOtomatis(hasilString);
            // Opsional: update jumlahBenur jika ingin langsung pakai hasil AI
            // setJumlahBenur(Number(hasilString)); 
          } else if (storedData.hasilOtomatis) {
             setHasilOtomatis(String(storedData.hasilOtomatis));
          }

          // Restore field lain jika state masih kosong
          if (!namaPembeli) setNamaPembeli(storedData.namaPembeli || '');
          if (!lokasi) setLokasi(storedData.lokasi || '');
          if (!nomorPembeli) setNomorPembeli(storedData.nomorPembeli || '');
          if (!toko) setToko(storedData.toko || '');
          if (!harga) setHarga(storedData.harga || '');
          if (!hasilManual) setHasilManual(storedData.hasilManual || '');
          if (!total) setTotal(storedData.total || '');
          if (!keterangan) setKeterangan(storedData.keterangan || '');
        }
      })();

      return () => { isActive = false; };
    }, [id_pembelian_param, params.hasilAI]) 
  );

  // Simpan ke AsyncStorage setiap kali state berubah
  useEffect(() => {
    (async () => {
      try {
        const data = {
          id_pembelian: idPembelianState,
          toko, harga, hasilManual, hasilOtomatis, jumlahBenur, keterangan, total,
          namaPembeli, lokasi, nomorPembeli // simpan data fetch juga
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.log('Gagal simpan data:', e);
      }
    })();
  }, [idPembelianState, toko, harga, hasilManual, hasilOtomatis, jumlahBenur, keterangan, total, namaPembeli, lokasi, nomorPembeli]);

  // Tombol ke Kamera
  const handleAmbilDataOtomatis = async () => {
    // Pastikan data tersimpan sebelum pindah
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        id_pembelian: idPembelianState,
        namaPembeli, lokasi, nomorPembeli, jumlahBenur,
        hasilOtomatis, toko, harga, total, hasilManual, keterangan
      }));
    } catch (e) {
      console.log("Gagal simpan data sebelum kamera:", e);
    }

    // Kirim idPembelianState ke kamera
    router.push({
      pathname: '/main/dashboard/seller/nav_cam/kamera_otomatis3',
      params: { id_pembelian: idPembelianState }
    });
  };

  // 🧾 Handle Submit
  const handleSubmit = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      
      if (!user) {
        Alert.alert('Error', 'User belum login');
        return;
      }

      // CEK ID PEMBELIAN DARI STATE
      if (!idPembelianState) {
        Alert.alert("Error", "ID Pembelian hilang. Mohon kembali ke menu utama dan ulangi proses.");
        return;
      }

      const { data: profil, error: profilErr } = await supabase
        .from('registrasi')
        .select('*')
        .eq('email', user.email)
        .single();

      if (profilErr || !profil) {
        Alert.alert('Error', 'Profil penjual tidak ditemukan');
        return;
      }

      const id_penjualan = uuidv4();
      const id_kwitansi = uuidv4();

      if (!namaPembeli) {
        Alert.alert("Data belum siap", "Nama pembeli belum terambil, coba tunggu sebentar.");
        return;
      }

      // 1. INSERT ke tabel PENJUALAN
      const { error: penjualanErr } = await supabase.from('penjualan').insert([
        {
          id_penjualan,
          toko_penjual: toko,
          nama_penjual: profil.nama_lengkap,
          nama_pembeli: namaPembeli,
          nomor_telepon_penjual: profil.nomor_telepon,
          nomor_telepon_pembeli: nomorPembeli,
          hasil_perhitungan_benur_manual: hasilManual ? Number(hasilManual) : null,
          hasil_perhitungan_benur: hasilOtomatis ? Number(hasilOtomatis) : null,
          harga_benur: Number(harga),
          harga_benur_total: Number(total),
          keterangan: keterangan || null,
          tanggal_mengambil_orderan: new Date().toISOString(),
          id_registrasi: profil.id_registrasi,
        },
      ]);

      if (penjualanErr) throw penjualanErr;

      // 2. UPDATE tabel ORDERS (Pakai idPembelianState)
      const { error: ordersUpdateErr } = await supabase
        .from('orders')
        .update({
          id_penjualan,
          nama_penjual: profil.nama_lengkap,
          tanggal_mengambil_orderan: new Date().toISOString(),
          harga_benur: Number(harga),
          harga_benur_total: Number(total),
          hasil_perhitungan_benur_manual: hasilManual ? Number(hasilManual) : null,
          hasil_perhitungan_benur: hasilOtomatis ? Number(hasilOtomatis) : null,
          status: 'selesai',
        })
        .eq('id_pembelian', idPembelianState); // <--- FIX

      if (ordersUpdateErr) throw ordersUpdateErr;

      // 3. AMBIL / BUAT id_order untuk kwitansi
      let id_order;
      const { data: orderCheck } = await supabase
        .from('orders')
        .select('id_order')
        .eq('id_pembelian', idPembelianState) // <--- FIX
        .maybeSingle();

      if (!orderCheck) {
        // Buat record orders baru jika tidak ada
        const { data: newOrder, error } = await supabase.from('orders').insert([{
          id_pembelian: idPembelianState, // <--- FIX
          status: 'pending',
          tanggal_pembelian: new Date().toISOString(),
        }]).select('id_order').maybeSingle();

        if (error) throw error;
        id_order = newOrder?.id_order;
      } else {
        id_order = orderCheck.id_order;
      }

      // 4. INSERT ke KWITANSI
      const { error: kwitansiErr } = await supabase.from('kwitansi').insert([{
        id_kwitansi,
        id_order,
        nama_pembeli: namaPembeli,
        nama_penjual: profil.nama_lengkap,
        harga_benur: Number(harga),
        harga_benur_total: Number(total),
        metode_pembayaran: metode || 'Tunai',
        status_transaksi: 'selesai',
        tanggal_pembelian: new Date().toISOString(),
        tanggal_mengambil_orderan: new Date().toISOString(),
        nomor_telepon_pembeli: nomorPembeli,
        nomor_telepon_penjual: profil.nomor_telepon,
        hasil_perhitungan_benur_manual: hasilManual ? Number(hasilManual) : null,
        hasil_perhitungan_benur: hasilOtomatis ? Number(hasilOtomatis) : null,
        id_penjual: profil.id_registrasi,
      }]);

      if (kwitansiErr) throw kwitansiErr;
      
      await AsyncStorage.removeItem(STORAGE_KEY);
      Alert.alert('✅ Sukses', 'Transaksi penjualan dan kwitansi berhasil dicatat.');
      router.replace('/(tabs)/home');
      
    } catch (err: any) {
      console.error('❌ handleSubmit error:', err);
      Alert.alert('Kesalahan', err.message || 'Terjadi kesalahan tak terduga.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          <Stack.Screen
            options={{
              title: 'Form Penjualan',
              headerTitleAlign: 'center',
            }}
          />

          <Text style={styles.title}>🧾 Form Penjualan</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Nama Pembeli</Text>
            <Text style={styles.value}>{namaPembeli || '-'}</Text>

            <Text style={styles.label}>Jumlah Benur (Pesanan)</Text>
            <Text style={styles.value}>{jumlahBenur || '-'}</Text>

            <Text style={styles.label}>Lokasi Tujuan</Text>
            <Text style={styles.value}>{lokasi || '-'}</Text>

            <Text style={styles.label}>Nomor Telepon</Text>
            <Text style={styles.value}>{nomorPembeli || '-'}</Text>
          </View>

          <View style={styles.card}>
            <TextInput placeholder="Nama Toko" value={toko} onChangeText={setToko} style={styles.input} />

            <TextInput placeholder="Harga Satuan Benur (Rean)" keyboardType="numeric" value={harga} onChangeText={setHarga} style={styles.input}/>
            {harga !== '' && <Text style={styles.unitText}>Harga per rean (5000 ekor)</Text>}

            <TextInput placeholder="Hasil Perhitungan Benur (Manual)" keyboardType="numeric" value={hasilManual} onChangeText={setHasilManual} style={styles.input}/>
            {hasilManual !== '' && <Text style={styles.unitText}>= {(Number(hasilManual) / REAN_VALUE).toFixed(2)} rean</Text>}

            <TextInput
              placeholder="Hasil Perhitungan Benur (Otomatis)"
              keyboardType="numeric"
              value={hasilOtomatis}
              editable={false}
              style={[styles.input, { backgroundColor: '#f1f1f1' }]}
            />
            {hasilOtomatis !== '' && <Text style={styles.unitText}>= {(Number(hasilOtomatis) / REAN_VALUE).toFixed(2)} rean</Text>}

            <TouchableOpacity style={styles.buttonSecondary} onPress={handleAmbilDataOtomatis}>
              <Text style={styles.buttonSecondaryText}>🤖 Ambil Data Otomatis</Text>
            </TouchableOpacity>

            <TextInput placeholder="Total Harga (otomatis)" value={total} editable={false} style={[styles.input, { backgroundColor: '#f1f1f1' }]} />
            <TextInput placeholder="Keterangan (opsional)" value={keterangan} onChangeText={setKeterangan} style={styles.input} />
          </View>

          <TouchableOpacity style={styles.buttonPrimary} onPress={handleSubmit}>
            <Text style={styles.buttonPrimaryText}>Simpan</Text>
          </TouchableOpacity>

        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15, textAlign: 'center' },

  card: {
    backgroundColor: "#ffffff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  label: { fontSize: 14, fontWeight: "600", marginTop: 5 },
  value: { fontSize: 15, color: "#333", marginBottom: 5 },

  input: {
    borderWidth: 1,
    borderColor: "#d4d4d4",
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 10,
    fontSize: 15,
  },

  unitText: {
    marginTop: -8,
    marginBottom: 10,
    fontSize: 12,
    color: "#777",
    fontStyle: "italic",
    textAlign: "right",
  },

  buttonPrimary: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonPrimaryText: { color: "white", fontWeight: "bold", fontSize: 16 },

  buttonSecondary: {
    backgroundColor: "#e8f0fe",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonSecondaryText: { color: "#007AFF", fontWeight: "bold" }
});