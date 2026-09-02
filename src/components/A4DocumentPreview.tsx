import React from 'react';
import { ContratoData, DocumentoConfig } from '../types';

interface A4DocumentPreviewProps {
  contrato: ContratoData;
  config?: DocumentoConfig;
}

export const A4DocumentPreview: React.FC<A4DocumentPreviewProps> = ({ contrato, config }) => {
  const content = contrato.conteudoFinal || '';
  const lines = content.split('\n');

  return (
    <div className="w-full overflow-x-auto flex justify-center py-6 bg-zinc-200 dark:bg-zinc-950 rounded-xl">
      {/* Visual A4 Paper Container */}
      <div
        style={{
          width: '210mm',
          minHeight: '297mm',
          paddingTop: `${config?.margensMm?.topo || 20}mm`,
          paddingBottom: `${config?.margensMm?.baixo || 20}mm`,
          paddingLeft: `${config?.margensMm?.esquerda || 20}mm`,
          paddingRight: `${config?.margensMm?.direita || 20}mm`,
          fontFamily: config?.fonte || 'Arial, sans-serif',
          fontSize: `${config?.tamanhoFonte || 11}pt`,
          lineHeight: config?.espacamentoLinhas || 1.25,
          textAlign: config?.alinhamento === 'esquerda' ? 'left' : 'justify'
        }}
        className="bg-white text-zinc-900 shadow-2xl border border-zinc-300 dark:border-zinc-800 relative flex flex-col justify-between"
      >
        <div>
          {/* Header */}
          {config?.exibirCabecalho && config.cabecalhoTexto && (
            <div className="text-[9pt] text-zinc-400 text-center border-b border-zinc-200 pb-2 mb-6 uppercase tracking-wider">
              {config.cabecalhoTexto}
            </div>
          )}

          {/* Title */}
          <h1 className="text-center font-bold text-base mb-6 tracking-wide uppercase">
            {contrato.titulo}
          </h1>

          {/* Document Content */}
          <div className="space-y-3 whitespace-pre-wrap">
            {lines.map((line, idx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={idx} className="h-2" />;

              const isClauseHeading =
                trimmed.startsWith('CLÁUSULA') ||
                trimmed.startsWith('CONTRATO') ||
                trimmed.startsWith('IDENTIFICAÇÃO');

              if (isClauseHeading) {
                return (
                  <h2 key={idx} className="font-bold text-xs uppercase pt-2 text-zinc-900">
                    {trimmed}
                  </h2>
                );
              }

              return (
                <p key={idx} className="text-xs text-zinc-800 leading-relaxed">
                  {trimmed}
                </p>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        {config?.exibirRodape && (
          <div className="mt-12 pt-3 border-t border-zinc-200 flex justify-between text-[8pt] text-zinc-400">
            <span>{config.rodapeTexto || 'DOCFY - Sistema de Gestão de Contratos'}</span>
            <span>Página 1 de 1</span>
          </div>
        )}
      </div>
    </div>
  );
};
