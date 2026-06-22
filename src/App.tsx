/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Download,
  Copy,
  Check,
  Sparkles,
  Sliders,
  Settings,
  Code,
  Network,
  Cpu,
  Database,
  HardDrive,
  Info,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

import { GeneratorState, IaCTool, CloudProvider, Environment, Tag } from './types';
import { generateTerraform, generateCloudFormation } from './utils/generators';
import { iacCascadingSchema } from './utils/dynamicOptions';
import TagManager from './components/TagManager';
import DocTabs from './components/DocTabs';

const INITIAL_STATE: GeneratorState = {
  tool: 'terraform',
  provider: 'aws',
  environment: 'dev',
  projectPrefix: 'enterprise',
  tags: [
    { key: 'Owner', value: 'SRE-Team' },
    { key: 'Department', value: 'Engineering' }
  ],
  resources: {
    vpc: {
      enabled: true,
      cidr: '10.0.0.0/16',
      subnetsCount: 2,
      enableDns: true
    },
    compute: {
      enabled: true,
      instanceType: 't3.micro',
      os: 'linux',
      allowSSH: true,
      allowHTTP: true
    },
    storage: {
      enabled: false,
      bucketType: 'private',
      versioning: true,
      encryption: true
    },
    database: {
      enabled: false,
      engine: 'postgres',
      allocatedStorage: 20,
      multiAz: false
    }
  }
};

