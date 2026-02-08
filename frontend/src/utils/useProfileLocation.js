import { useState, useCallback } from 'react';

const STORAGE_KEY = 'profile_city';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

/**
 * Запрашивает геолокацию и определяет город через reverse geocoding (Nominatim).
 * Сохраняет город в localStorage. Возвращает { city, loading, error, requestLocation }.
 */
export function useProfileLocation() {
  const [city, setCity] = useState(() => localStorage.getItem(STORAGE_KEY) || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Геолокация недоступна в этом браузере');
      return;
    }
    setError(null);
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `${NOMINATIM_URL}?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { Accept: 'application/json' } }
          );
          const data = await res.json();
          const cityName = data.address?.city
            || data.address?.town
            || data.address?.village
            || data.address?.municipality
            || data.address?.state
            || null;
          if (cityName) {
            setCity(cityName);
            localStorage.setItem(STORAGE_KEY, cityName);
          } else {
            setError('Не удалось определить город');
          }
        } catch (e) {
          setError('Ошибка определения города');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        if (err.code === 1) setError('Доступ к местоположению запрещён');
        else setError('Не удалось получить местоположение');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  return { city, loading, error, requestLocation };
}
