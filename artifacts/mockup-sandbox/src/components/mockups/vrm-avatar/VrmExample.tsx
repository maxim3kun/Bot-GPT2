import { useEffect, useRef, useState } from 'react';
import {
  AmbientLight,
  Box3,
  BoxGeometry,
  DirectionalLight,
  Euler,
  Group,
  Mesh,
  MeshStandardMaterial,
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
import './vrm-example.css';

type AvatarMode =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'walking'
  | 'running'
  | 'jumping'
  | 'waving'
  | 'pointing'
  | 'dancing';

const modes: Array<{ id: AvatarMode; label: string; duration: number; category: 'conversation' | 'movement' }> = [
  { id: 'idle', label: 'Repos', duration: 2100, category: 'conversation' },
  { id: 'listening', label: 'Écoute', duration: 2500, category: 'conversation' },
  { id: 'thinking', label: 'Clavier', duration: 2800, category: 'conversation' },
  { id: 'speaking', label: 'Parole', duration: 3200, category: 'conversation' },
  { id: 'walking', label: 'Marche', duration: 2600, category: 'movement' },
  { id: 'running', label: 'Course', duration: 2500, category: 'movement' },
  { id: 'jumping', label: 'Saut', duration: 2300, category: 'movement' },
  { id: 'waving', label: 'Salut', duration: 2500, category: 'movement' },
  { id: 'pointing', label: 'Pointer', duration: 2200, category: 'movement' },
  { id: 'dancing', label: 'Danse', duration: 3200, category: 'movement' },
];

const sampleVrmUrl =
  'https://raw.githubusercontent.com/vrm-c/UniVRM/efd20f62f1bf0ac3fcc34de1e497324c5197d146/Tests/Models/Alicia_vrm-0.51/AliciaSolid_vrm-0.51.vrm';

export function VrmExample() {
  const stageRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<AvatarMode>('idle');
  const gazeRef = useRef({ x: 0, y: 0, active: false });
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
    let head: Object3D | null = null;
    let spine: Object3D | null = null;
    let hips: Object3D | null = null;
    let leftUpperArm: Object3D | null = null;
    let rightUpperArm: Object3D | null = null;
    let leftLowerArm: Object3D | null = null;
    let rightLowerArm: Object3D | null = null;
    let leftUpperLeg: Object3D | null = null;
    let rightUpperLeg: Object3D | null = null;
    let leftLowerLeg: Object3D | null = null;
    let rightLowerLeg: Object3D | null = null;
    let modelBaseY = 0;
    let avatarHeight = 1;
    let gazeTarget: Object3D | null = null;
    const baseRotations = new Map<Object3D, Euler>();
    const gazePoint = new Vector3();
    let keyboard: Group | null = null;
    const typingKeys: Mesh[] = [];
    const setBoneRotation = (
      bone: Object3D | null,
      delta: number,
      x = 0,
      y = 0,
      z = 0,
    ) => {
      if (!bone) return;
      const base = baseRotations.get(bone);
      if (!base) return;
      const smoothing = 11;
      bone.rotation.set(
        MathUtils.damp(bone.rotation.x, base.x + x, smoothing, delta),
        MathUtils.damp(bone.rotation.y, base.y + y, smoothing, delta),
        MathUtils.damp(bone.rotation.z, base.z + z, smoothing, delta),
      );
    };
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
        avatarHeight = height;
        vrm.scene.position.y -= bounds.min.y;
        modelBaseY = vrm.scene.position.y;
        gazeTarget = new Object3D();
        scene.add(gazeTarget);
        if (vrm.lookAt) vrm.lookAt.target = gazeTarget;
        const humanoid = vrm.humanoid;
        head = humanoid?.getNormalizedBoneNode('head') ?? null;
        spine = humanoid?.getNormalizedBoneNode('spine') ?? null;
        hips = humanoid?.getNormalizedBoneNode('hips') ?? null;
        leftUpperArm = vrm.humanoid?.getNormalizedBoneNode('leftUpperArm') ?? null;
        rightUpperArm = vrm.humanoid?.getNormalizedBoneNode('rightUpperArm') ?? null;
        leftLowerArm = humanoid?.getNormalizedBoneNode('leftLowerArm') ?? null;
        rightLowerArm = humanoid?.getNormalizedBoneNode('rightLowerArm') ?? null;
        leftUpperLeg = humanoid?.getNormalizedBoneNode('leftUpperLeg') ?? null;
        rightUpperLeg = humanoid?.getNormalizedBoneNode('rightUpperLeg') ?? null;
        leftLowerLeg = humanoid?.getNormalizedBoneNode('leftLowerLeg') ?? null;
        rightLowerLeg = humanoid?.getNormalizedBoneNode('rightLowerLeg') ?? null;
        [
          head,
          spine,
          hips,
          leftUpperArm,
          rightUpperArm,
          leftLowerArm,
          rightLowerArm,
          leftUpperLeg,
          rightUpperLeg,
          leftLowerLeg,
          rightLowerLeg,
        ].forEach((bone) => {
          if (bone) baseRotations.set(bone, bone.rotation.clone());
        });
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
        const stepPhase = elapsed * (currentMode === 'running' ? 8 : 4.8);
        const step = Math.sin(stepPhase);
        const bounce = Math.abs(Math.sin(stepPhase * 2));
        let rootLift = 0;
        let headX = isThinking ? 0.12 : 0;
        let headY = Math.sin(elapsed * 0.55) * (currentMode === 'listening' ? 0.055 : 0.018);
        let headZ = currentMode === 'thinking' ? -0.075 : 0;
        let spineX = Math.sin(elapsed * 1.7) * 0.012 + (isThinking ? 0.018 : 0);
        let spineZ = 0;
        let hipsY = 0;
        let hipsZ = 0;
        let leftArmX = 0;
        let rightArmX = 0;
        let leftArmY = 0;
        let rightArmY = 0;
        let leftArmZ = 0.6;
        let rightArmZ = -0.6;
        let leftForearmX = 0;
        let rightForearmX = 0;
        let leftForearmZ = 0;
        let rightForearmZ = 0;
        let leftLegX = 0;
        let rightLegX = 0;
        let leftKneeX = 0;
        let rightKneeX = 0;

        switch (currentMode) {
          case 'listening':
            headX += Math.sin(elapsed * 2.2) * 0.028;
            headZ += Math.sin(elapsed * 0.8) * 0.025;
            break;
          case 'thinking':
            headX += 0.045 + Math.sin(elapsed * 1.7) * 0.025;
            leftArmY = -1.42;
            rightArmY = 1.42;
            leftArmZ = 0.75;
            rightArmZ = -0.75;
            leftForearmX = -0.08 + Math.sin(elapsed * 12) * 0.05;
            rightForearmX = -0.08 + Math.sin(elapsed * 12 + 1) * 0.05;
            leftForearmZ = Math.sin(elapsed * 12) * 0.06;
            rightForearmZ = Math.sin(elapsed * 12 + 1) * 0.06;
            break;
          case 'speaking':
            leftArmZ = 0.44 + Math.sin(elapsed * 2.1) * 0.12;
            leftArmX = Math.sin(elapsed * 1.8) * 0.1;
            spineX += Math.sin(elapsed * 2.4) * 0.018;
            headX += Math.sin(elapsed * 2.4) * 0.025;
            break;
          case 'walking':
            leftLegX = step * 0.34;
            rightLegX = -step * 0.34;
            leftKneeX = Math.max(0, -step) * 0.38;
            rightKneeX = Math.max(0, step) * 0.38;
            leftArmX = -step * 0.25;
            rightArmX = step * 0.25;
            rootLift = bounce * 0.022;
            hipsY = Math.sin(stepPhase) * 0.035;
            break;
          case 'running':
            leftLegX = step * 0.58;
            rightLegX = -step * 0.58;
            leftKneeX = Math.max(0, -step) * 0.82;
            rightKneeX = Math.max(0, step) * 0.82;
            leftArmX = -step * 0.48;
            rightArmX = step * 0.48;
            leftArmZ = 0.32;
            rightArmZ = -0.32;
            rootLift = bounce * 0.052;
            hipsY = Math.sin(stepPhase) * 0.05;
            spineX = -0.06 + Math.sin(stepPhase * 2) * 0.025;
            break;
          case 'jumping': {
            const jump = Math.max(0, Math.sin(elapsed * 2.7));
            rootLift = jump * 0.34;
            leftLegX = -jump * 0.24;
            rightLegX = -jump * 0.24;
            leftKneeX = jump * 0.48;
            rightKneeX = jump * 0.48;
            leftArmZ = -0.82 - jump * 0.12;
            rightArmZ = 0.82 + jump * 0.12;
            spineX = -jump * 0.06;
            break;
          }
          case 'waving':
            leftArmZ = -0.92;
            leftArmY = -0.16;
            leftForearmZ = -0.2 + Math.sin(elapsed * 6.2) * 0.42;
            leftForearmX = Math.sin(elapsed * 6.2) * 0.12;
            break;
          case 'pointing':
            leftArmZ = 0.06;
            leftArmY = -1.28;
            leftForearmZ = -0.02;
            headY = -0.12 + Math.sin(elapsed * 0.8) * 0.025;
            break;
          case 'dancing':
            hipsY = Math.sin(elapsed * 3.1) * 0.2;
            hipsZ = Math.sin(elapsed * 3.1) * 0.08;
            spineZ = Math.sin(elapsed * 3.1) * 0.12;
            leftArmZ = -0.25 + Math.sin(elapsed * 3.1) * 0.55;
            rightArmZ = 0.25 - Math.sin(elapsed * 3.1 + 1.5) * 0.55;
            leftArmX = Math.sin(elapsed * 3.1 + 0.4) * 0.24;
            rightArmX = -Math.sin(elapsed * 3.1 + 1.1) * 0.24;
            leftLegX = Math.sin(elapsed * 3.1) * 0.25;
            rightLegX = -Math.sin(elapsed * 3.1) * 0.25;
            rootLift = bounce * 0.035;
            headZ = Math.sin(elapsed * 3.1) * 0.08;
            break;
          default:
            spineX = Math.sin(elapsed * 1.7) * 0.012;
        }

        if (gazeTarget) {
          const pointer = gazeRef.current;
          const gazeX = pointer.active ? pointer.x * 0.78 : Math.sin(elapsed * 0.38) * 0.18;
          const gazeY = pointer.active ? pointer.y * 0.44 : Math.sin(elapsed * 0.53) * 0.1;
          gazePoint.set(
            gazeX * avatarHeight * 0.72,
            avatarHeight * (0.84 - gazeY * 0.16),
            avatarHeight * 1.75,
          );
          gazeTarget.position.lerp(gazePoint, 1 - Math.exp(-delta * 7));
        }

        vrm.scene.position.y = modelBaseY + rootLift;
        setBoneRotation(head, delta, headX, headY, headZ);
        setBoneRotation(spine, delta, spineX, 0, spineZ);
        setBoneRotation(hips, delta, 0, hipsY, hipsZ);
        setBoneRotation(leftUpperArm, delta, leftArmX, leftArmY, leftArmZ);
        setBoneRotation(rightUpperArm, delta, rightArmX, rightArmY, rightArmZ);
        setBoneRotation(leftLowerArm, delta, leftForearmX, 0, leftForearmZ);
        setBoneRotation(rightLowerArm, delta, rightForearmX, 0, rightForearmZ);
        setBoneRotation(leftUpperLeg, delta, leftLegX);
        setBoneRotation(rightUpperLeg, delta, rightLegX);
        setBoneRotation(leftLowerLeg, delta, leftKneeX);
        setBoneRotation(rightLowerLeg, delta, rightKneeX);
        const expressions = vrm.expressionManager;
        if (expressions) {
          const now = performance.now();
          if (now >= nextBlink) {
            blinkStarted = now;
            nextBlink = now + 2400 + Math.random() * 2200;
          }
          const blinkElapsed = blinkStarted < 0 ? Infinity : now - blinkStarted;
          const blink = blinkElapsed < 150 ? Math.sin((blinkElapsed / 150) * Math.PI) : 0;
          const setExpression = (name: string, value: number) => {
            if (expressions.getExpression(name)) expressions.setValue(name, value);
          };
          const mouthPhase = elapsed * 8.5;
          const mouthOpen = isSpeaking ? 0.12 + Math.abs(Math.sin(mouthPhase)) * 0.52 : 0;
          const viseme = Math.floor(mouthPhase / 1.5) % 4;
          const moodHappy = ['speaking', 'waving', 'dancing'].includes(currentMode);
          const surprise = currentMode === 'jumping'
            ? Math.max(0, Math.sin(elapsed * 2.7)) * 0.42
            : 0;
          setExpression('blink', blink);
          setExpression('aa', viseme === 0 ? mouthOpen : mouthOpen * 0.2);
          setExpression('ih', viseme === 1 ? mouthOpen * 0.78 : 0);
          setExpression('ou', viseme === 2 ? mouthOpen * 0.7 : 0);
          setExpression('ee', viseme === 3 ? mouthOpen * 0.72 : 0);
          setExpression('happy', moodHappy ? 0.2 + Math.max(0, Math.sin(elapsed * 1.4)) * 0.12 : 0);
          setExpression('relaxed', currentMode === 'idle' || currentMode === 'listening' ? 0.12 : 0);
          setExpression('surprised', surprise);
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
          <p className="vrm-demo__eyebrow">PERSONNAGE VIRTUEL · ESSAI 3D</p>
          <h1>Un personnage qui réagit à toi</h1>
          <p className="vrm-demo__subtitle">Regard interactif · expressions · mouvements · sans caméra ni micro</p>
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
        <div
          className="vrm-demo__stage"
          onPointerMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            gazeRef.current = {
              x: ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
              y: ((event.clientY - bounds.top) / bounds.height - 0.5) * 2,
              active: true,
            };
          }}
          onPointerLeave={() => {
            gazeRef.current.active = false;
          }}
        >
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
        <div className="vrm-demo__controls">
          <span className="vrm-demo__gaze-hint">Déplace le pointeur : elle le suit du regard</span>
          {[
            { id: 'conversation', title: 'Conversation' },
            { id: 'movement', title: 'Mouvements' },
          ].map((group) => (
            <section className="vrm-demo__control-group" key={group.id} aria-label={group.title}>
              <h2>{group.title}</h2>
              <div className="vrm-demo__control-row" role="group" aria-label={group.title}>
                {modes.filter((item) => item.category === group.id).map((item) => (
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
            </section>
          ))}
        </div>
        <div className="vrm-demo__notice">
          <strong>Ce que montre cet essai</strong>
          <p>
            Elle suit le pointeur, cligne des yeux, change d’expression et articule des formes de bouche simulées.
            Marche/course sur place, saut, clavier, salut, pointage et danse restent des mouvements de démonstration.
            Aucun micro ni audio réel n’est relié.
          </p>
          <p>
            Alicia Solid reste le modèle d’exemple pour les personas; ton avatar Maxime reste distinct.
            <a href="https://3d.nicovideo.jp/alicia/rule.html" target="_blank" rel="noreferrer"> Conditions et attribution du modèle</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
