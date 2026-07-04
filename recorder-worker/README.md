# DND721 Recorder Worker

Self-hosted session recorder that replaces LiveKit Cloud egress (which is
metered on the free plan). The worker joins each voice room as a **hidden
participant**, records everyone's audio, mixes it with ffmpeg, and uploads
`.ogg` files to Supabase Storage — feeding the exact same
`session_recordings` / `recording_tracks` tables and recording editor the
egress pipeline used. **Zero egress minutes are consumed.**

```
DM clicks Record → app inserts job row (status='requested')
                 → worker joins room, records PCM per participant
DM clicks Stop   → app sets status='stopping'
                 → worker mixes composite + per-speaker tracks, uploads,
                   marks status='completed' with file URLs
```

The app switches to this pipeline when the Vercel env var
**`RECORDER_MODE=bot`** is set (unset = old egress behavior).

## Requirements

- Node.js ≥ 20
- ffmpeg on PATH (`sudo apt install -y ffmpeg`)
- Network access to your LiveKit project and Supabase

## Run it (any machine — your PC works)

```bash
cd recorder-worker
cp .env.example .env      # fill in the values
npm install
npm start
```

Leave it running during game sessions. Multiple simultaneous sessions are
fine — each recording job is independent.

---

# Deploying on Oracle Cloud "Always Free" (24/7, $0)

Oracle's Always Free tier is permanent (not a trial): up to 4 ARM OCPUs /
24 GB RAM split across VMs. One small VM runs this worker comfortably.

## 1. Create the account & VM

1. Sign up at <https://www.oracle.com/cloud/free/> (credit card required for
   identity verification; Always Free resources never charge it).
2. Console → **Compute → Instances → Create instance**.
3. Name: `dnd721-recorder`.
4. Image: **Ubuntu 24.04** (aarch64). Shape: **Ampere A1.Flex**, 1 OCPU /
   6 GB RAM (well within Always Free).
5. Under **Add SSH keys**, paste your public key (`~/.ssh/id_ed25519.pub`;
   generate one with `ssh-keygen` if needed).
6. Create, wait for RUNNING, note the public IP.

No inbound ports are needed — the worker only makes outbound connections —
so the default security list is fine.

## 2. Install runtime

```bash
ssh ubuntu@<VM_PUBLIC_IP>

sudo apt update && sudo apt install -y ffmpeg curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # should print v22.x
```

## 3. Deploy the worker

```bash
# from your PC, in the repo root:
scp -r recorder-worker ubuntu@<VM_PUBLIC_IP>:~/recorder-worker

# on the VM:
cd ~/recorder-worker
cp .env.example .env
nano .env        # fill in LiveKit + Supabase values
npm install
npm start        # test run — you should see "recorder worker up"
```

Start a recording from the app; the worker log should show it joining the
room within a few seconds. Ctrl-C when satisfied.

## 4. Run 24/7 with systemd

```bash
sudo tee /etc/systemd/system/dnd721-recorder.service > /dev/null <<'EOF'
[Unit]
Description=DND721 session recorder worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/recorder-worker
EnvironmentFile=/home/ubuntu/recorder-worker/.env
ExecStart=/usr/bin/node index.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now dnd721-recorder
systemctl status dnd721-recorder        # should be active (running)
journalctl -u dnd721-recorder -f        # live logs
```

`Restart=always` + the worker's SIGTERM handler mean a reboot or crash
finalizes/fails jobs cleanly rather than leaving rows stuck.

## 5. Flip the app over

In Vercel → Project → Settings → Environment Variables, add:

```
RECORDER_MODE=bot
```

Redeploy. The Record button in the session table now creates worker jobs
instead of LiveKit egress. To roll back to egress at any time, remove the
var and redeploy.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Row stuck at `requested` | Worker not running / can't reach Supabase — check `journalctl -u dnd721-recorder` |
| `recorder connect failed` in row error | LIVEKIT_WS_URL/key/secret wrong on the VM |
| `ffmpeg spawn failed` | `sudo apt install -y ffmpeg` |
| `storage upload … violates row-level security` | You used the anon key — use the **service role** key |
| Recording completes but no audio | Nobody's mic was unmuted; the worker marks it `failed: no audio captured` |