export default function App() {
  const [state, setState] = useState<GeneratorState>(INITIAL_STATE);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'techDoc'>('editor');

  // AI Prompt refinement states
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiResult, setAiResult] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>('');
  const [hasServerKey, setHasServerKey] = useState<boolean>(false);

  // Check if server has Gemini API Key initialized
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.hasKey) {
          setHasServerKey(true);
        }
      })
      .catch((err) => console.log('Could not load api health: ', err));
  }, []);

  // Whenever options change, regenerate the client-side code immediately
  useEffect(() => {
    let code = '';
    if (state.tool === 'terraform') {
      code = generateTerraform(state);
    } else {
      code = generateCloudFormation(state);
    }
    setGeneratedCode(code);
  }, [state]);

  // Adjust Cascading selections based on primary choices
  const handleToolChange = (tool: IaCTool) => {
    setState((prev) => {
      // Create copy of state
      const newState = { ...prev, tool };

      // CloudFormation ONLY supports AWS on this app. Lock provider to AWS
      if (tool === 'cloudformation') {
        newState.provider = 'aws';
      }

      // Update basic config based on default selection configurations
      const toolSchema = iacCascadingSchema.find((t) => t.tool === tool);
      const providerSchema = toolSchema?.providers.find((p) => p.id === newState.provider);

      if (providerSchema) {
        // Enforce default configurations matched for this specific provider/tool
        providerSchema.resources.forEach((res) => {
          if (res.supported && prev.resources[res.id]) {
            newState.resources[res.id] = {
              ...prev.resources[res.id],
              ...res.defaultConfig
            };
          }
        });
      }

      return newState;
    });
  };

  const handleProviderChange = (provider: CloudProvider) => {
    if (state.tool === 'cloudformation' && provider !== 'aws') {
      // CloudFormation cannot use non-AWS providers
      return;
    }

    setState((prev) => {
      const newState = { ...prev, provider };
      const toolSchema = iacCascadingSchema.find((t) => t.tool === prev.tool);
      const providerSchema = toolSchema?.providers.find((p) => p.id === provider);

      if (providerSchema) {
        providerSchema.resources.forEach((res) => {
          if (res.supported && prev.resources[res.id]) {
            newState.resources[res.id] = {
              ...prev.resources[res.id],
              ...res.defaultConfig,
              enabled: prev.resources[res.id].enabled // Keep enabled state
            };
          }
        });
      }
      return newState;
    });
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Triggering browser download with proper file types and names
  const handleDownloadCode = () => {
    const filename = state.tool === 'terraform' ? 'main.tf' : 'template.yaml';
    const blob = new Blob([generatedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Submit refinement instructions to SRE AI engine
  const handleAIRefinement = async () => {
    if (!aiPrompt.trim()) return;

    setAiLoading(true);
    setAiError('');
    setAiResult('');

    try {
      const response = await fetch('/api/refine-iac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: generatedCode,
          tool: state.tool,
          provider: state.provider,
          prompt: aiPrompt
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao conectar com o serviço de SRE.');
      }

      setAiResult(data.result);
    } catch (err: any) {
      setAiError(err.message || 'Houve um erro no processamento da IA.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-[#E0E2E7] font-sans flex flex-col justify-between" id="app-root">
      {/* Header Navigation */}
      <header className="h-14 border-b border-[#2D333B] px-6 flex items-center justify-between bg-[#161B22] sticky top-0 z-40" id="main-header">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white font-bold">C</span>
          </div>
          <h1 className="text-md font-semibold tracking-tight text-[#E0E2E7]">
            Cloudsmith <span className="text-blue-400 text-xs font-mono ml-2">v0.0.1</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2 text-xs font-semibold text-slate-400 bg-[#0D1117] p-1 border border-[#2D333B] rounded">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                activeTab === 'editor'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              id="action-view-editor"
            >
              Design
            </button>
            <button
              onClick={() => setActiveTab('techDoc')}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                activeTab === 'techDoc'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              id="action-view-docs"
            >
              Manual SRE & Estrutura
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'techDoc' ? (
          <div className="space-y-6" id="tech-doc-view">
            <div className="p-5 bg-[#0D1117] rounded-xl border border-[#2D333B] space-y-2">
              <h3 className="text-md font-semibold text-white">Especificações recomendadas de Arquitetura</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                O Gerador de IaC Pro foi estruturado para resolver o gerenciamento dinâmico em cascata no lado do cliente,
                garantindo que qualquer alteração de ferramenta de IaC ou provedor seja atualizada de forma segura.
                Veja abaixo a proposta de arquitetura de pastas sugerida e as estruturas de mapeamento recomendadas.
              </p>
            </div>
            <DocTabs />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="design-canvas-view">
            {/* Left side: Controls and Form - takes 5 cols */}
            <div className="lg:col-span-5 space-y-6">
              {/* Card 1: Tool & Provider selection */}
              <div className="bg-[#0D1117] border border-[#2D333B] p-5 rounded-xl space-y-5" id="step-tool-provider">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3 block italic">01. Core Tooling</label>
                  {/* IaC Tool Selector */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleToolChange('terraform')}
                      className={`flex flex-col items-center justify-center p-3 border-2 rounded-lg transition-all ${
                        state.tool === 'terraform'
                          ? 'border-blue-500 bg-blue-500/10 text-white font-bold'
                          : 'border-[#2D333B] bg-transparent text-slate-400 hover:bg-[#1C2128] opacity-60'
                      }`}
                      id="tool-terraform-btn"
                    >
                      <div className="w-5 h-5 bg-blue-500 mb-2 rounded-sm flex items-center justify-center font-mono text-[9px] text-white">TF</div>
                      <span className="text-xs font-semibold">Terraform</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToolChange('cloudformation')}
                      className={`flex flex-col items-center justify-center p-3 border-2 rounded-lg transition-all ${
                        state.tool === 'cloudformation'
                          ? 'border-blue-500 bg-blue-500/10 text-white font-bold'
                          : 'border-[#2D333B] bg-transparent text-slate-400 hover:bg-[#1C2128] opacity-60'
                      }`}
                      id="tool-cloudformation-btn"
                    >
                      <div className="w-5 h-5 bg-orange-500 mb-2 rounded-sm flex items-center justify-center font-mono text-[9px] text-white">CF</div>
                      <span className="text-xs font-semibold">CloudFormation</span>
                    </button>
                  </div>
                </div>

                {/* Cloud Provider Select (cascading) */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block italic">02. Cloud Provider</label>
                    {state.tool === 'cloudformation' && (
                      <span className="text-[9px] text-orange-400 flex items-center gap-1 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 font-mono">
                        AWS Obrigatório
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {(['aws', 'azure', 'gcp', 'oci'] as CloudProvider[]).map((prov) => {
                      const isLocked = state.tool === 'cloudformation' && prov !== 'aws';
                      const isSelected = state.provider === prov;
                      
                      const labelMap: Record<CloudProvider, string> = {
                        aws: 'Amazon Web Services',
                        azure: 'Microsoft Azure',
                        gcp: 'Google Cloud Platform',
                        oci: 'Oracle Cloud Infrastructure'
                      };

                      return (
                        <div
                          key={prov}
                          onClick={() => !isLocked && handleProviderChange(prov)}
                          className={`flex items-center justify-between p-3 border rounded-md cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-500/5 border-blue-500/30 text-white'
                              : isLocked
                              ? 'bg-[#161B22]/40 border-[#2D333B]/50 text-slate-600 cursor-not-allowed opacity-40 line-through'
                              : 'border-[#2D333B] text-slate-400 hover:bg-[#1C2128]'
                          }`}
                          id={`provider-btn-${prov}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-blue-500' : 'border-slate-600'
                            }`}>
                              {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                            </div>
                            <span className="text-sm">{labelMap[prov]}</span>
                          </div>
                          {isLocked && <span className="text-[9px] text-slate-650 font-mono">(LOCKED)</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Card 2: Resource configuration state */}
              <div className="bg-[#0D1117] border border-[#2D333B] p-5 rounded-xl space-y-5" id="step-resources">
                <div className="flex items-center justify-between border-b border-[#2D333B] pb-3">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold italic">02. Recurso Config</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] border border-green-500/20 uppercase font-mono">Pronto</span>
                </div>

                {/* Resource 1: VPC */}
                <div className={`border p-3 rounded-lg space-y-3 transition-colors ${
                  state.resources.vpc.enabled ? 'border-blue-500/40 bg-blue-500/5' : 'border-[#2D333B] bg-[#161B22]/40'
                }`} id="resource-opt-vpc">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <Network className="w-3.5 h-3.5 text-blue-400" />
                      <span>Rede / VPC</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.resources.vpc.enabled}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            resources: {
                              ...prev.resources,
                              vpc: { ...prev.resources.vpc, enabled: e.target.checked }
                            }
                          }))
                        }
                        className="sr-only peer"
                        id="checkbox-vpc-enabled"
                      />
                      <div className="w-8 h-4 bg-[#2D333B] rounded-full relative transition peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:bg-white select-none"></div>
                    </label>
                  </div>

                  {state.resources.vpc.enabled && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#2D333B]" id="vpc-inner-params">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1 uppercase tracking-wider">Bloco CIDR</label>
                        <input
                          type="text"
                          value={state.resources.vpc.cidr}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              resources: {
                                ...prev.resources,
                                vpc: { ...prev.resources.vpc, cidr: e.target.value }
                              }
                            }))
                          }
                          className="w-full text-xs px-2.5 py-1.5 bg-[#161B22] border border-[#2D333B] rounded text-[#E0E2E7] font-mono focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1 uppercase tracking-wider">Subnets Públicas</label>
                        <select
                          value={state.resources.vpc.subnetsCount}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              resources: {
                                ...prev.resources,
                                vpc: { ...prev.resources.vpc, subnetsCount: parseInt(e.target.value) }
                              }
                            }))
                          }
                          className="w-full text-xs px-2 py-1.5 bg-[#161B22] border border-[#2D333B] rounded text-[#E0E2E7] focus:border-blue-500 font-mono"
                        >
                          <option value={1}>1 Subnet</option>
                          <option value={2}>2 Subnets</option>
                          <option value={3}>3 Subnets</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resource 2: Compute */}
                <div className={`border p-3 rounded-lg space-y-3 transition-colors ${
                  state.resources.compute.enabled ? 'border-blue-500/40 bg-blue-500/5' : 'border-[#2D333B] bg-[#161B22]/40'
                }`} id="resource-opt-compute">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <Cpu className="w-3.5 h-3.5 text-blue-400" />
                      <span>Computação / VM</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.resources.compute.enabled}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            resources: {
                              ...prev.resources,
                              compute: { ...prev.resources.compute, enabled: e.target.checked }
                            }
                          }))
                        }
                        className="sr-only peer"
                        id="checkbox-compute-enabled"
                      />
                      <div className="w-8 h-4 bg-[#2D333B] rounded-full relative transition peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:bg-white select-none"></div>
                    </label>
                  </div>

                  {state.resources.compute.enabled && (
                    <div className="space-y-3 pt-2 border-t border-[#2D333B]" id="compute-inner-params">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1 uppercase tracking-wider">Tipo de Instância</label>
                          <input
                            type="text"
                            value={state.resources.compute.instanceType}
                            onChange={(e) =>
                              setState((prev) => ({
                                ...prev,
                                resources: {
                                  ...prev.resources,
                                  compute: { ...prev.resources.compute, instanceType: e.target.value }
                                }
                              }))
                            }
                            className="w-full text-xs px-2.5 py-1.5 bg-[#161B22] border border-[#2D333B] rounded text-[#E0E2E7] font-mono focus:border-blue-500"
                            placeholder="t3.micro"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1 uppercase tracking-wider">Sistema Operacional</label>
                          <select
                            value={state.resources.compute.os}
                            onChange={(e) =>
                              setState((prev) => ({
                                ...prev,
                                resources: {
                                  ...prev.resources,
                                  compute: { ...prev.resources.compute, os: e.target.value as 'linux' | 'windows' }
                                }
                              }))
                            }
                            className="w-full text-xs px-2 py-1.5 bg-[#161B22] border border-[#2D333B] rounded text-[#E0E2E7] focus:border-blue-500 font-mono"
                          >
                            <option value="linux">Linux Server</option>
                            <option value="windows">Windows Server</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-4 pt-1">
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={state.resources.compute.allowSSH}
                            onChange={(e) =>
                              setState((prev) => ({
                                ...prev,
                                resources: {
                                  ...prev.resources,
                                  compute: { ...prev.resources.compute, allowSSH: e.target.checked }
                                }
                              }))
                            }
                            className="rounded bg-[#161B22] border-[#2D333B] text-blue-500 focus:ring-0 w-3.5 h-3.5"
                          />
                          <span className="font-mono text-[10px]">SSH (Porta 22)</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={state.resources.compute.allowHTTP}
                            onChange={(e) =>
                              setState((prev) => ({
                                ...prev,
                                resources: {
                                  ...prev.resources,
                                  compute: { ...prev.resources.compute, allowHTTP: e.target.checked }
                                }
                              }))
                            }
                            className="rounded bg-[#161B22] border-[#2D333B] text-blue-500 focus:ring-0 w-3.5 h-3.5"
                          />
                          <span className="font-mono text-[10px]">Web (Porta 80/443)</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resource 3: Storage */}
                <div className={`border p-3 rounded-lg space-y-3 transition-colors ${
                  state.resources.storage.enabled ? 'border-blue-500/40 bg-blue-500/5' : 'border-[#2D333B] bg-[#161B22]/40'
                }`} id="resource-opt-storage">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                      <span>Armazenamento / Bucket</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.resources.storage.enabled}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            resources: {
                              ...prev.resources,
                              storage: { ...prev.resources.storage, enabled: e.target.checked }
                            }
                          }))
                        }
                        className="sr-only peer"
                        id="checkbox-storage-enabled"
                      />
                      <div className="w-8 h-4 bg-[#2D333B] rounded-full relative transition peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:bg-white select-none"></div>
                    </label>
                  </div>

                  {state.resources.storage.enabled && (
                    <div className="space-y-3 pt-2 border-t border-[#2D333B]" id="storage-inner-params">
                      <div>
                        <label className="text-[10px] text-slate-500 block mb-1 uppercase tracking-wider">Acesso do bucket</label>
                        <select
                          value={state.resources.storage.bucketType}
                          onChange={(e) =>
                            setState((prev) => ({
                              ...prev,
                              resources: {
                                ...prev.resources,
                                storage: { ...prev.resources.storage, bucketType: e.target.value }
                              }
                            }))
                          }
                          className="w-full text-xs px-2 py-1.5 bg-[#161B22] border border-[#2D333B] rounded text-[#E0E2E7] focus:border-blue-500 font-mono"
                        >
                          <option value="private">Privado (Recomendado - Bloqueado)</option>
                          <option value="public-read">Leitura Pública (Static Web)</option>
                        </select>
                      </div>

                      <div className="flex gap-4 pt-1">
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={state.resources.storage.versioning}
                            onChange={(e) =>
                              setState((prev) => ({
                                ...prev,
                                resources: {
                                  ...prev.resources,
                                  storage: { ...prev.resources.storage, versioning: e.target.checked }
                                }
                              }))
                            }
                            className="rounded bg-[#161B22] border-[#2D333B] text-blue-500 focus:ring-0 w-3.5 h-3.5"
                          />
                          <span className="font-mono text-[10px]">Versionamento</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={state.resources.storage.encryption}
                            onChange={(e) =>
                              setState((prev) => ({
                                ...prev,
                                resources: {
                                  ...prev.resources,
                                  storage: { ...prev.resources.storage, encryption: e.target.checked }
                                }
                              }))
                            }
                            className="rounded bg-[#161B22] border-[#2D333B] text-blue-500 focus:ring-0 w-3.5 h-3.5"
                          />
                          <span className="font-mono text-[10px]">Criptografia Ativa</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Resource 4: Database */}
                <div className={`border p-3 rounded-lg space-y-3 transition-colors ${
                  state.resources.database.enabled ? 'border-blue-500/40 bg-blue-500/5' : 'border-[#2D333B] bg-[#161B22]/40'
                }`} id="resource-opt-db">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <Database className="w-3.5 h-3.5 text-blue-400" />
                      <span>Banco de Dados / SQL</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.resources.database.enabled}
                        onChange={(e) =>
                          setState((prev) => ({
                            ...prev,
                            resources: {
                              ...prev.resources,
                              database: { ...prev.resources.database, enabled: e.target.checked }
                            }
                          }))
                        }
                        className="sr-only peer"
                        id="checkbox-db-enabled"
                      />
                      <div className="w-8 h-4 bg-[#2D333B] rounded-full relative transition peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 peer-checked:after:bg-white select-none"></div>
                    </label>
                  </div>

                  {state.resources.database.enabled && (
                    <div className="space-y-3 pt-2 border-t border-[#2D333B]" id="db-inner-params">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1 uppercase tracking-wider">Mecanismo SQL</label>
                          <select
                            value={state.resources.database.engine}
                            onChange={(e) =>
                              setState((prev) => ({
                                ...prev,
                                resources: {
                                  ...prev.resources,
                                  database: { ...prev.resources.database, engine: e.target.value as 'postgres' | 'mysql' }
                                }
                              }))
                            }
                            className="w-full text-xs px-2 py-1.5 bg-[#161B22] border border-[#2D333B] rounded text-[#E0E2E7] focus:border-blue-500 font-mono"
                          >
                            <option value="postgres">PostgreSQL</option>
                            <option value="mysql">MySQL Engine</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-1 uppercase tracking-wider">Armazenamento (GB)</label>
                          <input
                            type="number"
                            min={10}
                            max={100}
                            value={state.resources.database.allocatedStorage}
                            onChange={(e) =>
                              setState((prev) => ({
                                ...prev,
                                resources: {
                                  ...prev.resources,
                                  database: { ...prev.resources.database, allocatedStorage: parseInt(e.target.value) || 20 }
                                }
                              }))
                            }
                            className="w-full text-xs px-2.5 py-1.5 bg-[#161B22] border border-[#2D333B] rounded text-[#E0E2E7] font-mono focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={state.resources.database.multiAz}
                            onChange={(e) =>
                              setState((prev) => ({
                                ...prev,
                                resources: {
                                  ...prev.resources,
                                  database: { ...prev.resources.database, multiAz: e.target.checked }
                                }
                              }))
                            }
                            className="rounded bg-[#161B22] border-[#2D333B] text-blue-500 focus:ring-0 w-3.5 h-3.5"
                          />
                          <span className="font-mono text-[10px]">Deploy Multi-AZ (Alta Disponibilidade)</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card 3: Global Standards (Prefix, Environment, Tags) */}
              <div className="bg-[#0D1117] border border-[#2D333B] p-5 rounded-xl space-y-4" id="step-globals">
                <div className="flex items-center gap-2 border-b border-[#2D333B] pb-3">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold italic">02. Padrões Globais</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1 uppercase tracking-wider font-semibold">Prefixo do Projeto</label>
                    <input
                      type="text"
                      placeholder="enterprise"
                      value={state.projectPrefix}
                      onChange={(e) => setState((prev) => ({ ...prev, projectPrefix: e.target.value }))}
                      className="w-full text-xs px-3 py-2 bg-[#161B22] border border-[#2D333B] rounded text-[#E0E2E7] focus:outline-none focus:border-blue-500 font-mono"
                      id="input-project-prefix"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1 uppercase tracking-wider font-semibold">Ambiente</label>
                    <select
                      value={state.environment}
                      onChange={(e) => setState((prev) => ({ ...prev, environment: e.target.value as Environment }))}
                      className="w-full text-xs px-3 py-2 bg-[#161B22] border border-[#2D333B] rounded text-[#E0E2E7] focus:outline-none focus:border-blue-500 font-mono"
                      id="select-environment"
                    >
                      <option value="dev">Dev (Desenvolvimento)</option>
                      <option value="qa">QA (Homologação)</option>
                      <option value="prod">Prod (Produção)</option>
                    </select>
                  </div>
                </div>

                {/* Tags custom block */}
                <TagManager
                  tags={state.tags}
                  onChange={(tags) => setState((prev) => ({ ...prev, tags }))}
                />
              </div>
            </div>

            {/* Right side: Generated Code View and AI assistant - takes 7 cols */}
            <div className="lg:col-span-7 flex flex-col space-y-5">
              {/* Main Code View Box */}
              <div className="bg-[#0D1117] border border-[#2D333B] rounded-xl overflow-hidden flex flex-col flex-1" id="block-generated-code">
                <div className="bg-[#161B22] px-4 py-3 border-b border-[#2D333B] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-semibold text-[#E0E2E7] font-mono">
                      {state.tool === 'terraform' ? 'main.tf' : 'template.yaml'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5" id="code-panel-actions">
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1 text-[11px] bg-[#161B22] hover:bg-[#2D333B] text-slate-300 hover:text-white px-2.5 py-1.5 rounded transition border border-[#2D333B]"
                      title="Copiar código gerado"
                      id="btn-copy-code"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                    <button
                      onClick={handleDownloadCode}
                      className="flex items-center gap-1 text-[11px] bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition font-medium"
                      title="Baixar arquivo final (.tf ou .yaml)"
                      id="btn-download-code"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar .{state.tool === 'terraform' ? 'tf' : 'yaml'}</span>
                    </button>
                  </div>
                </div>

                {/* Custom formatted highlighted display pane */}
                <div className="bg-[#010409] p-4 font-mono text-[11px] leading-relaxed overflow-auto flex-1 min-h-[360px] max-h-[500px] border border-[#2D333B]/30 rounded">
                  <pre className="text-blue-300">
                    <code>{generatedCode}</code>
                  </pre>
                </div>
              </div>

              {/* Server-side AI Assistant Card (Gemini Integration) */}
              <div className="bg-[#0D1117] border border-[#2D333B] p-5 rounded-xl space-y-4" id="gemini-assistant-card">
                <div className="flex items-center justify-between border-b border-[#2D333B] pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                    <h3 className="text-sm font-semibold text-white">SRE Copilot (Gemini AI)</h3>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-mono border ${
                    hasServerKey 
                      ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700/60'
                  }`}>
                    {hasServerKey ? 'ATIVADO via Server' : 'Sem Conexão / Local'}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Refine o template acima usando inteligência artificial de nuvem. Digite desejos como 
                  <em> "adicione políticas de auto-scaling"</em> ou <em> "mostre sugestões de hardening de redes"</em>.
                </p>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Ex: Como eu adicionaria backups recorrentes neste RDS?"
                      className="flex-1 text-xs px-3 py-2 bg-[#161B22] border border-[#2D333B] rounded text-zinc-100 placeholder-zinc-650 focus:outline-none focus:border-blue-500 font-mono"
                      id="ai-prompt-input"
                      disabled={aiLoading}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAIRefinement();
                      }}
                    />
                    <button
                      onClick={handleAIRefinement}
                      disabled={aiLoading}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition"
                      id="submit-ai-refinement-btn"
                    >
                      {aiLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      <span>Refinar</span>
                    </button>
                  </div>

                  {/* AI Response Output Block */}
                  {aiResult && (
                    <div className="bg-[#010409] border border-[#2D333B] rounded-lg p-3 space-y-2" id="ai-response-box">
                      <div className="flex items-center gap-1.5 border-b border-[#2D333B]/60 pb-1.5">
                        <Sparkles className="w-3 h-3 text-blue-400" />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Análise do Copilot</span>
                      </div>
                      <div className="text-[11px] text-[#E0E2E7] font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                        {aiResult}
                      </div>
                    </div>
                  )}

                  {aiError && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg flex items-start gap-2" id="ai-error-box">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-400" />
                      <div className="space-y-1">
                        <strong className="block">Aviso do Copilot:</strong>
                        <p className="text-[11px]">
                          {aiError}. Isso ocorre quando a chave de API <strong>GEMINI_API_KEY</strong> não está configurada nos segredos ou houve falha de rede. Você ainda pode usar o gerador padrão local perfeitamente!
                        </p>
                      </div>
                    </div>
                  )}

                  {!hasServerKey && !aiError && !aiResult && (
                    <div className="bg-[#161B22]/50 border border-[#2D333B] text-[11px] text-slate-500 px-3 py-2 rounded-lg flex items-center gap-2" id="ai-offline-info">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                      <span>Configure a chave <strong>GEMINI_API_KEY</strong> para ativar o assistente de arquitetura IA.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* High Density Status Bar (Footer) */}
      <footer className="h-7 bg-[#161B22] border-t border-[#2D333B] px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">System Ready</span>
          </div>
          <span className="text-[10px] text-slate-600">/config/{state.provider}/{state.tool}/vpc-module-v1</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono">
          <span>UTF-8</span>
          <span className="text-blue-500">PROD_PROFILE</span>
        </div>
      </footer>
    </div>
  );
}
