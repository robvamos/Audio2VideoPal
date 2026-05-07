' Windows Management Instrumentation Analysis
' Gathers system and process information for plugin compatibility analysis
' Usage: cscript.exe gather_wmi_info.vbs <dll_path> <output_json>

Option Explicit
Dim objWMIService, colItems, objItem
Dim fso, shell, dll_path, output_file
Dim result

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

If WScript.Arguments.Count < 2 Then
    WScript.Echo "{""error"": ""Usage: gather_wmi_info.vbs <dll_path> <output_json>""}"
    WScript.Quit 1
End If

dll_path = WScript.Arguments(0)
output_file = WScript.Arguments(1)

If Not fso.FileExists(dll_path) Then
    WScript.Echo "{""error"": ""File not found: " & dll_path & """}"
    WScript.Quit 1
End If

' Start building result
result = "{" & vbCrLf & _
    "  ""dll_path"": """ & EscapeJson(dll_path) & """," & vbCrLf & _
    "  ""os_info"": " & GetOsInfo() & "," & vbCrLf & _
    "  ""gpu_info"": " & GetGpuInfo() & "," & vbCrLf & _
    "  ""system_info"": " & GetSystemInfo() & "," & vbCrLf & _
    "  ""audio_devices"": " & GetAudioDevices() & "," & vbCrLf & _
    "  ""timestamp"": """ & Now & """" & vbCrLf & _
    "}"

WriteToFile output_file, result
WScript.Echo result

' ======== FUNCTIONS ========

Function GetOsInfo()
    Dim objWMI, colItems, objItem, result, osInfo
    Dim os_name, os_version, build_number
    
    Set objWMI = GetObject("winmgmts:")
    Set colItems = objWMI.ExecQuery("SELECT * FROM Win32_OperatingSystem")
    
    result = "{" & vbCrLf
    
    For Each objItem in colItems
        os_name = objItem.Name
        os_version = objItem.Version
        build_number = objItem.BuildNumber
        
        result = result & "    ""name"": """ & EscapeJson(Left(os_name, InStr(os_name, "|") - 1)) & """," & vbCrLf
        result = result & "    ""version"": """ & os_version & """," & vbCrLf
        result = result & "    ""build_number"": """ & build_number & """," & vbCrLf
        result = result & "    ""os_type"": """ & objItem.OSType & HexEncode(objItem.OSType) & """" & vbCrLf
    Next
    
    result = result & "  }"
    GetOsInfo = result
End Function

Function GetGpuInfo()
    Dim objWMI, colItems, objItem, result, gpu_count
    
    Set objWMI = GetObject("winmgmts:")
    Set colItems = objWMI.ExecQuery("SELECT * FROM Win32_VideoController")
    
    result = "{" & vbCrLf & _
        "    ""adapter_count"": " & colItems.Count & "," & vbCrLf & _
        "    ""adapters"": [" & vbCrLf
    
    gpu_count = 0
    For Each objItem in colItems
        result = result & "      {" & vbCrLf & _
            "        ""name"": """ & EscapeJson(objItem.Name) & """," & vbCrLf & _
            "        ""driver_version"": """ & EscapeJson(objItem.DriverVersion) & """," & vbCrLf & _
            "        ""memory"": " & objItem.AdapterRAM & vbCrLf & _
            "      }"
        
        gpu_count = gpu_count + 1
        If gpu_count < colItems.Count Then
            result = result & "," & vbCrLf
        Else
            result = result & vbCrLf
        End If
    Next
    
    result = result & "    ]" & vbCrLf & _
        "  }"
    
    GetGpuInfo = result
End Function

Function GetSystemInfo()
    Dim objWMI, colItems, objItem, result
    Dim manufacturer, model, cores, threads
    
    Set objWMI = GetObject("winmgmts:")
    Set colItems = objWMI.ExecQuery("SELECT * FROM Win32_ComputerSystem")
    
    result = "{" & vbCrLf
    
    For Each objItem in colItems
        manufacturer = objItem.Manufacturer
        model = objItem.Model
        
        result = result & "    ""manufacturer"": """ & EscapeJson(manufacturer) & """," & vbCrLf & _
            "    ""model"": """ & EscapeJson(model) & """," & vbCrLf & _
            "    ""total_physical_memory"": " & objItem.TotalPhysicalMemory & "," & vbCrLf & _
            "    ""system_family"": """ & EscapeJson(objItem.SystemFamily) & """" & vbCrLf
    Next
    
    result = result & "  }"
    GetSystemInfo = result
End Function

Function GetAudioDevices()
    Dim objWMI, colItems, objItem, result, count
    
    Set objWMI = GetObject("winmgmts:")
    Set colItems = objWMI.ExecQuery("SELECT * FROM Win32_SoundDevice")
    
    result = "{" & vbCrLf & _
        "    ""device_count"": " & colItems.Count & "," & vbCrLf & _
        "    ""devices"": [" & vbCrLf
    
    count = 0
    For Each objItem in colItems
        result = result & "      {" & vbCrLf & _
            "        ""name"": """ & EscapeJson(objItem.Name) & """," & vbCrLf & _
            "        ""status"": """ & EscapeJson(objItem.Status) & """" & vbCrLf & _
            "      }"
        
        count = count + 1
        If count < colItems.Count Then
            result = result & "," & vbCrLf
        Else
            result = result & vbCrLf
        End If
    Next
    
    result = result & "    ]" & vbCrLf & _
        "  }"
    
    GetAudioDevices = result
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

Function HexEncode(num)
    HexEncode = " (0x" & Hex(num) & ")"
End Function

Sub WriteToFile(filePath, content)
    Dim file
    Set file = fso.CreateTextFile(filePath, True)
    file.Write content
    file.Close
End Sub
