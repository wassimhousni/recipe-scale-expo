import { StatusBar } from 'expo-status-bar';
import ScannerScreen from './screens/ScannerScreen';

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <ScannerScreen />
    </>
  );
}