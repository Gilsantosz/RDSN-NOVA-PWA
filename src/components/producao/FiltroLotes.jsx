import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Filter, X } from 'lucide-react';

export default function FiltroLotes({ reservas = [], onFiltrar, onLimpar, filtroAtivo }) {
  const [modelo, setModelo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [cliente, setCliente] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);

  // Extrair opções únicas do histórico
  const sugestoes = useMemo(() => {
    return {
      modelos: [...new Set(reservas.map(r => r.modelo).filter(Boolean))].sort(),
      codigos: [...new Set(reservas.map(r => r.codigo_produto).filter(Boolean))].sort(),
      clientes: [...new Set(reservas.map(r => r.cliente).filter(Boolean))].sort(),
    };
  }, [reservas]);

  // Filtrar sugestões conforme digita
  const modelosFiltrados = modelo ? sugestoes.modelos.filter(m => m.toLowerCase().includes(modelo.toLowerCase())) : sugestoes.modelos;
  const codigosFiltrados = codigo ? sugestoes.codigos.filter(c => c.toLowerCase().includes(codigo.toLowerCase())) : sugestoes.codigos;
  const clientesFiltrados = cliente ? sugestoes.clientes.filter(c => c.toLowerCase().includes(cliente.toLowerCase())) : sugestoes.clientes;

  const handleFiltrar = () => {
    onFiltrar({ modelo, codigo, cliente });
  };

  const handleLimpar = () => {
    setModelo('');
    setCodigo('');
    setCliente('');
    setOpenDropdown(null);
    onLimpar();
  };

  const CampoComSugestoes = ({ value, onChange, sugestoes, placeholder, dropdownId }) => (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpenDropdown(value ? dropdownId : null);
        }}
        onFocus={() => setOpenDropdown(dropdownId)}
        onBlur={() => setTimeout(() => setOpenDropdown(null), 150)}
        onKeyPress={(e) => {
          if (e.key === 'Enter') handleFiltrar();
        }}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
      />
      {openDropdown === dropdownId && sugestoes.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto mt-1">
          {sugestoes.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                onChange(item);
                setOpenDropdown(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-100 text-sm text-slate-700 border-b border-slate-100 last:border-b-0"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <CampoComSugestoes
          value={modelo}
          onChange={setModelo}
          sugestoes={modelosFiltrados}
          placeholder="Filtrar por modelo..."
          dropdownId="modelo"
        />
        <CampoComSugestoes
          value={codigo}
          onChange={setCodigo}
          sugestoes={codigosFiltrados}
          placeholder="Filtrar por código..."
          dropdownId="codigo"
        />
        <CampoComSugestoes
          value={cliente}
          onChange={setCliente}
          sugestoes={clientesFiltrados}
          placeholder="Filtrar por cliente..."
          dropdownId="cliente"
        />
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleFiltrar}
          className="bg-slate-900 hover:bg-slate-800"
          size="sm"
        >
          <Filter className="w-3 h-3 mr-1" />
          Filtrar
        </Button>
        {filtroAtivo && (
          <Button
            onClick={handleLimpar}
            variant="outline"
            size="sm"
            className="text-slate-600 border-slate-300 hover:bg-slate-100"
          >
            <X className="w-3 h-3 mr-1" />
            Limpar Filtro
          </Button>
        )}
      </div>
    </div>
  );
}