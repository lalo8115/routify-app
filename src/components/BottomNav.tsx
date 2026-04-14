'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, Map, LogOut, Settings } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';

const navItems = [
  { href: '/', icon: Home, label: 'Inicio' },
  { href: '/directorio', icon: Users, label: 'Directorio' },
  { href: '/mapa', icon: Map, label: 'Mapa' },
  { href: '/configuracion', icon: Settings, label: 'SaaS' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
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
