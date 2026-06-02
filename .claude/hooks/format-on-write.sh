#!/bin/bash
# Auto-format les fichiers après Edit/Write
# Le harness fournit le contexte du hook en JSON sur stdin : { "tool_input": { "file_path": ... } }
FILE_PATH=$(node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).tool_input.file_path)}catch{}})")

case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.css|*.md|*.json)
    pnpm exec prettier --write "$FILE_PATH" > /dev/null 2>&1
    ;;
esac
exit 0
