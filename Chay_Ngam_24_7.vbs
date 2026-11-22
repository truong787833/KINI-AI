' ========================================================
' KINI AI - Chay Ngam 24/24 Khong Hien Cua So Console
' ========================================================
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = currentDir
cmd = "cmd.exe /c python tools\service_24_7.py"
WshShell.Run cmd, 0, False

