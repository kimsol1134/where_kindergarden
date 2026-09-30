import React from 'react';
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {loadFont} from '@remotion/fonts';

loadFont({family:'Pretendard',url:staticFile('fonts/Pretendard-ExtraBold.otf'),weight:'800'});
loadFont({family:'Pretendard',url:staticFile('fonts/Pretendard-Medium.otf'),weight:'500'});
const C={ink:'#173D2D',green:'#287148',lime:'#D9F478',paper:'#F8F9F1',mint:'#DDEBDC',white:'#FFFFFF'};
const ease=Easing.bezier(.16,1,.3,1);
const clamp={extrapolateLeft:'clamp' as const,extrapolateRight:'clamp' as const};
const steps=['가까운 곳','비교하기','운영 정보','후기 확인'];

const Arrive:React.FC<{children:React.ReactNode;delay?:number;dy?:number}>=({children,delay=0,dy=26})=>{
 const f=useCurrentFrame();const a=interpolate(f,[delay,delay+10],[0,1],{...clamp,easing:ease});
 return <div style={{opacity:a,transform:`translateY(${(1-a)*dy}px)`}}>{children}</div>;
};
const Native:React.FC<{file:string;video?:boolean;start?:number;rate?:number;top?:number;height?:number;opacity?:number}>=({file,video=false,start=0,rate=1,top=0,height=1920,opacity=1})=>{
 const style:React.CSSProperties={position:'absolute',width:886,height,top,left:0,objectFit:'contain',opacity};
 return video?<OffthreadVideo src={staticFile(`media/${file}`)} trimBefore={start} playbackRate={rate} muted style={style}/>:<Img src={staticFile(`media/${file}`)} style={style}/>;
};
const Brand:React.FC<{light?:boolean;label?:string}>=({light=false,label='우리동네 유치원'})=><div data-qa="brand" style={{fontSize:25,fontWeight:800,letterSpacing:-.5,display:'flex',alignItems:'center',gap:12,color:light?C.mint:C.green}}><span style={{display:'block',height:12,width:12,borderRadius:10,background:light?C.lime:C.green}}/>{label}</div>;
const StepRail:React.FC<{current:number}>=({current})=><div aria-hidden style={{position:'absolute',left:46,right:46,bottom:17,display:'flex',gap:9,zIndex:20}}>{steps.map((s,i)=><div key={s} style={{flex:1,height:5,background:i===current?C.green:'#CFDACCAA',borderRadius:8}}/>)}</div>;
const Head:React.FC<{a:string;b?:string;tag?:string;dark?:boolean;size?:number;small?:string}>=({a,b,tag,dark=false,size=82,small})=>{
 return <div style={{position:'absolute',top:0,left:0,right:0,padding:'48px 52px 42px',background:dark?C.ink:C.paper,zIndex:10,borderRadius:'0 0 40px 40px',boxShadow:'0 10px 22px #173D2D0C'}}>
 <Brand light={dark} label={tag}/>
 <div data-qa="headline" style={{fontSize:size,fontWeight:800,lineHeight:1.11,letterSpacing:-3.7,marginTop:29,color:dark?C.white:C.ink}}><Arrive>{a}</Arrive>{b?<Arrive delay={5}><span style={{color:dark?C.lime:C.green}}>{b}</span></Arrive>:null}</div>
 {small?<div data-qa="subline" style={{fontSize:32,fontWeight:500,lineHeight:1.4,color:dark?C.mint:'#4E6557',marginTop:22}}><Arrive delay={9}>{small}</Arrive></div>:null}
 </div>;
};
const Ring:React.FC<{x:number;y:number;w:number;h:number;delay?:number;label?:string}>=({x,y,w,h,delay=12,label})=>{
 const f=useCurrentFrame();const {fps}=useVideoConfig();const p=spring({frame:f-delay,fps,config:{damping:19,stiffness:190,mass:.6}});
 return <div style={{position:'absolute',left:x,top:y,width:w,height:h,borderRadius:34,border:`5px solid ${C.green}`,boxShadow:`0 0 0 8px ${C.lime}99`,opacity:Math.min(1,p),transform:`scale(${.98+.02*p})`,zIndex:9,pointerEvents:'none'}}>{label?<div data-qa="callout" style={{position:'absolute',right:18,top:-45,fontSize:30,fontWeight:800,background:C.ink,color:C.lime,borderRadius:18,padding:'11px 20px',whiteSpace:'nowrap'}}>{label}</div>:null}</div>;
};
const Hook:React.FC=()=>{
 const f=useCurrentFrame();const reveal=interpolate(f,[0,12],[70,0],{...clamp,easing:ease});
 return <AbsoluteFill style={{background:C.paper}}>
  <Native file="01-compare-detail.png"/>
  <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,#173D2DEE 0%,#173D2DE6 26%,#173D2D00 55%)'}}/>
  <div style={{position:'absolute',top:64,left:54,right:54,color:C.white,zIndex:12}}><Brand light label="유치원 알아보는 부모님께"/><div data-qa="headline" style={{marginTop:45,fontWeight:800,fontSize:112,lineHeight:1.08,letterSpacing:-5.5,transform:`translateY(${reveal}px)`}}><span style={{display:'block'}}>어디 보낼지,</span><span style={{display:'block',color:C.lime,marginTop:8}}>아직 고민 중?</span></div><Arrive delay={15}><p style={{fontSize:36,fontWeight:500,marginTop:30,color:'#EAF1DF'}}>관심 있는 두 곳, 나란히 보세요.</p></Arrive></div>
  <Ring x={42} y={1001} w={802} h={184} delay={24}/>
 </AbsoluteFill>;
};
const Promise:React.FC=()=> <AbsoluteFill style={{background:C.paper}}>
 <Native file="01-compare-detail.png" top={180} height={1740}/>
 <Head a="후보는 나란히." b="차이는 한눈에." dark size={86} small="공시 정보로 조건을 비교해요"/>
 <Ring x={80} y={870} w={727} h={170} delay={10} label="교사 비율"/>
 <Ring x={80} y={1088} w={727} h={170} delay={27} label="셔틀"/>
 <StepRail current={1}/>
