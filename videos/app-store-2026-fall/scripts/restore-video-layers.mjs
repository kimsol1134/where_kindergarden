import { readFileSync, writeFileSync } from 'node:fs';
const p=new URL('../index.html',import.meta.url);let s=readFileSync(p,'utf8');
s=s.replace(/\n\s*<!-- native-video-layers:start -->[\s\S]*?<!-- native-video-layers:end -->/g,'');
const clips=[['search',3,4],['select',7,4],['compare',11,6],['reviews',17,4]];
const layers='\n<!-- native-video-layers:start -->\n'+clips.map(([name,start,duration])=>`<video id="native-${name}" class="clip" src="assets/${name}.mp4" muted playsinline preload="auto" data-start="${start}" data-duration="${duration}" data-track-index="5" style="position:absolute;left:76px;top:280px;width:734px;height:1596px;object-fit:contain;z-index:10;"></video>`).join('\n')+'\n<!-- native-video-layers:end -->\n';
s=s.replace(/\n    <\/div>\n\n    <script>/,layers+'\n    </div>\n\n    <script>');
s=s.replace('lang="en"','lang="ko"').replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/gsap@3.14.2\/dist\/gsap.min.js"[^>]*><\/script>/,'<script src="assets/gsap.min.js"></script>');
if(!s.includes('id="native-search"'))throw new Error('Root insertion point not found');writeFileSync(p,s);
