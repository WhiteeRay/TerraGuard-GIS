#!/usr/bin/env python3
"""Re-export edited native sources using the official draw.io desktop CLI."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--drawio', default=os.environ.get('DRAWIO_BIN'), help='Path to the draw.io executable')
args = parser.parse_args()
exe = args.drawio or shutil.which('drawio')
if not exe:
    mac = Path('/Applications/draw.io.app/Contents/MacOS/draw.io')
    if mac.is_file():
        exe = str(mac)
if not exe:
    parser.error('Install official draw.io Desktop, or pass --drawio /absolute/path/to/executable')

root = Path(__file__).resolve().parents[1]
destination = root / 'exports'
destination.mkdir(exist_ok=True)
for source in sorted((root / 'source').glob('*.drawio')):
    for fmt in ('svg', 'png'):
        command = [exe, '--export', '--format', fmt, '--theme', 'light', '--border', '20',
                   '--embed-diagram', '--output', str(destination / f'{source.stem}.{fmt}'), str(source)]
        if fmt == 'png':
            command[1:1] = ['--scale', '2']
        else:
            command[1:1] = ['--embed-svg-metadata', '--embed-svg-fonts', 'false']
        subprocess.run(command, check=True, timeout=90)
