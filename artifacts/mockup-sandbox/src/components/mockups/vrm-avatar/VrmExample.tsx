import { useEffect, useRef, useState } from 'react';
import {
  AmbientLight,
  Box3,
  BoxGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
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
    let keyboard: Group | null = null;
    const typingKeys: Mesh[] = [];
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
        keyboard = new Group();
        keyboard.position.set(0, height * 0.52, height * 0.18);
        keyboard.rotation.x = 0.22;
        keyboard.visible = false;
        const keyboardDeck = new Mesh(
          new BoxGeometry(height * 0.76, height * 0.018, height * 0.2),
          new MeshStandardMaterial({ color: 0x10192a, metalness: 0.2, roughness: 0.46 }),
        );
        keyboard.add(keyboardDeck);
        const rows = 3;
        const columns = 11;
        const keyWidth = height * 0.047;
        const keyDepth = height * 0.038;
        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            const key = new Mesh(
              new BoxGeometry(keyWidth, height * 0.009, keyDepth),
              new MeshStandardMaterial({
                color: 0x263a56,
                emissive: 0x22a9c6,
                emissiveIntensity: 0.06,
                roughness: 0.34,
              }),
            );
            key.position.set(
              (column - (columns - 1) / 2) * keyWidth * 1.14,
              height * 0.014,
              (row - (rows - 1) / 2) * keyDepth * 1.18,
            );
            key.userData.restY = key.position.y;
            keyboard.add(key);
            typingKeys.push(key);
          }
        }
        scene.add(keyboard);
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
        const isThinking = currentMode === 'thinking';
        const isSpeaking = currentMode === 'speaking';
        if (keyboard) keyboard.visible = isThinking;
        typingKeys.forEach((key, index) => {
          const pulse = (Math.sin(elapsed * 12 + index * 0.83) + 1) / 2;
          const material = key.material as MeshStandardMaterial;
          material.emissiveIntensity = isThinking ? 0.12 + pulse * 0.38 : 0.06;
          key.position.y = Number(key.userData.restY) + (isThinking ? pulse * 0.004 : 0);
        });
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
            + (isSpeaking ? Math.sin(elapsed * 2.4) * 0.018 : 0)
            + (isThinking ? 0.018 : 0);
        }
        const typingReach = isThinking ? -0.15 : 0;
        if (leftUpperArm) {
          leftUpperArm.rotation.z = leftArmBase + (isSpeaking ? 0.43 + Math.sin(elapsed * 2.1) * 0.08 : 0.6 - typingReach);
          leftUpperArm.rotation.y = isThinking ? -1.42 : 0;
        }
        if (rightUpperArm) {
          rightUpperArm.rotation.z = rightArmBase - 0.6 + typingReach;
          rightUpperArm.rotation.y = isThinking ? 1.42 : 0;
        }
        const expressions = vrm.expressionManager;
        if (expressions) {
          const now = performance.now();
          if (now >= nextBlink) {
            blinkStarted = now;
            nextBlink = now + 2400 + Math.random() * 2200;
          }
          const blinkElapsed = blinkStarted < 0 ? Infinity : now - blinkStarted;
          const blink = blinkElapsed < 150 ? Math.sin((blinkElapsed / 150) * Math.PI) : 0;
          const mouth = isSpeaking
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
      keyboard?.traverse((object) => {
        if (object instanceof Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
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
            Le modèle réagit aux quatre états; un clavier apparaît pendant la réflexion.
            La bouche et les clignements sont simulés, sans voix ni micro.
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
