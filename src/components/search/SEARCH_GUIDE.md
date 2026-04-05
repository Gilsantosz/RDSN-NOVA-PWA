# Guia de Busca Global do Sistema

## Overview
Sistema de busca avançado com debounce, performance otimizada para grandes volumes e suporte a múltiplos campos.

## Componentes

### 1. `useSearch` Hook
Hook customizado para gerenciar lógica de busca com debounce.

**Propriedades:**
- `items` - Array de items para buscar
- `searchableFields` - Array de campo(s) para buscar (ex: `['codigo', 'cliente', 'operador']`)

**Retorna:**
```javascript
{
  searchTerm,        // String atual digitada
  setSearchTerm,     // Função para atualizar manualmente
  debouncedTerm,     // String debounced (300ms)
  handleSearch,      // Função para lidar com onChange
  results,           // Array filtrado
  hasResults,        // Boolean
  resultCount        // Número de resultados
}
```

**Exemplo:**
```javascript
const { searchTerm, handleSearch, results } = useSearch(
  reservas,
  ['codigo_completo', 'cliente', 'modelo']
);
```

### 2. `SearchBar` Componente
Barra de busca reutilizável com ícone e botão limpar.

**Props:**
- `searchTerm` (string) - Valor atual
- `onSearchChange` (function) - Callback onChange
- `placeholder` (string) - Texto placeholder
- `resultCount` (number) - Quantidade de resultados
- `showResultCount` (boolean) - Mostrar contador
- `disabled` (boolean) - Desabilitar input
- `className` (string) - Classes CSS customizadas

**Exemplo:**
```javascript
<SearchBar
  searchTerm={search}
  onSearchChange={handleSearch}
  placeholder="Buscar..."
  resultCount={results.length}
  showResultCount={search !== ''}
/>
```

### 3. `SearchableListWrapper` Componente
Wrapper completo que combina SearchBar + filtros + renderização.

**Props:**
- `items` (array) - Items para buscar
- `searchableFields` (array) - Campos pesquisáveis
- `renderList` (function) - Função que renderiza lista
- `placeholder` (string) - Placeholder do input
- `className` (string) - Classes CSS

**Exemplo:**
```javascript
<SearchableListWrapper
  items={products}
  searchableFields={['name', 'code', 'category']}
  placeholder="Buscar produtos..."
  renderList={(results) => (
    <ProductTable products={results} />
  )}
/>
```

## Performance Optimization

### Debounce
- **Delay:** 300ms
- **Propósito:** Evitar re-renders excessivos enquanto usuário digita
- **Benefício:** Até 10x menos processamento com 1000+ items

### useMemo
- Filtragem otimizada é memoizada
- Só recalcula quando `items`, `debouncedTerm` ou `searchableFields` mudam
- Melhora performance em buscas repetidas

### Case-Insensitive
- Busca ignora maiúsculas/minúsculas
- Trim automático de espaços

## Integração em Páginas

### Exemplo 1: Reservas (Completo)
```javascript
import { useSearch } from '@/components/hooks/useSearch';
import SearchBar from '@/components/search/SearchBar';

// Inside component
const { searchTerm, handleSearch, results: searchResults } = useSearch(
  reservas,
  ['codigo_completo', 'cliente', 'modelo', 'codigo_produto', 'letra_produto']
);

// Use searchResults instead of reservas
const filteredReservas = useMemo(() => {
  let result = searchTerm ? searchResults : [...reservas];
  // ... apply other filters
}, [searchTerm, searchResults, ...]);

// In JSX
<SearchBar
  searchTerm={searchTerm}
  onSearchChange={handleSearch}
  placeholder="Buscar por código, cliente, modelo..."
  resultCount={filteredReservas.length}
  showResultCount={searchTerm !== ''}
/>
```

### Exemplo 2: Produtos (Simples)
```javascript
<SearchableListWrapper
  items={products}
  searchableFields={['nome', 'codigo_produto', 'categoria']}
  placeholder="Buscar produtos..."
  renderList={(results) => (
    <ProductsTable products={results} />
  )}
/>
```

### Exemplo 3: Baixas (Com filtros avançados)
```javascript
const { searchTerm, handleSearch, results: searchResults } = useSearch(
  baixas,
  ['codigo_lido', 'operador', 'local', 'local_destino']
);

const filteredBaixas = useMemo(() => {
  let result = searchTerm ? searchResults : [...baixas];
  // Apply date filters, status filters, etc
  return result;
}, [searchTerm, searchResults, filters]);
```

## Campos Pesquisáveis Recomendados

### ReservaLote
- `codigo_completo` - Código da reserva (ex: A26LM)
- `cliente` - Nome do cliente
- `modelo` - Modelo do hidrómetro
- `codigo_produto` - Código técnico
- `letra_produto` - Letra do produto

### BaixaLote
- `codigo_lido` - Código lido por coleta
- `operador` - Nome do operador
- `local` - Local de origem
- `local_destino` - Local de destino

### MovimentacaoEstoque
- `celula` - Célula de produção
- `operador` - Nome do operador
- `observacao` - Observações

### Produto
- `nome` - Nome do produto
- `codigo_produto` - Código técnico
- `modelo` - Modelo
- `categoria` - Categoria

## Dicas e Boas Práticas

1. **Use campos que users realmente buscam**
   - Código, cliente, operador são os mais comuns

2. **Teste performance com 1000+ items**
   - Debounce deve estar em 300ms+
   - useMemo é essencial

3. **Considere combinação com filtros avançados**
   - Busca global (rápida)
   - Filtros específicos (precisão)
   - Combinação é muito poderosa

4. **Mobile-first**
   - SearchBar é responsive
   - Considerar teclado virtual

5. **Acessibilidade**
   - Componentes com proper ARIA labels
   - Keyboard navigation suportado

## Troubleshooting

**Problema:** Busca muito lenta
- ✅ Verificar delay do debounce (aumentar para 500ms)
- ✅ Verificar quantidade de fields pesquisáveis (menos é melhor)
- ✅ Usar useMemo ao aplicar filtros

**Problema:** Resultados incorretos
- ✅ Verificar nomes dos campos (case-sensitive!)
- ✅ Verificar se field realmente existe no item
- ✅ Adicionar console.log(item) para debug

**Problema:** SearchBar não aparece
- ✅ Verificar imports
- ✅ Verificar className/styling
- ✅ Verificar se SearchBar está dentro return()

## Próximos Passos

- [ ] Adicionar busca fuzzy (tolerância a typos)
- [ ] Salvar histórico de buscas
- [ ] Busca com auto-complete
- [ ] Exportar resultados de busca