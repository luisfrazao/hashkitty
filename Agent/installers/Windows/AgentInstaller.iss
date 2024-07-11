[Setup]
AppName=HashKitty Agent
AppVersion=1.0
DefaultDirName={pf}\HashKittyAgent
OutputDir=Agent\dist
OutputBaseFilename=AgentInstaller
Compression=zip
SolidCompression=yes
PrivilegesRequired=admin

[Files]
Source: ".\dist\Agent.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: ".\dist\hashcat-6.2.6\*"; DestDir: "{app}\hashcat-6.2.6"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".\dist\lists\*"; DestDir: "{app}\lists"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".\dist\rules\*"; DestDir: "{app}\rules"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".\dist\pots"; DestDir: "{app}\pots"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".\dist\config.json"; DestDir: "{app}"; Flags: ignoreversion

[Code]
var
  WebSocketPage: TInputQueryWizardPage;

procedure MyLog(const Msg: string);
begin
  MsgBox(Msg, mbInformation, MB_OK);
end;

function CustomStringReplace(const S, OldPattern, NewPattern: string): string;
var
  OldPatternLen, NewPatternLen, StartPos: Integer;
  ResultStr: string;
begin
  ResultStr := S;
  OldPatternLen := Length(OldPattern);
  NewPatternLen := Length(NewPattern);
  StartPos := Pos(OldPattern, ResultStr);

  while StartPos > 0 do
  begin
    Delete(ResultStr, StartPos, OldPatternLen);
    Insert(NewPattern, ResultStr, StartPos);
    // Search for the next occurrence starting from the position after the newly inserted pattern
    StartPos := Pos(OldPattern, Copy(ResultStr, StartPos + NewPatternLen, Length(ResultStr)));
    // Adjust StartPos to the actual position in the original string
    if StartPos > 0 then
      StartPos := StartPos + NewPatternLen;
  end;

  Result := ResultStr;
end;



procedure InitializeWizard;
begin
  WebSocketPage := CreateInputQueryPage(wpWelcome,
    'WebSocket Configuration', 'Please enter the WebSocket URI:',
    'Enter the WebSocket URI below, then click Next.');
  WebSocketPage.Add('WebSocket URI:', False);
  WebSocketPage.Values[0] := 'ws://localhost:8484';
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ConfigFile: string;
  ConfigLines: TStringList;
begin
  if CurStep = ssPostInstall then
  begin
    ConfigFile := ExpandConstant('{app}\config.json');
    if FileExists(ConfigFile) then
    begin
      ConfigLines := TStringList.Create;
      try
        ConfigLines.LoadFromFile(ConfigFile);

        ConfigLines.Text := CustomStringReplace(ConfigLines.Text, '"websocket_uri": "ws://localhost:8484"', '"websocket_uri": "' + WebSocketPage.Values[0] + '"');

        ConfigLines.SaveToFile(ConfigFile);
      finally
        ConfigLines.Free;
      end;
    end else
    begin
      MyLog('Config file not found: ' + ConfigFile);
    end;
  end;
end;
