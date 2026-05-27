# Publish Dashboard to devoted-reports

Publishes any HTML dashboard to `devoted-reports.github.io/dashboards/` with password protection. Handles git workflow, password injection, and returns a ready-to-share Slack message.

## Trigger phrases

Any of these should invoke this skill:
- "set me up for devoted reports dashboards" → run **Auto-setup** below
- "опублікуй дашборд" / "опублікуй репорт"
- "publish dashboard" / "publish report"
- "пушни на гіт" / "push to github"
- "оновити live" / "go live"
- "відправ командний репорт"

## Auto-setup (first time only)

Trigger: user says "set me up for devoted reports dashboards" or `~/devoted-dashboards` doesn't exist.

Run these steps silently, one by one. Tell the user what's happening in plain language (no technical jargon):

```bash
# 1. Check if Homebrew is installed
command -v brew &>/dev/null && echo "brew ok" || echo "brew missing"
```
If missing → tell user: "I need to install one tool first. This will take ~2 minutes." Then:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

```bash
# 2. Install gh CLI if missing
command -v gh &>/dev/null && echo "gh ok" || brew install gh
```

```bash
# 3. Check GitHub auth
gh auth status &>/dev/null && echo "auth ok" || gh auth login --hostname github.com --git-protocol https --web
```
If auth needed → tell user: "A browser window will open — just log in to your GitHub account and come back here."

```bash
# 4. Clone the repo
[ -d ~/devoted-dashboards/.git ] && echo "exists" || gh repo clone devoted-reports/dashboards ~/devoted-dashboards
```

```bash
# 5. Confirm
ls ~/devoted-dashboards
```

When done, tell the user:
> "You're all set! 🎉 Whenever you want to publish a dashboard, just say: **'Publish this dashboard'** and drag your HTML file into the message."

## Local repo path

The `devoted-reports/dashboards` repo is cloned at:
```
~/devoted-dashboards
```

## Team folder mapping

| Team                  | Folder         |
|-----------------------|----------------|
| Recruitment           | `recruitment`  |
| Finance               | `fin`          |
| Fusion by Devoted     | `fusion`       |
| Business Development  | `bd`           |

If the user hasn't said which team they are, ask:
> "Яка твоя папка? (recruitment / fin / fusion / bd)"

## Workflow — step by step

### 1. Identify the HTML file

Ask if not provided:
> "Який файл публікуємо? Вкажи повний шлях до HTML файлу."

### 2. Generate password and hash

```bash
# Generate a random password (format: devoted-XXXXXXXX)
PASSWORD=$(python3 -c "import secrets; print('devoted-' + secrets.token_hex(4))")
echo "Password: $PASSWORD"

# Compute SHA-256 hash
HASH=$(python3 -c "import hashlib, sys; print(hashlib.sha256(sys.argv[1].encode()).hexdigest())" "$PASSWORD")
echo "Hash: $HASH"
```

### 3. Inject password gate into HTML

Run this Python script, replacing `INPUT_FILE`, `OUTPUT_FILE`, `HASH_VALUE`, and `REPORT_TITLE`:

