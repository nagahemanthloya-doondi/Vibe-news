
import { useState, useCallback } from 'react';
import type { GeolocationState } from '../types';

export function useGeolocation(defaultState: GeolocationState = { latitude: null, longitude: null, error: null }) {
    const [location, setLocation] = useState<GeolocationState>(defaultState);
    const [isLoading, setIsLoading] = useState(false);

    const getLocation = useCallback(() => {
        setIsLoading(true);
        if (!navigator.geolocation) {
            setLocation(prev => ({ ...prev, error: "Geolocation is not supported by your browser." }));
            setIsLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    error: null,
                });
                setIsLoading(false);
            },
            () => {
                setLocation(prev => ({ ...prev, error: "Unable to retrieve your location. Please grant permission." }));
                setIsLoading(false);
            }
        );
    }, []);

    return { location, isLoading, getLocation };
}
