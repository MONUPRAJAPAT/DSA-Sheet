import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/input';
import { useUpdateProgress } from './hooks';

export function NotesDialog({
  open,
  onOpenChange,
  problemId,
  title,
  initial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  problemId: string;
  title: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const update = useUpdateProgress();
  useEffect(() => setValue(initial), [initial, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notes · {title}</DialogTitle>
          <DialogDescription>
            Key insight, edge cases, complexity — future you will thank you during revision.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={2000}
          rows={7}
          placeholder="e.g. Sort first, then two pointers. O(n log n) time, O(1) space."
          autoFocus
        />
        <p className="-mt-2 text-right text-xs text-muted-foreground">{value.length}/2000</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              update.mutate(
                { problemId, notes: value },
                { onSuccess: () => toast.success(value.trim() ? 'Notes saved' : 'Notes cleared') },
              );
              onOpenChange(false);
            }}
          >
            Save notes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
