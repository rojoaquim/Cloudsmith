/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeneratorState, Tag } from '../types';

// Helper to format tags list into Terraform or CloudFormation syntax
export function formatTags(tags: Tag[], tool: 'terraform' | 'cloudformation', provider: string = 'aws'): string {
  if (tags.length === 0) return '';

  if (tool === 'terraform') {
    if (provider === 'gcp') {
      // GCP uses labels (lowercase list)
      const labelLines = tags
        .map((t) => {
          const key = t.key.toLowerCase().replace(/[^a-z0-9_-]/g, '');
          const val = t.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
          return key ? `    "${key}" = "${val}"` : '';
        })
        .filter(Boolean)
        .join('\n');
      return labelLines ? `\n  labels = {\n${labelLines}\n  }` : '';
    } else {
      const tagLines = tags
        .map((t) => `    "${t.key}" = "${t.value}"`)
        .join('\n');
      return `\n  tags = {\n${tagLines}\n  }`;
    }
  } else {
    // CloudFormation tags represented as a dynamic list of Key/Value
    const cfnTags = tags
      .map((t) => `        - Key: ${t.key}\n          Value: ${t.value}`)
      .join('\n');
    return cfnTags ? `\n      Tags:\n${cfnTags}` : '';
  }
}

export function getAwsAmiOwner(osVersion: string): string {
  if (osVersion.startsWith('ubuntu')) return '"099720109477"'; // Canonical
  if (osVersion.startsWith('debian')) return '"136693071363"'; // Debian
  if (osVersion.startsWith('rhel')) return '"309956199498"'; // RedHat
  if (osVersion.startsWith('windows')) return '"801119661308"'; // Microsoft
  return '"137112412989"'; // Amazon
}

export function getAwsAmiFilter(osVersion: string): string {
  switch (osVersion) {
    case 'ubuntu-24.04': return '*ubuntu-noble-24.04-amd64-server-*';
    case 'ubuntu-22.04': return '*ubuntu-jammy-22.04-amd64-server-*';
    case 'debian-12': return '*debian-12-amd64-*';
    case 'amazon-linux-2023': return 'al2023-ami-2023.*-kernel-6.1-x86_64';
    case 'rhel-9': return '*RHEL-9.*_HVM-*';
    case 'windows-2025': return 'Windows_Server-2025-English-Full-Base-*';
    case 'windows-2022': return 'Windows_Server-2022-English-Full-Base-*';
    case 'windows-2019': return 'Windows_Server-2019-English-Full-Base-*';
    case 'windows-2016': return 'Windows_Server-2016-English-Full-Base-*';
    default: return '*ubuntu-noble-24.04-amd64-server-*';
  }
}

export function getAzureImageReference(osVersion: string): { publisher: string; offer: string; sku: string } {
  switch (osVersion) {
    case 'ubuntu-24.04':
      return { publisher: 'Canonical', offer: 'ubuntu-24_04-lts', sku: 'server' };
    case 'ubuntu-22.04':
      return { publisher: 'Canonical', offer: 'ubuntu-22_04-lts', sku: 'server' };
    case 'debian-12':
      return { publisher: 'debian', offer: 'debian-12', sku: '12-gen2' };
    case 'amazon-linux-2023': // Fallback to RHEL on Azure
    case 'rhel-9':
      return { publisher: 'RedHat', offer: 'RHEL', sku: '9-lvm-gen2' };
    case 'windows-2025':
      return { publisher: 'MicrosoftWindowsServer', offer: 'WindowsServer', sku: '2025-datacenter-azure-edition' };
    case 'windows-2022':
      return { publisher: 'MicrosoftWindowsServer', offer: 'WindowsServer', sku: '2022-datacenter-azure-edition' };
    case 'windows-2019':
      return { publisher: 'MicrosoftWindowsServer', offer: 'WindowsServer', sku: '2019-datacenter' };
    case 'windows-2016':
      return { publisher: 'MicrosoftWindowsServer', offer: 'WindowsServer', sku: '2016-datacenter' };
    default:
      return { publisher: 'Canonical', offer: 'ubuntu-24_04-lts', sku: 'server' };
  }
}

