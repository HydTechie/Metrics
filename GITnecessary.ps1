Remove-Item "$env:USERPROFILE\.codex\.sandbox\*" -Force -Recurse -ErrorAction SilentlyContinue


Get-ChildItem "$env:USERPROFILE\.codex\.sandbox"

$node="C:\Users\phani\AppData\Local\OpenAI\Codex\runtimes\cua_node\be2aaea167c12e53\bin\node_repl.exe"
Test-Path $node