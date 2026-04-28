'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Map, LogOut, Settings, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { databaseSource, supabase } from '@/lib/database';
import { clearLocalSession } from '@/lib/local-session';

const navItems = [
  { href: '/', icon: Home, label: 'Inicio' },
  { href: '/directorio', icon: Users, label: 'Dir.' },
  { href: '/historial', icon: Clock, label: 'Historial' },
  { href: '/configuracion', icon: Settings, label: 'SaaS' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const isLocalMode = databaseSource === 'local';

  const handleLogout = async () => {
    try {
      if (isLocalMode) {
        clearLocalSession();
        router.push('/login');
        return;
      }

      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      router.push('/login');
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe-bottom z-50">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex flex-col items-center justify-center gap-1 transition-colors',
                isActive
                  ? 'text-primary-600'
                  : 'text-gray-500 active:text-primary-400'
              )}
            >
              <Icon className={clsx('w-6 h-6', isActive && 'stroke-[2.5]')} />
              <span className={clsx('text-xs', isActive && 'font-semibold')}>
                {item.label}
              </span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-1 text-gray-500 active:text-red-400 transition-colors"
        >
          <LogOut className="w-6 h-6" />
          <span className="text-xs">Salir</span>
        </button>
      </div>
    </nav>
  );
}
