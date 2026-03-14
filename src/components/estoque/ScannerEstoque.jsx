import React, { useState } from 'react';
import { Camera, Keyboard, Search, Package, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import BarcodeScanner from '@/components/scanner/BarcodeScanner';

export default function ScannerEstoque({ produtos, onProdutoEncontrado, open, onOpenChange }) {
  const [showCamera, setShowCamera] = useState(false);
  const [codigoManual, setCodigoManual] = useState('');
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  const buscarProduto = (codigo) => {
    setErro('');
    setResultado(null);

    if (!codigo || !codigo.trim()) {
      setErro('Digite ou escaneie um código');
      return;
    }

    const codigoLimpo = codigo.trim().toUpperCase();

    // Buscar por: letra+sufixo, código_produto, ou prefixo_padrao
    const produto = produtos.find(p => {
      const letraSufixo = `${p.letra_produto || ''}${p.sufixo || ''}`.toUpperCase();
      const codigoProd = (p.codigo_produto || '').toUpperCase();
      const prefixo = (p.prefixo_padrao || '').toUpperCase();
      
      return letraSufixo === codigoLimpo || 
             codigoProd === codigoLimpo || 
             prefixo === codigoLimpo ||
             codigoLimpo.includes(letraSufixo) ||
             codigoLimpo.includes(codigoProd);
    });

    if (produto) {
      setResultado(produto);
      if (onProdutoEncontrado) {
        onProdutoEncontrado(produto);
      }
    } else {
      setErro(`Nenhum produto encontrado para o código "${codigo}"`);
    }
  };

  const handleScan = (code) => {
    setShowCamera(false);
    setCodigoManual(code);
    buscarProduto(code);
  };

  const handleReset = () => {
    setCodigoManual('');
    setResultado(null);
    setErro('');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) handleReset(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Buscar Produto por Código
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="manual" className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual" className="gap-2">
                <Keyboard className="w-4 h-4" />
                Digitar Código
              </TabsTrigger>
              <TabsTrigger value="camera" className="gap-2">
                <Camera className="w-4 h-4" />
                Usar Câmera
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Código do Produto</Label>
                <div className="flex gap-2">
                  <Input
                    value={codigoManual}
                    onChange={(e) => setCodigoManual(e.target.value)}
                    placeholder="Ex: ALM, BLM, código do produto..."
                    onKeyDown={(e) => { if (e.key === 'Enter') buscarProduto(codigoManual); }}
                    autoFocus
                  />
                  <Button onClick={() => buscarProduto(codigoManual)}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Aceita: letra+sufixo (ALM), código técnico, ou prefixo do produto
                </p>
              </div>
            </TabsContent>

            <TabsContent value="camera" className="space-y-4 mt-4">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                  <Camera className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-sm text-slate-600">
                  Use a câmera do dispositivo para escanear o QR Code ou código de barras do produto.
                </p>
                <Button 
                  onClick={() => setShowCamera(true)} 
                  className="bg-slate-900 hover:bg-slate-800"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Abrir Câmera
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Resultado */}
          {resultado && (
            <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-600 text-white rounded-lg flex items-center justify-center font-bold">
                    {resultado.letra_produto}
                  </div>
                  <div>
                    <div className="font-semibold text-emerald-900">
                      {resultado.letra_produto}{resultado.sufixo}
                    </div>
                    <div className="text-sm text-emerald-700">{resultado.descricao || resultado.modelo || ''}</div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleReset}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                <div className="bg-white rounded p-2">
                  <span className="text-slate-500">Estoque Atual</span>
                  <div className="font-bold text-lg">{resultado.estoque_atual || 0}</div>
                </div>
                <div className="bg-white rounded p-2">
                  <span className="text-slate-500">Estoque Mínimo</span>
                  <div className="font-bold text-lg">{resultado.estoque_minimo || 0}</div>
                </div>
                {resultado.categoria && (
                  <div className="bg-white rounded p-2">
                    <span className="text-slate-500">Categoria</span>
                    <div className="font-medium">{resultado.categoria}</div>
                  </div>
                )}
                {resultado.codigo_produto && (
                  <div className="bg-white rounded p-2">
                    <span className="text-slate-500">Código</span>
                    <div className="font-medium">{resultado.codigo_produto}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Erro */}
          {erro && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {erro}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Camera Scanner overlay */}
      {showCamera && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowCamera(false)}
          placeholder="Aponte para o QR Code ou código de barras do produto"
        />
      )}
    </>
  );
}