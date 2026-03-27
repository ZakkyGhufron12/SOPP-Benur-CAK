import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Button,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../supabase';

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState({
    nama_lengkap: '',
    tanggal_lahir: '',
    umur: '',
    email: '',
    username: '',
    password: '',
    role: '',
    kota: '',
    alamat_lengkap: '',
    nomor_telepon: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  const handleRegister = async () => {
    if (!form.nama_lengkap || !form.email || !form.username || !form.password || !form.role) {
      Alert.alert('Error', 'Nama lengkap, email, username, password, dan role wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      // 1. Buat akun di Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (authError) throw authError;

      // 2. Simpan ke tabel registrasi
      const id_registrasi = uuidv4();
      const { error: insertError } = await supabase.from('registrasi').insert([
        {
          id_registrasi,
          nama_lengkap: form.nama_lengkap,
          tanggal_lahir: form.tanggal_lahir || null,
          umur: form.umur ? parseInt(form.umur) : null,
          email: form.email,
          username: form.username,
          role: form.role,
          kota: form.kota || null,
          alamat_lengkap: form.alamat_lengkap || null,
          nomor_telepon: form.nomor_telepon || null,
        },
      ]);
      if (insertError) throw insertError;

      Alert.alert('Sukses', 'Registrasi berhasil! Silakan login menggunakan akun Anda.');
      router.replace('/auth/login');
    } catch (err: any) {
      Alert.alert('Gagal mendaftar', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Registrasi</Text>

        {/*Form input dengan contoh format*/}
        {[
          { key: 'nama_lengkap', label: 'Nama Lengkap (contoh: Abdullah Fulan)' },
          { key: 'tanggal_lahir', label: 'Tanggal Lahir (contoh: 2001-12-31)' },
          { key: 'umur', label: 'Umur (contoh: 23)' },
          { key: 'email', label: 'Email (contoh: budi@mail.com)' },
          { key: 'username', label: 'Username (contoh: budi123)' },
          { key: 'password', label: 'Kata Sandi' },
          { key: 'kota', label: 'Kota (contoh: Jakarta)' },
          { key: 'alamat_lengkap', label: 'Alamat Lengkap (contoh: Jl. Merdeka No. 10)' },
          { key: 'nomor_telepon', label: 'Nomor Telepon (contoh: 08123456789)' },
        ].map(({ key, label }) => (
          <TextInput
            key={key}
            style={styles.input}
            placeholder={label} // 🩶 tulisan abu-abu contoh format muncul di sini
            secureTextEntry={key === 'password'}
            value={(form as any)[key]}
            onChangeText={(text) => handleChange(key, text)}
          />
        ))}

        {/*Picker Role*/}
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={form.role}
            onValueChange={(value) => handleChange('role', value)}
          >
            <Picker.Item label="Pilih peran Anda" value="" />
            <Picker.Item label="Pembeli" value="buyer" />
            <Picker.Item label="Penjual" value="seller" />
          </Picker>
        </View>

        {/*Tombol Daftar*/}
        <Button
          title={loading ? 'Mendaftar...' : 'Daftar'}
          onPress={handleRegister}
          disabled={loading}
        />

        {/* 🔗 Link ke Login */}
        <Text style={styles.link} onPress={() => router.push('/auth/login')}>
          Sudah punya akun? Login
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 12,
  },
  link: {
    textAlign: 'center',
    color: 'blue',
    marginTop: 12,
  },
});
