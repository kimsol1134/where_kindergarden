"""Original 100 BPM plucked-key score and soft UI accents; no sampled music."""
import wave
from pathlib import Path
import numpy as np
SR=48000; D=24; N=SR*D
rng=np.random.default_rng(20260908)
stereo=np.zeros((N,2),np.float64)
def add(sig,start,vol=1,pan=0):
 i=int(start*SR);length=min(len(sig),N-i)
 if length<=0:return
 gains=np.array([np.sqrt((1-pan)/2),np.sqrt((1+pan)/2)])
 stereo[i:i+length]+=sig[:length,None]*gains*vol

def key(midi,length=1.8):
 t=np.arange(int(length*SR))/SR;f=440*2**((midi-69)/12)
 strike=(1-np.exp(-t*220))*np.exp(-t*3.2)
 return (np.sin(2*np.pi*f*t)+.27*np.sin(2*np.pi*f*2*t)*np.exp(-t*5)+.08*np.sin(2*np.pi*f*3*t)*np.exp(-t*9))*strike

def low(midi,length=1):
 t=np.arange(int(length*SR))/SR;f=440*2**((midi-69)/12)
 return np.sin(2*np.pi*f*t)*(1-np.exp(-t*50))*np.exp(-t*3.3)
beat=.6
chords=[[62,66,69,73],[59,62,66,69],[55,59,62,69],[57,61,64,69],[62,66,69,74]]
for bar in range(10):
 chord=chords[min(bar//2,4)];base=bar*4*beat
 add(low(chord[0]-12,2),base,.14)
 for step in range(8):
  note=chord[[0,2,1,3,2,1,3,2][step]]
  add(key(note),base+step*.3,.07 if step%2==0 else .045,(-.27 if step%2==0 else .27))
 for off in [0,1.2]:
  t=np.arange(int(.2*SR))/SR;f=90*np.exp(-t*18)+47
  add(np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*28),base+off,.13)
 for step in range(8):
  t=np.arange(int(.055*SR))/SR;noise=rng.normal(0,1,len(t));noise=np.concatenate(([0],np.diff(noise)))
  add(noise*np.exp(-t*95),base+step*.3+.15,.008,(-.2 if step%2 else .2))
# Factual UI transitions receive tiny, soft two-tone ticks, never aggressive risers.
for at in [2.4,4.8,7.2,9.6,13.2,16.8,20.4]:
 add(key(81,.32),at,.035,-.1);add(key(86,.28),at+.06,.018,.1)
# A short final resolving chord, and a restrained room reflection.
for n in [62,66,69,74]:add(key(n,2),22.1,.028)
for delay,gain in [(int(SR*.085),.1),(int(SR*.137),.07)]:
 stereo[delay:]+=stereo[:-delay,::-1]*gain
fade=np.minimum(np.arange(N)/(SR*.1),1)*np.minimum((N-1-np.arange(N))/(SR*.8),1)
stereo*=np.maximum(fade,0)[:,None]
stereo*=10**(9/20)
stereo*=.8/max(.8,np.max(np.abs(stereo)))
p=Path('public/media/original-score.wav')
with wave.open(str(p),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((stereo*32767).astype('<i2').tobytes())
print('Original soundtrack:',p,'peak dBFS',20*np.log10(np.max(np.abs(stereo))))
