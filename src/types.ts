/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type IaCTool = 'terraform' | 'cloudformation';
export type CloudProvider = 'aws' | 'azure' | 'gcp' | 'oci';
export type Environment = 'dev' | 'qa' | 'prod';

export interface Tag {
  key: string;
  value: string;
}

export interface VpcConfig {
  enabled: boolean;
  cidr: string;
  subnetsCount: number;
  enableDns: boolean;
}

export interface ComputeConfig {
  enabled: boolean;
  instanceType: string;
  os: 'linux' | 'windows';
  allowSSH: boolean;
  allowHTTP: boolean;
}

export interface StorageConfig {
  enabled: boolean;
  bucketType: string; // 'private' | 'public-read'
  versioning: boolean;
  encryption: boolean;
}

export interface DatabaseConfig {
  enabled: boolean;
  engine: 'postgres' | 'mysql';
  allocatedStorage: number;
  multiAz: boolean;
}

export interface ResourceState {
  vpc: VpcConfig;
  compute: ComputeConfig;
  storage: StorageConfig;
  database: DatabaseConfig;
}

export interface GeneratorState {
  tool: IaCTool;
  provider: CloudProvider;
  environment: Environment;
  projectPrefix: string;
  tags: Tag[];
  resources: ResourceState;
}

// Map tool -> providers
export interface CascadingOptions {
  tool: IaCTool;
  name: string;
  providers: {
    id: CloudProvider;
    name: string;
    resources: {
      id: keyof ResourceState;
      name: string;
      supported: boolean;
      defaultConfig: any;
    }[];
  }[];
}
