#!/bin/sh
# copie de démo (API_URL vide) servie sur :8899
mkdir -p /home/claude/site-demo && find /home/claude/site-demo -mindepth 1 -delete
cd /home/claude/mode-champion && tar --exclude=.DS_Store -cf - . | tar -xf - -C /home/claude/site-demo
sed -i "s#API_URL: 'https://script.google.com[^']*'#API_URL: ''#" /home/claude/site-demo/js/config.js
grep -c "API_URL: ''" /home/claude/site-demo/js/config.js
# « sh tests/mkdemo.sh tout » : tout ouvert aux enfants et aux parents (Skills, copains, missions des éducs), comme avant la V1 du 28/10
if [ "$1" = "tout" ]; then sed -i -E "s#^(    (skills|copains|missionsEducs): )false#\1true#" /home/claude/site-demo/js/config.js; grep -c ": true" /home/claude/site-demo/js/config.js; fi
pgrep -f "^python3 -m http.server 8899" >/dev/null || (cd /home/claude/site-demo && nohup python3 -m http.server 8899 >/dev/null 2>&1 &)
