import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.claw3d.app',
  appName: 'Claw3D',
  webDir: '../out', // Pointing to the Next.js export folder in the parent directory
  server: {
    androidScheme: 'https'
  }
};

export default config;
