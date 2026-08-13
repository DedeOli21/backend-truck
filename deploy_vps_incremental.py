#!/usr/bin/env python3
import paramiko
import os

HOST = "40.160.82.252"
USER = "ubuntu"
PASS = "Liene@oli205"
REMOTE_DIR = "/opt/backend-truck"

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

# Envia código fonte atualizado (src/)
print("Enviando código fonte src/ para o VPS...")
local_src = "/home/david/projeto-freela/backend-truck/src"
remote_src = f"{REMOTE_DIR}/src"

stdin, stdout, stderr = client.exec_command(f"rm -rf {remote_src}")
stdout.channel.recv_exit_status()
client.exec_command(f"mkdir -p {remote_src}")

for root, dirs, files in os.walk(local_src):
    dirs[:] = [d for d in dirs if d not in {'node_modules', 'dist'}]
    rel_path = os.path.relpath(root, local_src)
    remote_path = os.path.join(remote_src, rel_path).replace('\\', '/')
    client.exec_command(f"mkdir -p {remote_path}")
    for name in files:
        local_file = os.path.join(root, name)
        remote_file = os.path.join(remote_path, name).replace('\\', '/')
        sftp.put(local_file, remote_file)

# Envia arquivos de configuração
for config_file in ['package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.build.json', 'nest-cli.json']:
    local_config = f"/home/david/projeto-freela/backend-truck/{config_file}"
    if os.path.exists(local_config):
        print(f"Enviando {config_file}")
        sftp.put(local_config, f"{REMOTE_DIR}/{config_file}")

sftp.close()

commands = [
    f"cd {REMOTE_DIR}",
    "echo '=== Rebuild do BACKEND (volume do postgres preservado) ==='",
    # Rebuida apenas o backend; a migration roda no entrypoint do container
    "docker compose -f docker-compose.prod.yml up -d --build backend",
    "echo '=== Status ==='",
    "docker compose -f docker-compose.prod.yml ps",
    "echo '=== Aguardando 20s para boot + migrations ==='",
    "sleep 20",
    "echo '=== Logs do backend ==='",
    "docker logs --tail 50 truck-backend",
]

cmd = "; ".join(commands)
print("\nExecutando comandos de deploy...")
stdin, stdout, stderr = client.exec_command(cmd, get_pty=True)
stdin.close()

for line in iter(stdout.readline, ""):
    print(line, end="")

err = stderr.read().decode()
if err:
    print("STDERR:", err)

client.close()
print("\nDeploy incremental finalizado!")