</AbsoluteFill>;
const Search:React.FC=()=> <AbsoluteFill style={{background:C.paper}}>
 <Native file="search.mp4" video/>
 <Head a="우리 집 근처부터." size={80} tag="01  가까운 곳 찾기"/>
 <StepRail current={0}/>
</AbsoluteFill>;
const Select:React.FC=()=>{
 return <AbsoluteFill style={{background:C.paper}}>
  <Native file="select.mp4" video/>
  <Head a="마음에 드는 곳은" b="비교에 담고." size={77} dark tag="02  비교 후보 고르기"/>
  <Ring x={91} y={865} w={446} h={116} delay={42}/>
  <StepRail current={1}/>
 </AbsoluteFill>;
};
const Compare:React.FC=()=> <AbsoluteFill style={{background:C.paper}}>
 <Native file="compare.mp4" video start={60}/>
 <Head a="어디가 다른지," b="바로 확인해요." size={82} tag="02  조건 비교하기"/>
 <StepRail current={1}/>
</AbsoluteFill>;
const Detail:React.FC=()=> <AbsoluteFill style={{background:C.paper}}>
 <Native file="03-details.png"/>
 <Head a="셔틀은? 몇 시까지?" b="방문 전에 확인." size={76} dark tag="03  운영 정보 살펴보기"/>
 <Ring x={50} y={1240} w={783} h={208} delay={14} label="운영 시간 · 셔틀"/>
 <StepRail current={2}/>
</AbsoluteFill>;
const Review:React.FC=()=> <AbsoluteFill style={{background:C.paper}}>
 <Native file="reviews.mp4" video/>
 <Head a="찾고 있던 후기," b="출처까지 확인." size={78} tag="04  후기 이어 보기"/>
 <StepRail current={3}/>
</AbsoluteFill>;
const Close:React.FC=()=>{
 const f=useCurrentFrame();return <AbsoluteFill style={{background:C.paper}}>
 <Native file="01-compare-detail.png"/>
 <div style={{position:'absolute',top:0,left:0,right:0,background:C.ink,borderRadius:'0 0 48px 48px',padding:'58px 54px 48px',zIndex:10}}>
 <Brand light label="가까운 곳부터, 함께 고르는"/>
 <div data-qa="headline" style={{fontSize:110,lineHeight:1.08,fontWeight:800,letterSpacing:-5,color:C.white,marginTop:30}}><Arrive>우리동네</Arrive><Arrive delay={4}><span style={{color:C.lime}}>유치원</span></Arrive></div>
 <Arrive delay={12}><div data-qa="subline" style={{fontSize:34,color:C.mint,marginTop:26,fontWeight:500}}>광고 없이 · 회원가입 없이</div></Arrive>
 </div>
 <Ring x={45} y={1600} w={796} h={117} delay={21}/>
 <div style={{position:'absolute',top:1487,left:85,right:85,padding:'15px 10px',borderRadius:22,background:C.paper,textAlign:'center',zIndex:12,fontSize:41,color:C.ink,fontWeight:800,opacity:interpolate(f,[14,24],[0,1],clamp)}}>비교표는 가족에게 보내세요.</div>
 </AbsoluteFill>;
};
const scenePlan=[{from:0,duration:72,View:Hook},{from:72,duration:72,View:Promise},{from:144,duration:72,View:Search},{from:216,duration:72,View:Select},{from:288,duration:108,View:Compare},{from:396,duration:108,View:Detail},{from:504,duration:108,View:Review},{from:612,duration:108,View:Close}];
export const KindergartenPreview:React.FC=()=> <AbsoluteFill style={{fontFamily:'Pretendard,sans-serif',background:C.paper,overflow:'hidden'}}>
 {scenePlan.map(({from,duration,View})=><Sequence key={from} from={from} durationInFrames={duration}><View/></Sequence>)}
 <Audio src={staticFile('media/original-score.wav')}/>
</AbsoluteFill>;
