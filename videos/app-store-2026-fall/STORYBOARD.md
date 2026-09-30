---
format: 886x1920
duration: 24s
mode: autonomous
message: "관심 있는 유치원을 나란히 비교하고 후보를 좁힐 수 있다"
arc: Demo Loop
audience: 유치원 입학을 알아보는 부모
music: none
captions: skipped (short Korean explanatory copy is authored in each frame; no voiceover)
---

## Video direction
Actual native app footage is the evidence. Keep app geometry and colors intact. Use the same flat upright app surface across all six shots, never 3D device spins or simulated UI. Canvas 886x1920; cream #F7F8F1, ink #182D26, green #287148. Two short lines above the app; large white app viewport below. Each source is a real capture. No invented state or data. Silent composition: no SCRIPT.md and music none. Holds are deliberate so parents can read. Use simple cuts between frames, with optional 0.2s opacity arrival of caption only; keep captured app pixels fully visible from t=0. Reuse geometry: app media x=57 y=300 width=772 height=1678 would exceed canvas, so use x=76 y=280 width=734 height=1596; ends at1876. No phone bezel in video. Root fonts loaded from assets/fonts. Metadata pill at x=58,y=54 is small, static brand text. Headline x=54 y=104 width778 font62/1.12 weight800, subtitle x=56,y=202 width774 font29/1.25 weight500. Media x=76,y=280,width734,height1596 object-fit:contain; no scaling tween. Whole canvas ground is an independent full-duration child clip. All elements have unique id prefix frame_id. Border optional 1px #E5EDDE, radius32 with overflow hidden is intentional clipping of only corner pixels. Do not draw extra app UI.

## Frame 1 — 유치원, 어디가 다를까요?

- scene: 유치원, 어디가 다를까요?
- duration: 3s
- poster: 2s
- transition_in: cut
- status: animated
- type: hook
- narrativeRole: Show the real app outcome or action that helps a parent narrow candidates.
- src: compositions/frames/01-hook.html
- asset_candidates: assets/01-compare-detail.png — actual native app capture
- blueprint: cursor-ui-demo
- motion_rules: ["stat-bars-and-fills"]

Adapt cursor-ui-demo: use recorded interaction instead of a synthetic cursor; no recreation of product UI. No placeholder visual.
Scene 1 (0.0–0.3s): Real image `assets/01-compare-detail.png` appears immediately at the shared viewport geometry. Header text `유치원, 어디가 다를까요?` fades in gently (opacity 0.7→1 only) above it. Brand label `우리동네 유치원` is at x58 y54, font22, green.
Scene 2 (0.3–3s): Keep headline and subtitle `관심 있는 곳을 나란히 비교해요` readable. Deliberate held read of the real app screenshot; no invented movement. A thin 4px green progress line at y1900 grows left-to-right across this frame. Hold the final view; do not fade app UI to black at exit. This is a native App Store demo, so clarity overrides decorative motion.

## Frame 2 — 우리 동네부터 찾고

- scene: 우리 동네부터 찾고
- duration: 4s
- poster: 2s
- transition_in: cut
- status: animated
- type: feature_showcase
- narrativeRole: Show the real app outcome or action that helps a parent narrow candidates.
- src: compositions/frames/02-search.html
- asset_candidates: assets/search.mp4 — actual native app capture
- blueprint: cursor-ui-demo
- motion_rules: ["stat-bars-and-fills"]

Adapt cursor-ui-demo: use recorded interaction instead of a synthetic cursor; no recreation of product UI. No placeholder visual.
Scene 1 (0.0–0.3s): Real video `assets/search.mp4` appears immediately at the shared viewport geometry. Header text `우리 동네부터 찾고` fades in gently (opacity 0.7→1 only) above it. Brand label `우리동네 유치원` is at x58 y54, font22, green.
Scene 2 (0.3–4s): Keep headline and subtitle `지도와 거리로 가까운 곳부터` readable. Recorded source interaction supplies the motion; no extra zoom or crop. A thin 4px green progress line at y1900 grows left-to-right across this frame. Hold the final view; do not fade app UI to black at exit. This is a native App Store demo, so clarity overrides decorative motion.

## Frame 3 — 관심 있는 곳을 담아

- scene: 관심 있는 곳을 담아
- duration: 4s
- poster: 2s
- transition_in: cut
- status: animated
- type: feature_showcase
- narrativeRole: Show the real app outcome or action that helps a parent narrow candidates.
- src: compositions/frames/03-select.html
- asset_candidates: assets/select.mp4 — actual native app capture
- blueprint: cursor-ui-demo
- motion_rules: ["stat-bars-and-fills"]

