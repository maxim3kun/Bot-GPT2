---
name: Persona VRM animation
description: Avatar choice and full-body motion requirements for personas and Maxime's separate avatar.
---

Use Alicia Solid as the VRM model for personas. Keep it distinct from Maxime's own personalized avatar. The user has only a phone, so prefer mobile-compatible avatar creation and export steps.

VRM provides a humanoid model and rig, not a complete movement library. Full-body actions such as walking, jumping, typing, and expressive gestures require compatible animation clips, authored motion, or retargeting to the model's skeleton.

When retargeting Mixamo-style GLB clips, match the bone names after Three.js has loaded them (the loader may remove punctuation such as the colon in `mixamorig:Hips`). Apply animation deltas to the avatar's visible neutral pose, including any arm offsets used by its idle setup, rather than its raw bind pose; otherwise the arms can snap outward.

For Maxime's live room, the user values clear, non-pixelated rendering and shoes that stay on the floor, but considers generic robotic walking unacceptable. Prioritize foot contact and coordination with the room over adding more motion; prevent coplanar floor props such as rugs from flickering.

The user confirmed that applying the grounded leg correction after the idle pose made the walk much better, though not fully finished.

The user wants Maxime to feel like a Sims-style character who can continue moving and doing room activities while talking. Walking should be continuous between intentional destinations, with no arbitrary pauses along the route.

The user wants Maxime's room routine to respond to local time, including choosing to go to bed when it is late, sleeping on the mattress under a duvet, and leaving the bed only once in the morning. Avoid repeated bed-to-desk trips. The PC screen should change only while he is using the computer. Keep choices within coherent, visibly animated room activities.

**Why:** The user wants Alicia Solid to remain available for personas and wants those characters to perform full-body actions, including jumping. They explicitly said they do not have access to a computer. They also confirmed the corrected leg-animation ordering improved Maxime's walk and asked for Maxime to have ongoing autonomy while conversational.

**How to apply:** Keep persona and Maxime avatar choices separate. Prefer workflows that can be completed from a phone. Test and tune motion on the chosen VRM rig, preserve the user's accepted visual quality, and be clear when a movement is only a simulated pose rather than a complete animation. Let conversational states overlay the room routine; pause it only when the activity is not visible. Use local time for bedtime, keep the computer display unchanged outside computer use, and ensure each bedtime cycle reaches the bed once, stays covered while asleep, then leaves once after morning wake-up. During retargeting, verify runtime bone names and preserve the VRM's visible neutral pose.

The user is frustrated by repeated gait regressions and wants the full walk/bed behavior corrected as a coherent system, not by many rounds of speculative tweaks. Do not call a gait natural based only on unit tests; explicitly distinguish code-level checks from visual verification on the actual VRM.

**Why:** The user has repeatedly reported crossed legs, unnatural steps, and the avatar intersecting the bed after earlier fixes.

**How to apply:** Check anatomical left/right targets, root and foot coordinates, route and obstacle clearance, and mattress height together. Verify a real walk and sleep pose in the running scene whenever possible; if the preview cannot reach a specific state, state that limitation plainly.
