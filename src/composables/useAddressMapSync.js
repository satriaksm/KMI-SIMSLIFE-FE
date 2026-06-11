import { ref } from 'vue';

export function useAddressMapSync() {
  const isSyncing = ref(false);

  // Normalizer: hilangkan kata seperti kab, kabupaten, kota, dki, daerah, dll
  const normalizeText = (text) => {
    if (!text) return "";
    return text.toLowerCase()
      .replace(/^(kabupaten|kab\.|kota|provinsi|daerah khusus ibukota|dki|daerah istimewa|di|kecamatan|kec\.|kelurahan|desa)\s+/gi, "")
      .trim();
  };

  const findBestMatch = (options, targetName) => {
    if (!targetName || !options || options.length === 0) return null;
    const target = normalizeText(targetName);
    
    // Exact match on normalized
    let match = options.find(o => normalizeText(o.name || o.label) === target);
    if (match) return match;

    // Includes match
    match = options.find(o => {
      const optText = normalizeText(o.name || o.label);
      return optText.includes(target) || target.includes(optText);
    });
    return match || null;
  };

  const translateProvince = (text) => {
    if (!text) return "";
    const lower = text.toLowerCase();
    const dict = {
      "central java": "jawa tengah",
      "east java": "jawa timur",
      "west java": "jawa barat",
      "special region of yogyakarta": "di yogyakarta",
      "yogyakarta": "di yogyakarta",
      "jakarta": "dki jakarta",
      "special capital region of jakarta": "dki jakarta",
      "north sumatra": "sumatera utara",
      "south sumatra": "sumatera selatan",
      "west sumatra": "sumatera barat",
    };
    return dict[lower] || text;
  };

  /**
   * Sinkronisasi dari Peta ke Dropdown Alamat (Reverse Geocoding)
   * 
   * @param {number} lat 
   * @param {number} lng 
   * @param {object} helpers - Object berisi dependencies & callback
   */
  const syncMapToAddress = async (lat, lng, helpers) => {
    if (!lat || !lng) return;
    
    try {
      isSyncing.value = true;
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=id`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (!data || !data.address) return;
      
      const addr = data.address;
      
      // Kumpulkan semua nama yang berpotensi menjadi wilayah
      const allNames = [
        addr.village, addr.neighbourhood, addr.residential, addr.hamlet, addr.quarter,
        addr.suburb, addr.city_district, addr.district, addr.town, 
        addr.city, addr.county, addr.municipality
      ].filter(Boolean);

      // Urutan prioritas dari Nominatim
      const provName = addr.state || addr.region;
      // Gunakan city/county sebagai nama kota
      const cityName = addr.city || addr.county || addr.municipality;
      // Gunakan town/suburb/district sebagai nama kecamatan
      const distName = addr.town || addr.suburb || addr.city_district || addr.district;
      // Sisanya sebagai desa
      const villName = addr.village || addr.neighbourhood || addr.residential || addr.hamlet || addr.quarter;

      // 1. Match Province
      if (provName && helpers.provinces) {
        let prov = findBestMatch(helpers.provinces, provName);
        if (!prov) prov = findBestMatch(helpers.provinces, translateProvince(provName));
        
        if (prov) {
          const provId = prov.id || prov.value;
          helpers.setProvince(provId);
          const cities = await helpers.loadCities(provId);
          
          // 2. Match City
          if (cityName && cities) {
            const city = findBestMatch(cities, cityName);
            if (city) {
              const cityId = city.id || city.value;
              helpers.setCity(cityId);
              const districts = await helpers.loadDistricts(cityId);
              
              // 3. Match District
              let matchedDistrict = false;
              if (distName && districts) {
                const dist = findBestMatch(districts, distName);
                if (dist) {
                  matchedDistrict = true;
                  const distId = dist.id || dist.value;
                  helpers.setDistrict(distId);
                  const villages = await helpers.loadVillages(distId);
                  
                  // 4. Match Village
                  if (villName && villages) {
                    const vill = findBestMatch(villages, villName);
                    if (vill) {
                      const villId = vill.id || vill.value;
                      helpers.setVillage(villId);
                    }
                  }
                }
              }

              // Fallback jika distName tidak ada/tidak cocok, tapi ada candidate lain di allNames
              if (!matchedDistrict && allNames.length > 0 && districts) {
                 for (const dist of districts) {
                    const distId = dist.id || dist.value;
                    const villages = await helpers.loadVillages(distId);
                    
                    // Cari apakah ada nama desa yang cocok dengan salah satu candidate di allNames
                    let matchedVill = null;
                    for (const candidate of allNames) {
                      matchedVill = findBestMatch(villages, candidate);
                      if (matchedVill) break;
                    }
                    
                    if (matchedVill) {
                       helpers.setDistrict(distId);
                       helpers.setVillage(matchedVill.id || matchedVill.value);
                       break;
                    }
                 }
              }
            }
          }
        }
      }
      
    } catch (e) {
      console.error("Reverse geocoding error:", e);
    } finally {
      isSyncing.value = false;
    }
  };

  /**
   * Sinkronisasi dari Dropdown Alamat ke Peta (Geocoding)
   * Menggunakan debounce agar tidak kena limit dari Nominatim API
   */
  let geocodeTimeout = null;
  const syncAddressToMap = (textParts, mapRef) => {
    // textParts should filter out empty strings
    const validParts = textParts.filter(p => !!p);
    if (validParts.length === 0) return;
    
    // Gabung dengan koma, tambahkan Indonesia agar lebih akurat
    const query = validParts.join(", ") + ", Indonesia";
    
    clearTimeout(geocodeTimeout);
    geocodeTimeout = setTimeout(async () => {
      try {
        isSyncing.value = true;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=id`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          // Set koordinat dan panTo
          if (mapRef && mapRef.panTo) {
             mapRef.panTo(parseFloat(lat), parseFloat(lon), 16);
          } else if (mapRef && mapRef.value && mapRef.value.panTo) {
             mapRef.value.panTo(parseFloat(lat), parseFloat(lon), 16);
          }
        }
      } catch (e) {
        console.error("Geocoding error:", e);
      } finally {
        isSyncing.value = false;
      }
    }, 1200); // Debounce 1.2s untuk menghormati Nominatim limits (1 req/s)
  };

  return {
    isSyncing,
    syncMapToAddress,
    syncAddressToMap
  };
}
