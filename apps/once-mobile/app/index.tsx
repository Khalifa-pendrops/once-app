import { Redirect } from 'expo-router';
import { View } from 'react-native';

export default function Index() {
  // The _layout.tsx handles the actual redirection logic, 
  // but we need an index file for Expo Router to have a valid initial route.
  return <Redirect href="/ritual" />;
}
