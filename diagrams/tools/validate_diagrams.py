#!/usr/bin/env python3
"""Validate native models and confirm both exports retain every editable cell."""
import base64
import hashlib
import json
from pathlib import Path
import struct
import urllib.parse
import xml.etree.ElementTree as ET
import zlib

ROOT = Path(__file__).resolve().parents[1]

def cells(xml):
    document = ET.fromstring(xml) if isinstance(xml, (str, bytes)) else xml
    if document.tag == 'mxGraphModel':
        return document.findall('.//mxCell')
    model = document.find('.//mxGraphModel')
    if model is None:
        diagram = document.find('diagram')
        packed = base64.b64decode(diagram.text)
        decoded = urllib.parse.unquote(zlib.decompress(packed, -15).decode())
        model = ET.fromstring(decoded)
    return model.findall('.//mxCell')

def signature(items):
    return {c.get('id'): (c.get('vertex'), c.get('edge'), c.get('value', ''),
                         c.get('source'), c.get('target')) for c in items}

def png_metadata(path):
    data = path.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', path
    width, height = struct.unpack('>II', data[16:24])
    offset = 8
    model = None
    while offset < len(data):
        length = struct.unpack('>I', data[offset:offset+4])[0]
        kind = data[offset+4:offset+8]
        value = data[offset+8:offset+8+length]
        if kind == b'zTXt':
            key, compressed = value.split(b'\0', 1)
            if key == b'mxGraphModel':
                model = urllib.parse.unquote(zlib.decompress(compressed[1:]).decode())
        offset += length + 12
    assert model is not None, f'No embedded native model: {path}'
    return width, height, model

report = []
sources = sorted((ROOT / 'source').glob('*.drawio'))
assert len(sources) == 6, 'Expected six diagrams'
for source in sources:
    xml = ET.parse(source).getroot()
    items = cells(xml)
    ids = {c.get('id') for c in items}
    assert len(ids) == len(items), f'Duplicate IDs: {source}'
    vertices = [c for c in items if c.get('vertex') == '1']
    edges = [c for c in items if c.get('edge') == '1']
    assert vertices and edges
    model = xml.find('.//mxGraphModel')
    page_width, page_height = float(model.get('pageWidth')), float(model.get('pageHeight'))
    for c in items:
        style = c.get('style', '')
        assert 'image=' not in style and 'shape=image' not in style, f'Raster shape: {c.get("id")}'
        assert 'locked=1' not in style and 'editable=0' not in style, f'Locked cell: {c.get("id")}'
        if c.get('edge') == '1':
            assert c.get('source') in ids and c.get('target') in ids, f'Dangling connector: {c.get("id")}'
        if c.get('vertex') == '1':
            g = c.find('mxGeometry')
            x, y, w, h = [float(g.get(k, '0')) for k in ('x', 'y', 'width', 'height')]
            assert x >= 0 and y >= 0 and w > 0 and h > 0
            assert x+w <= page_width and y+h <= page_height, f'Outside page: {c.get("id")}'
    svg_path = ROOT / 'exports' / f'{source.stem}.svg'
    svg = ET.parse(svg_path).getroot()
    assert svg.tag.endswith('svg') and 'color-scheme: light' in svg.get('style', '')
    assert not svg.findall('.//{http://www.w3.org/2000/svg}image'), 'Unexpected raster in SVG'
    assert signature(cells(svg.get('content'))) == signature(items), f'SVG cell mismatch: {source}'
    png_path = ROOT / 'exports' / f'{source.stem}.png'
    width, height, embedded = png_metadata(png_path)
    assert width >= 3000 and height >= 2000
    assert signature(cells(embedded)) == signature(items), f'PNG cell mismatch: {source}'
    record = {'diagram': source.stem, 'vertices': len(vertices), 'connectors': len(edges),
              'png_pixels': [width, height], 'native_cells_preserved_in_svg_and_png': True,
              'sha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                         for p in (source, svg_path, png_path)}}
    report.append(record)
print(json.dumps({'status': 'passed', 'diagrams': report}, indent=2))
