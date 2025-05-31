#!/bin/bash
# 1) removing vendor/bin
rm -rf vendor/bin

# 2) removing doc folders
find vendor -type d \( -iname docs -o -iname test* -o -iname tests \) -prune -exec rm -rf {} \;

# 3) removing script files
find vendor -type f \
  \( -iname '*.exe' -o -iname '*.bash' -o -iname '*.fish' -o -iname '*.zsh' \
     -o -iname '*.py' -o -iname '*.base64' \) \
  -delete