export function getGcpImage(osVersion: string): string {
  switch (osVersion) {
    case 'ubuntu-24.04': return 'ubuntu-os-cloud/ubuntu-2404-lts-amd64';
    case 'ubuntu-22.04': return 'ubuntu-os-cloud/ubuntu-2204-lts';
    case 'debian-12': return 'debian-cloud/debian-12';
    case 'amazon-linux-2023': return 'rocky-linux-cloud/rocky-linux-9'; // Fallback
    case 'rhel-9': return 'rhel-cloud/rhel-9';
    case 'windows-2025': return 'windows-cloud/windows-server-2025-byol';
    case 'windows-2022': return 'windows-cloud/windows-server-2022-byol';
    case 'windows-2019': return 'windows-cloud/windows-server-2019-byol';
    case 'windows-2016': return 'windows-cloud/windows-server-2016-byol';
    default: return 'debian-cloud/debian-12';
  }
}

export function getCfnAmiId(osVersion: string): string {
  switch (osVersion) {
    case 'ubuntu-24.04': return 'ami-0e2c8caa4b6378d8c';
    case 'ubuntu-22.04': return 'ami-080e1f13689e07408';
    case 'debian-12': return 'ami-058bd2d568351da34';
    case 'amazon-linux-2023': return 'ami-0c7217cdde317cfec';
    case 'rhel-9': return 'ami-0165f76b4d373f842';
    case 'windows-2025': return 'ami-0e0600d86940a02cf';
    case 'windows-2022': return 'ami-0b92f7596b7fdccbd';
    case 'windows-2019': return 'ami-04f7620eb5a55d496';
    case 'windows-2016': return 'ami-09cf6e9e4b6d396ec';
    default: return 'ami-0c7217cdde317cfec';
  }
}

