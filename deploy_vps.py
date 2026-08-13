#!/usr/bin/env python3
import paramiko
import sys
import os

HOST = "40.160.82.252"
USER = "ubuntu"
PASS = "Liene@oli205"
REMOTE_DIR = "/opt/backend-truck"

files_to_upload = [
    ("/home/david/projeto-freela/backend-truck/docker-compose.prod.yml", f"{REMOTE_DIR}/docker-compose.prod.yml"),
    ("/home/david/projeto-freela/backend-truck/docker-entrypoint.sh", f"{REMOTE_DIR}/docker-entrypoint.sh"),
    ("/home/david/projeto-freela/backend-truck/Dockerfile.prod", f"{REMOTE_DIR}/Dockerfile.prod"),
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print(f"Conectando em {HOST}...")
client.connect(HOST, username=USER, password=PASS, timeout=15)
print("Conectado!")

sftp = client.open_sftp()

# Envia .env.production para a VPS
env_local = "/home/david/projeto-freela/backend-truck/.env.production"
env_remote = f"{REMOTE_DIR}/.env.production"
print(f"Enviando .env.production -> {env_remote}")
sftp.put(env_local, env_remote)

for local, remote in files_to_upload:
    print(f"Enviando {os.path.basename(local)} -> {remote}")
    sftp.put(local, remote)
    # Permissões para shell scripts
    if local.endswith('.sh'):
        sftp.chmod(remote, 0o755)

sftp.close()

commands = [
    f"cd {REMOTE_DIR}",
    "echo '=== Criando symlink .env -> .env.production ==='",
    "ln -sf .env.production .env",
    "echo '=== Verificando variaveis ==='",
    "grep -E '^(DATABASE_PASSWORD|JWT_SECRET|CORS_ORIGINS)=' .env | sed 's/.*/OK: variavel definida/'",
    "echo '=== Parando containers antigos ==='",
    "docker compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true",
    "echo '=== Removendo volume postgres corrompido (se existir) ==='",
    "docker volume rm truck_postgres_data 2>/dev/null || echo 'Volume ja removido ou nao existe'",
    "echo '=== Build e start ==='",
    "docker compose -f docker-compose.prod.yml up --build -d",
    "echo '=== Status ==='",
    "docker compose -f docker-compose.prod.yml ps",
    "echo '=== Aguardando 15s para inicializacao ==='",
    "sleep 15",
    "echo '=== Logs do postgres ==='",
    "docker logs --tail 20 truck-postgres",
    "echo '=== Logs do backend ==='",
    "docker logs --tail 40 truck-backend",
]

cmd = "; ".join(commands)
print("\nExecutando comandos de deploy...")
stdin, stdout, stderr = client.exec_command(cmd, get_pty=True)

# Envia sudo se necessario (nao deve ser necessario pois usuario esta no grupo docker)
stdin.close()

for line in iter(stdout.readline, ""):
    print(line, end="")

err = stderr.read().decode()
if err:
    print("STDERR:", err)

# Testa health endpoint
print("\n=== Testando endpoint /health ===")
stdin2, stdout2, stderr2 = client.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost/health || echo '000'")
health_code = stdout2.read().decode().strip()
print(f"HTTP Status /health: {health_code}")

client.close()
print("\nDeploy finalizado!")
