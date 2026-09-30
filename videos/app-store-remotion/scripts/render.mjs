import {bundle} from '@remotion/bundler';
import {openBrowser,selectComposition,renderStill,renderMedia} from '@remotion/renderer';
import {writeFile,rename,unlink} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const mode=process.argv[2]??'qa';
const browserExecutable='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const serveUrl=await bundle({entryPoint:path.join(root,'src/index.tsx'),publicDir:path.join(root,'public'),outDir:path.join(root,'.bundle'),onProgress:(v)=>{if(v===100)process.stdout.write('Bundle ready\n');}});
const browser=await openBrowser('chrome',{browserExecutable});
try{
 const composition=await selectComposition({serveUrl,id:'KindergartenPreview',browserExecutable,puppeteerInstance:browser});
 await writeFile(path.join(root,'qa/composition.json'),JSON.stringify(composition,null,2));
 if(mode==='qa'){
  const frames=[30,100,175,260,342,447,561,660];
  for(const frame of frames){await renderStill({serveUrl,composition,frame,output:path.join(root,`qa/frame-${String(frame).padStart(3,'0')}.png`),imageFormat:'png',browserExecutable,puppeteerInstance:browser});process.stdout.write(`Frame ${frame}\n`);}
 }else{
  let last=-1;
  await renderMedia({serveUrl,composition,codec:'h264',outputLocation:path.join(root,'out/kindergarten-app-preview-remotion.mp4'),browserExecutable,puppeteerInstance:browser,concurrency:2,pixelFormat:'yuv420p',videoBitrate:'10M',audioCodec:'aac',audioBitrate:'256k',x264Preset:'medium',onProgress:({progress})=>{const n=Math.floor(progress*10);if(n!==last){last=n;process.stdout.write(`Render ${n*10}%\n`);}}});
  const output=path.join(root,'out/kindergarten-app-preview-remotion.mp4');
  const raw=path.join(root,'out/.source-render.mp4');
  await rename(output,raw);
  const result=spawnSync('ffmpeg',['-y','-v','error','-i',raw,'-t','24','-vf','scale=in_range=pc:out_range=tv,format=yuv420p,setsar=1','-c:v','libx264','-preset','slow','-profile:v','high','-level:v','4.0','-b:v','10M','-maxrate','12M','-bufsize','20M','-r','30','-g','60','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv','-c:a','aac','-b:a','256k','-ar','48000','-ac','2','-movflags','+faststart',output],{stdio:'inherit'});
  if(result.status!==0)throw new Error('MP4 normalization failed; source render retained');
  await unlink(raw);
  process.stdout.write('Final MP4 ready\n');
 }
}finally{await browser.close({silent:true});}
