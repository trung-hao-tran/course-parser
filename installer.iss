[Setup]
AppName=Course Management System
AppVersion=1.0.0
DefaultDirName={pf}\CourseManagementSystem
DefaultGroupName=Course Management System
OutputDir=installer
OutputBaseFilename=CourseManagementSystem-Setup

[Files]
Source: "dist\CourseManagementSystem\*"; DestDir: "{app}"; Flags: recursesubdirs

[Icons]
Name: "{group}\Course Management System"; Filename: "{app}\CourseManagementSystem.exe"
Name: "{commondesktop}\Course Management System"; Filename: "{app}\CourseManagementSystem.exe" 