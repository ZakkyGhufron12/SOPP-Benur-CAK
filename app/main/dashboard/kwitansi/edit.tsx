import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../../supabase";

export default function EditKwitansi() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [form, setForm] = useState<any>({});
  const REAN_VALUE = 5000;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data, error } = await supabase
      .from("kwitansi")
      .select("*")
      .eq("id_kwitansi", id)
      .single();

    if (error) return Alert.alert("Error", error.message);
    setForm(data);
  }

  async function updateData() {
  // 1. Ambil data lama sebelum diedit
  const { data: oldData, error: errOld } = await supabase
    .from("kwitansi")
    .select("hasil_perhitungan_benur, hasil_perhitungan_benur_manual, nama_penjual")
    .eq("id_kwitansi", id)
    .single();

  if (errOld) return Alert.alert("Error", errOld.message);

  const jumlahLama = oldData.hasil_perhitungan_benur_manual
    ? Number(oldData.hasil_perhitungan_benur_manual)
    : Number(oldData.hasil_perhitungan_benur);

  const jumlahBaru = form.hasil_perhitungan_benur_manual
    ? Number(form.hasil_perhitungan_benur_manual)
    : Number(form.hasil_perhitungan_benur);

  const selisih = jumlahBaru - jumlahLama;

  // 2. Update stok benur berdasarkan selisih
  const { data: stokData } = await supabase
    .from("stok_benur")
    .select("*")
    .eq("nama_penjual", oldData.nama_penjual)
    .single();

  if (stokData) {
    const stokBaru = stokData.stok_sisa - selisih;

    await supabase
      .from("stok_benur")
      .update({ stok_sisa: stokBaru })
      .eq("id_stok", stokData.id_stok);
  }

  // 3. Update tabel kwitansi seperti biasa
  const payload = { ...form };
  delete payload.hasil_perhitungan_final;

  const { error } = await supabase
    .from("kwitansi")
    .update(payload)
    .eq("id_kwitansi", id);

  if (error) return Alert.alert("Gagal", error.message);

  Alert.alert("Berhasil", "Kwitansi berhasil diperbarui");
  router.replace("/main/dashboard/kwitansi/list_kwitansi_seller");
}

  function setValue(key: string, value: any) {
    setForm({ ...form, [key]: value });
  }
  useEffect(() => {
    const jumlahEkor = form.hasil_perhitungan_benur_manual
        ? Number(form.hasil_perhitungan_benur_manual)
        : Number(form.hasil_perhitungan_benur);

    const jumlahRean = jumlahEkor / REAN_VALUE;
    const totalHitung = Number(form.harga_benur || 0) * jumlahRean;

    setForm((prev:any) => ({
        ...prev,
        harga_benur_total: totalHitung.toFixed(0),
    }));
    }, [form.harga_benur, form.hasil_perhitungan_benur_manual, form.hasil_perhitungan_benur]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
    <Stack.Screen
            options={{
            title: 'Edit Data Penjualan',
            headerTitleAlign: 'center',
            }}
    />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Edit Kwitansi</Text>

        {[ 
          { field: "nama_pembeli", label: "Nama Pembeli" },
          { field: "harga_benur", label: "Harga Benur" },
          { field: "harga_benur_total", label: "Harga Total", disabled: true },
          { field: "metode_pembayaran", label: "Metode Pembayaran" },
          { field: "status_transaksi", label: "Status Transaksi" },
          { field: "nomor_telepon", label: "Nomor Telepon" },
          { field: "hasil_perhitungan_benur_manual", label: "Hitung Manual" },
          { field: "hasil_perhitungan_benur", label: "Hasil AI" }
        ].map(({ field, label, disabled }) => (
          <View key={field} style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              value={String(form[field] ?? "")}
              onChangeText={(text) => setValue(field, text)}
              keyboardType={
                ["harga_benur", "harga_benur_total", "hasil_perhitungan_benur", "hasil_perhitungan_benur_manual"].includes(field)
                  ? "numeric"
                  : "default"
              }
              editable={!disabled}
              style={[styles.input, disabled && styles.disabled]}
            />
          </View>
        ))}

        <TouchableOpacity style={styles.button} onPress={updateData}>
          <Text style={styles.buttonText}>Simpan Perubahan</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    marginBottom: 5,
    fontWeight: "600",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "white",
  },
  disabled: {
    backgroundColor: "#F1F1F1",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 12,
  },
  buttonText: {
    textAlign: "center",
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});