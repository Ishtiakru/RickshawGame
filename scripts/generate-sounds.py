"""Generate original, deterministic PCM sound clips (no third-party recordings).
Run python3 scripts/generate-sounds.py, then npm run sync:android.
The ride tone emphasizes midrange harmonics audible on small phone speakers.
"""
import math
import random
import struct
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'audio'
ROOT.mkdir(exist_ok=True)
RATE = 22050
random.seed(42)


def write(name, seconds, sample, loop=False):
    samples = []
    for i in range(round(RATE * seconds)):
        t = i / RATE
        fade = 1 if loop else min(1, t / .012, (seconds - t) / .055)
        value = max(-.95, min(.95, sample(t) * fade))
        samples.append(round(value * 32767))
    with wave.open(str(ROOT / (name + '.wav')), 'wb') as out:
        out.setparams((1, 2, RATE, len(samples), 'NONE', 'not compressed'))
        out.writeframes(struct.pack('<' + 'h' * len(samples), *samples))


sine = lambda hz, t: math.sin(2 * math.pi * hz * t)
# Integer cycle counts throughout a 2-second clip avoid clicks at the loop seam.
write('ride', 2, lambda t: (.27*sine(280,t) + .25*sine(560,t) + .17*sine(840,t)) * (.7 + .3*sine(14,t)), loop=True)
write('start', .4, lambda t: .65*math.sin(2*math.pi*(440*t+400*t*t)))
write('steer', .17, lambda t: .6*sine(740,t) + .14*sine(1110,t))
write('crash', .65, lambda t: (.5*random.uniform(-1,1) + .3*math.sin(2*math.pi*(260*t-140*t*t))) * math.exp(-3*t))
write('test', 1.2, lambda t: (.42*sine(660,t) + .25*sine(880,t)) * (1 if int(t*5)%2==0 else .2))
print('Generated five mono PCM WAV files in audio/.')
