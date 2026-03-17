'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Home',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"
          stroke={active ? '#E8611A' : '#C4B9B0'}
          strokeWidth={active ? '2' : '1.5'}
          fill={active ? 'rgba(232,97,26,0.08)' : 'none'}
          strokeLinejoin="round"
        />
        <path
          d="M9 21V12h6v9"
          stroke={active ? '#E8611A' : '#C4B9B0'}
          strokeWidth={active ? '2' : '1.5'}
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: '/feed',
    label: 'News',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect
          x="3" y="4" width="18" height="16" rx="2"
          stroke={active ? '#E8611A' : '#C4B9B0'}
          strokeWidth={active ? '2' : '1.5'}
          fill={active ? 'rgba(232,97,26,0.08)' : 'none'}
        />
        <path d="M7 9h10M7 13h7M7 17h5" stroke={active ? '#E8611A' : '#C4B9B0'} strokeWidth={active ? '2' : '1.5'} strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/community',
    label: 'Community',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586M3 4h12a2 2 0 012 2v6a2 2 0 01-2 2H7l-4 4V6a2 2 0 012-2z"
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
    href: '/map',
    label: 'My Map',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
    href: '/me',
    label: 'Me',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
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
      <div className="flex items-center justify-around h-[68px]">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-4 py-2 transition-opacity active:opacity-70"
            >
              {item.icon(isActive)}
              <span
                className="text-[10px] font-body font-medium tracking-wide"
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
