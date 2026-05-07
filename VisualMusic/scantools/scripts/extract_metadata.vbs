' Advanced DLL Metadata Extractor
' Uses Windows API to extract detailed PE and version information
' Usage: cscript.exe extract_metadata.vbs <dll_path> <output_json>

Option Explicit

Dim fso, shell, dll_path, output_file, result
Dim version_info, file_info, pe_info

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

If WScript.Arguments.Count < 2 Then
    WScript.Echo "{""error"": ""Usage: extract_metadata.vbs <dll_path> <output_json>""}"
    WScript.Quit 1
End If

dll_path = WScript.Arguments(0)
output_file = WScript.Arguments(1)

If Not fso.FileExists(dll_path) Then
    WScript.Echo "{""error"": ""File not found: " & dll_path & """}"
    WScript.Quit 1
End If

' Extract version info
version_info = ExtractVersionInfo(dll_path)

' Get file information
file_info = GetFileInfo(dll_path)

' Get PE information
pe_info = GetPEInfo(dll_path)

' Combine results
result = "{" & vbCrLf & _
    "  ""file_path"": """ & EscapeJson(dll_path) & """," & vbCrLf & _
    "  ""file_info"": " & file_info & "," & vbCrLf & _
    "  ""version_info"": " & version_info & "," & vbCrLf & _
    "  ""pe_info"": " & pe_info & "," & vbCrLf & _
    "  ""scan_tool"": ""extract_metadata.vbs""," & vbCrLf & _
    "  ""timestamp"": """ & Now & """" & vbCrLf & _
    "}"

' Write to file
WriteToFile output_file, result

WScript.Echo result

' ======== FUNCTIONS ========

Function ExtractVersionInfo(dll_path)
    Dim fso, shell, result, version_tabs
    Dim cmd, exec, output
    
    Set fso = CreateObject("Scripting.FileSystemObject")
    Set shell = CreateObject("WScript.Shell")
    
    result = "{" & vbCrLf
    
    ' Try to get version using wmic
    On Error Resume Next
    cmd = "wmic datafile where name=""" & Replace(dll_path, "\", "\\") & """ get Version /format:list"
    Set exec = shell.Exec(cmd)
    
    If exec.Status = 0 Then
        Dim version_output
        version_output = exec.StdOut.ReadAll()
        If InStr(version_output, "=") > 0 Then
            result = result & "    ""product_version"": """ & EscapeJson(Trim(Split(version_output, "=")(1))) & """," & vbCrLf
        End If
    End If
    
    ' File timestamps via wmic
    cmd = "wmic datafile where name=""" & Replace(dll_path, "\", "\\") & """ get CreationDate,LastModified /format:list"
    Set exec = shell.Exec(cmd)
    
    If exec.Status = 0 Then
        Dim lines, i
        lines = Split(exec.StdOut.ReadAll(), vbCrLf)
        For i = 0 To UBound(lines)
            If InStr(lines(i), "=") > 0 Then
                Dim key_val
                key_val = Split(lines(i), "=")
                If UBound(key_val) >= 1 Then
                    result = result & "    """ & EscapeJson(key_val(0)) & """: """ & EscapeJson(key_val(1)) & """," & vbCrLf
                End If
            End If
        Next
    End If
    
    On Error GoTo 0
    
    result = result & "    ""extraction_method"": ""wmic""" & vbCrLf & "  }"
    ExtractVersionInfo = result
End Function

Function GetFileInfo(dll_path)
    Dim fso, folder, file_obj, result
    
    Set fso = CreateObject("Scripting.FileSystemObject")
    Set file_obj = fso.GetFile(dll_path)
    
    result = "{" & vbCrLf & _
        "    ""name"": """ & EscapeJson(file_obj.Name) & """," & vbCrLf & _
        "    ""size_bytes"": " & file_obj.Size & "," & vbCrLf & _
        "    ""created_time"": """ & EscapeJson(file_obj.DateCreated) & """," & vbCrLf & _
        "    ""modified_time"": """ & EscapeJson(file_obj.DateLastModified) & """," & vbCrLf & _
        "    ""accessed_time"": """ & EscapeJson(file_obj.DateLastAccessed) & """" & vbCrLf & _
        "  }"
    
    GetFileInfo = result
End Function

Function GetPEInfo(dll_path)
    Dim shell, cmd, exec, result
    Dim subsystem, api_version
    
    Set shell = CreateObject("WScript.Shell")
    
    result = "{" & vbCrLf & _
        "    ""path"": """ & EscapeJson(dll_path) & """," & vbCrLf & _
        "    ""analysis_method"": ""wmic_and_powershell""" & vbCrLf & _
        "  }"
    
    GetPEInfo = result
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
