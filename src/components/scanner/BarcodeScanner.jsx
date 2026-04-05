import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, Zap, CheckCircle2, AlertCircle, Loader2, ScanLine } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function BarcodeScanner({ onScan, onClose, placeholder = "Aponte a câmera para o código" }) {
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, scanning, success, error
  const [lastCode, setLastCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const audioContextRef = useRef(null);

  // Criar contexto de áudio
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window['webkitAudioContext'])();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Tocar som de sucesso
  const playSuccessSound = () => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);

    // Vibração
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }
  };

  // Tocar som de erro
  const playErrorSound = () => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(400, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.25);

    // Vibração
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  // Tocar som de scan
  const playScanSound = () => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 600;
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  };

  const startScanning = async () => {
    try {
      setScanning(true);
      setStatus('scanning');
      setErrorMsg('');
      
      html5QrCodeRef.current = new Html5Qrcode("barcode-scanner");
      
      const config = { 
        fps: 10,
        qrbox: { width: 300, height: 150 },
        aspectRatio: 1.777778
      };

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          playScanSound();
          setLastCode(decodedText);
          setStatus('success');
          playSuccessSound();
          
          // Chamar callback após pequeno delay para mostrar feedback
          setTimeout(() => {
            onScan(decodedText);
            stopScanning();
          }, 800);
        },
        (errorMessage) => {
          // Ignorar erros de scan contínuo
        }
      );
    } catch (error) {
      console.error('Erro ao iniciar scanner:', error);
      setStatus('error');
      setErrorMsg(error.message || 'Não foi possível acessar a câmera');
      playErrorSound();
      setScanning(false);
    }
  };

  const stopScanning = async () => {
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    } catch (error) {
      console.error('Erro ao parar scanner:', error);
    }
    setScanning(false);
    setStatus('idle');
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <Card className="w-full max-w-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Scanner de Código</h3>
              <p className="text-xs text-slate-300">{placeholder}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              stopScanning();
              onClose();
            }}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scanner Area */}
        <div className="p-6 space-y-4">
          {/* Status Feedback */}
          <AnimatePresence mode="wait">
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-emerald-50 border-2 border-emerald-500 rounded-lg p-4 flex items-center gap-3"
              >
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-emerald-900">Código Lido com Sucesso!</p>
                  <p className="text-sm text-emerald-700 font-mono mt-1">{lastCode}</p>
                </div>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-red-50 border-2 border-red-500 rounded-lg p-4 flex items-center gap-3"
              >
                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-red-900">Erro ao Acessar Câmera</p>
                  <p className="text-sm text-red-700 mt-1">{errorMsg}</p>
                </div>
              </motion.div>
            )}

            {status === 'scanning' && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-blue-50 border-2 border-blue-500 rounded-lg p-4 flex items-center gap-3"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <Loader2 className="w-7 h-7 text-white animate-spin" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-blue-900">Escaneando...</p>
                  <p className="text-sm text-blue-700">Posicione o código dentro do quadro</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scanner View */}
          <div className="relative rounded-xl overflow-hidden bg-slate-900">
            <div 
              id="barcode-scanner" 
              className={cn(
                "w-full aspect-video",
                !scanning && "hidden"
              )}
            />
            
            {!scanning && status === 'idle' && (
              <div className="w-full aspect-video flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6"
                >
                  <ScanLine className="w-12 h-12" />
                </motion.div>
                <p className="text-lg font-semibold mb-2">Pronto para Escanear</p>
                <p className="text-sm text-slate-400">Clique no botão abaixo para iniciar</p>
              </div>
            )}

            {scanning && (
              <div className="absolute inset-0 pointer-events-none">
                <motion.div
                  animate={{ y: [0, 300, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                  style={{ top: '50%' }}
                />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            {!scanning ? (
              <Button
                onClick={startScanning}
                className="flex-1 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white h-12"
              >
                <Camera className="w-5 h-5 mr-2" />
                Iniciar Scanner
              </Button>
            ) : (
              <Button
                onClick={stopScanning}
                variant="outline"
                className="flex-1 h-12 border-2"
              >
                <X className="w-5 h-5 mr-2" />
                Parar Scanner
              </Button>
            )}
          </div>

          {/* Tips */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Dicas para Melhor Leitura:
            </p>
            <ul className="text-xs text-slate-600 space-y-1 ml-6 list-disc">
              <li>Mantenha o código bem iluminado</li>
              <li>Evite reflexos e sombras</li>
              <li>Mantenha a câmera estável</li>
              <li>Posicione o código centralizado no quadro</li>
            </ul>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}