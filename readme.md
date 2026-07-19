# Guía de Despliegue (Lunes)

Necesitás 3 terminales abiertas, en este orden:

### Terminal 1 - Ollama
*(Si no está corriendo como servicio en la bandeja del sistema)*
```powershell
ollama serve
```

### Terminal 2 - Backend
```powershell
cd C:\Users\samodeo\Desktop\despliegue-ias\chatbot-interno-alibaba\backend
node server.js
```

### Terminal 3 - Frontend
```powershell
cd C:\Users\samodeo\Desktop\despliegue-ias\chatbot-interno-alibaba\frontend
npm run dev
```

---

## Verificación rápida antes de la demo

```powershell
ollama list
```

* **Nota 1:** Confirmá que aparece `qwen2.5:7b-instruct-q4_K_M`. Si Ollama ya corre como ícono en la bandeja del sistema, podés saltear la **Terminal 1**.
* **Nota 2 (Orden de arranque):** El orden de arranque importa: Ollama primero, backend segundo, frontend último. Abrí http://localhost:5173 recién cuando los tres estén arriba.
* **Nota 3 (Matar Ollama):**
-  Get-Process | Where-Object {$_.Name -like "*ollama*"}.
-  Stop-Process -Name "ollama" -Force
-  Get-NetTCPConnection -LocalPort 11434 -ErrorAction SilentlyContinue