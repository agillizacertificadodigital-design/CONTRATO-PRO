import React, { useState } from 'react';
import { FileText, Lock, Mail, ArrowRight, Loader2, UserCheck } from 'lucide-react';
import { loginEmailPassword, registerEmailPassword, loginAnonymous } from '../services/authService';

export const LoginPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg('');

    try {
      if (isRegister) {
        await registerEmailPassword(email, password, email.split('@')[0]);
      } else {
        await loginEmailPassword(email, password);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar autenticação.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoadingGuest(true);
    setErrorMsg('');
    try {
      await loginAnonymous();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao entrar como convidado.');
    } finally {
      setLoadingGuest(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-mono">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-5">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 bg-blue-950 text-blue-400 rounded-lg flex items-center justify-center mx-auto border border-blue-800/80">
            <FileText className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-black text-slate-100 tracking-tight">DOCFY PRO</h1>
          <p className="text-xs text-slate-400">
            {isRegister ? 'Criar uma nova conta de acesso' : 'Acesse com seu e-mail ou use o modo demonstração'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/80 border border-red-800/80 rounded-lg text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1">E-mail</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || loadingGuest}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-md flex items-center justify-center gap-2 border border-blue-400/30 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isRegister ? 'Cadastrar Conta' : 'Entrar no Sistema'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[10px] text-slate-500 uppercase tracking-wider">ou</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        <button
          type="button"
          onClick={handleGuestLogin}
          disabled={loading || loadingGuest}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700/80 text-slate-200 font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 border border-slate-700 transition-colors"
        >
          {loadingGuest ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4 text-emerald-400" />}
          Acessar como Convidado (Demonstração)
        </button>

        <div className="text-center pt-2 border-t border-slate-800">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg('');
            }}
            className="text-xs text-blue-400 font-semibold hover:underline"
          >
            {isRegister ? 'Já tem conta? Faça login' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
};

