interface StarRatingProps {
  score: number; // 0–10
  size?: 'sm' | 'md' | 'lg';
}

export default function StarRating({ score, size = 'md' }: StarRatingProps) {
  const stars = Math.round((score / 10) * 5 * 2) / 2; // 0–5 in 0.5 steps
  const sizes = { sm: 12, md: 14, lg: 18 };
  const px = sizes[size];

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = stars >= i;
        const half = !filled && stars >= i - 0.5;
        return (
          <svg
            key={i}
            width={px}
            height={px}
            viewBox="0 0 24 24"
            fill="none"
          >
            {half ? (
              <>
                <defs>
                  <linearGradient id={`half-${i}`}>
                    <stop offset="50%" stopColor="#F4A425" />
                    <stop offset="50%" stopColor="#2A2A48" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill={`url(#half-${i})`}
                  stroke="none"
                />
              </>
            ) : (
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={filled ? '#F4A425' : '#2A2A48'}
                stroke="none"
              />
            )}
          </svg>
        );
      })}
    </div>
  );
}
