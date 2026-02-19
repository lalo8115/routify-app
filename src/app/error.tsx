'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          ¡Algo salió mal!
        </h2>
        <p className="text-gray-600 mb-6">
          {error.message || 'Ocurrió un error inesperado'}
        </p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Intentar nuevamente
        </button>
      </div>
    </div>
  );
}
