import { useEffect, useRef, useState } from 'react';
import {
  AmbientLight,
  Box3,
  DirectionalLight,
  Euler,
  MeshStandardMaterial,
  MathUtils,
  Object3D,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import type { LiveAvatarModelMode } from './live-avatar-model';
import { LiveAvatarModel } from './live-avatar-model';
import { createLiveBedroomScene, type LiveBedroomScene } from './live-bedroom-scene';
import avatarUrl from '../../../../attached_assets/avatar_1794982764789.vrm?url';

interface LiveVrmAvatarProps {
  mode: LiveAvatarModelMode;
  audioLevel: number;
  blinking: boolean;
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

export function LiveVrmAvatar({ mode, audioLevel, blinking }: LiveVrmAvatarProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef(mode);
  const audioLevelRef = useRef(audioLevel);
  const blinkingRef = useRef(blinking);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  modeRef.current = mode;
  audioLevelRef.current = Number.isFinite(audioLevel) ? clamp(audioLevel, 0, 1) : 0;
  blinkingRef.current = blinking;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        alpha: true,
        antialias: window.innerWidth > 700,
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
    let elapsed = 9;
    let smoothedMouth = 0;
    let deskPositionX = 0;
    let bedroomAspect = 0;
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.2));
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
      const cameraDistance = Math.hypot(camera.position.y - avatarHeight * 0.47, camera.position.z);
      const visibleWorldWidth = 2 * cameraDistance * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
      const nextBedroom = createLiveBedroomScene(avatarHeight, deskPositionX - visibleWorldWidth * 0.385);
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
        modelRoot.add(vrm.scene);
        vrm.scene.updateMatrixWorld(true);
        const bounds = new Box3().setFromObject(vrm.scene);
        const height = Math.max(0.1, bounds.max.y - bounds.min.y);
        avatarHeight = height;
        deskPositionX = height * 0.7;
        vrm.scene.position.y -= bounds.min.y;
        modelRoot.scale.setScalar(0.78);
        modelRoot.position.x = deskPositionX;
        modelRoot.position.z = -height * 0.26;

        camera.position.set(deskPositionX, height * 0.9, height * 1.15);
        camera.lookAt(deskPositionX, height * 0.47, 0);
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

        vrm.lookAt && (vrm.lookAt.target = gazeTarget);
        setError('');
        setLoaded(true);
      },
      undefined,
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
        const promenadeTime = elapsed % 28;
        const walkingOut = promenadeTime >= 4 && promenadeTime < 8;
        const atWindow = promenadeTime >= 8 && promenadeTime < 12;
        const walkingBack = promenadeTime >= 12 && promenadeTime < 16;
        const smoothStep = (value: number) => {
          const t = clamp(value, 0, 1);
          return t * t * (3 - 2 * t);
        };
        const windowProgress = walkingOut
          ? smoothStep((promenadeTime - 4) / 4)
          : atWindow
            ? 1
            : walkingBack
              ? 1 - smoothStep((promenadeTime - 12) / 4)
              : 0;
        const cameraDistance = Math.hypot(camera.position.y - avatarHeight * 0.47, camera.position.z);
        const visibleWorldWidth = 2 * cameraDistance * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
        const windowTravel = visibleWorldWidth * 0.385;
        const moving = motionFactor > 0 && (walkingOut || walkingBack);
        const walkBlend = MathUtils.damp(
          Number(modelRoot.userData.walkBlend ?? 0),
          moving ? 1 : 0,
          6,
          delta,
        );
        modelRoot.userData.walkBlend = walkBlend;
        const travelProgress = windowProgress * motionFactor;
        modelRoot.position.x = MathUtils.damp(modelRoot.position.x, deskPositionX - windowTravel * travelProgress, 4, delta);
        camera.position.x = modelRoot.position.x;
        camera.lookAt(modelRoot.position.x, avatarHeight * 0.47, 0);
        const walkFacing = walkingOut || atWindow
          ? -Math.PI / 2
          : walkingBack
            ? Math.PI / 2
            : 0;
        modelRoot.rotation.y = MathUtils.damp(modelRoot.rotation.y, walkFacing * motionFactor, 3.5, delta);
        const gaitPhase = elapsed * 5.8;
        const leftStep = Math.sin(gaitPhase) * walkBlend;
        const rightStep = Math.sin(gaitPhase + Math.PI) * walkBlend;

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

        setBonePose('hips', Math.abs(Math.sin(gaitPhase * 2)) * walkBlend * 0.025, Math.sin(elapsed * 0.52) * 0.008 * idleSway, Math.sin(gaitPhase) * walkBlend * 0.025);
        setBonePose('leftUpperLeg', leftStep * 0.34, 0, 0);
        setBonePose('rightUpperLeg', rightStep * 0.34, 0, 0);
        setBonePose('leftLowerLeg', Math.max(0, -leftStep) * 0.46, 0, 0);
        setBonePose('rightLowerLeg', Math.max(0, -rightStep) * 0.46, 0, 0);
        setBonePose('leftFoot', Math.max(0, leftStep) * -0.18, 0, 0);
        setBonePose('rightFoot', Math.max(0, rightStep) * -0.18, 0, 0);
        setBonePose('spine', breath + (thinking ? 0.018 : speaking ? energy * 0.018 : 0), 0, Math.sin(gaitPhase) * walkBlend * 0.018);
        setBonePose('chest', Math.sin(elapsed * 1.1) * 0.008 * idleSway, 0, speaking ? Math.sin(elapsed * 1.35) * energy * 0.018 : 0);
        setBonePose(
          'head',
          (thinking ? 0.1 : 0) + (listening ? Math.sin(elapsed * 1.8) * 0.022 * idleSway : Math.sin(elapsed * 0.73) * 0.012 * idleSway),
          Math.sin(elapsed * 0.39) * (listening ? 0.034 : 0.017) * idleSway,
          thinking ? -0.065 : speaking ? Math.sin(elapsed * 1.3) * (0.012 + energy * 0.035) * idleSway : Math.sin(elapsed * 0.51) * 0.012 * idleSway,
        );
        const typingPhase = elapsed * 10.5;
        const typePulse = thinking ? motionFactor : 0;
        const speechGesture = speaking ? motionFactor * energy * (0.45 + 0.55 * Math.max(0, Math.sin(elapsed * 1.55))) : 0;
        setBonePose('leftUpperArm', (thinking ? -0.08 : speaking ? Math.sin(elapsed * 1.4) * speechGesture * 0.11 : Math.sin(elapsed * 0.66) * 0.012 * idleSway) + leftStep * 0.14, thinking ? -1.2 : speaking ? -0.25 : 0, thinking ? 0.66 : speaking ? 1.02 + speechGesture * 0.14 : 1.18);
        setBonePose('rightUpperArm', (thinking ? -0.08 : speaking ? Math.sin(elapsed * 1.5 + 1) * speechGesture * 0.08 : Math.sin(elapsed * 0.68 + 1) * 0.012 * idleSway) + rightStep * 0.14, thinking ? 1.2 : speaking ? 0.18 : 0, thinking ? -0.66 : -1.18);
        setBonePose('leftLowerArm', thinking ? -0.1 + Math.sin(typingPhase) * 0.06 * typePulse : speaking ? -0.28 : -0.04, 0, thinking ? Math.sin(typingPhase) * 0.035 * typePulse : 0.035);
        setBonePose('rightLowerArm', thinking ? -0.1 + Math.sin(typingPhase + 1.5) * 0.06 * typePulse : speaking ? -0.08 : -0.04, 0, thinking ? Math.sin(typingPhase + 1.5) * 0.035 * typePulse : -0.035);
        setBonePose('leftHand', 0, 0, thinking ? Math.sin(typingPhase) * 0.045 * typePulse : 0);
        setBonePose('rightHand', 0, 0, thinking ? Math.sin(typingPhase + 1.5) * 0.045 * typePulse : 0);

        const lookX = Math.sin(elapsed * (thinking ? 0.72 : 0.31)) * (thinking ? 0.16 : 0.045) * idleSway;
        const lookY = avatarHeight * (listening ? 0.79 : thinking ? 0.73 : 0.76) + Math.sin(elapsed * 0.47) * avatarHeight * 0.008 * idleSway;
        gazeTarget.position.set(modelRoot.position.x + lookX * avatarHeight, lookY, avatarHeight * 2.6);

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
      renderer.dispose();
      bedroom?.dispose();
      if (vrm) VRMUtils.deepDispose(vrm.scene);
      scene.clear();
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="live-vrm-avatar" data-testid="live-vrm-avatar" data-loaded={loaded}>
      <div className={`live-vrm-fallback${loaded && !error ? ' live-vrm-fallback--hidden' : ''}`}>
        <LiveAvatarModel mode={mode} audioLevel={audioLevel} blinking={blinking} />
      </div>
      <div
        ref={hostRef}
        className={`live-vrm-canvas${loaded && !error ? ' live-vrm-canvas--visible' : ''}`}
        aria-label="Personnage Maxime en 3D"
        data-testid="canvas-live-vrm"
      />
      {!loaded && !error && <span className="live-vrm-notice" role="status">Chargement du personnage 3D…</span>}
      {error && <span className="live-vrm-notice live-vrm-notice--error" role="status">{error}</span>}
    </div>
  );
}