// Generate complete Terraform code
export function generateTerraform(state: GeneratorState): string {
  const { provider, environment, projectPrefix, tags, resources } = state;
  const prefix = projectPrefix ? `${projectPrefix}-${environment}` : environment;

  const terraformTagLines = tags
    .map((t) => `    "${t.key}" = "${t.value}"`)
    .join('\n');

  let code = `# ==============================================================================
# TEMPLATE DE INFRAESTRUTURA COMO CODIGO (IAC) - TERRAFORM
# Provedor: ${provider.toUpperCase()} | Ambiente: ${environment.toUpperCase()}
# Gerado Automaticamente - Gerador SRE IaC
# ==============================================================================

# Definições Locais e Variáveis de Configuração Globais
locals {
  project_prefix = "${prefix}"
  environment    = "${environment}"
  common_tags = {
    "Env"       = "${environment}"
    "Project"   = "${projectPrefix || 'iac-generator'}"
    "ManagedBy" = "IaCGenerator"${terraformTagLines ? '\n' + terraformTagLines : ''}
  }
}

# Configuração de Provedor e Requisitos de Versão
terraform {
  required_version = ">= 1.5.0"
  required_providers {
${getProviderRequiredBlocks(provider)}
  }
}

provider "${getProviderName(provider)}" {
${getProviderConfigBlock(provider)}
}
`;

  // 1. VPC CONFIGURATION
  if (resources.vpc.enabled) {
    code += `
# ==========================================
# RECURSOS DE REDE (VPC / VIRTUAL NETWORK)
# ==========================================
`;
    if (provider === 'aws') {
      code += `resource "aws_vpc" "main" {
  cidr_block           = "${resources.vpc.cidr}"
  enable_dns_hostnames = ${resources.vpc.enableDns}
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "\${local.project_prefix}-vpc"
  })
}

resource "aws_subnet" "public" {
  count                   = ${resources.vpc.subnetsCount}
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 4, count.index)
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "\${local.project_prefix}-subnet-public-\${count.index}"
  })
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = merge(local.common_tags, {
    Name = "\${local.project_prefix}-igw"
  })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = merge(local.common_tags, {
    Name = "\${local.project_prefix}-rt-public"
  })
}

resource "aws_route_table_association" "public" {
  count          = ${resources.vpc.subnetsCount}
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
`;
    } else if (provider === 'azure') {
      code += `resource "azurerm_resource_group" "rg" {
  name     = "\${local.project_prefix}-rg"
  location = "eastus2"
  tags     = local.common_tags
}

resource "azurerm_virtual_network" "vnet" {
  name                = "\${local.project_prefix}-vnet"
  address_space       = ["${resources.vpc.cidr}"]
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  tags                = local.common_tags
}

resource "azurerm_subnet" "subnet" {
  name                 = "\${local.project_prefix}-subnet-0"
  resource_group_name  = azurerm_resource_group.rg.name
  virtual_network_name = azurerm_virtual_network.vnet.name
  address_prefixes     = [cidrsubnet("${resources.vpc.cidr}", 8, 1)]
}
`;
    } else if (provider === 'gcp') {
      code += `resource "google_compute_network" "vpc_network" {
  name                    = "\${local.project_prefix}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "\${local.project_prefix}-subnet"
  ip_cidr_range = "${resources.vpc.cidr}"
  region        = "us-central1"
  network       = google_compute_network.vpc_network.id
}
`;
    } else if (provider === 'oci') {
      code += `resource "oci_core_vcn" "vcn" {
  cidr_block     = "${resources.vpc.cidr}"
  compartment_id = var.compartment_ocid
  display_name   = "\${local.project_prefix}-vcn"
  dns_label      = "${projectPrefix ? projectPrefix.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '') : 'subnet'}"
}

resource "oci_core_subnet" "subnet" {
  cidr_block     = cidrsubnet("${resources.vpc.cidr}", 8, 1)
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.vcn.id
  display_name   = "\${local.project_prefix}-sub"
  dns_label      = "sublbl"
}
`;
    }
  }

  // 2. COMPUTE CONFIGURATION
  if (resources.compute.enabled) {
    code += `
# ==========================================
# RECURSOS DE COMPUTAÇÃO (EC2 / VIRTUAL MACHINE)
# ==========================================
`;
    if (provider === 'aws') {
      code += `resource "aws_security_group" "web_sg" {
  name        = "\${local.project_prefix}-sg-web"
  description = "Acesso de web para a instancia de computacao"
  vpc_id      = ${resources.vpc.enabled ? 'aws_vpc.main.id' : 'var.vpc_id'}

  # Regras de Entrada baseadas na configuracao selecionada
${resources.compute.allowHTTP ? `  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP Public"
  }
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS Public"
  }` : ''}

${resources.compute.allowSSH ? `  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["200.0.0.0/8"] # Exemplo de melhores praticas: Apenas IPs corporativos recomendados
    description = "Acesso restrito para SSH"
  }` : ''}

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}

data "aws_ami" "os" {
  most_recent = true
  owners      = [${getAwsAmiOwner(resources.compute.osVersion)}]

  filter {
    name   = "name"
    values = ["${getAwsAmiFilter(resources.compute.osVersion)}"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.os.id
  instance_type = "${resources.compute.instanceType}"
  subnet_id     = ${resources.vpc.enabled ? 'aws_subnet.public[0].id' : 'var.subnet_id'}
  vpc_security_group_ids = [aws_security_group.web_sg.id]

  # Protecao recomendada em Producao
  disable_api_termination = local.environment == "prod" ? true : false

  root_block_device {
    volume_size           = ${resources.compute.os === 'linux' ? '20' : '50'}
    volume_type           = "gp3"
    encrypted             = true # Melhor Pratica de SRE Seguranca
  }

  tags = merge(local.common_tags, {
    Name = "\${local.project_prefix}-vm-web"
  })
}
`;
    } else if (provider === 'azure') {
      code += `resource "azurerm_public_ip" "pip" {
  name                = "\${local.project_prefix}-pip"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name
  allocation_method   = "Dynamic"
  tags                = local.common_tags
}

resource "azurerm_network_interface" "nic" {
  name                = "\${local.project_prefix}-nic"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = ${resources.vpc.enabled ? 'azurerm_subnet.subnet.id' : 'var.subnet_id'}
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.pip.id
  }
  tags                = local.common_tags
}

resource "azurerm_network_security_group" "nsg" {
  name                = "\${local.project_prefix}-nsg"
  location            = azurerm_resource_group.rg.location
  resource_group_name = azurerm_resource_group.rg.name

${resources.compute.allowHTTP ? `  security_rule {
    name                       = "web-http"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }` : ''}

${resources.compute.allowSSH ? `  security_rule {
    name                       = "sec-ssh"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "${resources.compute.os === 'linux' ? '22' : '3389'}"
    source_address_prefix      = "200.0.0.0/8" # Apenas SSH restrito
    destination_address_prefix = "*"
  }` : ''}
}

resource "azurerm_network_interface_security_group_association" "nsg_assoc" {
  network_interface_id      = azurerm_network_interface.nic.id
  network_security_group_id = azurerm_network_security_group.nsg.id
}

resource "azurerm_${resources.compute.os === 'linux' ? 'linux_virtual_machine' : 'windows_virtual_machine'}" "node" {
  name                = "\${local.project_prefix}-vm"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  size                = "${resources.compute.instanceType}"
  admin_username      = "adminuser"
  # Senha apenas para fins demonstrativos (ideal: SSH Key ou Azure KeyVault)
  admin_password      = "P@ssw0rdSecure!2026" 
  disable_password_authentication = ${resources.compute.os === 'linux' ? 'false' : 'null'}
  network_interface_ids = [
    azurerm_network_interface.nic.id,
  ]

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "${getAzureImageReference(resources.compute.osVersion).publisher}"
    offer     = "${getAzureImageReference(resources.compute.osVersion).offer}"
    sku       = "${getAzureImageReference(resources.compute.osVersion).sku}"
    version   = "latest"
  }
}
`;
    } else if (provider === 'gcp') {
      code += `resource "google_compute_instance" "vm_instance" {
  name         = "\${local.project_prefix}-node-vm"
  machine_type = "${resources.compute.instanceType}"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "${getGcpImage(resources.compute.osVersion)}"
      size  = ${resources.compute.os === 'linux' ? '30' : '70'}
    }
  }

  network_interface {
    network    = ${resources.vpc.enabled ? 'google_compute_network.vpc_network.id' : '"default"'}
    subnetwork = ${resources.vpc.enabled ? 'google_compute_subnetwork.subnet.id' : 'null'}

    access_config {
      // Ephemeral public IP
    }
  }

  ${formatTags(tags, 'terraform', 'gcp')}
}

resource "google_compute_firewall" "rules" {
  name    = "\${local.project_prefix}-allow-rules"
  network = ${resources.vpc.enabled ? 'google_compute_network.vpc_network.id' : '"default"'}

  allow {
    protocol = "tcp"
    ports    = [
      ${resources.compute.allowHTTP ? '"80", "443"' : ''}
      ${resources.compute.allowSSH ? (resources.compute.os === 'linux' ? ', "22"' : ', "3389"') : ''}
    ]
  }

  source_ranges = ["0.0.0.0/0"]
}
`;
    } else if (provider === 'oci') {
      code += `resource "oci_core_instance" "compute" {
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  compartment_id      = var.compartment_ocid
  shape               = "${resources.compute.instanceType}"
  display_name        = "\${local.project_prefix}-vm"

  source_details {
    source_type             = "image"
    source_id               = var.image_ocid
    boot_volume_size_in_gbs = ${resources.compute.os === 'linux' ? '50' : '100'}
  }

  create_vnic_details {
    subnet_id        = ${resources.vpc.enabled ? 'oci_core_subnet.subnet.id' : 'var.subnet_id'}
    display_name     = "primaryvnic"
    assign_public_ip = true
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
  }
}
`;
    }
  }

  // 3. STORAGE CONFIGURATION
  if (resources.storage.enabled) {
    code += `
# ==========================================
# RECURSOS DE ARMAZENAMENTO (BUCKET / STORAGE)
# ==========================================
`;
    if (provider === 'aws') {
      code += `resource "aws_s3_bucket" "bucket" {
  bucket = "\${local.project_prefix}-${resources.storage.bucketType || 'data'}-bucket-\${random_string.suffix.result}"
  
  tags = merge(local.common_tags, {
    Access = "${resources.storage.bucketType}"
  })
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

resource "aws_s3_bucket_versioning" "v" {
  bucket = aws_s3_bucket.bucket.id
  versioning_configuration {
    status = "${resources.storage.versioning ? 'Enabled' : 'Disabled'}"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "enc" {
  bucket = aws_s3_bucket.bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "${resources.storage.encryption ? 'aws:kms' : 'AES256'}"
    }
  }
}

# Bloqueio de Acesso Publico se for privado (Seguranca Recomendada)
resource "aws_s3_bucket_public_access_block" "pab" {
  bucket                  = aws_s3_bucket.bucket.id
  block_public_acls       = ${resources.storage.bucketType === 'private' ? 'true' : 'false'}
  block_public_policy     = ${resources.storage.bucketType === 'private' ? 'true' : 'false'}
  ignore_public_acls      = ${resources.storage.bucketType === 'private' ? 'true' : 'false'}
  restrict_public_buckets = ${resources.storage.bucketType === 'private' ? 'true' : 'false'}
}
`;
    } else if (provider === 'azure') {
      code += `resource "azurerm_storage_account" "sa" {
  name                     = "sa\${replace(local.project_prefix, "-", "")}acct"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  account_tier             = "Standard"
  account_replication_type = "${resources.storage.versioning ? 'GRS' : 'LRS'}"
  
  # Criptografia automatica de seguranca Azure
  infrastructure_encryption_enabled = ${resources.storage.encryption ? 'true' : 'false'}

  tags = local.common_tags
}

resource "azurerm_storage_container" "cont" {
  name                  = "data-container"
  storage_account_name  = azurerm_storage_account.sa.name
  container_access_type = "${resources.storage.bucketType === 'private' ? 'private' : 'blob'}"
}
`;
    } else if (provider === 'gcp') {
      code += `resource "google_storage_bucket" "bucket" {
  name          = "\${local.project_prefix}-storage-bucket-\${random_string.storage_suffix.result}"
  location      = "US"
  force_destroy = true

  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  ${resources.storage.versioning ? `versioning {
    enabled = true
  }` : ''}

  ${resources.storage.encryption ? `encryption {
    default_kms_key_name = var.kms_key_name
  }` : ''}
}

resource "random_string" "storage_suffix" {
  length  = 6
  special = false
  upper   = false
}
`;
    } else if (provider === 'oci') {
      code += `resource "oci_objectstorage_bucket" "bucket" {
  compartment_id = var.compartment_ocid
  name           = "\${local.project_prefix}-${resources.storage.bucketType || 'data'}-bucket"
  namespace      = var.bucket_namespace
  access_type    = "${resources.storage.bucketType === 'private' ? 'NoPublicAccess' : 'ObjectRead'}"
  storage_tier   = "Standard"

  versioning = "${resources.storage.versioning ? 'Enabled' : 'Disabled'}"
}
`;
    }
  }

  // 4. DATABASE CONFIGURATION
  if (resources.database.enabled) {
    code += `
# ==========================================
# RECURSOS DE BANCO DE DADOS (DATABASE / SQL)
# ==========================================
`;
    if (provider === 'aws') {
      code += `resource "aws_db_subnet_group" "db_sub" {
  name       = "\${local.project_prefix}-db-subnets"
  subnet_ids = ${resources.vpc.enabled ? 'aws_subnet.public[*].id' : 'var.db_subnet_ids'}

  tags = local.common_tags
}

resource "aws_db_instance" "db" {
  allocated_storage      = ${resources.database.allocatedStorage}
  engine                 = "${resources.database.engine}"
  engine_version         = "${resources.database.engine === 'postgres' ? '15.4' : '8.0.35'}"
  instance_class         = "db.t3.micro"
  db_name                = "appdb\${replace(local.environment, "-", "")}"
  username               = "adminuser"
  password               = "DatabaseKeySecure2026!"
  db_subnet_group_name   = aws_db_subnet_group.db_sub.name
  skip_final_snapshot    = true
  multi_az               = ${resources.database.multiAz}
  storage_encrypted      = true

  tags = merge(local.common_tags, {
    Name = "\${local.project_prefix}-rds-db"
  })
}
`;
    } else if (provider === 'azure') {
      code += `resource "azurerm_postgresql_flexible_server" "pgsql" {
  name                   = "\${local.project_prefix}-postgres-srv"
  resource_group_name    = azurerm_resource_group.rg.name
  location               = azurerm_resource_group.rg.location
  version                = "14"
  administrator_login    = "psqladmin"
  administrator_password = "SecurePassword123!"
  storage_mb             = ${resources.database.allocatedStorage * 1024}
  sku_name               = "GP_Standard_D2s_v3"
  
  # Alta disponibilidade configurada
  ${resources.database.multiAz ? `high_availability {
    mode = "ZoneRedundant"
  }` : ''}

  tags = local.common_tags
}
`;
    } else if (provider === 'gcp') {
      code += `resource "google_sql_database_instance" "master" {
  name             = "\${local.project_prefix}-db-instance"
  database_version = "${resources.database.engine === 'postgres' ? 'POSTGRES_15' : 'MYSQL_8_0'}"
  region           = "us-central1"

  settings {
    tier = "db-f1-micro"
    disk_size = ${resources.database.allocatedStorage}
    
    ip_configuration {
      ipv4_enabled    = true
      private_network = ${resources.vpc.enabled ? 'google_compute_network.vpc_network.id' : 'null'}
    }

    ${resources.database.multiAz ? `availability_type = "REGIONAL"` : 'availability_type = "ZONAL"'}
  }
}
`;
    } else if (provider === 'oci') {
      code += `resource "oci_database_autonomous_database" "db" {
  compartment_id           = var.compartment_ocid
  db_name                  = "appdb\${local.environment}"
  cpu_core_count           = 1
  data_storage_size_in_tbs = 1
  db_workload              = "OLTP"
  display_name             = "\${local.project_prefix}-autonomous-db"

  admin_password           = "SecurePasswordOCI#123"
  is_free_tier             = true
}
`;
    }
  }

  // Append user custom tags (formatted at the very end as outputs or notes)
  if (tags.length > 0) {
    code += `
# ==========================================
# OUTPUTS E META-TAGS ADICIONADAS
# ==========================================
output "custom_tags_applied" {
  description = "Lista de Tags customizadas configuradas pelo Gerador"
  value       = {
${tags.map((t) => `    "${t.key}" = "${t.value}"`).join('\n')}
  }
}
`;
  }

  return code;
}

