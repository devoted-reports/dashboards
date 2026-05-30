#!/usr/bin/env node
// lock-page.js — password-protect an HTML page with real AES-256-GCM encryption.
// The content is encrypted; it can only be read in a browser after entering the password.
// Usage: node lock-page.js <input.html> <output.html> <password> ["Page Title"]
const fs = require("fs");
const crypto = require("crypto");

const [, , inPath, outPath, password, titleArg] = process.argv;
if (!inPath || !outPath || !password) {
  console.error('Usage: node lock-page.js <input.html> <output.html> <password> ["Title"]');
  process.exit(1);
}
const title = titleArg || "Protected dashboard";
const html = fs.readFileSync(inPath, "utf8");

const ITER = 200000;
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(password, salt, ITER, 32, "sha256");
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
const ct = Buffer.concat([cipher.update(Buffer.from(html, "utf8")), cipher.final()]);
const tag = cipher.getAuthTag();
const payload = Buffer.concat([ct, tag]).toString("base64"); // SubtleCrypto expects tag appended

const out = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} · Locked</title>
<style>
  :root{--p:#6D45BF;--d:#3B2A61}
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;
    background:radial-gradient(circle at 30% 20%,#4a3580,#2a1f47);color:#fff}
  .card{background:rgba(255,255,255,.07);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.15);
    padding:40px 36px;border-radius:18px;width:340px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,.35);text-align:center}
  .lock{font-size:34px;margin-bottom:8px}
  h1{font-size:19px;margin:0 0 4px}
  p{font-size:13px;opacity:.7;margin:0 0 22px}
  input{width:100%;padding:13px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.25);
    background:rgba(0,0,0,.25);color:#fff;font-size:15px;outline:none}
  input:focus{border-color:#A593C9}
  button{width:100%;margin-top:12px;padding:13px;border:0;border-radius:10px;background:var(--p);color:#fff;
    font-size:15px;font-weight:600;cursor:pointer}
  button:hover{background:#7d54d6}
  .err{color:#ff9b9b;font-size:13px;height:18px;margin-top:10px}
</style></head>
<body>
  <form class="card" id="f">
    <div class="lock">&#128274;</div>
    <h1>${title}</h1>
    <p>Enter the password to view this dashboard.</p>
    <input id="pw" type="password" autocomplete="off" placeholder="Password" autofocus>
    <button type="submit">Unlock</button>
    <div class="err" id="e"></div>
  </form>
<script>
const ITER=${ITER}, SALT=b64("${salt.toString("base64")}"), IV=b64("${iv.toString("base64")}"), DATA=b64("${payload}");
function b64(s){const r=atob(s),a=new Uint8Array(r.length);for(let i=0;i<r.length;i++)a[i]=r.charCodeAt(i);return a;}
document.getElementById("f").addEventListener("submit",async(ev)=>{
  ev.preventDefault();
  const e=document.getElementById("e"); e.textContent="";
  const pw=document.getElementById("pw").value;
  try{
    const enc=new TextEncoder();
    const base=await crypto.subtle.importKey("raw",enc.encode(pw),"PBKDF2",false,["deriveKey"]);
    const key=await crypto.subtle.deriveKey({name:"PBKDF2",salt:SALT,iterations:ITER,hash:"SHA-256"},
      base,{name:"AES-GCM",length:256},false,["decrypt"]);
    const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:IV},key,DATA);
    const html=new TextDecoder().decode(plain);
    document.open();document.write(html);document.close();
  }catch(err){ e.textContent="Wrong password. Try again."; }
});
</script>
</body></html>`;
fs.writeFileSync(outPath, out);
console.log("locked -> " + outPath + " (" + ct.length + " bytes encrypted)");
