// app/main/_layout.tsx
import { Stack } from "expo-router";

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Semua halaman di bawah folder main/dashboard otomatis masuk sini */}
    </Stack>
  );
}
