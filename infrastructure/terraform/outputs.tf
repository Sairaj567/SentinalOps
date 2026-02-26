# =============================================================================
# SentinelOps - Terraform Outputs
# =============================================================================

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.sentinelops.id
}

output "public_subnet_id" {
  description = "Public subnet ID"
  value       = aws_subnet.public.id
}

# =============================================================================
# SENTINEL SERVER
# =============================================================================

output "sentinel_public_ip" {
  description = "Sentinel server public IP"
  value       = aws_eip.sentinel.public_ip
}

output "sentinel_private_ip" {
  description = "Sentinel server private IP"
  value       = aws_instance.sentinel.private_ip
}

output "sentinel_instance_id" {
  description = "Sentinel server instance ID"
  value       = aws_instance.sentinel.id
}

# =============================================================================
# VICTIM SERVER
# =============================================================================

output "victim_public_ip" {
  description = "Victim server public IP"
  value       = aws_instance.victim.public_ip
}

output "victim_private_ip" {
  description = "Victim server private IP"
  value       = aws_instance.victim.private_ip
}

output "victim_instance_id" {
  description = "Victim server instance ID"
  value       = aws_instance.victim.id
}

# =============================================================================
# ATTACKER MACHINE
# =============================================================================

output "attacker_public_ip" {
  description = "Attacker machine public IP"
  value       = aws_instance.attacker.public_ip
}

output "attacker_private_ip" {
  description = "Attacker machine private IP"
  value       = aws_instance.attacker.private_ip
}

output "attacker_instance_id" {
  description = "Attacker machine instance ID"
  value       = aws_instance.attacker.id
}

# =============================================================================
# CONNECTION STRINGS
# =============================================================================

output "ssh_sentinel" {
  description = "SSH command for Sentinel server"
  value       = "ssh -i ~/.ssh/sentinelops-key ubuntu@${aws_eip.sentinel.public_ip}"
}

output "ssh_victim" {
  description = "SSH command for Victim server"
  value       = "ssh -i ~/.ssh/sentinelops-key ubuntu@${aws_instance.victim.public_ip}"
}

output "ssh_attacker" {
  description = "SSH command for Attacker machine"
  value       = "ssh -i ~/.ssh/sentinelops-key kali@${aws_instance.attacker.public_ip}"
}

# =============================================================================
# SERVICE URLS
# =============================================================================

output "kibana_url" {
  description = "Kibana URL"
  value       = "http://${aws_eip.sentinel.public_ip}:5601"
}

output "grafana_url" {
  description = "Grafana URL"
  value       = "http://${aws_eip.sentinel.public_ip}:3000"
}

output "wazuh_api_url" {
  description = "Wazuh API URL"
  value       = "https://${aws_eip.sentinel.public_ip}:55000"
}

output "dvwa_url" {
  description = "DVWA URL"
  value       = "http://${aws_instance.victim.public_ip}:8080"
}

output "juice_shop_url" {
  description = "OWASP Juice Shop URL"
  value       = "http://${aws_instance.victim.public_ip}:3000"
}

# =============================================================================
# NETWORK INFO FOR ATTACKS
# =============================================================================

output "attack_targets" {
  description = "Target IPs for attack simulation"
  value = {
    victim_public  = aws_instance.victim.public_ip
    victim_private = aws_instance.victim.private_ip
    dvwa           = "${aws_instance.victim.public_ip}:8080"
    juice_shop     = "${aws_instance.victim.public_ip}:3000"
  }
}
