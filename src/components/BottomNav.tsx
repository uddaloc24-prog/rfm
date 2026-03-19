'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    href: '/social-feed',
    label: 'Feed',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
          stroke={active ? '#E8611A' : '#C4B9B0'}
          strokeWidth={active ? '2' : '1.5'}
          fill={active ? 'rgba(232,97,26,0.08)' : 'none'}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: '/lists',
    label: 'Lists',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect
          x="4" y="3" width="16" height="18" rx="2"
          stroke={active ? '#E8611A' : '#C4B9B0'}
          strokeWidth={active ? '2' : '1.5'}
          fill={active ? 'rgba(232,97,26,0.08)' : 'none'}
        />
        <path
          d="M8 8h8M8 12h8M8 16h5"
          stroke={active ? '#E8611A' : '#C4B9B0'}
          strokeWidth={active ? '2' : '1.5'}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: '/search',
    label: 'Search',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle
          cx="11" cy="11" r="7"
          stroke={active ? '#E8611A' : '#C4B9B0'}
          strokeWidth={active ? '2' : '1.5'}
          fill={active ? 'rgba(232,97,26,0.08)' : 'none'}
        />
        <path
          d="M21 21l-4.35-4.35"
          stroke={active ? '#E8611A' : '#C4B9B0'}
          strokeWidth={active ? '2' : '1.5'}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: '/map',
    label: 'Map',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
          stroke={active ? '#E8611A' : '#C4B9B0'}
          strokeWidth={active ? '2' : '1.5'}
          fill={active ? 'rgba(232,97,26,0.08)' : 'none'}
        />
        <circle
          cx="12"
          cy="9"
          r="2.5"
          stroke={active ? '#E8611A' : '#C4B9B0'}
          strokeWidth={active ? '2' : '1.5'}
          fill={active ? '#E8611A' : 'none'}
        />
      </svg>
    ),
  },
  {
    href: '/leaderboard',
    label: 'Ranks',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2l2.4 4.8L20 7.6l-4 3.9 .9 5.5L12 14.5l-4.9 2.5.9-5.5-4-3.9 5.6-.8L12 2z"
          stroke={active ? '#E8611A' : '#C4B9B0'}
          strokeWidth={active ? '2' : '1.5'}
          fill={active ? 'rgba(232,97,26,0.08)' : 'none'}
          strokeLinejoin="round"
        />
        <path
          d="M5 21h14M8 21v-3M12 21v-5M16 21v-2"
          stroke={active ? '#E8611A' : '#C4B9B0'}
          strokeWidth={active ? '2' : '1.5'}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: '/me',
    label: 'Profile',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="8"
          r="4"
          stroke={active ? '#E8611A' : '#C4B9B0'}
          strokeWidth={active ? '2' : '1.5'}
          fill={active ? 'rgba(232,97,26,0.08)' : 'none'}
        />
        <path
          d="M4 20c0-4 3.58-7 8-7s8 3 8 7"
          stroke={active ? '#E8611A' : '#C4B9B0'}
          strokeWidth={active ? '2' : '1.5'}
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
      style={{
        background: 'rgba(250,250,248,0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid #E8E2DC',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around h-[64px]">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 flex-1 py-2 transition-opacity active:opacity-70"
            >
              {item.icon(isActive)}
              <span
                className="text-[9px] font-body font-medium tracking-wide"
                style={{ color: isActive ? '#E8611A' : '#C4B9B0' }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
