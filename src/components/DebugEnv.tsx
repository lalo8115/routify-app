'use client';

import { useEffect } from 'react';

export default function DebugEnv() {
  useEffect(() => {
    console.log('=== DEBUG ENV VARS ===');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('ANON KEY (primeros 20 chars):', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20));
    console.log('ANON KEY contiene "anon":', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes('anon'));
    
    // Limpiar cualquier sesión vieja
    localStorage.clear();
    sessionStorage.clear();
    console.log('Storage limpiado');
    console.log('=====================');
  }, []);

  return (
    <div className="fixed bottom-20 right-4 bg-black text-white p-4 rounded text-xs max-w-xs z-50">
      <p><strong>Debug Info:</strong></p>
      <p>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30)}...</p>
      <p>Key starts: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 15)}...</p>
    </div>
  );
}
