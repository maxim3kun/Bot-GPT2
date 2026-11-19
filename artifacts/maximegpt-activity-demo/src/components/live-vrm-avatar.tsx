import { useEffect, useRef, useState } from 'react';
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  DirectionalLight,
  Euler,
  HemisphereLight,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MathUtils,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Texture,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import type { LiveAvatarModelMode } from './live-avatar-model';
import {
  LIVE_BEDROOM_DESK_STAND_X_OFFSET_RATIO,
  LIVE_BEDROOM_DESK_STAND_Z_RATIO,
  createLiveBedroomScene,
  LIVE_BEDROOM_DESK_X_RATIO,
  LIVE_BEDROOM_WINDOW_APPROACH_Z_RATIO,
  LIVE_BEDROOM_WINDOW_DISTANCE_RATIO,
  type LiveBedroomScene,
} from './live-bedroom-scene';
import { createRoomAutonomy, createRoomRouteMotion } from './live-room-autonomy';
import {
  captureFootStart,
  createFootLockState,
  getSwingFootTarget,
  solveGroundedLeg,
  updateFootLock,
} from './live-foot-ik';
import {
  getRoomWalkPose,
  roomRouteLength,
  roomWalkCyclesForDistance,
  ROOM_WALK_CYCLE_STRIDE_HEIGHT_RATIO,
  ROOM_WALK_CYCLE_SECONDS,
  roomRoutePointAtProgress,
  roomRouteTangentAtProgress,
  routeProgressFromPosition,
  type RoomRoutePoint,
} from './live-room-gait';
import avatarUrl from '../../../../attached_assets/avatar_1794982764789.vrm?url';

interface LiveVrmAvatarProps {
  mode: LiveAvatarModelMode;
  audioLevel: number;
  blinking: boolean;
  interactionActive: boolean;
}

