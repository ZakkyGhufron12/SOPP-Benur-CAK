// app/auth/login.tsx
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../../supabase";

export default function LoginScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Masukkan username dan password terlebih dahulu");
      return;
    }

    setLoading(true);

    try {
      const { data: user, error: userError } = await supabase
        .from("registrasi")
        .select("*")
        .eq("username", username)
        .single();

      if (userError || !user) {
        Alert.alert("Gagal Login", "Username tidak ditemukan");
        setLoading(false);
        return;
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (authError) {
        Alert.alert("Gagal Login", authError.message);
        setLoading(false);
        return;
      }

      await supabase.from("login").upsert(
        {
          username: user.username,
          registrasi_id: user.id_registrasi,
          last_login: new Date(),
        },
        { onConflict: "username" }
      );

      Alert.alert("Berhasil", `Selamat datang, ${user.nama_lengkap}!`);

      router.replace({
        pathname: "/(tabs)/home",
        params: { role: user.role },
      });
    } catch (error: any) {
      Alert.alert("Kesalahan", error.message || "Terjadi kesalahan tak terduga.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        "Keluar Aplikasi",
        "Apakah Anda ingin keluar dari aplikasi?",
        [
          { text: "Tidak", onPress: () => null, style: "cancel" },
          { text: "Ya", onPress: () => BackHandler.exitApp() }
        ]
      );
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, []);
  
  return (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
              keyboardShouldPersistTaps="handled"
            >
              <LinearGradient colors={["#0a84ff", "#60a5fa"]} style={styles.header}>
                <View style={styles.headerRow}>
                  <Image
                    source={require("./logo_soppbenur2.png")}
                    style={styles.logo}
                    resizeMode="cover"
                  />
                  <View style={styles.textContainer}>
                    <Text style={styles.appName}>SOPP-BENUR CAK</Text>
                    <Text style={styles.appDesc}>
                      Sistem Operasi Perhitungan dan Penjualan Benur
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              <View style={styles.container}>
                <Text style={styles.loginTitle}>Masuk ke Akun Anda</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#94a3b8"
                  value={username}
                  onChangeText={setUsername}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />

                <TouchableOpacity
                  style={[styles.button, loading && { opacity: 0.7 }]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? "Memproses..." : "Login"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push("/auth/register")}>
                  <Text style={styles.link}>Belum punya akun? Daftar sekarang</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        );
}

const styles = StyleSheet.create({
  header: {
    //paddingVertical: 50,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "white",
    marginRight: 15,
  },
  textContainer: {
    flexShrink: 1,
  },
  appName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "white",
    letterSpacing: 1,
  },
  appDesc: {
    fontSize: 13,
    color: "white",
    opacity: 0.9,
    marginTop: 4,
  },
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingTop: 100,
    //justifyContent: "center",
  },
  loginTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
    color: "#0f172a",
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    color: "#0f172a",
  },
  button: {
    backgroundColor: "#0a84ff",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: "60%",          // 🔹 lebar hanya 60% dari layar
    alignSelf: "center",   // 🔹 posisi tombol di tengah layar
    marginTop: 10,         // 🔹 jarak kecil dari input atas
  },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 16, paddingVertical : 5},
  link: {
    textAlign: "center",
    color: "#0a84ff",
    marginTop: 10,
    marginBottom : 10,
    fontSize: 13,
  },
});
