/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Copy, Check, FolderSync, Database, ShieldAlert, BookOpen } from 'lucide-react';
import { proposalFolderStructure, iacCascadingSchema } from '../utils/dynamicOptions';

export default function DocTabs() {
  const [activeTab, setActiveTab] = useState<'architecture' | 'state' | 'sre'>('architecture');
  const [copied, setCopied] = useState(false);

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentTabCode = activeTab === 'architecture' 
    ? proposalFolderStructure 
    : JSON.stringify(iacCascadingSchema, null, 2);

  return (
    <div className="bg-[#0D1117] border border-[#2D333B] rounded-xl overflow-hidden" id="doc-tabs-panel">
      {/* Tab select headers */}
      <div className="flex border-b border-[#2D333B] bg-[#161B22] px-2">
        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'architecture'
              ? 'border-blue-500 text-blue-400 bg-[#0B0E14]'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
          id="tab-architecture"
        >
          <FolderSync className="w-3.5 h-3.5 text-blue-400" />
          Estrutura do Projeto
        </button>
        <button
          onClick={() => setActiveTab('state')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'state'
              ? 'border-blue-500 text-blue-400 bg-[#0B0E14]'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
          id="tab-state"
        >
          <Database className="w-3.5 h-3.5 text-blue-400" />
          Estado & Cascata JSON
        </button>
        <button
          onClick={() => setActiveTab('sre')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
            activeTab === 'sre'
              ? 'border-blue-500 text-blue-400 bg-[#0B0E14]'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
          id="tab-sre"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
          Manual SRE & Práticas
        </button>
      </div>

      <div className="p-4" id="doc-content-pane">
        {activeTab === 'sre' ? (
          <div className="space-y-4 text-xs text-zinc-300 leading-relaxed" id="sre-guide-pane">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-950/20 border border-blue-900/30 text-blue-300">
              <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
              <div>
                <strong className="block text-sm mb-0.5 font-bold">Filosofia de Código Próprio e Seguro</strong>
                Toda a geração de infraestrutura deste sistema segue princípios arquiteturais robustos (SRE Core Rules).
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <h5 className="font-semibold text-zinc-100 flex items-center gap-1.5 border-b border-[#2D333B] pb-1 uppercase tracking-wider text-[11px] italic text-blue-400">
                  🛡️ Segurança e Criptografia
                </h5>
                <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                  <li><strong className="text-zinc-200">KMS/Server-side Encryption:</strong> S3 buckets e bancos de dados RDS são criados com criptografia nativa estrita.</li>
                  <li><strong className="text-zinc-200">Acesso Público Bloqueado:</strong> S3 Bucket public-access-block ativado por padrão para instâncias definidas como "private".</li>
                </ul>
              </div>

              <div className="space-y-2.5">
                <h5 className="font-semibold text-zinc-100 flex items-center gap-1.5 border-b border-[#2D333B] pb-1 uppercase tracking-wider text-[11px] italic text-blue-400">
                  🌐 Práticas de Rede e SRE
                </h5>
                <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                  <li><strong className="text-zinc-200">Segmentação CIDR:</strong> Subnets públicas e privadas isoladas por meio de funções `cidrsubnet` nativas.</li>
                  <li><strong className="text-zinc-200">DNS habilitado:</strong> Namespaces limpos facilitando a configuração de registros do Route53 ou correspondentes.</li>
                </ul>
              </div>
            </div>

            <div className="pt-3 bg-[#0B0E14] p-3 rounded border border-[#2D333B]">
              <span className="font-mono text-[10px] text-zinc-500 block uppercase tracking-wider mb-1.5">Checklist de Aprovação (SRE Standards)</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="text-blue-500 font-bold">✔</span> Sem Secrets Hardcoded
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="text-blue-400 font-bold">✔</span> GP3 como Volume Padrão
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <span className="text-blue-400 font-bold">✔</span> IAM Roles com Mínimos Direitos
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute right-2 top-2 z-10">
              <button
                onClick={() => handleCopyText(currentTabCode)}
                className="flex items-center gap-1 bg-[#161B22] hover:bg-zinc-800 text-zinc-350 hover:text-white px-2.5 py-1.5 rounded text-xs transition border border-[#2D333B]"
                id="copy-doc-code-button"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-blue-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            <pre className="text-[11px] font-mono leading-relaxed overflow-x-auto text-zinc-300 bg-[#010409] p-4 rounded-lg border border-[#2D333B] max-h-96">
              <code>{currentTabCode}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
