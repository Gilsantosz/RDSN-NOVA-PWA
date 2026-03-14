import { useState, useCallback, useMemo } from 'react';

export function useSearch(items = [], searchableFields = []) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  // Debounce da busca para melhor performance
  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    const timer = setTimeout(() => {
      setDebouncedTerm(term.toLowerCase());
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Filtragem otimizada com useMemo
  const results = useMemo(() => {
    if (!debouncedTerm) return items;

    return items.filter(item => {
      // Busca em múltiplos campos
      return searchableFields.some(field => {
        const value = item[field];
        if (!value) return false;
        
        // Converter para string e fazer busca case-insensitive
        const stringValue = String(value).toLowerCase();
        return stringValue.includes(debouncedTerm);
      });
    });
  }, [items, debouncedTerm, searchableFields]);

  return {
    searchTerm,
    setSearchTerm,
    debouncedTerm,
    handleSearch,
    results,
    hasResults: results.length > 0,
    resultCount: results.length
  };
}