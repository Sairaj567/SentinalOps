# =============================================================================
# SentinelOps - Terraform Variables
# =============================================================================

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "sentinelops"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

# =============================================================================
# NETWORKING
# =============================================================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidr" {
  description = "CIDR block for private subnet"
  type        = string
  default     = "10.0.2.0/24"
}

variable "allowed_ip" {
  description = "Your IP address for SSH/management access (use /32 for single IP)"
  type        = string
  default     = "0.0.0.0/0"  # CHANGE THIS to your IP for security!
}

# =============================================================================
# EC2 INSTANCES
# =============================================================================

variable "sentinel_instance_type" {
  description = "Instance type for Sentinel server"
  type        = string
  default     = "t3.large"
}

variable "victim_instance_type" {
  description = "Instance type for Victim server"
  type        = string
  default     = "t3.medium"
}

variable "attacker_instance_type" {
  description = "Instance type for Attacker machine"
  type        = string
  default     = "t3.medium"
}

variable "public_key" {
  description = "SSH public key for EC2 access"
  type        = string
  default     = ""  # Add your public key here or use terraform.tfvars
}

# =============================================================================
# WAZUH CONFIGURATION
# =============================================================================

variable "wazuh_version" {
  description = "Wazuh version to install"
  type        = string
  default     = "4.7.0"
}

variable "elasticsearch_version" {
  description = "Elasticsearch version to install"
  type        = string
  default     = "7.17.0"
}

# =============================================================================
# TAGS
# =============================================================================

variable "additional_tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}
