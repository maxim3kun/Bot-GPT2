import { useEffect, useRef, useState } from 'react';
import {
  AmbientLight,
  AnimationClip,
  AnimationMixer,
  Box3,
  DirectionalLight,
  Euler,
  LinearFilter,
  LinearMipmapLinearFilter,
  LoopRepeat,
  MeshStandardMaterial,
  MathUtils,
  Object3D,
  PerspectiveCamera,
  QuaternionKeyframeTrack,
  Scene,
  SRGBColorSpace,
  Texture,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils, type VRMHumanBoneName } from '@pixiv/three-vrm';
import type { LiveAvatarModelMode } from './live-avatar-model';
import {
  createLiveBedroomScene,
  LIVE_BEDROOM_CHAIR_SEAT_HEIGHT_RATIO,
  LIVE_BEDROOM_DESK_X_RATIO,
  LIVE_BEDROOM_WINDOW_DISTANCE_RATIO,
  type LiveBedroomScene,
} from './live-bedroom-scene';
import { createRoomAutonomy, createRoomRouteMotion } from './live-room-autonomy';
import walkAnimation from '../assets/quaternius-walk-loop.json';
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
const animatedWalkBones = new Set(walkAnimation.tracks.map((track) => track.bone));

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
    let walkMixer: AnimationMixer | undefined;
    let walkAction: ReturnType<AnimationMixer['clipAction']> | undefined;
    let walkAnimationActive = false;
    let bedroom: LiveBedroomScene | undefined;
    let avatarHeight = 1;
    let lastFrame = 0;
    let elapsed = 0;
    let smoothedMouth = 0;
    let deskPositionX = 0;
    let bedroomAspect = 0;
    let previousRouteX = 0;
    let smoothedVelocityX = 0;
    let cameraLookX = 0;
    let seatedPose = 0;
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
    const bones = new Map<BoneName, Object3D>();
    const camera = new PerspectiveCamera(43, 1, 0.05, 100);
    const scene = new Scene();
    scene.background = null;
    const modelRoot = new Object3D();
    const gazeTarget = new Object3D();

    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPowerDevice ? 1.45 : isPhone ? 1.8 : 2));
    renderer.setClearColor(0xf1f0eb, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);
    scene.add(modelRoot);
    scene.add(gazeTarget);
    motionPreference.addEventListener('change', updateMotionPreference);

    const ambient = new AmbientLight(0xe7e5dc, 1.75);
    const keyLight = new DirectionalLight(0xffe2bd, 2.25);
    keyLight.position.set(-3, 5, 4);
    const fillLight = new DirectionalLight(0xa4c7d3, 0.65);
    fillLight.position.set(3, 2, -3);
    scene.add(ambient, keyLight, fillLight);

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
        const textureAnisotropy = Math.min(
          renderer.capabilities.getMaxAnisotropy(),
          lowPowerDevice ? 2 : isPhone ? 4 : 8,
        );
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
          if (texture.minFilter === LinearFilter) {
            texture.minFilter = LinearMipmapLinearFilter;
            texture.generateMipmaps = true;
          }
          texture.needsUpdate = true;
        }
        modelRoot.add(vrm.scene);
        vrm.scene.updateMatrixWorld(true);
        const bounds = new Box3().setFromObject(vrm.scene);
        const height = Math.max(0.1, bounds.max.y - bounds.min.y);
        avatarHeight = height;
        deskPositionX = height * LIVE_BEDROOM_DESK_X_RATIO;
        vrm.scene.position.y -= bounds.min.y;
        modelRoot.scale.setScalar(0.78);
        modelRoot.position.x = deskPositionX;
        modelRoot.position.z = -height * 0.26;

        camera.position.set(deskPositionX, height * 0.9, height * 1.65);
        camera.lookAt(deskPositionX, height * 0.47, 0);
        previousRouteX = deskPositionX;
        cameraLookX = deskPositionX;
        rebuildBedroom();

        const humanoid = vrm.humanoid;
        for (const name of [
          'head',
          'hips',
          'chest',
          'spine',
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

        const walkTracks = walkAnimation.tracks.flatMap(({ bone, values }) => {
          const normalizedBone = humanoid?.getNormalizedBoneNode(bone as VRMHumanBoneName);
          if (!normalizedBone) return [];

          // Match the quaternion convention used by three-vrm's VRM 0 retargeting.
          const compatibleValues = vrm?.meta.metaVersion === '0'
            ? values.map((value, index) => (index % 4 === 0 || index % 4 === 2 ? -value : value))
            : values;
          return [
            new QuaternionKeyframeTrack(
              `${normalizedBone.name}.quaternion`,
              walkAnimation.times,
              compatibleValues,
            ),
          ];
        });
        if (walkTracks.length === 0) {
          setError('Le cycle de marche ne correspond pas aux os du modèle VRM.');
          return;
        }
        walkMixer = new AnimationMixer(vrm.scene);
        walkAction = walkMixer.clipAction(
          new AnimationClip('Quaternius Walk Loop', walkAnimation.duration, walkTracks),
        );
        walkAction.setLoop(LoopRepeat, Infinity);

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
        const positionProgress = clamp((deskPositionX - modelRoot.position.x) / windowTravel, 0, 1);
        const activity = roomAutonomy.update(
          delta,
          interactionActiveRef.current
            || currentMode !== 'ready'
            || document.visibilityState !== 'visible',
          motionFactor > 0,
          positionProgress,
        );
        const working = activity.activity === 'working-seated';
        const stretching = activity.activity === 'stretching';
        const walkingOut = activity.activity === 'walking-to-window';
        const atWindow = activity.activity === 'looking-out-window';
        const walkingBack = activity.activity === 'walking-to-desk';
        const moving = motionFactor > 0 && (walkingOut || walkingBack);
        const seatedTarget = activity.seated ? 1 : 0;
        seatedPose = motionFactor > 0
          ? MathUtils.damp(seatedPose, seatedTarget, 4.2, delta)
          : seatedTarget;
        modelRoot.position.y = MathUtils.damp(
          modelRoot.position.y,
          activity.seated ? avatarHeight * (LIVE_BEDROOM_CHAIR_SEAT_HEIGHT_RATIO - 0.52) : 0,
          motionFactor > 0 ? 4.2 : 1000,
          delta,
        );
        if (moving && walkAction && !walkAnimationActive) {
          walkAction.reset().fadeIn(0.22).play();
          walkAnimationActive = true;
        } else if (!moving && walkAction && walkAnimationActive) {
          walkAction.fadeOut(0.24);
          walkAnimationActive = false;
        }
        walkMixer?.update(delta);
        const walkPoseActive = Boolean(
          walkAction?.isRunning() && walkAction.getEffectiveWeight() > 0.025,
        );
        const routeProgress = roomRouteMotion.update(
          moving ? activity.activity : 'attending',
          moving ? delta : 0,
          positionProgress,
        );
        if (moving) {
          modelRoot.position.x = deskPositionX - windowTravel * routeProgress;
        }
        const travelProgress = moving ? routeProgress : positionProgress;
        const routeVelocityX = delta > 0 ? (modelRoot.position.x - previousRouteX) / delta : 0;
        previousRouteX = modelRoot.position.x;
        smoothedVelocityX = MathUtils.damp(smoothedVelocityX, routeVelocityX, 3.2, delta);

        // The camera trails the route slightly and looks just ahead, keeping Maxime framed
        // while the room moves through the composition instead of sliding the character away.
        const cameraTargetX = deskPositionX - windowTravel * travelProgress * 0.64
          + clamp(smoothedVelocityX * 0.045, -avatarHeight * 0.045, avatarHeight * 0.045);
        camera.position.x = MathUtils.damp(camera.position.x, cameraTargetX, 1.9, delta);
        const lookTargetX = modelRoot.position.x + clamp(smoothedVelocityX * 0.025, -avatarHeight * 0.025, avatarHeight * 0.025);
        cameraLookX = MathUtils.damp(cameraLookX, lookTargetX, 3.1, delta);
        camera.lookAt(cameraLookX, avatarHeight * 0.47, 0);

        const profileTurn = Math.PI * 0.22;
        const facingTarget = (walkingOut || atWindow
          ? -profileTurn
          : walkingBack
            ? profileTurn
            : 0) * motionFactor;
        const facingDelta = Math.atan2(Math.sin(facingTarget - modelRoot.rotation.y), Math.cos(facingTarget - modelRoot.rotation.y));
        modelRoot.rotation.y += facingDelta * (1 - Math.exp(-1.25 * delta));

        const setBonePose = (name: BoneName, x: number, y: number, z: number) => {
          if (walkPoseActive && animatedWalkBones.has(name)) return;
          const bone = bones.get(name);
          const base = baseRotations.get(name);
          if (!bone || !base) return;
          bone.rotation.set(
            MathUtils.damp(bone.rotation.x, base.x + x, 9, delta),
            MathUtils.damp(bone.rotation.y, base.y + y, 9, delta),
            MathUtils.damp(bone.rotation.z, base.z + z, 9, delta),
          );
        };

        setBonePose('hips', 0, Math.sin(elapsed * 0.52) * 0.008 * idleSway, 0);
        setBonePose('leftUpperLeg', seatedPose * 1.12, 0, 0);
        setBonePose('rightUpperLeg', seatedPose * 1.12, 0, 0);
        setBonePose('leftLowerLeg', seatedPose * -0.98, 0, 0);
        setBonePose('rightLowerLeg', seatedPose * -0.98, 0, 0);
        setBonePose('leftFoot', seatedPose * -0.12, 0, 0);
        setBonePose('rightFoot', seatedPose * -0.12, 0, 0);
        setBonePose('spine', breath + (thinking ? 0.018 : speaking ? energy * 0.018 : 0) + seatedPose * -0.035, 0, 0);
        setBonePose('chest', Math.sin(elapsed * 1.1) * 0.008 * idleSway, 0, speaking ? Math.sin(elapsed * 1.35) * energy * 0.018 : 0);
        setBonePose(
          'head',
          (thinking ? 0.1 : 0) + (listening ? Math.sin(elapsed * 1.8) * 0.022 * idleSway : Math.sin(elapsed * 0.73) * 0.012 * idleSway),
          Math.sin(elapsed * 0.39) * (listening ? 0.034 : 0.017) * idleSway,
          thinking ? -0.065 : speaking ? Math.sin(elapsed * 1.3) * (0.012 + energy * 0.035) * idleSway : Math.sin(elapsed * 0.51) * 0.012 * idleSway,
        );
        const typingPhase = elapsed * 10.5;
        const typing = (thinking || working) && motionFactor > 0;
        const typePulse = typing ? motionFactor : 0;
        const speechGesture = speaking ? motionFactor * energy * (0.45 + 0.55 * Math.max(0, Math.sin(elapsed * 1.55))) : 0;
        const stretchAmount = stretching ? 0.7 + Math.sin(elapsed * 1.15) * 0.05 : 0;
        setBonePose(
          'leftUpperArm',
          stretching ? -0.12 : typing ? -0.08 : speaking ? Math.sin(elapsed * 1.4) * speechGesture * 0.11 : Math.sin(elapsed * 0.66) * 0.012 * idleSway,
          stretching ? -0.12 : typing ? -1.2 : speaking ? -0.25 : 0,
          stretching ? stretchAmount : typing ? 0.66 : speaking ? 1.02 + speechGesture * 0.14 : 1.18,
        );
        setBonePose(
          'rightUpperArm',
          stretching ? -0.12 : typing ? -0.08 : speaking ? Math.sin(elapsed * 1.5 + 1) * speechGesture * 0.08 : Math.sin(elapsed * 0.68 + 1) * 0.012 * idleSway,
          stretching ? 0.12 : typing ? 1.2 : speaking ? 0.18 : 0,
          stretching ? -stretchAmount : typing ? -0.66 : -1.18,
        );
        setBonePose(
          'leftLowerArm',
          stretching ? -0.28 : typing ? -0.1 + Math.sin(typingPhase) * 0.06 * typePulse : speaking ? -0.28 : -0.04,
          0,
          stretching ? 0.08 : typing ? Math.sin(typingPhase) * 0.035 * typePulse : 0.035,
        );
        setBonePose(
          'rightLowerArm',
          stretching ? -0.28 : typing ? -0.1 + Math.sin(typingPhase + 1.5) * 0.06 * typePulse : speaking ? -0.08 : -0.04,
          0,
          stretching ? -0.08 : typing ? Math.sin(typingPhase + 1.5) * 0.035 * typePulse : -0.035,
        );
        setBonePose('leftHand', 0, 0, typing ? Math.sin(typingPhase) * 0.045 * typePulse : 0);
        setBonePose('rightHand', 0, 0, typing ? Math.sin(typingPhase + 1.5) * 0.045 * typePulse : 0);

        const lookX = Math.sin(elapsed * (thinking ? 0.72 : 0.31)) * (thinking ? 0.16 : 0.045) * idleSway;
        const lookY = avatarHeight * (listening ? 0.79 : thinking ? 0.73 : 0.76) + Math.sin(elapsed * 0.47) * avatarHeight * 0.008 * idleSway;
        const gazeX = atWindow
          ? deskPositionX - windowTravel
          : modelRoot.position.x + lookX * avatarHeight;
        gazeTarget.position.set(gazeX, lookY, avatarHeight * 2.6);

        bedroom?.keyboardKeys.forEach((key, index) => {
          const restY = Number(key.userData.restY ?? key.position.y);
          const pulse = (Math.sin(typingPhase + index * 0.77) + 1) * 0.5;
          key.position.y = restY + pulse * (typePulse ? avatarHeight * 0.003 : 0);
          const material = key.material;
          if (material instanceof MeshStandardMaterial) {
            material.emissiveIntensity = typePulse ? 0.1 + pulse * 0.2 : 0.1;
          }
        });

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
      walkMixer?.stopAllAction();
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
