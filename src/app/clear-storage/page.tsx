'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClearStoragePage() {
  const router = useRouter();
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    // Limpiar todo el almacenamiento
    localStorage.clear();
    sessionStorage.clear();
    
    // Limpiar cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
    
    setCleared(true);
    console.log('✅ Storage completamente limpiado');
  }, []);

  const handleContinue = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md text-center">
        {cleared ? (
          <>
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">
              Almacenamiento Limpiado
            </h1>
            <p className="text-gray-600 mb-6">
              Todas las sesiones antiguas y datos cacheados han sido eliminados.
            </p>
            <button
              onClick={handleContinue}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Ir al Login
            </button>
          </>
        ) : (
          <>
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
            <p className="text-gray-600">Limpiando almacenamiento...</p>
          </>
        )}
      </div>
    </div>
  );
}
