import Link from 'next/link';
import { Vendor, CATEGORY_EMOJI } from '@/lib/types';

interface VendorCardProps {
  vendor: Vendor;
  rank: number;
  maxDailyCount?: number;
}

export default function VendorCard({ vendor, rank }: VendorCardProps) {
  return (
    <Link href={`/v/${vendor.slug}`} className="block card-press">
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{
          background: '#FFFFFF',
          border: '1px solid #E8E2DC',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}
      >
        {/* Rank */}
        <span
          className="font-display font-black text-base w-6 text-center shrink-0 leading-none"
          style={{ color: '#E8611A' }}
        >
          {rank}
        </span>

        {/* Name + location + rater count */}
        <div className="flex-1 min-w-0">
          <h3
            className="font-display font-bold text-[15px] leading-tight truncate"
            style={{ color: '#1A1205' }}
          >
            {vendor.name}
          </h3>
          <p className="font-body text-xs mt-0.5 truncate" style={{ color: '#9B8E84' }}>
            {vendor.neighbourhood}
          </p>
          {vendor.total_rating_count > 0 && (
            <p className="font-body text-[10px] mt-0.5" style={{ color: '#B8ADA6' }}>
              {vendor.total_rating_count} {vendor.total_rating_count === 1 ? 'person' : 'people'} tried this
            </p>
          )}
        </div>

        {/* Right side: score + category emoji */}
        <div className="flex items-center gap-2 shrink-0">
          {vendor.total_rating_count > 0 && (
            <span
              className="font-display font-bold text-sm px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(232,97,26,0.1)', color: '#E8611A' }}
            >
              {vendor.community_score.toFixed(1)}
            </span>
          )}
          <span
            className="text-base px-2.5 py-1 rounded-full"
            style={{ background: '#F5F2EE' }}
          >
            {CATEGORY_EMOJI[vendor.category]}
          </span>
        </div>
      </div>
    </Link>
  );
}
