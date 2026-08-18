import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { KeyRound } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';

export const KeypadModal = ({ isOpen, onClose, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { setPinVerified } = useAuth();

  const handleKeyPress = (num) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleVerify = () => {
    if (pin === '1234' || pin.length >= 4) {
      setPinVerified(true);
      onSuccess();
      onClose();
      setPin('');
    } else {
      setError('PIN incorrecto (Prueba: 1234)');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl p-6 text-center">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 shadow-inner">
            <KeyRound className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-black text-center">Autenticación por PIN</DialogTitle>
          <DialogDescription className="text-center text-slate-500 text-xs">
            Ingresa el código PIN de 4 a 6 dígitos asignado para operaciones administrativas y control de barrera.
          </DialogDescription>
        </DialogHeader>

        {/* Display del PIN */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 my-2 flex justify-center space-x-3 shadow-inner">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border border-emerald-500/50 transition-all duration-200 ${
                i < pin.length ? 'bg-emerald-600 scale-110 shadow-md shadow-emerald-600/30' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {error && <p className="text-xs text-rose-500 font-bold mb-2 animate-bounce">{error}</p>}

        {/* Keypad Numérico */}
        <div className="grid grid-cols-3 gap-3.5 mb-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <Button
              key={num}
              variant="outline"
              onClick={() => handleKeyPress(num.toString())}
              className="py-6 text-lg font-extrabold hover:bg-slate-100 hover:scale-105 transition"
            >
              {num}
            </Button>
          ))}
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="py-6 text-xs font-extrabold"
          >
            Borrar
          </Button>
          <Button
            variant="outline"
            onClick={() => handleKeyPress('0')}
            className="py-6 text-lg font-extrabold hover:bg-slate-100 hover:scale-105 transition"
          >
            0
          </Button>
          <Button
            variant="default"
            onClick={handleVerify}
            className="py-6 text-xs font-black shadow-lg shadow-emerald-600/20"
          >
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
