import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../src/store/store';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, role } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    } else {
      // Redirect based on role
      switch (role) {
        case 'ADMIN':
          router.replace('/(admin)');
          break;
        case 'STAFF':
          router.replace('/(staff)');
          break;
        case 'RESELLER':
          router.replace('/(reseller)');
          break;
        case 'RESELLER_STAFF':
          router.replace('/(reseller-staff)');
          break;
        default:
          router.replace('/login');
      }
    }
  }, [isAuthenticated, role]);

  return null;
}
