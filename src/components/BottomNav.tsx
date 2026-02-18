'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Map } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { href: '/', icon: Home, label: 'Inicio' },
  { href: '/directorio', icon: Users, label: 'Directorio' },
  { href: '/mapa', icon: Map, label: 'Mapa' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe-bottom z-50">
      <div className="grid grid-cols-3 h-16">
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
      </div>
    </nav>
  );
}
