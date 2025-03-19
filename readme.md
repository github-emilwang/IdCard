schtasks /create /tn "ID Card PDF Generator" /tr "C:\Program Files\nodejs\node.exe C:\path\to\your\project\server.js" /sc ONSTART /ru SYSTEM /f

