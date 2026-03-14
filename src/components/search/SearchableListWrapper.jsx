import React from 'react';
import { useSearch } from '@/components/hooks/useSearch';
import SearchBar from './SearchBar';

/**
 * Componente wrapper para adicionar busca a listas/tabelas
 * Exemplo de uso:
 * 
 * <SearchableListWrapper
 *   items={products}
 *   searchableFields={['name', 'code', 'category']}
 *   renderList={(results, searchTerm) => (
 *     <ProductTable products={results} />
 *   )}
 * />
 */
export default function SearchableListWrapper({
  items = [],
  searchableFields = [],
  renderList,
  placeholder = "Buscar...",
  className = ""
}) {
  const { searchTerm, handleSearch, results, resultCount } = useSearch(items, searchableFields);

  return (
    <div className={className}>
      <div className="mb-4 bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={handleSearch}
          placeholder={placeholder}
          resultCount={resultCount}
          showResultCount={searchTerm !== ''}
        />
      </div>
      {renderList(results, searchTerm)}
    </div>
  );
}