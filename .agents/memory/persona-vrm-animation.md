---
name: Persona VRM animation
description: Avatar choice and full-body motion requirements for personas and Maxime's separate avatar.
---

Use Alicia Solid as the VRM model for personas. Keep it distinct from Maxime's own personalized avatar. The user has only a phone, so prefer mobile-compatible avatar creation and export steps.

VRM provides a humanoid model and rig, not a complete movement library. Full-body actions such as walking, jumping, typing, and expressive gestures require compatible animation clips, authored motion, or retargeting to the model's skeleton.

When retargeting Mixamo-style GLB clips, match the bone names after Three.js has loaded them (the loader may remove punctuation such as the colon in `mixamorig:Hips`). Apply animation deltas to the avatar's visible neutral pose, including any arm offsets used by its idle setup, rather than its raw bind pose; otherwise the arms can snap outward.

For Maxime's live room, the user values clear, non-pixelated rendering and shoes that stay on the floor, but considers generic robotic walking unacceptable. Prioritize foot contact and coordination with the room over adding more motion; prevent coplanar floor props such as rugs from flickering.

**Why:** The user wants Alicia Solid to remain available for personas and wants those characters to perform full-body actions, including jumping. They explicitly said they do not have access to a computer.

**How to apply:** Keep persona and Maxime avatar choices separate. Prefer workflows that can be completed from a phone. Test and tune motion on the chosen VRM rig, preserve the user's accepted visual quality, and be clear when a movement is only a simulated pose rather than a complete animation. During retargeting, verify runtime bone names and preserve the VRM's visible neutral pose.
