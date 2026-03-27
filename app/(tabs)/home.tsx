// app/(tabs)/home.tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../../supabase';
import BuyerMain from '../main/dashboard/buyer/buyermain';
import SellerMain from '../main/dashboard/seller/sellermain';

export default function Home() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(params.role as string);
  const [loading, setLoading] = useState(!role);

  useEffect(() => {
    const fetchRole = async () => {
      if (!role) {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user) {
          router.replace('/auth/login');
          return;
        }
        const { data: profil } = await supabase
          .from('registrasi')
          .select('role')
          .eq('email', user.email)
          .single();

        if (profil) setRole(profil.role);
      }
      setLoading(false);
    };

    fetchRole();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  // penyesuaikan role berdasarkan login
  if (role === 'buyer') return <BuyerMain />;
  if (role === 'seller') return <SellerMain />;
  return null;
}
