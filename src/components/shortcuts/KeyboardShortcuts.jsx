import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  FileText, 
  Factory, 
  Package,
  AlertTriangle,
  Search,
  CalendarClock,
  Keyboard
} from 'lucide-react';

const shortcuts = [
  { key: 'Ctrl+K / ⌘K', description: 'Abrir busca global', icon: Search, action: 'search' },
  { key: '?', description: 'Ver atalhos de teclado', icon: Keyboard, action: null },
  { key: 'g d', description: 'Ir para Dashboard', icon: LayoutDashboard, page: 'Dashboard' },
  { key: 'g r', description: 'Ir para Reservas', icon: FileText, page: 'Reservas' },
  { key: 'g p', description: 'Ir para Produção', icon: Factory, page: 'Producao' },
  { key: 'g b', description: 'Ir para Baixas', icon: Package, page: 'Baixas' },
  { key: 'g a', description: 'Ir para Alertas', icon: AlertTriangle, page: 'Alertas' },
  { key: 'g e', description: 'Ir para Agendamento', icon: CalendarClock, page: 'Agendamento' },
  { key: 'n', description: 'Nova reserva (na página de Reservas)', icon: FileText, action: 'new-reservation' },
];

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const [sequenceBuffer, setSequenceBuffer] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignorar se estiver em um input, textarea, select ou qualquer elemento editável
      const target = e.target;
      const tagName = target.tagName?.toUpperCase();
      if (
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        target.isContentEditable ||
        target.contentEditable === 'true' ||
        target.closest('[role="textbox"]') ||
        target.closest('[contenteditable]') ||
        target.closest('input') ||
        target.closest('textarea')
      ) {
        return;
      }

      // Mostrar atalhos com '?'
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setOpen(true);
        return;
      }

      // Sequências com 'g' (go)
      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        setSequenceBuffer('g');
        setTimeout(() => setSequenceBuffer(''), 1000);
        return;
      }

      // Completar sequência
      if (sequenceBuffer === 'g') {
        const shortcut = shortcuts.find(s => s.key === `g ${e.key}` && s.page);
        if (shortcut) {
          e.preventDefault();
          navigate(createPageUrl(shortcut.page));
          setSequenceBuffer('');
        }
      }

      // ESC para fechar modal
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, sequenceBuffer, open]);

  // Expor função global para abrir o modal
  useEffect(() => {
    window.openShortcutsModal = () => setOpen(true);
    return () => delete window.openShortcutsModal;
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-labelledby="shortcuts-title">
        <DialogHeader>
          <DialogTitle id="shortcuts-title" className="text-2xl font-bold flex items-center gap-2">
            <Keyboard className="w-6 h-6" />
            Atalhos de Teclado
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              💡 <strong>Dica:</strong> Use estes atalhos para navegar rapidamente pelo sistema e aumentar sua produtividade.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Navegação</h3>
            <div className="space-y-2">
              {shortcuts.map((shortcut, index) => {
                const Icon = shortcut.icon;
                return (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white border border-slate-300 rounded-md flex items-center justify-center">
                        <Icon className="w-4 h-4 text-slate-600" />
                      </div>
                      <span className="text-slate-700">{shortcut.description}</span>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs px-3 py-1 bg-white">
                      {shortcut.key}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <h4 className="font-semibold text-slate-700 mb-2 text-sm">Como usar sequências:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-600">
              <li>Pressione a primeira tecla (ex: <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs">g</kbd>)</li>
              <li>Em seguida, pressione a segunda tecla (ex: <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-xs">d</kbd>)</li>
              <li>Você será redirecionado imediatamente!</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}