```bash
python3 - <<'PYEOF'
import sys, re

INPUT_FILE  = "/path/to/input.html"      # ← replace
OUTPUT_FILE = "/path/to/output.html"     # ← same or different
HASH_VALUE  = "abc123..."                # ← SHA-256 hash from step 2
REPORT_TITLE = "Talent Report — May 2026"  # ← short title for the gate screen

GATE_CSS = """
  /* ── PASSWORD GATE ── */
  #pw-gate {
    position: fixed; inset: 0; z-index: 9999;
    background: #f5f5f7;
    display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, 'DM Sans', system-ui, sans-serif;
  }
  #pw-gate.hidden { display: none; }
  #pw-box {
    background: #fff; border: 1px solid #e5e5ea;
    border-radius: 12px; padding: 36px 40px; width: 340px;
    text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  }
  #pw-logo {
    font-size: 11px; font-weight: 600; letter-spacing: 0.12em;
    text-transform: uppercase; color: #8e8e93; margin-bottom: 18px;
  }
  #pw-title {
    font-size: 15px; font-weight: 600; color: #1c1c1e; margin-bottom: 6px;
  }
  #pw-sub {
    font-size: 12px; color: #8e8e93; margin-bottom: 22px;
  }
  #pw-input {
    width: 100%; padding: 10px 12px; font-size: 13px;
    border: 1px solid #e5e5ea; border-radius: 8px;
    background: #f5f5f7; color: #1c1c1e; outline: none;
    margin-bottom: 12px; box-sizing: border-box;
    transition: border-color 0.15s;
  }
  #pw-input:focus { border-color: #636366; }
  #pw-input.pw-error { border-color: #ff3b30; }
  #pw-btn {
    width: 100%; padding: 10px; font-size: 13px; font-weight: 600;
    background: #1c1c1e; color: #fff;
    border: none; border-radius: 8px; cursor: pointer;
    transition: opacity 0.15s;
  }
  #pw-btn:hover { opacity: 0.82; }
  #pw-err {
    font-size: 11px; color: #ff3b30; margin-top: 10px; min-height: 16px;
  }
"""

GATE_HTML = f"""
<!-- PASSWORD GATE -->
<div id="pw-gate">
  <div id="pw-box">
    <div id="pw-logo">Devoted Reports</div>
    <div id="pw-title">{REPORT_TITLE}</div>
    <div id="pw-sub">This report is confidential.</div>
    <input id="pw-input" type="password" placeholder="Password" autocomplete="current-password" />
    <button id="pw-btn">Unlock</button>
    <div id="pw-err"></div>
  </div>
</div>
"""

GATE_JS = f"""
  <!-- PASSWORD GATE LOGIC -->
  <script>
    (function () {{
      var HASH = '{HASH_VALUE}';
      var gate  = document.getElementById('pw-gate');
      var input = document.getElementById('pw-input');
      var btn   = document.getElementById('pw-btn');
      var err   = document.getElementById('pw-err');
      if (sessionStorage.getItem('dr_unlocked') === '1') {{ gate.classList.add('hidden'); return; }}
      function sha256(str) {{
        var buf = new TextEncoder().encode(str);
        return crypto.subtle.digest('SHA-256', buf).then(function(hash) {{
          return Array.from(new Uint8Array(hash)).map(function(b) {{ return b.toString(16).padStart(2,'0'); }}).join('');
        }});
      }}
      function attempt() {{
        var val = input.value;
        if (!val) return;
        sha256(val).then(function(digest) {{
          if (digest === HASH) {{
            sessionStorage.setItem('dr_unlocked', '1');
            gate.classList.add('hidden');
          }} else {{
            input.classList.add('pw-error');
            err.textContent = 'Incorrect password. Try again.';
            input.value = ''; input.focus();
          }}
        }});
      }}
      btn.addEventListener('click', attempt);
      input.addEventListener('keydown', function(e) {{
        if (e.key === 'Enter') attempt();
        input.classList.remove('pw-error'); err.textContent = '';
      }});
      input.focus();
    }})();
  </script>
"""

with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Inject CSS into <head> (before </head>)
if '</head>' in html:
    html = html.replace('</head>', f'<style>{GATE_CSS}</style>\n</head>', 1)
else:
    html = f'<style>{GATE_CSS}</style>\n' + html

# 2. Inject gate HTML after <body> tag (or at start)
if '<body' in html:
    html = re.sub(r'(<body[^>]*>)', r'\1' + GATE_HTML, html, count=1)
else:
    html = GATE_HTML + html

# 3. Inject JS before </body> (or at end)
if '</body>' in html:
    html = html.replace('</body>', GATE_JS + '\n</body>', 1)
else:
    html = html + GATE_JS

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"Done: {OUTPUT_FILE}")
PYEOF
```

### 4. Copy to team folder and push

```bash
TEAM_FOLDER="talent"          # ← replace with actual team folder
FILENAME="may-2026.html"      # ← keep original filename or rename to YYYY-MM-topic.html

REPO=~/devoted-dashboards
TARGET="$REPO/$TEAM_FOLDER/$FILENAME"

# Pull latest first (avoid conflicts)
cd "$REPO"
git pull --rebase origin main

# Create team folder if needed
mkdir -p "$REPO/$TEAM_FOLDER"

# Copy protected HTML
cp /path/to/output.html "$TARGET"

# Stage, commit, push
git add "$TARGET"
git commit -m "Add $TEAM_FOLDER/$FILENAME"
git push origin main
```

### 5. Return share message

After push, print this block for the user to copy into Slack/email:

```
📊 [Report Title]
🔗 https://devoted-reports.github.io/dashboards/[team]/[filename].html
🔑 Password: devoted-xxxxxxxx

Save the password — it won't be shown again.
```

## File naming convention

`YYYY-MM-topic.html` — examples:
- `2026-05-talent-monthly.html`
- `2026-05-production-sprint.html`
- `2026-Q2-bd-pipeline.html`

If the user gives a file with a messy name, suggest a clean one before copying.

## If git push fails — auth error

The user needs to set up SSH or GitHub CLI auth. Tell them:
> "Схоже є проблема з доступом до GitHub. Запусти: `gh auth login` і пройди авторизацію в браузері."

Check with:
```bash
ssh -T git@github.com
# or
gh auth status
```

## If ~/devoted-dashboards doesn't exist yet

```bash
cd ~
git clone https://github.com/devoted-reports/dashboards.git devoted-dashboards
```

(Use HTTPS for first clone if SSH not set up yet — GitHub CLI handles auth.)
