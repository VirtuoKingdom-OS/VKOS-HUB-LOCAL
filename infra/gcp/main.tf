resource "google_project_service" "apis" {
  for_each = toset([
    "aiplatform.googleapis.com",
    "compute.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com"
  ])
  service            = each.value
  disable_on_destroy = false
}

resource "google_compute_address" "vkos" {
  name   = "vkos-v3-ip"
  region = var.region
}

resource "google_service_account" "vm" {
  account_id   = "vkos-v3-vm"
  display_name = "VKOS 3 VM"
}

resource "google_service_account" "vertex" {
  account_id   = "vkos-v3-vertex"
  display_name = "VKOS 3 Vertex broker"
}

resource "google_service_account" "backup" {
  account_id   = "vkos-v3-backup"
  display_name = "VKOS 3 backup"
}

resource "google_project_iam_member" "vertex" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.vertex.email}"
}

resource "google_storage_bucket_iam_member" "backup" {
  bucket = google_storage_bucket.backups.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.backup.email}"
}

resource "google_storage_bucket" "backups" {
  name                        = var.backup_bucket
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  versioning {
    enabled = true
  }
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
}

locals {
  secrets = toset(["cofre-master-key", "motor-internal-token", "backup-key", "vertex-service-account", "backup-service-account"])
}

resource "google_secret_manager_secret" "vkos" {
  for_each  = local.secrets
  secret_id = each.value
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_iam_member" "vm_secrets" {
  for_each  = local.secrets
  secret_id = google_secret_manager_secret.vkos[each.key].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.vm.email}"
}

resource "google_compute_firewall" "web" {
  name    = "vkos-v3-web"
  network = "default"
  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["vkos-v3"]
}

resource "google_compute_firewall" "ssh" {
  name    = "vkos-v3-ssh"
  network = "default"
  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
  source_ranges = [var.ssh_source_cidr]
  target_tags   = ["vkos-v3"]
}

resource "google_compute_instance" "vkos" {
  name         = "vkos-v3"
  machine_type = "e2-standard-2"
  tags         = ["vkos-v3"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 50
      type  = "pd-balanced"
    }
  }

  network_interface {
    network = "default"
    access_config {
      nat_ip = google_compute_address.vkos.address
    }
  }

  service_account {
    email  = google_service_account.vm.email
    scopes = ["cloud-platform"]
  }

  metadata = {
    enable-oslogin = "TRUE"
  }

  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }

  depends_on = [google_project_service.apis]
}
