// app/(tabs)/profile.tsx
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Avatar, Button, Card, Text } from "react-native-paper";
import { supabase } from "../../supabase";

export default function Profile() {
  const params = useLocalSearchParams();
  const [profil, setProfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const roleParam = params.role as string | undefined;

  useEffect(() => {
    const loadProfile = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return;

      const { data: profilData } = await supabase
        .from("registrasi")
        .select("*")
        .eq("email", user.email)
        .single();

      setProfil(profilData);
      setLoading(false);
    };

    loadProfile();
  }, []);

  const handleLogout = async () => {
    Alert.alert(
      "Konfirmasi Logout",
      "Apakah kamu yakin ingin keluar dari aplikasi?",
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Ya, Keluar",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace("/auth/login");
          },
        },
      ]
    );
  };

  const handleRekapPress = () => {
    if (!profil?.role) {
      Alert.alert("Error", "Role pengguna tidak ditemukan.");
      return;
    }

    if (profil.role === "seller") {
      router.push("/main/dashboard/rekap/rekap_seller");
    } else if (profil.role === "buyer") {
      router.push("/main/dashboard/rekap/rekap_buyer");
    } else {
      Alert.alert("Error", `Role ${profil.role} tidak dikenali.`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.card}>
        <Card.Content style={{ alignItems: "center" }}>
          <Avatar.Text
            size={90}
            label={profil?.nama_lengkap?.charAt(0)?.toUpperCase() || "?"}
            style={{ backgroundColor: "#007AFF" }}
          />
          <Text style={styles.name}>{profil?.nama_lengkap}</Text>
          <Text style={styles.email}>{profil?.email}</Text>
          <Text style={styles.kota}>{profil?.kota}</Text>
          <Text style={styles.role}>
            {profil?.role === "seller" ? "Penjual" : "Pembeli"}
          </Text>
        </Card.Content>
      </Card>

      {profil?.role === "seller" && (
        <Button
          mode="contained"
          onPress={handleRekapPress}
          style={styles.rekapButton}
          icon="chart-line"
        >
          Lihat Rekap Penjualan
        </Button>
      )}

      <Button
        mode="outlined"
        onPress={handleLogout}
        style={styles.logoutButton}
        textColor="red"
        icon="logout"
      >
        Logout
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    alignItems: "center",
    backgroundColor: "#F8F9FB",
  },
  card: {
    width: "100%",
    borderRadius: 20,
    marginBottom: 30,
    paddingVertical: 20,
    elevation: 3,
    backgroundColor: "white",
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 10,
  },
  email: {
    fontSize: 15,
    color: "#666",
    marginTop: 5,
  },
  kota: {
    fontSize: 15,
    color: "#666",
    marginTop: 5,
  },
  role: {
    marginTop: 5,
    color: "#007AFF",
    fontWeight: "600",
  },
  logoutButton: {
    width: "100%",
    marginTop: 15,
    borderColor: "red",
  },
  rekapButton: {
    width: "100%",
    backgroundColor: "#007AFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
