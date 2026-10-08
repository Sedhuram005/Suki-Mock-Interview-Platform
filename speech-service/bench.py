import re, sys, time
import requests

def words(s): return re.sub(r"[^a-z0-9' ]", " ", s.lower()).split()

def wer(ref, hyp):
    r, h = words(ref), words(hyp)
    d = [[i] + [0] * len(h) for i in range(len(r) + 1)]
    d[0] = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        for j in range(1, len(h) + 1):
            d[i][j] = min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (r[i-1] != h[j-1]))
    return d[len(r)][len(h)] / max(1, len(r))

wav, ref = sys.argv[1], sys.argv[2]
for mode in ("live", "final"):
    t = time.time()
    r = requests.post("http://127.0.0.1:8000/transcribe",
                      files={"file": open(wav, "rb")}, data={"mode": mode, "prompt": ""}).json()
    sec = time.time() - t
    print(f"{mode:5} | {sec:5.2f}s for {r['audioSec']:.1f}s audio | WER {wer(ref, r['transcript']) * 100:5.1f}%")
    print("      ", r["transcript"])
