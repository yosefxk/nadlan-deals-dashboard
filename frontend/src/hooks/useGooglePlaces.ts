import { useState, useEffect, useRef } from 'react';

export interface GooglePlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  types: string[];
}

export interface ParsedAddress {
  settlement?: string;
  street?: string;
  houseNum?: string;
  fullAddress: string;
}

export function useGooglePlaces(apiKey?: string) {
  const effectiveApiKey = apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [isLoaded, setIsLoaded] = useState(false);
  const [predictions, setPredictions] = useState<GooglePlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const dummyElementRef = useRef<HTMLDivElement | null>(null);

  // Load Google Maps script once if API key is provided
  useEffect(() => {
    if (!effectiveApiKey) return;

    if (window.google?.maps?.places) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      if (!dummyElementRef.current) {
        dummyElementRef.current = document.createElement('div');
      }
      placesServiceRef.current = new window.google.maps.places.PlacesService(dummyElementRef.current);
      setIsLoaded(true);
      return;
    }

    const scriptId = 'google-maps-places-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${effectiveApiKey}&libraries=places&language=he&region=IL`;
      script.async = true;
      script.onload = () => {
        if (window.google?.maps?.places) {
          autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
          if (!dummyElementRef.current) {
            dummyElementRef.current = document.createElement('div');
          }
          placesServiceRef.current = new window.google.maps.places.PlacesService(dummyElementRef.current);
          setIsLoaded(true);
        }
      };
      document.head.appendChild(script);
    }
  }, [effectiveApiKey]);

  const searchPlaces = (input: string) => {
    if (!input.trim() || !autocompleteServiceRef.current) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);
    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: input.trim(),
        componentRestrictions: { country: 'il' },
        language: 'he',
      },
      (results: any[], status: string) => {
        setIsLoading(false);
        if (status === 'OK' && results) {
          const mapped: GooglePlacePrediction[] = results.map((r) => ({
            placeId: r.place_id,
            description: r.description,
            mainText: r.structured_formatting?.main_text || r.description,
            secondaryText: r.structured_formatting?.secondary_text || '',
            types: r.types || [],
          }));
          setPredictions(mapped);
        } else {
          setPredictions([]);
        }
      }
    );
  };

  const getDetails = (placeId: string): Promise<ParsedAddress> => {
    return new Promise((resolve) => {
      if (!placesServiceRef.current) {
        resolve({ fullAddress: '' });
        return;
      }

      placesServiceRef.current.getDetails(
        {
          placeId,
          fields: ['address_components', 'formatted_address', 'name'],
        },
        (place: any, status: string) => {
          if (status === 'OK' && place) {
            const comps = place.address_components || [];
            let settlement = '';
            let street = '';
            let houseNum = '';

            for (const c of comps) {
              if (c.types.includes('locality')) {
                settlement = c.long_name;
              } else if (c.types.includes('route')) {
                street = c.long_name;
              } else if (c.types.includes('street_number')) {
                houseNum = c.long_name;
              }
            }

            // Normalize spaces around hyphens in settlement (e.g. תל אביב - יפו -> תל אביב -יפו)
            if (settlement.includes(' - ')) {
              settlement = settlement.replace(' - ', ' -');
            }

            resolve({
              settlement,
              street,
              houseNum,
              fullAddress: place.formatted_address || '',
            });
          } else {
            resolve({ fullAddress: '' });
          }
        }
      );
    });
  };

  return {
    isConfigured: !!effectiveApiKey,
    isLoaded,
    isLoading,
    predictions,
    searchPlaces,
    getDetails,
  };
}
