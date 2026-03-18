variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project prefix used in AWS resources"
  type        = string
  default     = "backend-truck"
}

variable "vpc_cidr" {
  description = "CIDR block for main VPC"
  type        = string
  default     = "10.40.0.0/16"
}

variable "lambda_zip_path" {
  description = "Path to deployable zip package"
  type        = string
}

variable "lambda_handler" {
  description = "Lambda handler entrypoint"
  type        = string
  default     = "dist/lambda.handler"
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds"
  type        = number
  default     = 15
}

variable "lambda_memory" {
  description = "Lambda memory in MB"
  type        = number
  default     = 512
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "truckdb"
}

variable "db_username" {
  description = "PostgreSQL admin username"
  type        = string
  default     = "truck_admin"
}

variable "db_password" {
  description = "PostgreSQL admin password"
  type        = string
  sensitive   = true
}

variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "15.8"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Initial storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Autoscaling max storage in GB"
  type        = number
  default     = 100
}

variable "db_deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = true
}
