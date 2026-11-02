#!/bin/bash
# chờ đủ 10969 id duy nhất rồi dừng các tiến trình dịch
cd /home/tuannn/project-mini/baitap
while true; do
  n=$(python3 -c "
import json
s=set()
for l in open('data/hsk_vi.jsonl'):
    l=l.strip()
    if l:
        try: s.add(json.loads(l)['id'])
        except: pass
print(len(s))")
  [ "$n" -ge 10969 ] && break
  sleep 20
done
pkill -f "[0]2_translate_hsk" || true
echo "DONE $n"