// Generate complete AWS CloudFormation code
export function generateCloudFormation(state: GeneratorState): string {
  const { environment, projectPrefix, tags, resources } = state;
  const prefix = projectPrefix ? `${projectPrefix}-${environment}` : environment;

  let code = `AWSTemplateFormatVersion: '2010-09-09'
Description: 'IaC CloudFormation gerado pelo Gerador SRE para o ambiente de ${environment.toUpperCase()}'

Metadata:
  Generator: IaCGenerator SRE Suite v1.0
  Environment: ${environment}

# ==============================================================================
# PARAMETROS DE ENTRADA DO CLOUDFORMATION
# ==============================================================================
Parameters:
  ProjectPrefix:
    Type: String
    Default: '${prefix}'
    Description: Prefixo para nomeacao dos recursos de infraestrutura.
    
  EnvironmentType:
    Type: String
    Default: '${environment}'
    AllowedValues: [dev, qa, prod]
    Description: Ambiente no qual os recursos estao sendo provisionados.

Resources:
`;

  // 1. VPC CONFIGURATION
  if (resources.vpc.enabled) {
    code += `
# ==========================================
# RECURSOS DE INFRAESTRUTURA DE REDE (VPC)
# ==========================================
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: ${resources.vpc.cidr}
      EnableDnsHostnames: ${resources.vpc.enableDns}
      EnableDnsSupport: true${formatTags(tags, 'cloudformation')}

  PublicSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: !Select [ 0, !Cidr [ !GetAtt VPC.CidrBlock, ${resources.vpc.subnetsCount}, 8 ] ]
      MapPublicIpOnLaunch: true${formatTags(tags.concat([{ key: 'Name', value: `${prefix}-public-subnet` }]), 'cloudformation')}

  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:${formatTags(tags.concat([{ key: 'Name', value: `${prefix}-igw` }]), 'cloudformation')}

  VPCGatewayAttachment:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref VPC
      InternetGatewayId: !Ref InternetGateway

  RouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC${formatTags(tags.concat([{ key: 'Name', value: `${prefix}-public-rt` }]), 'cloudformation')}

  DefaultRoute:
    Type: AWS::EC2::Route
    DependsOn: VPCGatewayAttachment
    Properties:
      RouteTableId: !Ref RouteTable
      DestinationCidrBlock: 0.0.0.0/0
      InternetGatewayId: !Ref InternetGateway

  SubnetRouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet
      RouteTableId: !Ref RouteTable
`;
  }

  // 2. COMPUTE CONFIGURATION
  if (resources.compute.enabled) {
    code += `
# ==========================================
# RECURSOS DE COMPUTAÇÃO (EC2 INSTANCE)
# ==========================================
  WebServerSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Regras de firewall para o servidor web do projeto
      VpcId: ${resources.vpc.enabled ? '!Ref VPC' : '!Ref DefaultVPCId'}
      SecurityGroupIngress:
`;
    if (resources.compute.allowHTTP) {
      code += `        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
          Description: Acesso HTTP público
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
          Description: Acesso HTTPS público
`;
    }
    if (resources.compute.allowSSH) {
      code += `        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 200.0.0.0/8 # Acesso SSH restrito
          Description: Acesso SSH restrito para controle SRE
`;
    }
    code += `      SecurityGroupEgress:
        - IpProtocol: -1
          CidrIp: 0.0.0.0/0
          Description: Todo trafego de saida permitido

  EC2Instance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: ${resources.compute.instanceType}
      ImageId: ${getCfnAmiId(resources.compute.osVersion)} # ${resources.compute.osVersion} default no US-East-1
      SubnetId: ${resources.vpc.enabled ? '!Ref PublicSubnet' : '!Ref DefaultSubnetId'}
      SecurityGroupIds:
        - !Ref WebServerSecurityGroup
      BlockDeviceMappings:
        - DeviceName: /dev/xvda
          Ebs:
            VolumeSize: ${resources.compute.os === 'linux' ? '20' : '65'}
            VolumeType: gp3
            Encrypted: true${formatTags(tags.concat([{ key: 'Name', value: `${prefix}-web-ec2` }]), 'cloudformation')}
`;
  }

  // 3. STORAGE CONFIGURATION
  if (resources.storage.enabled) {
    code += `
# ==========================================
# RECURSOS DE ARMAZENAMENTO (S3 BUCKET)
# ==========================================
  S3Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub '\${ProjectPrefix}-s3-bucket-\${AWS::AccountId}-\${AWS::Region}'
      VersioningConfiguration:
        Status: ${resources.storage.versioning ? 'Enabled' : 'Suspended'}
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: ${resources.storage.encryption ? 'aws:kms' : 'AES256'}
      PublicAccessBlockConfiguration:
        BlockPublicAcls: ${resources.storage.bucketType === 'private' ? 'true' : 'false'}
        BlockPublicPolicy: ${resources.storage.bucketType === 'private' ? 'true' : 'false'}
        IgnorePublicAcls: ${resources.storage.bucketType === 'private' ? 'true' : 'false'}
        RestrictPublicBuckets: ${resources.storage.bucketType === 'private' ? 'true' : 'false'}${formatTags(tags, 'cloudformation')}
`;
  }

  // 4. DATABASE CONFIGURATION
  if (resources.database.enabled) {
    code += `
# ==========================================
# RECURSOS DE BANCO DE DADOS (RDS DATABASE)
# ==========================================
  DBSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      DBSubnetGroupDescription: Subnets para deploy do banco RDS relacional
      SubnetIds:
        - ${resources.vpc.enabled ? '!Ref PublicSubnet' : '!Ref DefaultSubnet1'}
        - ${resources.vpc.enabled ? '!Ref PublicSubnet2' : '!Ref DefaultSubnet2'}

  RDSInstance:
    Type: AWS::RDS::DBInstance
    Properties:
      AllocatedStorage: '${resources.database.allocatedStorage}'
      DBInstanceClass: db.t3.micro
      DBInstanceIdentifier: !Sub '\${ProjectPrefix}-rds-database'
      Engine: ${resources.database.engine}
      EngineVersion: ${resources.database.engine === 'postgres' ? '15.4' : '8.0.35'}
      MasterUsername: adminuser
      MasterUserPassword: DatabaseSecurePasswordPerfect2026!
      DBSubnetGroupName: !Ref DBSubnetGroup
      MultiAZ: ${resources.database.multiAz}
      StorageEncrypted: true${formatTags(tags, 'cloudformation')}
`;
  }

  // OUTPUTS
  code += `
# ==============================================================================
# RETORNOS DA INFRAESTRUTURA (OUTPUTS)
# ==============================================================================
Outputs:
  EnvironmentUsed:
    Description: Ambiente final que foi provisionado
    Value: !Ref EnvironmentType
`;

  if (resources.vpc.enabled) {
    code += `  VPCId:
    Description: ID do VPC criado
    Value: !Ref VPC
`;
  }
  if (resources.compute.enabled) {
    code += `  WebInstanceIP:
    Description: IP publico do servidor criado
    Value: !GetAtt EC2Instance.PublicIp
`;
  }
  if (resources.storage.enabled) {
    code += `  BucketDNSName:
    Description: DNS do Bucket S3 de Armazenamento
    Value: !GetAtt S3Bucket.DomainName
`;
  }

  return code;
}

