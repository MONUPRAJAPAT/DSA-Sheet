import { LoaderCircle, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDemoLogin } from './hooks';

export function DemoButton({
  className,
  size,
  label = 'Explore with demo account',
}: {
  className?: string;
  size?: 'default' | 'lg';
  label?: string;
}) {
  const demo = useDemoLogin();
  return (
    <Button
      variant="outline"
      size={size}
      className={cn('bg-card', className)}
      disabled={demo.isPending}
      onClick={() =>
        demo.mutate(undefined, {
          // Never fail silently — tell the visitor what happened and what to do.
          onError: (err) => toast.error('Couldn’t open the demo', { description: err.message }),
        })
      }
    >
      {demo.isPending ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <Play className="size-4" />
      )}
      {demo.isPending ? 'Opening demo…' : label}
    </Button>
  );
}
