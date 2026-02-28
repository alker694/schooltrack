' ═══════════════════════════════════════════════════════════
'  حضور الحلقات — launch.vbs
'  تشغيل التطبيق بدون نافذة سوداء
'  انقر نقراً مزدوجاً لتشغيل التطبيق
' ═══════════════════════════════════════════════════════════

Dim oShell, oFSO, sDir, sNode

Set oShell = CreateObject("WScript.Shell")
Set oFSO   = CreateObject("Scripting.FileSystemObject")

' مسار مجلد المشروع
sDir = oFSO.GetParentFolderName(WScript.ScriptFullName)

' البحث عن node.exe
Dim nodePaths(5)
nodePaths(0) = "node.exe"
nodePaths(1) = oShell.ExpandEnvironmentStrings("%ProgramFiles%\nodejs\node.exe")
nodePaths(2) = oShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%\nodejs\node.exe")
nodePaths(3) = oShell.ExpandEnvironmentStrings("%APPDATA%\nvm\current\node.exe")
nodePaths(4) = oShell.ExpandEnvironmentStrings("%LOCALAPPDATA%\Programs\nodejs\node.exe")
nodePaths(5) = oShell.ExpandEnvironmentStrings("%NVM_HOME%\node.exe")

sNode = ""
Dim i
For i = 0 To 5
    If nodePaths(i) = "node.exe" Then
        ' نحاول node.exe من PATH مباشرةً
        sNode = "node.exe"
        Exit For
    ElseIf oFSO.FileExists(nodePaths(i)) Then
        sNode = """" & nodePaths(i) & """"
        Exit For
    End If
Next

If sNode = "" Then
    MsgBox "لم يتم العثور على Node.js." & vbCrLf & _
           "يرجى تثبيت Node.js من https://nodejs.org" & vbCrLf & vbCrLf & _
           "Node.js not found. Please install it from https://nodejs.org", _
           16, "حضور الحلقات — خطأ"
    WScript.Quit 1
End If

' التحقق من وجود launcher.js
Dim sLauncher
sLauncher = sDir & "\launcher.js"
If Not oFSO.FileExists(sLauncher) Then
    MsgBox "الملف launcher.js غير موجود في:" & vbCrLf & sDir, 16, "خطأ"
    WScript.Quit 1
End If

' تشغيل launcher.js بدون نافذة (0 = مخفي تماماً)
Dim sCmd
sCmd = sNode & " """ & sLauncher & """"
oShell.Run sCmd, 0, False

' انتظار ثانيتين ثم عرض رسالة تأكيد
WScript.Sleep 2000
oShell.Popup "✅ جارٍ تشغيل حضور الحلقات..." & vbCrLf & vbCrLf & _
             "سيفتح المتصفح تلقائياً." & vbCrLf & _
             "رابط الشبكة (للجوال) تم نسخه إلى الحافظة 📋", _
             3, "حضور الحلقات", 64
