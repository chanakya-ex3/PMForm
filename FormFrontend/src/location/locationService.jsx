export const getCurrentLocation = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return resolve({ placemarks: [], position: { latitude: 0, longitude: 0 } });
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          const placemarks = [
            {
              locality: data.address.city || data.address.town || data.address.village || data.address.county,
              administrativeArea: data.address.state || 'Unknown',
              country: data.address.country || 'Unknown',
            },
          ];
          console.log(placemarks)

          resolve({ placemarks, position: { latitude, longitude } });
        } catch (err) {
          console.error('Reverse geocoding failed:', err);
          const placemarks = [{ locality: 'Unknown', administrativeArea: 'Unknown' }];
          resolve({ placemarks, position: { latitude, longitude } });
        }
      },
      (error) => {
        console.error('Error fetching location:', error);
        resolve({ placemarks: [], position: { latitude: 0, longitude: 0 } });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};
