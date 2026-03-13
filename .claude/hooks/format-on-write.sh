#!/bin/bash
# Auto-format les fichiers après Edit/Write
FILE_PATH=$(echo "$CLAUDE_TOOL_INPUT" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{console.log(JSON.parse(d).file_path)}catch{}})")

case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.css|*.md|*.json)
    pnpm exec prettier --write "$FILE_PATH" > /dev/null 2>&1
    ;;
esac
exit 0
