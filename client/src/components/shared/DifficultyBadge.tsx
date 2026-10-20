import type { Difficulty } from '@dsa/shared';
import { Badge } from '@/components/ui/badge';

const variant = { Easy: 'easy', Medium: 'medium', Hard: 'hard' } as const;

export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: Difficulty;
  className?: string;
}) {
  return (
    <Badge variant={variant[difficulty]} className={className}>
      {difficulty}
    </Badge>
  );
}

export const difficultyText = {
  Easy: 'text-easy',
  Medium: 'text-medium',
  Hard: 'text-hard',
} as const;
export const difficultyBg = { Easy: 'bg-easy', Medium: 'bg-medium', Hard: 'bg-hard' } as const;