Adapt cursor-ui-demo: use recorded interaction instead of a synthetic cursor; no recreation of product UI. No placeholder visual.
Scene 1 (0.0–0.3s): Real video `assets/select.mp4` appears immediately at the shared viewport geometry. Header text `관심 있는 곳을 담아` fades in gently (opacity 0.7→1 only) above it. Brand label `우리동네 유치원` is at x58 y54, font22, green.
Scene 2 (0.3–4s): Keep headline and subtitle `비교할 후보를 골라보세요` readable. Recorded source interaction supplies the motion; no extra zoom or crop. A thin 4px green progress line at y1900 grows left-to-right across this frame. Hold the final view; do not fade app UI to black at exit. This is a native App Store demo, so clarity overrides decorative motion.

## Frame 4 — 조건을 나란히 비교해요

- scene: 조건을 나란히 비교해요
- duration: 6s
- poster: 2s
- transition_in: cut
- status: animated
- type: benefit_highlight
- narrativeRole: Show the real app outcome or action that helps a parent narrow candidates.
- src: compositions/frames/04-compare.html
- asset_candidates: assets/compare.mp4 — actual native app capture
- blueprint: cursor-ui-demo
- motion_rules: ["stat-bars-and-fills"]

Adapt cursor-ui-demo: use recorded interaction instead of a synthetic cursor; no recreation of product UI. No placeholder visual.
Scene 1 (0.0–0.3s): Real video `assets/compare.mp4` appears immediately at the shared viewport geometry. Header text `조건을 나란히 비교해요` fades in gently (opacity 0.7→1 only) above it. Brand label `우리동네 유치원` is at x58 y54, font22, green.
Scene 2 (0.3–6s): Keep headline and subtitle `교사 비율 · 셔틀 · 면적까지` readable. Recorded source interaction supplies the motion; no extra zoom or crop. A thin 4px green progress line at y1900 grows left-to-right across this frame. Hold the final view; do not fade app UI to black at exit. This is a native App Store demo, so clarity overrides decorative motion.

## Frame 5 — 후기도 출처와 함께

- scene: 후기도 출처와 함께
- duration: 4s
- poster: 2s
- transition_in: cut
- status: animated
- type: social_proof
- narrativeRole: Show the real app outcome or action that helps a parent narrow candidates.
- src: compositions/frames/05-reviews.html
- asset_candidates: assets/reviews.mp4 — actual native app capture
- blueprint: cursor-ui-demo
- motion_rules: ["stat-bars-and-fills"]

Adapt cursor-ui-demo: use recorded interaction instead of a synthetic cursor; no recreation of product UI. No placeholder visual.
Scene 1 (0.0–0.3s): Real video `assets/reviews.mp4` appears immediately at the shared viewport geometry. Header text `후기도 출처와 함께` fades in gently (opacity 0.7→1 only) above it. Brand label `우리동네 유치원` is at x58 y54, font22, green.
Scene 2 (0.3–4s): Keep headline and subtitle `후기 링크로 이어서 살펴보세요` readable. Recorded source interaction supplies the motion; no extra zoom or crop. A thin 4px green progress line at y1900 grows left-to-right across this frame. Hold the final view; do not fade app UI to black at exit. This is a native App Store demo, so clarity overrides decorative motion.

## Frame 6 — 우리동네 유치원

- scene: 우리동네 유치원
- duration: 3s
- poster: 2s
- transition_in: cut
- status: animated
- type: cta
- narrativeRole: Show the real app outcome or action that helps a parent narrow candidates.
- src: compositions/frames/06-saved.html
- asset_candidates: assets/01-compare-detail.png — actual native app capture
- blueprint: cursor-ui-demo
- motion_rules: ["stat-bars-and-fills"]

Adapt cursor-ui-demo: use recorded interaction instead of a synthetic cursor; no recreation of product UI. No placeholder visual.
Scene 1 (0.0–0.3s): Real image `assets/01-compare-detail.png` appears immediately at the shared viewport geometry. Header text `우리동네 유치원` fades in gently (opacity 0.7→1 only) above it. Brand label `우리동네 유치원` is at x58 y54, font22, green.
Scene 2 (0.3–3s): Keep headline and subtitle `비교표를 가족과 함께 보세요` readable. Deliberate held read of the real app screenshot; no invented movement. A thin 4px green progress line at y1900 grows left-to-right across this frame. Hold the final view; do not fade app UI to black at exit. This is a native App Store demo, so clarity overrides decorative motion.

