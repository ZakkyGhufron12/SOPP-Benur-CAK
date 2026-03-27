import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../../../supabase';

export default function SellerForm2() {
  const router = useRouter();
  const { hasilAI } = useLocalSearchParams();
  const [toko, setToko] = useState('');
  const [harga, setHarga] = useState('');
  const [total, setTotal] = useState('');
  const [jumlahBenur, setJumlahBenur] = useState<number>(0);
  const [hasilManual, setHasilManual] = useState<string>('');
  const [hasilOtomatis, setHasilOtomatis] = useState<string>('');
  const [keterangan, setKeterangan] = useState('');
  const [namaPembeli, setNamaPembeli] = useState('');
  const [nomorPembeli, setNomorPembeli] = useState('');
  const REAN_VALUE = 5000;

  const namaPembeliDefault = 'Pembeli Umum';

  useEffect(() => {
    if (hasilAI) {
      console.log("==== MASUK EFFECT HASIL AI ====", hasilAI);
      setHasilOtomatis(String(hasilAI));
      setJumlahBenur(Number(hasilAI));
    }
  }, [hasilAI]);

  useEffect(() => {
    const jumlahEkor = hasilManual ? Number(hasilManual) : jumlahBenur;
    const jumlahRean = jumlahEkor / REAN_VALUE;
    const totalHitung = Number(harga || 0) * jumlahRean;
    setTotal(String(totalHitung.toFixed(0)));
  }, [harga, hasilManual, jumlahBenur, hasilOtomatis]);

  const handleAmbilDataOtomatis = () => {
    router.push('/main/dashboard/seller/nav_cam/kamera_otomatis2');
  };

  const namaPembeliAkhir = namaPembeli.trim() || namaPembeliDefault;
  const STORAGE_KEY = 'sellerform2_data';

  const handleSubmit = async () => {
    try {
      // Validasi input minimal
      if (!toko.trim()) {
        return Alert.alert('Error', 'Nama Toko harus diisi.');
      }
      if (!harga.trim() || isNaN(Number(harga)) || Number(harga) <= 0) {
        return Alert.alert('Error', 'Harga harus diisi dan bernilai lebih dari 0.');
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return Alert.alert('Error', 'User belum login');

      const { data: profil, error: profilErr } = await supabase
        .from('registrasi')
        .select('*')
        .eq('email', user.email)
        .single();

      if (profilErr || !profil) return Alert.alert('Error', 'Profil penjual tidak ditemukan');

      const id_penjualan = uuidv4();
      const id_order = uuidv4();
      const id_kwitansi = uuidv4();
      const jumlahYangDijual = hasilManual ? Number(hasilManual) : Number(hasilOtomatis);

      await supabase.from('penjualan').insert([{
        id_penjualan,
        toko_penjual: toko,
        nama_penjual: profil.nama_lengkap,
        nama_pembeli: namaPembeliAkhir,
        nomor_telepon_pembeli: nomorPembeli || null,
        hasil_perhitungan_benur_manual: hasilManual ? Number(hasilManual) : null,
        hasil_perhitungan_benur: hasilOtomatis ? Number(hasilOtomatis) : null,
        harga_benur: Number(harga),
        harga_benur_total: Number(total),
        keterangan: keterangan || null,
        tanggal_mengambil_orderan: new Date().toISOString(),
        id_registrasi: profil.id_registrasi,
      }]);

      await supabase.from('orders').insert([{
        id_order,
        id_penjualan,
        nama_pembeli: namaPembeliAkhir,
        nama_penjual: profil.nama_lengkap,
        tanggal_pembelian: new Date().toISOString(),
        harga_benur: Number(harga),
        harga_benur_total: Number(total),
        hasil_perhitungan_benur_manual: hasilManual ? Number(hasilManual) : null,
        hasil_perhitungan_benur: hasilOtomatis ? Number(hasilOtomatis) : null,
        status: 'selesai',
      }]);

      await supabase.from('kwitansi').insert([{
        id_kwitansi,
        id_order,
        nama_pembeli: namaPembeliAkhir,
        nama_penjual: profil.nama_lengkap,
        harga_benur: Number(harga),
        harga_benur_total: Number(total),
        metode_pembayaran: 'Tunai',
        status_transaksi: 'selesai',
        tanggal_pembelian: new Date().toISOString(),
        tanggal_mengambil_orderan: new Date().toISOString(),
        nomor_telepon_pembeli: nomorPembeli || null,
        hasil_perhitungan_benur_manual: hasilManual ? Number(hasilManual) : null,
        hasil_perhitungan_benur: hasilOtomatis ? Number(hasilOtomatis) : null,
        id_penjual: profil.id_registrasi,
      }]);
      
      const { data: stokData } = await supabase
          .from("stok_benur")
          .select("id_stok, stok_sisa")
          .eq("nama_penjual", profil.nama_lengkap)
          .single();

        if (stokData) {
          const stokBaru = stokData.stok_sisa - jumlahYangDijual;

          await supabase
            .from("stok_benur")
            .update({
              stok_sisa: stokBaru,
              updated_at: new Date()
            })
            .eq("id_stok", stokData.id_stok);
        }
      await AsyncStorage.removeItem(STORAGE_KEY);
      Alert.alert('✅ Sukses', 'Penjualan berhasil dicatat.');
      router.replace('/(tabs)/home');
    } catch (err: any) {
      Alert.alert('Kesalahan', err.message || 'Terjadi kesalahan tak terduga.');
    }
  };
  // key untuk AsyncStorage
  
  // Load data dari AsyncStorage saat mount
  useEffect(() => {
    (async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
        if (jsonValue) {
          const data = JSON.parse(jsonValue);
          if (!hasilAI) {
            setHasilOtomatis(data.hasilOtomatis || '');
            setJumlahBenur(data.jumlahBenur || 0);
          }
          setNamaPembeli(data.namaPembeli || '');
          setToko(data.toko || '');
          setHarga(data.harga || '');
          setHasilManual(data.hasilManual || '');
          //setHasilOtomatis(data.hasilOtomatis || ''); // <- otomatis update
          setJumlahBenur(data.jumlahBenur || 0);      // <- otomatis update
          setKeterangan(data.keterangan || '');
          setTotal(data.total || '');
          setNomorPembeli(data.nomorPembeli || '');
        }
      } catch (e) {
        console.log('Gagal load data:', e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = {
          namaPembeli,
          toko,
          harga,
          hasilManual,
          hasilOtomatis,
          keterangan,
          jumlahBenur,
          total,
          nomorPembeli,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        console.log('Gagal simpan data:', e);
      }
    })();
  }, [namaPembeli, toko, harga, hasilManual, hasilOtomatis, keterangan, jumlahBenur, total]);
  
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      (async () => {
        try {
          // Pertama: cek params dulu
          if (hasilAI && isActive) {
            console.log("✅ Pakai HASIL AI dari kamera:", hasilAI);
            setHasilOtomatis(String(hasilAI));
            setJumlahBenur(Number(hasilAI));
            return;
          }

          // Kedua: kalau tidak ada params, baru pakai AsyncStorage
          const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
          if (jsonValue && isActive) {
            const data = JSON.parse(jsonValue);
            console.log("📦 Load dari AsyncStorage:", data);

            setHasilOtomatis(data.hasilOtomatis != null ? String(data.hasilOtomatis) : '');
            setJumlahBenur(data.jumlahBenur ?? 0);
          }

        } catch (e) {
          console.log('Gagal load data saat focus:', e);
        }
      })();

      return () => { isActive = false; };
    }, [hasilAI])
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView 
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled">
          <Stack.Screen
            options={{
              title: 'Tambah Penjualan Umum',
              headerTitleAlign: 'center',
              headerLeft: () => (
                <TouchableOpacity style={{ paddingHorizontal: 10 }} onPress={() => router.push('/(tabs)/home')}>
                  <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>KEMBALI</Text>
                </TouchableOpacity>
              ),
            }}
          />

          <Text style={styles.title}>🧾 Form Penjualan Umum</Text>

          <View style={styles.card}>
            <TextInput placeholder="Nama Pembeli (opsional)" value={namaPembeli} onChangeText={setNamaPembeli} style={styles.input} />
            <TextInput placeholder="Nama Toko" value={toko} onChangeText={setToko} style={styles.input} />

            <TextInput placeholder="Harga Satuan Benur (Rean)" keyboardType="numeric" value={harga} onChangeText={setHarga} style={styles.input} />
            {harga !== '' && <Text style={styles.helper}>Harga per rean</Text>}

            <TextInput placeholder="Hasil Perhitungan Benur (Manual)" keyboardType="numeric" value={hasilManual} onChangeText={setHasilManual} style={styles.input} />
            {hasilManual !== '' && <Text style={styles.helper}>= {(Number(hasilManual) / REAN_VALUE).toFixed(2)} rean</Text>}

            <TextInput placeholder="Hasil Perhitungan Benur (Otomatis)" keyboardType="numeric" value={hasilOtomatis} editable={false} style={[styles.input, styles.disabled]} />
            {hasilOtomatis !== '' && <Text style={styles.helper}>= {(Number(hasilOtomatis) / REAN_VALUE).toFixed(2)} rean</Text>}

            <TouchableOpacity style={styles.buttonSecondary} onPress={handleAmbilDataOtomatis}>
              <Text style={styles.buttonSecondaryText}>🤖 Ambil Data Perhitungan Otomatis</Text>
            </TouchableOpacity>

            <TextInput placeholder="Total Harga" value={total} editable={false} style={[styles.input, styles.disabled]} />

            <TextInput placeholder="Keterangan (opsional)" value={keterangan} onChangeText={setKeterangan} style={styles.input} />
            <TextInput 
              placeholder="Nomor Telepon Pembeli (opsional)"
              value={nomorPembeli}
              keyboardType="phone-pad"
              onChangeText={setNomorPembeli}
              style={styles.input}
            />
            <TouchableOpacity style={styles.buttonPrimary} onPress={handleSubmit}>
              <Text style={styles.buttonPrimaryText}>Simpan Penjualan Umum</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#F8FAFF',
  },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    shadowColor: '#111',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 6,
    marginBottom: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 10,
  },
  disabled: { backgroundColor: '#ECECEC' },
  helper: { fontSize: 12, fontStyle: 'italic', color: '#666', marginBottom: 10, marginTop: -5 },
  buttonPrimary: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  buttonPrimaryText: { fontWeight: 'bold', fontSize: 16, color: 'white' },
  buttonSecondary: {
    backgroundColor: '#e7efff',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 8,
  },
  buttonSecondaryText: { fontSize: 15, fontWeight: '600', color: '#007AFF' },
});
