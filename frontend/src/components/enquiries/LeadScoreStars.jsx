import React from 'react';
import { Star } from 'lucide-react';

const FILLED = '#F5A623';
const EMPTY_STAR = '#D9D9D9';

// Five stars, supports half stars (e.g. 3.5).
const LeadScoreStars = ({ score = 0, size = 16 }) => {
    const value = Math.max(0, Math.min(5, Number(score) || 0));
    return (
        <span className="inline-flex items-center" aria-label={`Lead score ${value.toFixed(1)} out of 5`}>
            {[1, 2, 3, 4, 5].map((n) => {
                const fill = Math.max(0, Math.min(1, value - (n - 1)));
                return (
                    <span key={n} className="relative inline-block" style={{ width: size, height: size }}>
                        <Star size={size} fill={EMPTY_STAR} color={EMPTY_STAR} className="absolute inset-0" />
                        <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                            <Star size={size} fill={FILLED} color={FILLED} />
                        </span>
                    </span>
                );
            })}
        </span>
    );
};

export default LeadScoreStars;
