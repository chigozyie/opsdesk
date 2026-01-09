'use client';

import { highlightSearchTerms, DEFAULT_HIGHLIGHT_TAGS } from '@/lib/utils/search-optimization';

interface SearchHighlightProps {
  text: string;
  searchQuery?: string;
  className?: string;
  highlightClassName?: string;
}

/**
 * Component that highlights search terms in text
 */
export function SearchHighlight({
  text,
  searchQuery,
  className = '',
  highlightClassName = 'bg-yellow-200 px-1 rounded font-medium',
}: SearchHighlightProps) {
  if (!searchQuery || !searchQuery.trim()) {
    return <span className={className}>{text}</span>;
  }

  const highlightTags = {
    start: `<mark class="${highlightClassName}">`,
    end: '</mark>',
  };

  const highlightedText = highlightSearchTerms(text, searchQuery, highlightTags);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: highlightedText }}
    />
  );
}

/**
 * Hook for getting highlighted text without rendering
 */
export function useSearchHighlight(text: string, searchQuery?: string) {
  if (!searchQuery || !searchQuery.trim()) {
    return text;
  }

  return highlightSearchTerms(text, searchQuery, DEFAULT_HIGHLIGHT_TAGS);
}