type BoneName =
  | 'head'
  | 'hips'
  | 'chest'
  | 'spine'
  | 'upperChest'
  | 'neck'
  | 'leftShoulder'
  | 'rightShoulder'
  | 'leftUpperLeg'
  | 'rightUpperLeg'
  | 'leftLowerLeg'
  | 'rightLowerLeg'
  | 'leftFoot'
  | 'rightFoot'
  | 'leftUpperArm'
  | 'rightUpperArm'
  | 'leftLowerArm'
  | 'rightLowerArm'
  | 'leftHand'
  | 'rightHand';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function LiveVrmAvatar({ mode, audioLevel, blinking, interactionActive }: LiveVrmAvatarProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef(mode);
  const audioLevelRef = useRef(audioLevel);
  const blinkingRef = useRef(blinking);
  const interactionActiveRef = useRef(interactionActive);
  const [loaded, setLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState('');

  modeRef.current = mode;
  audioLevelRef.current = Number.isFinite(audioLevel) ? clamp(audioLevel, 0, 1) : 0;
  blinkingRef.current = blinking;
  interactionActiveRef.current = interactionActive;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const isPhone = window.matchMedia('(max-width: 700px)').matches;
    const lowPowerDevice = isPhone && (
      (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4)
      || ('deviceMemory' in navigator && Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory) <= 4)
    );
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setError('Le rendu 3D WebGL n’est pas disponible dans ce navigateur.');
      return;
    }

    let disposed = false;
    let vrm: VRM | undefined;
    let bedroom: LiveBedroomScene | undefined;
    let avatarHeight = 1;
    let lastFrame = 0;
    let elapsed = 0;
    let smoothedMouth = 0;
    let deskPositionX = 0;
    let roomRoutePoints: RoomRoutePoint[] = [];
    let roomRouteLengthValue = 0;
    let bedroomAspect = 0;
    let previousRouteX = 0;
    let previousRouteZ = 0;
    let smoothedVelocityX = 0;
    let smoothedVelocityZ = 0;
    let cameraLookX = 0;
    let cameraLookZ = 0;
    let walkStartProgress = 0;
    let wasMoving = false;
    const roomAutonomy = createRoomAutonomy();
    const roomRouteMotion = createRoomRouteMotion();
    let nextBlink = performance.now() + 1800 + Math.random() * 1600;
    let blinkStarted = -1;
    let motionFactor = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1;
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => {
      motionFactor = motionPreference.matches ? 0 : 1;
    };
    const baseRotations = new Map<BoneName, Euler>();
    const footGroundHeights = new Map<string, number>();
    const footRestRootQuaternions = new Map<string, Quaternion>();
    const leftFootLock = createFootLockState();
    const rightFootLock = createFootLockState();
    const bones = new Map<BoneName, Object3D>();
    const camera = new PerspectiveCamera(40, 1, 0.05, 100);
    const scene = new Scene();
    scene.background = null;
    const modelRoot = new Object3D();
    const gazeTarget = new Object3D();

    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !lowPowerDevice;
    renderer.shadowMap.type = PCFShadowMap;
    const maxPixelRatio = isPhone ? (lowPowerDevice ? 2 : 2.65) : 2.2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
    renderer.setClearColor(0xf1f0eb, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);
    scene.add(modelRoot);
    scene.add(gazeTarget);
    motionPreference.addEventListener('change', updateMotionPreference);

    const ambient = new AmbientLight(0xe7e5dc, 0.95);
    const hemisphere = new HemisphereLight(0xfff5e8, 0x8b7966, 1.05);
    const keyLight = new DirectionalLight(0xffe5c7, 2.65);
    keyLight.position.set(-3, 5, 4);
    keyLight.castShadow = !lowPowerDevice;
    keyLight.shadow.mapSize.set(isPhone ? 768 : 1024, isPhone ? 768 : 1024);
    keyLight.shadow.camera.left = -4.5;
    keyLight.shadow.camera.right = 4.5;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -3.5;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.025;
    const fillLight = new DirectionalLight(0xb8d5e0, 0.85);
    fillLight.position.set(3, 2, -3);
    scene.add(ambient, hemisphere, keyLight, fillLight);

    const rebuildBedroom = () => {
      if (!vrm || !avatarHeight) return;
      const nextBedroom = createLiveBedroomScene(
        avatarHeight,
        deskPositionX - avatarHeight * LIVE_BEDROOM_WINDOW_DISTANCE_RATIO,
      );
      if (bedroom) {
        scene.remove(bedroom.group);
        bedroom.dispose();
      }
      bedroom = nextBedroom;
      bedroomAspect = camera.aspect;
      scene.add(bedroom.group);
    };

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      if (vrm && Math.abs(camera.aspect - bedroomAspect) > 0.01) rebuildBedroom();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      avatarUrl,
      (gltf) => {
        if (disposed) {
          const lateVrm = gltf.userData.vrm as VRM | undefined;
          if (lateVrm) VRMUtils.deepDispose(lateVrm.scene);
          return;
        }

        vrm = gltf.userData.vrm as VRM | undefined;
        if (!vrm) {
          setError('Le fichier reçu ne contient pas de modèle VRM lisible.');
          return;
        }

        VRMUtils.rotateVRM0(vrm);
        const textureAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
        const avatarTextures = new Set<Texture>();
        vrm.scene.traverse((object) => {
          if (!('material' in object)) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            for (const value of Object.values(material)) {
              if (value instanceof Texture) avatarTextures.add(value);
            }
          }
        });
        for (const texture of avatarTextures) {
          texture.anisotropy = textureAnisotropy;
          texture.minFilter = LinearMipmapLinearFilter;
          texture.magFilter = LinearFilter;
          texture.generateMipmaps = true;
          texture.needsUpdate = true;
        }
        vrm.scene.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          object.castShadow = !lowPowerDevice;
          object.receiveShadow = !lowPowerDevice;
        });
        modelRoot.add(vrm.scene);
        vrm.scene.updateMatrixWorld(true);
        const bounds = new Box3().setFromObject(vrm.scene);
        const height = Math.max(0.1, bounds.max.y - bounds.min.y);
        avatarHeight = height;
        deskPositionX = height * (LIVE_BEDROOM_DESK_X_RATIO - LIVE_BEDROOM_DESK_STAND_X_OFFSET_RATIO);
        vrm.scene.position.y -= bounds.min.y;
        // The room is sized from this measured height. Keep the model at that
        // same scale so the desk, chair and floor share one physical scale.
        modelRoot.scale.setScalar(1);
        modelRoot.position.x = deskPositionX;
        modelRoot.position.z = height * LIVE_BEDROOM_DESK_STAND_Z_RATIO;
        const deskPositionZ = height * LIVE_BEDROOM_DESK_STAND_Z_RATIO;
        roomRoutePoints = [
          { x: deskPositionX, z: deskPositionZ },
          {
            x: deskPositionX - height * LIVE_BEDROOM_WINDOW_DISTANCE_RATIO,
            z: height * LIVE_BEDROOM_WINDOW_APPROACH_Z_RATIO,
          },
        ];
        roomRouteLengthValue = roomRouteLength(roomRoutePoints);

        camera.position.set(deskPositionX, height * 0.9, height * 1.65);
        camera.lookAt(deskPositionX, height * 0.47, modelRoot.position.z);
        previousRouteX = deskPositionX;
        previousRouteZ = modelRoot.position.z;
        smoothedVelocityX = 0;
        smoothedVelocityZ = 0;
        cameraLookX = deskPositionX;
        cameraLookZ = modelRoot.position.z;
        rebuildBedroom();

        const humanoid = vrm.humanoid;
        for (const name of [
          'head',
          'hips',
          'chest',
          'spine',
          'upperChest',
          'neck',
          'leftShoulder',
          'rightShoulder',
          'leftUpperLeg',
          'rightUpperLeg',
          'leftLowerLeg',
          'rightLowerLeg',
          'leftFoot',
          'rightFoot',
          'leftUpperArm',
          'rightUpperArm',
          'leftLowerArm',
          'rightLowerArm',
          'leftHand',
          'rightHand',
        ] as const) {
          const bone = humanoid?.getNormalizedBoneNode(name);
          if (!bone) continue;
          bones.set(name, bone);
          baseRotations.set(name, bone.rotation.clone());
        }

        vrm.scene.updateMatrixWorld(true);
        const inverseRootRotation = modelRoot.getWorldQuaternion(new Quaternion()).invert();
        for (const name of ['leftFoot', 'rightFoot'] as const) {
          const foot = bones.get(name);
          if (!foot) continue;
          footGroundHeights.set(name, foot.getWorldPosition(new Vector3()).y);
          footRestRootQuaternions.set(
            name,
            inverseRootRotation.clone().multiply(foot.getWorldQuaternion(new Quaternion())),
          );
        }

        vrm.lookAt && (vrm.lookAt.target = gazeTarget);
        setError('');
        setLoaded(true);
      },
      (progress) => {
        if (!disposed && progress.total > 0) {
          setLoadProgress(clamp(progress.loaded / progress.total, 0, 1));
        }
      },
      (loadError) => {
        if (!disposed) {
          setError(loadError instanceof Error
            ? `Le modèle n’a pas pu être chargé : ${loadError.message}`
            : 'Le modèle VRM n’a pas pu être chargé.');
        }
      },
    );

    renderer.setAnimationLoop((time) => {
      const delta = lastFrame ? Math.min((time - lastFrame) / 1000, 0.05) : 0;
      lastFrame = time;
      elapsed += delta;

      if (vrm) {
        const currentMode = modeRef.current;
        const speaking = currentMode === 'speaking';
        const thinking = currentMode === 'thinking';
        const listening = currentMode === 'listening';
        const energy = speaking ? clamp((audioLevelRef.current - 0.015) * 3.4, 0, 1) : 0;
        const breath = Math.sin(elapsed * 1.18) * 0.009 * motionFactor;
        const idleSway = motionFactor;
        const windowTravel = avatarHeight * LIVE_BEDROOM_WINDOW_DISTANCE_RATIO;
        const deskPositionZ = avatarHeight * LIVE_BEDROOM_DESK_STAND_Z_RATIO;
        const windowPositionX = deskPositionX - windowTravel;
        const windowPositionZ = avatarHeight * LIVE_BEDROOM_WINDOW_APPROACH_Z_RATIO;
        const positionProgress = routeProgressFromPosition(
          modelRoot.position.x,
          modelRoot.position.z,
          roomRoutePoints,
        );
        const activity = roomAutonomy.update(
          delta,
          interactionActiveRef.current
            || currentMode !== 'ready'
            || document.visibilityState !== 'visible',
          motionFactor > 0,
          positionProgress,
        );
        const walkingOut = activity.activity === 'walking-to-window';
        const atWindow = activity.activity === 'looking-out-window';
        const walkingToCenter = activity.activity === 'walking-to-room-center';
        const walkingBack = activity.activity === 'walking-to-desk';
        const lookingAround = activity.activity === 'looking-around';
        const moving = motionFactor > 0 && (walkingOut || walkingToCenter || walkingBack);
        modelRoot.position.y = 0;
        const routeProgress = roomRouteMotion.update(
          moving ? activity.activity : 'attending',
          moving ? delta : 0,
          positionProgress,
        );
        if (moving && !wasMoving) {
          walkStartProgress = positionProgress;
          const leftFoot = bones.get('leftFoot');
          const rightFoot = bones.get('rightFoot');
          const leftGroundHeight = footGroundHeights.get('leftFoot');
          const rightGroundHeight = footGroundHeights.get('rightFoot');
          if (leftFoot && leftGroundHeight !== undefined) {
            captureFootStart(leftFootLock, leftFoot, leftGroundHeight);
            leftFootLock.planted = true;
          }
          if (rightFoot && rightGroundHeight !== undefined) {
            captureFootStart(rightFootLock, rightFoot, rightGroundHeight);
          }
        }
        wasMoving = moving;
        if (moving) {
          const routePosition = roomRoutePointAtProgress(roomRoutePoints, routeProgress);
          modelRoot.position.x = routePosition.x;
          modelRoot.position.z = routePosition.z;
        }
        const walkedDistance = Math.abs(routeProgress - walkStartProgress) * roomRouteLengthValue;
        const walkCycles = roomWalkCyclesForDistance(walkedDistance, avatarHeight);
        const walkPose = getRoomWalkPose(
          walkCycles * ROOM_WALK_CYCLE_SECONDS,
        );
        const travelProgress = moving ? routeProgress : positionProgress;
        const routeDirection: 1 | -1 = moving && activity.targetProgress < positionProgress ? -1 : 1;
        const routeTangent = roomRouteTangentAtProgress(roomRoutePoints, travelProgress, routeDirection);
        const windowTangent = roomRouteTangentAtProgress(roomRoutePoints, travelProgress);
        const movementHeading = Math.atan2(routeTangent.x, routeTangent.z);
        const routeHeading = Math.atan2(windowTangent.x, windowTangent.z);
        modelRoot.position.y = moving ? walkPose.bodyBob * avatarHeight : 0;
        const routeVelocityX = delta > 0 ? (modelRoot.position.x - previousRouteX) / delta : 0;
        const routeVelocityZ = delta > 0 ? (modelRoot.position.z - previousRouteZ) / delta : 0;
        previousRouteX = modelRoot.position.x;
        previousRouteZ = modelRoot.position.z;
        smoothedVelocityX = MathUtils.damp(smoothedVelocityX, routeVelocityX, 3.2, delta);
        smoothedVelocityZ = MathUtils.damp(smoothedVelocityZ, routeVelocityZ, 3.2, delta);
        const cameraRoutePosition = roomRoutePointAtProgress(roomRoutePoints, travelProgress);
        if (bedroom) {
          bedroom.avatarShadow.position.x = modelRoot.position.x;
          bedroom.avatarShadow.position.z = modelRoot.position.z;
        }

        // Follow gently so the audience can see Maxime cross the room instead
        // of watching the room slide around a nearly stationary-looking avatar.
        const follow = 0.9;
        const cameraTargetX = deskPositionX + (cameraRoutePosition.x - deskPositionX) * follow
          + clamp(smoothedVelocityX * 0.045, -avatarHeight * 0.045, avatarHeight * 0.045);
        const cameraTargetZ = avatarHeight * 1.65
          + (cameraRoutePosition.z - deskPositionZ) * follow;
        camera.position.x = MathUtils.damp(camera.position.x, cameraTargetX, 1.9, delta);
        camera.position.z = MathUtils.damp(camera.position.z, cameraTargetZ, 1.9, delta);
        const lookTargetX = deskPositionX + (cameraRoutePosition.x - deskPositionX) * follow
          + clamp(smoothedVelocityX * 0.025, -avatarHeight * 0.025, avatarHeight * 0.025);
        const lookTargetZ = deskPositionZ + (cameraRoutePosition.z - deskPositionZ) * follow;
        cameraLookX = MathUtils.damp(cameraLookX, lookTargetX, 3.1, delta);
        cameraLookZ = MathUtils.damp(cameraLookZ, lookTargetZ, 3.1, delta);
        camera.lookAt(cameraLookX, avatarHeight * 0.47, cameraLookZ);

        const facingTarget = (moving
          ? movementHeading
          : atWindow
            ? routeHeading
            : lookingAround
              ? Math.sin(elapsed * 0.42) * 0.2
            : thinking
              ? Math.PI * 0.12
              : 0) * motionFactor;
        const facingDelta = Math.atan2(Math.sin(facingTarget - modelRoot.rotation.y), Math.cos(facingTarget - modelRoot.rotation.y));
        modelRoot.rotation.y += facingDelta * (1 - Math.exp(-4.5 * delta));

        const setBonePose = (name: BoneName, x: number, y: number, z: number) => {
          const bone = bones.get(name);
          const base = baseRotations.get(name);
          if (!bone || !base) return;
          bone.rotation.set(
            MathUtils.damp(bone.rotation.x, base.x + x, 9, delta),
            MathUtils.damp(bone.rotation.y, base.y + y, 9, delta),
            MathUtils.damp(bone.rotation.z, base.z + z, 9, delta),
          );
        };

        setBonePose(
          'hips',
          0,
          Math.sin(elapsed * 0.52) * 0.008 * idleSway + (moving ? walkPose.torsoTwist : 0),
          0,
        );
        if (moving) {
          // IK must start from the same rig pose every frame. Reusing last
          // frame's solved rotations makes the feet drift and the knees twist.
          for (const name of [
            'leftUpperLeg',
            'rightUpperLeg',
            'leftLowerLeg',
            'rightLowerLeg',
            'leftFoot',
            'rightFoot',
          ] as const) {
            const bone = bones.get(name);
            const base = baseRotations.get(name);
            if (bone && base) bone.rotation.copy(base);
          }
        } else {
          setBonePose('leftUpperLeg', 0, 0, 0);
          setBonePose('rightUpperLeg', 0, 0, 0);
          setBonePose('leftLowerLeg', 0, 0, 0);
          setBonePose('rightLowerLeg', 0, 0, 0);
          setBonePose('leftFoot', 0, 0, 0);
          setBonePose('rightFoot', 0, 0, 0);
        }
        setBonePose(
          'spine',
          breath
            + (thinking ? 0.018 : speaking ? energy * 0.018 : 0)
            + (moving ? 0.008 : 0),
          0,
          0,
        );
        setBonePose('chest', Math.sin(elapsed * 1.1) * 0.008 * idleSway, 0, speaking ? Math.sin(elapsed * 1.35) * energy * 0.018 : 0);
        setBonePose(
          'head',
          (thinking ? 0.1 : 0)
            + (listening
              ? Math.sin(elapsed * 1.8) * 0.022 * idleSway
              : lookingAround
                ? Math.sin(elapsed * 0.9) * 0.035 * idleSway
                : Math.sin(elapsed * 0.73) * 0.012 * idleSway),
          Math.sin(elapsed * (lookingAround ? 0.72 : 0.39))
            * (listening ? 0.034 : lookingAround ? 0.085 : 0.017)
            * idleSway,
          thinking ? -0.065 : speaking ? Math.sin(elapsed * 1.3) * (0.012 + energy * 0.035) * idleSway : Math.sin(elapsed * 0.51) * 0.012 * idleSway,
        );
        const speechGesture = speaking ? motionFactor * energy * (0.45 + 0.55 * Math.max(0, Math.sin(elapsed * 1.55))) : 0;
        setBonePose(
          'leftUpperArm',
          moving ? walkPose.leftArmSwing : speaking ? Math.sin(elapsed * 1.4) * speechGesture * 0.11 : Math.sin(elapsed * 0.66) * 0.012 * idleSway,
          speaking ? -0.25 : 0,
          speaking ? 1.02 + speechGesture * 0.14 : 1.18,
        );
        setBonePose(
          'rightUpperArm',
          moving ? walkPose.rightArmSwing : speaking ? Math.sin(elapsed * 1.5 + 1) * speechGesture * 0.08 : Math.sin(elapsed * 0.68 + 1) * 0.012 * idleSway,
          speaking ? 0.18 : 0,
          -1.18,
        );
        setBonePose(
          'leftLowerArm',
          speaking ? -0.28 : moving ? 0.04 : -0.04,
          0,
          0.035,
        );
        setBonePose(
          'rightLowerArm',
          speaking ? -0.08 : moving ? 0.04 : -0.04,
          0,
          -0.035,
        );
        setBonePose('leftHand', 0, 0, 0);
        setBonePose('rightHand', 0, 0, 0);
        if (moving) {
          const gaitPhase = walkCycles % 1;
          const leftStance = gaitPhase < 0.5;
          const rightStance = !leftStance;
          const leftFoot = bones.get('leftFoot');
          const rightFoot = bones.get('rightFoot');
          const leftUpperLeg = bones.get('leftUpperLeg');
          const leftLowerLeg = bones.get('leftLowerLeg');
          const rightUpperLeg = bones.get('rightUpperLeg');
          const rightLowerLeg = bones.get('rightLowerLeg');
          const leftRestRoot = footRestRootQuaternions.get('leftFoot');
          const rightRestRoot = footRestRootQuaternions.get('rightFoot');
          const leftGroundHeight = footGroundHeights.get('leftFoot');
          const rightGroundHeight = footGroundHeights.get('rightFoot');
          const gaitForward = new Vector3(routeTangent.x, 0, routeTangent.z);
          // A foot advances half of the full same-foot gait cycle on each swing.
          const swingLength = avatarHeight * ROOM_WALK_CYCLE_STRIDE_HEIGHT_RATIO * 0.5;
          const footLift = avatarHeight * 0.05;
          modelRoot.updateWorldMatrix(true, false);
          const rootRotation = modelRoot.getWorldQuaternion(new Quaternion());

          if (leftFoot && leftGroundHeight !== undefined) {
            const leftRestRotation = rootRotation.clone().multiply(leftRestRoot ?? new Quaternion());
            const leftLandingTarget = leftStance && !leftFootLock.planted
              ? getSwingFootTarget(
                leftFootLock.anchor,
                gaitForward,
                swingLength,
                1,
                leftGroundHeight,
                footLift,
              )
              : undefined;
            updateFootLock(
              leftFootLock,
              leftStance,
              leftFoot,
              leftGroundHeight,
              leftLandingTarget,
              leftLandingTarget ? leftRestRotation : undefined,
            );
            const swingProgress = gaitPhase >= 0.5 ? (gaitPhase - 0.5) * 2 : 0;
            const target = leftStance
              ? leftFootLock.anchor
              : getSwingFootTarget(
                leftFootLock.anchor,
                gaitForward,
                swingLength,
                swingProgress,
                leftGroundHeight,
                footLift,
              );
            const footRotation = leftStance
              ? leftFootLock.anchorQuaternion
              : rootRotation.clone().multiply(leftRestRoot ?? new Quaternion());
            if (leftUpperLeg && leftLowerLeg) {
              solveGroundedLeg({
                upperLeg: leftUpperLeg,
                lowerLeg: leftLowerLeg,
                foot: leftFoot,
                anchor: target,
                footRestWorldQuaternion: footRotation,
                kneePoleDirection: gaitForward,
              });
            }
          }

          if (rightFoot && rightGroundHeight !== undefined) {
            const rightRestRotation = rootRotation.clone().multiply(rightRestRoot ?? new Quaternion());
            const rightLandingTarget = rightStance && !rightFootLock.planted
              ? getSwingFootTarget(
                rightFootLock.anchor,
                gaitForward,
                swingLength,
                1,
                rightGroundHeight,
                footLift,
              )
              : undefined;
            updateFootLock(
              rightFootLock,
              rightStance,
              rightFoot,
              rightGroundHeight,
              rightLandingTarget,
              rightLandingTarget ? rightRestRotation : undefined,
            );
            const swingProgress = gaitPhase < 0.5 ? gaitPhase * 2 : 0;
            const target = rightStance
              ? rightFootLock.anchor
              : getSwingFootTarget(
                rightFootLock.anchor,
                gaitForward,
                swingLength,
                swingProgress,
                rightGroundHeight,
                footLift,
              );
            const footRotation = rightStance
              ? rightFootLock.anchorQuaternion
              : rootRotation.clone().multiply(rightRestRoot ?? new Quaternion());
            if (rightUpperLeg && rightLowerLeg) {
              solveGroundedLeg({
                upperLeg: rightUpperLeg,
                lowerLeg: rightLowerLeg,
                foot: rightFoot,
                anchor: target,
                footRestWorldQuaternion: footRotation,
                kneePoleDirection: gaitForward,
              });
            }
          }
        } else {
          leftFootLock.planted = false;
          rightFootLock.planted = false;
        }

        const lookX = Math.sin(elapsed * (thinking || lookingAround ? 0.72 : 0.31))
          * (thinking ? 0.16 : lookingAround ? 0.12 : 0.045)
          * idleSway;
        const lookY = avatarHeight * (listening ? 0.79 : thinking ? 0.73 : 0.76) + Math.sin(elapsed * 0.47) * avatarHeight * 0.008 * idleSway;
        const gazeX = atWindow ? windowPositionX : modelRoot.position.x + lookX * avatarHeight;
        gazeTarget.position.set(
          gazeX,
          lookY,
          atWindow ? windowPositionZ - avatarHeight * 0.2 : avatarHeight * 2.6,
        );

        const expressions = vrm.expressionManager;
        if (expressions) {
          const now = performance.now();
          if (now >= nextBlink) {
            blinkStarted = now;
            nextBlink = now + 2600 + Math.random() * 2600;
          }
          const blinkElapsed = blinkStarted < 0 ? Infinity : now - blinkStarted;
          const automaticBlink = blinkElapsed < 170
            ? Math.sin((blinkElapsed / 170) * Math.PI)
            : 0;
          const blink = Math.max(automaticBlink, blinkingRef.current ? 1 : 0);
          const targetMouth = speaking ? clamp((audioLevelRef.current - 0.014) * 3.1, 0, 0.92) : 0;
          smoothedMouth = MathUtils.damp(smoothedMouth, targetMouth, 15, delta);
          const setExpression = (name: string, value: number) => {
            if (expressions.getExpression(name)) expressions.setValue(name, value);
          };
          setExpression('blink', blink);
          setExpression('aa', smoothedMouth);
          const mouthShape = 0.72 + Math.sin(elapsed * 5.3) * 0.18;
          setExpression('ih', smoothedMouth * Math.max(0, 0.45 - mouthShape));
          setExpression('ee', smoothedMouth * Math.max(0, mouthShape - 0.58));
          setExpression('ou', smoothedMouth * (1 - Math.abs(Math.sin(elapsed * 4.1))) * 0.38);
          setExpression('happy', speaking ? 0.08 + energy * 0.12 : 0);
        }

        vrm.update(delta);
      }

      renderer.render(scene, camera);
    });

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      motionPreference.removeEventListener('change', updateMotionPreference);
      renderer.setAnimationLoop(null);
      renderer.dispose();
      bedroom?.dispose();
      if (vrm) VRMUtils.deepDispose(vrm.scene);
      scene.clear();
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="live-vrm-avatar" data-testid="live-vrm-avatar" data-loaded={loaded}>
      <div
        ref={hostRef}
        className={`live-vrm-canvas${loaded && !error ? ' live-vrm-canvas--visible' : ''}`}
        aria-label="Personnage Maxime en 3D"
        data-testid="canvas-live-vrm"
      />
      {!loaded && !error && (
        <div className="live-vrm-placeholder" role="status" aria-live="polite">
          <span className="live-vrm-progress-track" aria-hidden="true"><i style={{ transform: `scaleX(${Math.max(0.12, loadProgress)})` }} /></span>
          <span>{loadProgress > 0 ? 'Chargement du personnage 3D…' : 'Préparation du personnage 3D…'}</span>
        </div>
      )}
      {error && <span className="live-vrm-notice live-vrm-notice--error" role="status">{error}</span>}
    </div>
  );
}
