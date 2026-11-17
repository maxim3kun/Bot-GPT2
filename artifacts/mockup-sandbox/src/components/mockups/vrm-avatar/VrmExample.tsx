import { useEffect, useRef, useState } from 'react';
import {
  AmbientLight,
  Box3,
  DirectionalLight,
  Group,
  Object3D,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import './vrm-example.css';

type AvatarMode = 'idle' | 'listening' | 'thinking' | 'speaking';

const modes: Array<{ id: AvatarMode; label: string; duration: number }> = [
  { id: 'idle', label: 'Repos', duration: 2100 },
  { id: 'listening', label: 'Écoute', duration: 2500 },
  { id: 'thinking', label: 'Réflexion', duration: 2300 },
  { id: 'speaking', label: 'Parole', duration: 3200 },
];

const sampleVrmUrl =
  'https://raw.githubusercontent.com/vrm-c/UniVRM/efd20f62f1bf0ac3fcc34de1e497324c5197d146/Tests/Models/Alicia_vrm-0.51/AliciaSolid_vrm-0.51.vrm';

export function VrmExample() {
  const stageRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<AvatarMode>('idle');
  const [mode, setMode] = useState<AvatarMode>(() => {
    const requested = new URLSearchParams(window.location.search).get('mode');
    return modes.some((item) => item.id === requested) ? requested as AvatarMode : 'idle';
  });
  const [automatic, setAutomatic] = useState(() => new URLSearchParams(window.location.search).get('auto') !== '0');
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    if (!automatic) return;
    const currentIndex = modes.findIndex((item) => item.id === mode);
    const next = modes[(currentIndex + 1) % modes.length];
    const timer = window.setTimeout(
      () => setMode(next.id),
      modes[currentIndex]?.duration ?? 2100,
    );
    return () => window.clearTimeout(timer);
  }, [automatic, mode]);

  useEffect(() => {
    const host = stageRef.current;
    if (!host) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch {
      setError('Ce navigateur ne peut pas afficher le rendu 3D WebGL.');
      return;
    }

    let disposed = false;
    let vrm: VRM | undefined;
    let leftUpperArm: Object3D | null = null;
    let rightUpperArm: Object3D | null = null;
    let leftArmBase = 0;
    let rightArmBase = 0;
    const scene = new Scene();
    const camera = new PerspectiveCamera(30, 1, 0.1, 100);
    const modelRoot = new Group();

    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMappingExposure = 0.82;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);
    scene.add(modelRoot);

    const ambient = new AmbientLight(0xc5e8ff, 1.1);
    const key = new DirectionalLight(0xffead6, 1.8);
    key.position.set(-3, 5, 4);
    const fill = new DirectionalLight(0x45caff, 0.7);
    fill.position.set(3, 2, -3);
    scene.add(ambient, key, fill);

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

    let nextBlink = performance.now() + 2200;
    let blinkStarted = -1;
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    loader.load(
      sampleVrmUrl,
      (gltf) => {
        if (disposed) return;
        vrm = gltf.userData.vrm as VRM | undefined;
        if (!vrm) {
          setError('Le fichier chargé ne contient pas de modèle VRM reconnu.');
          return;
        }

        VRMUtils.rotateVRM0(vrm);
        modelRoot.add(vrm.scene);
        vrm.scene.updateMatrixWorld(true);
        const bounds = new Box3().setFromObject(vrm.scene);
        const height = Math.max(1, bounds.max.y - bounds.min.y);
        vrm.scene.position.y -= bounds.min.y;
        leftUpperArm = vrm.humanoid?.getNormalizedBoneNode('leftUpperArm') ?? null;
        rightUpperArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm') ?? null;
        leftArmBase = leftUpperArm?.rotation.z ?? 0;
        rightArmBase = rightUpperArm?.rotation.z ?? 0;
        camera.position.set(0, height * 0.52, height * 1.95);
        camera.lookAt(0, height * 0.51, 0);
        setLoaded(true);
      },
      (event) => {
        if (event.total > 0) setProgress(Math.round((event.loaded / event.total) * 100));
      },
      (loadError) => {
        if (!disposed) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : String(loadError || 'Impossible de charger le modèle d’exemple.'),
          );
        }
      },
    );

    let lastFrameTime = 0;
    let elapsed = 0;
    renderer.setAnimationLoop((time) => {
      const delta = lastFrameTime ? Math.min((time - lastFrameTime) / 1000, 0.05) : 0;
      lastFrameTime = time;
      elapsed += delta;
      const currentMode = modeRef.current;

      if (vrm) {
        const head = vrm.humanoid?.getNormalizedBoneNode('head');
        const spine = vrm.humanoid?.getNormalizedBoneNode('spine');
        if (head) {
          const thinking = currentMode === 'thinking' ? 0.12 : 0;
          const listening = currentMode === 'listening' ? 0.035 : 0;
          head.rotation.x = thinking + Math.sin(elapsed * 1.15) * 0.018;
          head.rotation.y = Math.sin(elapsed * 0.55) * (currentMode === 'listening' ? 0.055 : 0.018);
          head.rotation.z = (currentMode === 'thinking' ? -0.075 : listening)
            + Math.sin(elapsed * 0.8) * 0.012;
        }
        if (spine) {
          spine.rotation.x = Math.sin(elapsed * 1.7) * 0.012
            + (currentMode === 'speaking' ? Math.sin(elapsed * 2.4) * 0.018 : 0);
        }
        const speakingGesture = currentMode === 'speaking' ? Math.sin(elapsed * 2.1) * 0.1 : 0;
        if (leftUpperArm) leftUpperArm.rotation.z = leftArmBase + 0.6 + speakingGesture;
        if (rightUpperArm) rightUpperArm.rotation.z = rightArmBase - 0.6 - speakingGesture;
        const expressions = vrm.expressionManager;
        if (expressions) {
          const now = performance.now();
          if (now >= nextBlink) {
            blinkStarted = now;
            nextBlink = now + 2400 + Math.random() * 2200;
          }
          const blinkElapsed = blinkStarted < 0 ? Infinity : now - blinkStarted;
          const blink = blinkElapsed < 150 ? Math.sin((blinkElapsed / 150) * Math.PI) : 0;
          const mouth = currentMode === 'speaking'
            ? 0.16 + Math.max(0, Math.sin(elapsed * 10.5)) * 0.42
            : 0;
          expressions.setValue('blink', blink);
          expressions.setValue('aa', mouth);
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

  const selectMode = (next: AvatarMode) => {
    setAutomatic(false);
    setMode(next);
  };

  return (
    <main className="vrm-demo">
      <header className="vrm-demo__header">
        <div>
          <p className="vrm-demo__eyebrow">ESSAI DU RENDU 3D</p>
          <h1>Un vrai modèle VRM dans le navigateur</h1>
          <p className="vrm-demo__subtitle">Modèle d’exemple · test visuel · micro désactivé</p>
        </div>
        <button
          type="button"
          className="vrm-demo__play"
          aria-pressed={automatic}
          onClick={() => setAutomatic((value) => !value)}
        >
          {automatic ? 'Mettre en pause' : 'Lancer les mouvements'}
        </button>
      </header>

      <section className="vrm-demo__card">
        <div className="vrm-demo__stage-head">
          <div>
            <span className="vrm-demo__live-dot" />
            Démonstration interactive
          </div>
          <span className="vrm-demo__state">{modes.find((item) => item.id === mode)?.label}</span>
        </div>
        <div className="vrm-demo__stage">
          <div className="vrm-demo__canvas-host" ref={stageRef} aria-hidden="true" />
          {!loaded && !error && (
            <div className="vrm-demo__loading">
              <span className="vrm-demo__loader" />
              <strong>Chargement du modèle VRM…</strong>
              <span>{progress ? `${progress} %` : 'Connexion à la source officielle'}</span>
            </div>
          )}
          {error && <p className="vrm-demo__error">{error}</p>}
          <div className="vrm-demo__floor" aria-hidden="true" />
        </div>
        <div className="vrm-demo__controls" role="group" aria-label="États du personnage">
          {modes.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={!automatic && mode === item.id}
              onClick={() => selectMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="vrm-demo__notice">
          <strong>Ce que montre cet essai</strong>
          <p>
            Le modèle 3D réagit à quatre états. La bouche et les clignements sont simulés;
            aucune voix ni aucun micro ne sont utilisés.
          </p>
          <p>
            C’est Alicia Solid, un modèle de démonstration de DWANGO, pas encore le personnage Maxime.
            <a href="https://3d.nicovideo.jp/alicia/rule.html" target="_blank" rel="noreferrer"> Conditions et attribution du modèle</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
