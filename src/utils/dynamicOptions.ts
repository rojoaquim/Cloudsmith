/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CascadingOptions } from '../types';

export const iacCascadingSchema: CascadingOptions[] = [
  {
    tool: 'terraform',
    name: 'Terraform (HCL)',
    providers: [
      {
        id: 'aws',
        name: 'Amazon Web Services (AWS)',
        resources: [
          { id: 'vpc', name: 'VPC Network', supported: true, defaultConfig: { cidr: '10.0.0.0/16', subnetsCount: 2, enableDns: true } },
          { id: 'compute', name: 'EC2 Instance / VM', supported: true, defaultConfig: { instanceType: 't3.micro', os: 'linux', allowSSH: true, allowHTTP: true } },
          { id: 'storage', name: 'S3 Bucket / Storage', supported: true, defaultConfig: { bucketType: 'private', versioning: true, encryption: true } },
          { id: 'database', name: 'RDS / Relational DB', supported: true, defaultConfig: { engine: 'postgres', allocatedStorage: 20, multiAz: false } }
        ]
      },
      {
        id: 'azure',
        name: 'Microsoft Azure',
        resources: [
          { id: 'vpc', name: 'Virtual Network (VNet)', supported: true, defaultConfig: { cidr: '10.1.0.0/16', subnetsCount: 1, enableDns: true } },
          { id: 'compute', name: 'Virtual Machine (VM)', supported: true, defaultConfig: { instanceType: 'Standard_B1s', os: 'linux', allowSSH: true, allowHTTP: true } },
          { id: 'storage', name: 'Blob Storage Account', supported: true, defaultConfig: { bucketType: 'private', versioning: false, encryption: true } },
          { id: 'database', name: 'PostgreSQL Flexible Server', supported: true, defaultConfig: { engine: 'postgres', allocatedStorage: 32, multiAz: false } }
        ]
      },
      {
        id: 'gcp',
        name: 'Google Cloud Platform (GCP)',
        resources: [
          { id: 'vpc', name: 'VPC Network', supported: true, defaultConfig: { cidr: '10.2.0.0/16', subnetsCount: 1, enableDns: true } },
          { id: 'compute', name: 'Compute Engine VM', supported: true, defaultConfig: { instanceType: 'e2-micro', os: 'linux', allowSSH: true, allowHTTP: true } },
          { id: 'storage', name: 'Cloud Storage Bucket', supported: true, defaultConfig: { bucketType: 'private', versioning: true, encryption: false } },
          { id: 'database', name: 'Cloud SQL Database', supported: true, defaultConfig: { engine: 'postgres', allocatedStorage: 10, multiAz: false } }
        ]
      },
      {
        id: 'oci',
        name: 'Oracle Cloud Infrastructure (OCI)',
        resources: [
          { id: 'vpc', name: 'Virtual Cloud Network (VCN)', supported: true, defaultConfig: { cidr: '10.3.0.0/16', subnetsCount: 1, enableDns: true } },
          { id: 'compute', name: 'Compute Shape VM', supported: true, defaultConfig: { instanceType: 'VM.Standard.E4.Flex', os: 'linux', allowSSH: true, allowHTTP: true } },
          { id: 'storage', name: 'Object Storage Bucket', supported: true, defaultConfig: { bucketType: 'private', versioning: false, encryption: true } },
          { id: 'database', name: 'Autonomous Db / SQL Transaction', supported: true, defaultConfig: { engine: 'postgres', allocatedStorage: 20, multiAz: false } }
        ]
      }
    ]
  },
  {
    tool: 'cloudformation',
    name: 'AWS CloudFormation (YAML)',
    providers: [
      {
        id: 'aws',
        name: 'Amazon Web Services (AWS)',
        resources: [
          { id: 'vpc', name: 'AWS EC2 VPC', supported: true, defaultConfig: { cidr: '10.0.0.0/16', subnetsCount: 2, enableDns: true } },
          { id: 'compute', name: 'AWS EC2 Instance', supported: true, defaultConfig: { instanceType: 't3.micro', os: 'linux', allowSSH: true, allowHTTP: true } },
          { id: 'storage', name: 'AWS S3 Bucket', supported: true, defaultConfig: { bucketType: 'private', versioning: true, encryption: true } },
          { id: 'database', name: 'AWS RDS DBInstance', supported: true, defaultConfig: { engine: 'postgres', allocatedStorage: 20, multiAz: false } }
        ]
      }
    ]
  }
];

// Technical proposal documentation shown inside the app for SRE education
export const proposalFolderStructure = `gerador-iac-frontend/
├── public/                 # Assets estáticos
│   └── favicon.svg
├── src/
│   ├── types.ts            # Tipagem TypeScript compartilhada (IaCTool, CloudProvider, etc.)
│   ├── main.tsx            # Ponto de entrada do React
│   ├── index.css           # Estilos globais (Tailwind CSS)
│   ├── App.tsx             # Componente container que gerencia o estado e renderização
│   ├── components/         # Componentes reutilizáveis isolados
│   │   ├── SidebarConfig.tsx  # Painel de configurações (Filtros, Recursos, Ambiente)
│   │   ├── CodeViewer.tsx     # Display de código com realce de sintaxe e botões de ação
│   │   ├── DocTabs.tsx        # Documentação técnica e arquitetura de pastas inclusa
│   │   └── TagManager.tsx     # Gerenciamento dinâmico de Tags (Chave/Valor)
│   └── utils/
│       ├── generators.ts      # Motor de templates que gera o código HCL/YAML offline
│       └── dynamicOptions.ts  # Mapeamento estático e JSON de opções em cascata
├── server.ts               # Servidor Express Full-Stack (Dev e Prod) integrado ao Vite
├── package.json            # Scripts de build unificados (esbuild para Node, Vite para SPA)
├── tsconfig.json           # Configurações do TypeScript
└── vite.config.ts          # Configuração rica do Vite e resolve aliases`;
