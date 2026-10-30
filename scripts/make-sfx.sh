#!/usr/bin/env bash
# Makes the transition sounds in studio-assets/sfx/ from scratch with ffmpeg (synthesised noise and
# tones), so they have no licence to track. The files are committed; run this only to change them.
set -euo pipefail
cd "$(dirname "$0")/../studio-assets/sfx"
OUT=(-ar 44100 -ac 1 -c:a pcm_s16le -y -loglevel error)

# whoosh: pink noise that swells and fades, for pushes and slides
ffmpeg -f lavfi -i "anoisesrc=d=0.55:c=pink:r=44100:a=0.9" -af "highpass=f=250,lowpass=f=3500,afade=t=in:d=0.2,afade=t=out:st=0.25:d=0.3,volume=2.2" "${OUT[@]}" whoosh.wav
# swoosh: a shorter, brighter sweep, for wipes
ffmpeg -f lavfi -i "anoisesrc=d=0.3:c=white:r=44100:a=0.7" -af "highpass=f=1200,lowpass=f=7000,afade=t=in:d=0.1,afade=t=out:st=0.12:d=0.18,volume=0.7" "${OUT[@]}" swoosh.wav
# pop: a quick falling blip, for zooms and a scene's first beat
ffmpeg -f lavfi -i "aevalsrc='0.8*sin(2*PI*t*(900-3000*t))*exp(-22*t)':d=0.18:s=44100" "${OUT[@]}" pop.wav
# click: a tiny tick
ffmpeg -f lavfi -i "aevalsrc='0.7*sin(2*PI*2200*t)*exp(-90*t)':d=0.06:s=44100" "${OUT[@]}" click.wav
# riser: a rising tone that builds, for a big reveal
ffmpeg -f lavfi -i "aevalsrc='0.5*sin(2*PI*t*(180+320*t))*(t/1.2)':d=1.2:s=44100" -af "afade=t=out:st=1.1:d=0.1" "${OUT[@]}" riser.wav
# impact: a low thump with a noise burst, for a hit
ffmpeg -f lavfi -i "aevalsrc='(0.9*sin(2*PI*55*t)+0.5*(random(0)-0.5)*exp(-35*t))*exp(-7*t)':d=0.6:s=44100" -af "volume=0.8" "${OUT[@]}" impact.wav
