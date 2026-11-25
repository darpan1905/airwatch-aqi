import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { useAppStore } from '../store';

export type LocationStatus =
  | 'idle'
  | 'requesting'
  | 'denied'
  | 'resolving'
  | 'ready'
  | 'error';

export function useLocation() {
  const { setLocation } = useAppStore();
  const [status, setStatus] = useState<LocationStatus>('idle');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setStatus('requesting');

      const { status: permStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (cancelled) return;

      if (permStatus !== 'granted') {
        setStatus('denied');
        return;
      }

      setStatus('resolving');

      try {
        // Try high-accuracy first with a timeout fallback
        let coords: Location.LocationObjectCoords | null = null;

        try {
          const loc = await Promise.race([
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            }),
            // 10s timeout — fall back to last known position
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), 10000)
            ),
          ]) as Location.LocationObject;
          coords = loc.coords;
        } catch {
          // Try last known position as fallback
          const last = await Location.getLastKnownPositionAsync();
          if (last) coords = last.coords;
        }

        if (cancelled) return;

        if (!coords) {
          setStatus('error');
          return;
        }

        // Reverse geocode for a human-readable name
        let name = 'My Location';
        try {
          const [place] = await Location.reverseGeocodeAsync({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
          name =
            [
              place?.city || place?.district || place?.subregion,
              place?.region,
            ]
              .filter(Boolean)
              .join(', ') || 'My Location';
        } catch {
          // name stays 'My Location'
        }

        if (cancelled) return;

        setLocation(coords.latitude, coords.longitude, name);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    status,
    isLoading: status === 'idle' || status === 'requesting' || status === 'resolving',
    isDenied: status === 'denied',
    isReady: status === 'ready',
    isError: status === 'error',
  };
}