// Low-level helper to map providers to their terraform names
function getProviderName(provider: string): string {
  switch (provider) {
    case 'azure':
      return 'azurerm';
    case 'gcp':
      return 'google';
    default:
      return provider;
  }
}

function getProviderRequiredBlocks(provider: string): string {
  switch (provider) {
    case 'aws':
      return `      aws = {
        source  = "hashicorp/aws"
        version = "~> 5.0"
      }`;
    case 'azure':
      return `      azurerm = {
        source  = "hashicorp/azurerm"
        version = "~> 3.0"
      }`;
    case 'gcp':
      return `      google = {
        source  = "hashicorp/google"
        version = "~> 5.0"
      }`;
    case 'oci':
      return `      oci = {
        source  = "oracle/oci"
        version = "~> 5.0"
      }`;
    default:
      return '';
  }
}

function getProviderConfigBlock(provider: string): string {
  switch (provider) {
    case 'aws':
      return `  region = "us-east-1"`;
    case 'azure':
      return `  features {}`;
    case 'gcp':
      return `  project = var.gcp_project_id
  region  = "us-central1"`;
    case 'oci':
      return `  tenancy_ocid = var.tenancy_ocid
  user_ocid    = var.user_ocid
  region       = "us-ashburn-1"`;
    default:
      return '';
  }
}
