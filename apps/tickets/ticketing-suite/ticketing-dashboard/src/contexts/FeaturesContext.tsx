import React, { createContext, useContext, useEffect, useState } from 'react';
import { Features, getFeatures } from '../lib/api';

interface FeaturesContextType {
  features: Features | null;
  loading: boolean;
  error: Error | null;
}

const FeaturesContext = createContext<FeaturesContextType>({
  features: null,
  loading: true,
  error: null,
});

export const FeaturesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [features, setFeatures] = useState<Features | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const data = await getFeatures();
        setFeatures(data);
      } catch (err) {
        console.error('Failed to fetch features:', err);
        setError(err as Error);
        // Fallback to assuming features are disabled
        setFeatures({ search: false, attachments: false });
      } finally {
        setLoading(false);
      }
    };

    fetchFeatures();
  }, []);

  return (
    <FeaturesContext.Provider value={{ features, loading, error }}>
      {children}
    </FeaturesContext.Provider>
  );
};

export const useFeatures = () => {
  const context = useContext(FeaturesContext);
  if (!context) {
    throw new Error('useFeatures must be used within a FeaturesProvider');
  }
  return context;
};
