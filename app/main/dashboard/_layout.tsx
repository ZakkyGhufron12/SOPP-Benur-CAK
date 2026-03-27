// app/main/dashboard/_layout.tsx
import { Stack } from "expo-router";

export default function DashboardLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        // hilangkan title default
      }}
    >
      {/* biarkan anak-anak menentukan title sendiri */}
    </Stack>
  );
}
