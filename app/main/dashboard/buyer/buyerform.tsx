import { Picker } from '@react-native-picker/picker';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import 'react-native-get-random-values';
import { Button, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../../../supabase';

export default function BuyerForm() {
  const [jumlah, setJumlah] = useState('');
  const [metode, setMetode] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [kota, setKota] = useState('');
  const [penjual, setPenjual] = useState('');
  const [daftarKota, setDaftarKota] = useState<string[]>([]);
  const [daftarPenjual, setDaftarPenjual] = useState<any[]>([]);
  const [rean, setRean] = useState('0');
  const router = useRouter();

  const handleSubmit = async () => {
    try {
      // Ambil user login
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData?.user;
      if (userError || !user) {
        Alert.alert('Error', 'User belum login');
        return;
      }

      // Ambil data profil
      const { data: profil, error: profilError } = await supabase
        .from('registrasi')
        .select('*')
        .eq('email', user.email)
        .single();

      if (profilError || !profil) {
        Alert.alert('Error', 'Profil tidak ditemukan');
        return;
      }

      // Validasi jumlah
      if (!jumlah || isNaN(Number(jumlah)) || Number(jumlah) <= 0) {
        Alert.alert('Validasi', 'Masukkan jumlah benur yang valid.');
        return;
      }

      // Validasi metode pembayaran
      if (!metode) {
        Alert.alert('Validasi', 'Pilih metode pembayaran terlebih dahulu.');
        return;
      }

      // Insert ke tabel pembelian
      const id_pembelian = uuidv4();
      const { error: pembelianError } = await supabase.from('pembelian').insert([
        {
          id_pembelian,
          nama_pembeli: profil.nama_lengkap,
          jumlah_benur_yang_dibeli: Number(jumlah),
          metode_pembayaran: metode,
          keterangan: keterangan || null,
          lokasi_tujuan: lokasi || null,
          nomor_telepon: profil.nomor_telepon || null,
          kota_pemesanan: kota,
          penjual_dipilih: penjual,
        },
      ]);

      if (pembelianError) throw pembelianError;

      // Insert ke tabel orders
      const id_order = uuidv4();
      const { error: orderError } = await supabase.from('orders').insert([
        {
          id_order,
          id_pembelian,
          nama_pembeli: profil.nama_lengkap,
          tanggal_pembelian: new Date().toISOString(),
          metode_pembayaran: metode,
          harga_benur: null,
          harga_benur_total: null,
          nomor_telepon: profil.nomor_telepon || null,
          status: 'menunggu penjual',
        },
      ]);

      if (orderError) throw orderError;

      Alert.alert('Sukses', 'Pesanan berhasil dicatat!');
      router.replace('/(tabs)/home');
    } catch (err: any) {
      console.error('handleSubmit error:', err);
      Alert.alert('Kesalahan', err.message || 'Terjadi kesalahan tak terduga.');
    }
  };

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
    const fetchKota = async () => {
      const { data, error } = await supabase
        .from('registrasi')
        .select('kota'); // pastikan tabel registrasi punya kolom ini

      if (!error && data) {
        const unik = [...new Set(data.map((d) => d.kota).filter(Boolean))];
        setDaftarKota(unik);
      }
    };
    fetchKota();
  }, []);

  // Ambil daftar penjual berdasarkan kota
  useEffect(() => {
    const fetchPenjual = async () => {
      if (!kota) return;
      const { data, error } = await supabase
        .from('registrasi')
        .select('nama_lengkap')
        .ilike('kota', kota)
        .eq('role', 'seller'); // pastikan role diset
      if (!error && data) setDaftarPenjual(data);
    };
    fetchPenjual();
  }, [kota]);

  // Hitung otomatis rean
  useEffect(() => {
    if (jumlah) {
      const hasil = Number(jumlah) / 5000;
      setRean(hasil.toFixed(2)); // dua angka desimal
    } else {
      setRean('0');
    }
  }, [jumlah]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}>
      <Stack.Screen
        options={{
          title: 'Form Pembelian',
          headerTitleAlign: 'center',
          headerLeft: () => (
            <Button 
              onPress={() => router.push('/(tabs)/home')}
              textColor="#007AFF"
            >
              KEMBALI
            </Button>
              ),
            }}
          />
      <Text style={styles.title}>Form Pembelian</Text>
      <ScrollView>
      <TextInput
        placeholder="Jumlah Benur"
        keyboardType="numeric"
        value={jumlah}
        onChangeText={setJumlah}
        style={styles.input}
      />

      {/* Picker Metode Pembayaran */}
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={metode}
          onValueChange={(value) => setMetode(value)}
        >
          <Picker.Item label="Pilih Metode Pembayaran Anda" value="" />
          <Picker.Item label="Cash" value="Cash" />
          <Picker.Item label="Transfer" value="Transfer" />
          {/*<Picker.Item label="QRIS" value="QRIS" />*/}
        </Picker>
      </View>

      <TextInput
        placeholder="Keterangan (opsional)"
        value={keterangan}
        onChangeText={setKeterangan}
        style={styles.input}
      />

      <TextInput
        placeholder="Lokasi Tujuan (contoh: Desa Kedungrejo, Blitar)"
        value={lokasi}
        onChangeText={setLokasi}
        style={styles.input}
      />
      {/* Pilih Kota */}
      <View style={styles.pickerContainer}>
        <Picker selectedValue={kota} onValueChange={(value) => setKota(value)}>
          <Picker.Item label="Pilih Kota Pemesanan" value="" />
          {daftarKota.map((k) => (
            <Picker.Item key={k} label={k} value={k} />
          ))}
        </Picker>
      </View>

      {/* Pilih Penjual */}
      <View style={styles.pickerContainer}>
        <Picker selectedValue={penjual} onValueChange={(value) => setPenjual(value)}>
          <Picker.Item label="Pilih Penjual" value="" />
          {daftarPenjual.map((p) => (
            <Picker.Item key={p.nama_lengkap} label={p.nama_lengkap} value={p.nama_lengkap} />
          ))}
        </Picker>
      </View>

      {/* Jumlah Benur + Rean */}
      <TextInput
        placeholder="Jumlah Benur (ekor)"
        keyboardType="numeric"
        value={jumlah}
        onChangeText={setJumlah}
        style={styles.input}
      />
      <Text style={{ marginBottom: 10, color: '#555' }}>
        = {rean} rean
      </Text>
      <View style={styles.buttonContainer}>
        <Button 
          mode="contained" 
          onPress={handleSubmit} 
          buttonColor="#007AFF"
          textColor="white"
          style={{ paddingVertical: 6 }}
        >
          Simpan
        </Button>
      </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f9fafb',
    padding: 20 
  },
  title: { 
    fontSize: 22, 
    fontWeight: '700', 
    marginBottom: 20, 
    textAlign: 'center',
    color: '#222'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'white',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  buttonContainer: {
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden'
  },
});
