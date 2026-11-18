import { useEffect, useRef, useState } from 'react';
import {
  AmbientLight,
  Box3,
  DirectionalLight,
  Euler,
  MathUtils,
  Object3D,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import type { LiveAvatarModelMode } from './live-avatar-model';
import { LiveAvatarModel } from './live-avatar-model';
import avatarUrl from '../../../../attached_assets/avatar_1794982764789.vrm?url';

interface LiveVrmAvatarProps {
  mode: LiveAvatarModelMode;
  audioLevel: number;
  blinking: boolean;
}

type BoneName =
  | 'head'
  | 'spine'
  | 'leftUpperArm'
  | 'rightUpperArm'
  | 'leftLowerArm'
  | 'rightLowerArm';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function LiveVrmAvatar({ mode, audioLevel, blinking }: LiveVrmAvatarProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef(mode);
  const audioLevelRef = useRef(audioLevel);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  modeRef.current = mode;
  audioLevelRef.current = Number.isFinite(audioLevel) ? clamp(audioLevel, 0, 1) : 0;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

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
    let lastFrame = 0;
    let elapsed = 0;
    let smoothedMouth = 0;
    let nextBlink = performance.now() + 1800 + Math.random() * 1600;
    let blinkStarted = -1;
    const baseRotations = new Map<BoneName, Euler>();
    const bones = new Map<BoneName, Object3D>();
    const camera = new PerspectiveCamera(32, 1, 0.05, 100);
    const scene = new Scene();
    const modelRoot = new Object3D();

    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);
    scene.add(modelRoot);

    const ambient = new AmbientLight(0xc5e8ff, 1.35);
    const keyLight = new DirectionalLight(0xffead6, 2.1);
    keyLight.position.set(-3, 5, 4);
    const fillLight = new DirectionalLight(0x45caff, 0.9);
    fillLight.position.set(3, 2, -3);
    scene.add(ambient, keyLight, fillLight);

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
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
        vrm.scene.position.y -= bounds.min.y;

        const humanoid = vrm.humanoid;
        for (const name of [
          'head',
          'spine',
          'leftUpperArm',
          'rightUpperArm',
          'leftLowerArm',
          'rightLowerArm',
        ] as const) {
          const bone = humanoid?.getNormalizedBoneNode(name);
          if (!bone) continue;
          bones.set(name, bone);
          baseRotations.set(name, bone.rotation.clone());
        }

        camera.position.set(0, height * 0.64, height * 2.2);
        camera.lookAt(0, height * 0.52, 0);
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
        const breath = Math.sin(elapsed * 1.7) * 0.012;

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

        setBonePose('spine', breath + (speaking ? Math.sin(elapsed * 2.2) * 0.018 : 0), 0, 0);
        setBonePose(
          'head',
          (thinking ? 0.12 : 0) + (listening ? Math.sin(elapsed * 2) * 0.035 : Math.sin(elapsed * 0.7) * 0.012),
          Math.sin(elapsed * 0.5) * (listening ? 0.04 : 0.018),
          thinking ? -0.075 : speaking ? Math.sin(elapsed * 2.1) * 0.035 : 0,
        );
        setBonePose('leftUpperArm', 0, 0, 1.18 + (speaking ? Math.sin(elapsed * 1.9) * 0.08 : 0));
        setBonePose('rightUpperArm', 0, 0, -1.18 - (speaking ? Math.sin(elapsed * 1.9 + 1) * 0.07 : 0));
        setBonePose('leftLowerArm', -0.08, 0, 0.04);
        setBonePose('rightLowerArm', -0.08, 0, -0.04);

        const expressions = vrm.expressionManager;
        if (expressions) {
          const now = performance.now();
          if (now >= nextBlink) {
            blinkStarted = now;
            nextBlink = now + 2600 + Math.random() * 2600;
          }
          const blinkElapsed = blinkStarted < 0 ? Infinity : now - blinkStarted;
          const blink = blinkElapsed < 170
            ? Math.sin((blinkElapsed / 170) * Math.PI)
            : 0;
          const targetMouth = speaking
            ? clamp((audioLevelRef.current - 0.018) * 2.7, 0, 0.86)
            : 0;
          smoothedMouth = MathUtils.damp(smoothedMouth, targetMouth, 15, delta);
          const setExpression = (name: string, value: number) => {
            if (expressions.getExpression(name)) expressions.setValue(name, value);
          };
          setExpression('blink', blink);
          setExpression('aa', smoothedMouth);
          setExpression('ou', smoothedMouth * 0.24);
        }

        vrm.update(delta);
      }

      renderer.render(scene, camera);
    });

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      renderer.dispose();
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
