import { useEffect } from 'react';

/** Sets the browser tab title, e.g. "Study Calendar · DSA Sheet". */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · DSA Sheet` : 'DSA Sheet — Plan, track & master DSA';
  }, [title]);
}
