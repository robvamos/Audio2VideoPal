' Digital Signature and Security Analysis
' Checks for digital signatures, certificates, and security attributes
' Usage: cscript.exe check_security.vbs <dll_path> <output_json>

Option Explicit
Dim fso, shell, wsh_shell, dll_path, output_file
Dim result

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
Set wsh_shell = CreateObject("WScript.Shell")

If WScript.Arguments.Count < 2 Then
    WScript.Echo "{""error"": ""Usage: check_security.vbs <dll_path> <output_json>""}"
    WScript.Quit 1
End If

dll_path = WScript.Arguments(0)
output_file = WScript.Arguments(1)

If Not fso.FileExists(dll_path) Then
    WScript.Echo "{""error"": ""File not found: " & dll_path & """}"
    WScript.Quit 1
End If

' Build security analysis result
result = "{" & vbCrLf & _
    "  ""file_path"": """ & EscapeJson(dll_path) & """," & vbCrLf & _
    "  ""digital_signature"": " & CheckDigitalSignature(dll_path) & "," & vbCrLf & _
    "  ""file_attributes"": " & GetFileAttributes(dll_path) & "," & vbCrLf & _
    "  ""security_scan"": " & ScanSecurityAttributes(dll_path) & "," & vbCrLf & _
    "  ""timestamp"": """ & Now & """" & vbCrLf & _
    "}"

WriteToFile output_file, result
WScript.Echo result

' ======== FUNCTIONS ========

Function CheckDigitalSignature(dll_path)
    Dim cmd, exec, output, result
    
    result = "{" & vbCrLf & _
        "    ""method"": ""sigcheck_via_cmd""," & vbCrLf
    
    On Error Resume Next
    
    ' Try using built-in certificate checking
    cmd = "certutil -verify """ & dll_path & """ 2>&1"
    Set exec = shell.Exec(cmd)
    
    If exec.Status = 0 Then
        Dim sig_output
        sig_output = exec.StdOut.ReadAll()
        If InStr(sig_output, "SignatureNotPresent") > 0 Or InStr(sig_output, "Signature not present") > 0 Then
            result = result & "    ""signed"": false," & vbCrLf & _
                "    ""reason"": ""No digital signature found""" & vbCrLf
        ElseIf InStr(sig_output, "Verified") > 0 Then
            result = result & "    ""signed"": true," & vbCrLf & _
                "    ""verified"": true" & vbCrLf
        Else
            result = result & "    ""signed"": null," & vbCrLf & _
                "    ""detail"": """ & EscapeJson(Left(sig_output, 100)) & """" & vbCrLf
        End If
    Else
        result = result & "    ""signed"": null," & vbCrLf & _
            "    ""error"": ""Could not determine signature status""" & vbCrLf
    End If
    
    On Error GoTo 0
    
    result = result & "  }"
    CheckDigitalSignature = result
End Function

Function GetFileAttributes(dll_path)
    Dim fso, file_obj, attrs, result
    
    Set fso = CreateObject("Scripting.FileSystemObject")
    Set file_obj = fso.GetFile(dll_path)
    
    result = "{" & vbCrLf
    
    ' ReadOnly attribute (1)
    If (file_obj.Attributes And 1) = 1 Then
        result = result & "    ""readonly"": true," & vbCrLf
    End If
    
    ' Hidden attribute (2)
    If (file_obj.Attributes And 2) = 2 Then
        result = result & "    ""hidden"": true," & vbCrLf
    End If
    
    ' System attribute (4)
    If (file_obj.Attributes And 4) = 4 Then
        result = result & "    ""system"": true," & vbCrLf
    End If
    
    ' Archive attribute (32)
    If (file_obj.Attributes And 32) = 32 Then
        result = result & "    ""archive"": true," & vbCrLf
    End If
    
    result = result & "    ""raw_attributes"": " & file_obj.Attributes & vbCrLf & _
        "  }"
    
    GetFileAttributes = result
End Function

Function ScanSecurityAttributes(dll_path)
    Dim result, cmd, exec, output
    
    result = "{" & vbCrLf & _
        "    ""checks"": [" & vbCrLf
    
    ' Check for known suspicious patterns
    Dim fileSize, suspiciousNames, isSuspicious
    Set fso = CreateObject("Scripting.FileSystemObject")
    
    fileSize = fso.GetFile(dll_path).Size
    isSuspicious = False
    
    ' Check file size - very small DLLs might be suspicious
    If fileSize < 1024 Then
        result = result & "      {""check"": ""file_size"", ""status"": ""warning"", ""message"": ""File smaller than 1KB""}," & vbCrLf
        isSuspicious = True
    End If
    
    ' Check for temp or unusual paths
    If InStr(LCase(dll_path), "temp") > 0 Or InStr(LCase(dll_path), "\tmp\") > 0 Then
        result = result & "      {""check"": ""location"", ""status"": ""warning"", ""message"": ""Located in temp directory""}," & vbCrLf
        isSuspicious = True
    End If
    
    result = result & "      {""check"": ""overall"", ""status"": """ & IIf(isSuspicious, "warning", "normal") & """, ""is_suspicious"": " & LCase(CStr(isSuspicious)) & "}" & vbCrLf & _
        "    ]," & vbCrLf & _
        "    ""detailed_analysis"": ""Manual review recommended for untrusted sources""" & vbCrLf & _
        "  }"
    
    ScanSecurityAttributes = result
End Function

Function EscapeJson(strText)
    Dim result
    result = strText
    result = Replace(result, "\", "\\")
    result = Replace(result, """", "\""")
    result = Replace(result, vbCrLf, "\n")
    result = Replace(result, vbCr, "\n")
    result = Replace(result, vbLf, "\n")
    result = Replace(result, vbTab, "\t")
    EscapeJson = result
End Function

Sub WriteToFile(filePath, content)
    Dim file
    Set file = fso.CreateTextFile(filePath, True)
    file.Write content
    file.Close
End Sub
