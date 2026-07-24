output "ip_publico" { value = google_compute_address.vkos.address }
output "service_account" { value = google_service_account.vm.email }
output "vertex_service_account" { value = google_service_account.vertex.email }
output "backup_service_account" { value = google_service_account.backup.email }
output "bucket_backups" { value = google_storage_bucket.backups.name }
