#!/usr/bin/env bash
# Makes the default Studio music in studio-assets/music/ from scratch with ffmpeg (a synthesised
# 120 BPM kick, hat, bass and pad), so it has no licence to track. The file is committed; run this only to change it.
set -euo pipefail
mkdir -p "$(dirname "$0")/../studio-assets/music"
cd "$(dirname "$0")/../studio-assets/music"
B='mod(t,0.5)'
M='mod(floor(t/4),4)'
STEP="(3*gte($M,1)*lt($M,2)+5*gte($M,2)*lt($M,3)+7*gte($M,3))"
KICK="0.9*sin(2*PI*(48+110*exp(-35*$B))*$B)*exp(-9*$B)"
HAT="0.18*(random(0)-0.5)*exp(-60*mod(t+0.25,0.5))"
BASS="0.28*sin(2*PI*55*pow(2,$STEP/12)*t)*(0.6+0.4*exp(-4*$B))"
PAD="0.07*(sin(2*PI*220*pow(2,$STEP/12)*t)+sin(2*PI*264*pow(2,$STEP/12)*t))*(0.7+0.3*sin(2*PI*0.25*t))"
ffmpeg -f lavfi -i "aevalsrc='$KICK+$HAT+$BASS+$PAD':d=32:s=44100" -af "afade=t=in:d=1,afade=t=out:st=29:d=3,volume=0.7" -ar 44100 -ac 1 -b:a 128k -y -loglevel error upbeat-120.mp3
