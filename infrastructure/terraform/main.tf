# =============================================================================
# SentinelOps - AWS Infrastructure
# =============================================================================
# This Terraform configuration creates the cyber lab environment:
# - Sentinel Server (SOC Brain) - Wazuh, Elasticsearch, Kibana, Grafana, Suricata
# - Victim Server - Docker, DVWA, Juice Shop
# - Attacker Machine - Kali Linux
# =============================================================================

terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "SentinelOps"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# =============================================================================
# DATA SOURCES
# =============================================================================

# Get latest Ubuntu 22.04 AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Get latest Kali Linux AMI
data "aws_ami" "kali" {
  most_recent = true
  owners      = ["679593333241"] # Kali Linux

  filter {
    name   = "name"
    values = ["kali-linux-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Get availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# =============================================================================
# VPC & NETWORKING
# =============================================================================

resource "aws_vpc" "sentinelops" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.sentinelops.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# Public Subnet for all servers
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.sentinelops.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet"
  }
}

# Private Subnet for internal communication
resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.sentinelops.id
  cidr_block        = var.private_subnet_cidr
  availability_zone = data.aws_availability_zones.available.names[0]

  tags = {
    Name = "${var.project_name}-private-subnet"
  }
}

# Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.sentinelops.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# =============================================================================
# SECURITY GROUPS
# =============================================================================

# Sentinel Server Security Group
resource "aws_security_group" "sentinel" {
  name        = "${var.project_name}-sentinel-sg"
  description = "Security group for Sentinel SOC server"
  vpc_id      = aws_vpc.sentinelops.id

  # SSH Access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ip]
    description = "SSH access"
  }

  # Wazuh Manager
  ingress {
    from_port   = 1514
    to_port     = 1515
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Wazuh agent communication"
  }

  # Wazuh API
  ingress {
    from_port   = 55000
    to_port     = 55000
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ip]
    description = "Wazuh API"
  }

  # Elasticsearch
  ingress {
    from_port   = 9200
    to_port     = 9200
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr, var.allowed_ip]
    description = "Elasticsearch"
  }

  # Kibana
  ingress {
    from_port   = 5601
    to_port     = 5601
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ip]
    description = "Kibana"
  }

  # Grafana
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ip]
    description = "Grafana"
  }

  # Suricata
  ingress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
    description = "Internal traffic for Suricata"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-sentinel-sg"
  }
}

# Victim Server Security Group
resource "aws_security_group" "victim" {
  name        = "${var.project_name}-victim-sg"
  description = "Security group for Victim server"
  vpc_id      = aws_vpc.sentinelops.id

  # SSH Access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr, var.allowed_ip]
    description = "SSH access"
  }

  # HTTP/HTTPS for vulnerable apps
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr, var.allowed_ip]
    description = "HTTP"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr, var.allowed_ip]
    description = "HTTPS"
  }

  # DVWA
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr, var.allowed_ip]
    description = "DVWA"
  }

  # Juice Shop
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr, var.allowed_ip]
    description = "Juice Shop"
  }

  # Custom Node App
  ingress {
    from_port   = 4000
    to_port     = 4000
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr, var.allowed_ip]
    description = "Node App"
  }

  # Wazuh Agent
  egress {
    from_port   = 1514
    to_port     = 1515
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
    description = "Wazuh agent to manager"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-victim-sg"
  }
}

# Attacker Machine Security Group
resource "aws_security_group" "attacker" {
  name        = "${var.project_name}-attacker-sg"
  description = "Security group for Attacker (Kali) machine"
  vpc_id      = aws_vpc.sentinelops.id

  # SSH Access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ip]
    description = "SSH access"
  }

  # RDP for Kali GUI (optional)
  ingress {
    from_port   = 3389
    to_port     = 3389
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ip]
    description = "RDP access"
  }

  # Full outbound for attack tools
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-attacker-sg"
  }
}

# =============================================================================
# KEY PAIR
# =============================================================================

resource "aws_key_pair" "sentinelops" {
  key_name   = "${var.project_name}-key"
  public_key = var.public_key
}

# =============================================================================
# EC2 INSTANCES
# =============================================================================

# Sentinel Server (SOC Brain)
resource "aws_instance" "sentinel" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.sentinel_instance_type
  key_name               = aws_key_pair.sentinelops.key_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.sentinel.id]

  root_block_device {
    volume_size           = 50
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
  }

  user_data = file("${path.module}/scripts/sentinel-setup.sh")

  tags = {
    Name = "${var.project_name}-sentinel-server"
    Role = "SOC"
  }
}

# Victim Server
resource "aws_instance" "victim" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.victim_instance_type
  key_name               = aws_key_pair.sentinelops.key_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.victim.id]

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
  }

  user_data = file("${path.module}/scripts/victim-setup.sh")

  tags = {
    Name = "${var.project_name}-victim-server"
    Role = "Target"
  }
}

# Attacker Machine (Kali Linux)
resource "aws_instance" "attacker" {
  ami                    = data.aws_ami.kali.id
  instance_type          = var.attacker_instance_type
  key_name               = aws_key_pair.sentinelops.key_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.attacker.id]

  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
  }

  user_data = file("${path.module}/scripts/attacker-setup.sh")

  tags = {
    Name = "${var.project_name}-attacker-kali"
    Role = "RedTeam"
  }
}

# =============================================================================
# ELASTIC IP (Optional - for stable IPs)
# =============================================================================

resource "aws_eip" "sentinel" {
  instance = aws_instance.sentinel.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-sentinel-eip"
  }
}
