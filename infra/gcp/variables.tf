variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "zone" {
  type    = string
  default = "us-central1-a"
}

variable "ssh_source_cidr" {
  type        = string
  description = "IP publico do operador em CIDR, por exemplo 203.0.113.10/32."
}

variable "backup_bucket" {
  type = string
}
