'use client';

import { useEffect, useRef } from 'react';
import { AdMob, BannerAdSize, BannerAdPosition, AdMobError } from '@capacitor-community/admob';

export function MobileAdBanner() {
  const isAdLoaded = useRef(false);

  useEffect(() => {
    // Initialize AdMob and show banner
    const initAd = async () => {
      try {
        await AdMob.initialize({
          testingDevices: ['2077ef9a63d2b398840261c8221a0c9b'], // Optional: Add real device ID for testing
          initializeForTesting: true,
        });

        // Request consent info (GDPR) - Good practice even if not strictly required for test ads
        // await AdMob.requestConsentInfo(); 

        await AdMob.showBanner({
          adId: 'ca-app-pub-5648788643644962/5397823299', // Real Banner ID
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: false,
        });
        
        isAdLoaded.current = true;
      } catch (error) {
        console.error('AdMob initialization failed', error);
      }
    };

    initAd();

    return () => {
      // Cleanup: hide/remove banner when component unmounts
      if (isAdLoaded.current) {
        AdMob.hideBanner().catch(console.error);
        AdMob.removeBanner().catch(console.error);
      }
    };
  }, []);

  // Native ads are overlays, so we return an empty div or a placeholder to reserve space if needed.
  // Ideally, we add some padding to the bottom of the page content to prevent overlap.
  return <div style={{ height: '50px' }} aria-hidden="true" />;
}
