import { Box, QuadTree } from 'js-quadtree';
import {
  AmbientLight,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  Sprite,
  SpriteMaterial,
  TextureLoader,
  Vector2,
  WebGLRenderer
} from 'three';
import { tileDefinitions } from './tile-definitions';

const TILE_SCALE = 1.6;
const TILE_HEIGHT = 0.8;

export default class Game {
  constructor(canvas, setLoadingText) {
    this.canvas = canvas;
    this.setLoadingText = setLoadingText;

    // Scene, camera, renderer
    this.setupScene();

    // Load textures
    this.loadTextures(() => {
      // Load map
      this.loadMap('map-1', () => {
        // Player
        this.setupPlayer();

        // Controls
        this.setupControls();

        // Start the game loop
        this.animate();
      });
    });
  }

  setupScene() {
    // Set up camera & renderer
    const aspectRatio = window.innerWidth / window.innerHeight;
    const distance = 10;
    const camera = new OrthographicCamera(
      -distance * aspectRatio,
      distance * aspectRatio,
      distance,
      -distance,
      1,
      1000
    );

    const scene = new Scene();
    camera.position.set(20, 15, 20); // Dimetric: Y=10, Isometric: Y=20
    camera.lookAt(scene.position); // Look at the origin, to get the camera's angle right
    const renderer = new WebGLRenderer({
      canvas: this.canvas
    });

    renderer.setClearColor(0xd7bda5);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // const gridHelper = new GridHelper(5, 5);
    // scene.add(gridHelper);

    const ambientLight = new AmbientLight(0xffffff);
    scene.add(ambientLight);

    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
  }

  loadTextures(onComplete) {
    this.setLoadingText(`loading ${tileDefinitions.length} textures`);
    this.materials = {};

    let textureCount = 0;
    tileDefinitions.forEach((d) => {
      const url = `tiles/${d.src}.png`;
      const texture = new TextureLoader().load(url, () => {
        textureCount++;
        if (textureCount < tileDefinitions.length) return;
        // Complete
        this.setLoadingText(`✔️ textures loaded`, 2);
        onComplete();
      });
      const material = new SpriteMaterial({ map: texture });
      this.materials[d.id] = material;
    });
  }

  loadMap(mapName, onComplete) {
    if (this.world) {
      // TODO unload the current map
    }

    let url = `${process.env.PUBLIC_URL}/maps/${mapName}.tmj`;
    this.setLoadingText(`loading map from ${url}`);
    fetch(url).then((response) => {
      response.json().then((json) => {
        // Parse the map data
        this.mapWidth = json.width;

        // Create the tile map
        this.world = new Group();
        this.world.position.x -= this.mapWidth / 2;
        this.world.position.y -= this.mapWidth / 2;
        this.worldContainer = new Group();
        this.worldContainer.rotation.x = -Math.PI / 2;
        this.worldContainer.add(this.world);
        this.scene.add(this.worldContainer);

        this.tiles = new QuadTree(new Box(0, 0, this.mapWidth, this.mapHeight));
        json.layers.forEach((layer, z) => {
          if (layer.data) {
            layer.data.forEach((tileId, i) => {
              if (tileId) {
                const x = i % this.mapWidth;
                const y = Math.floor(i / this.mapWidth);
                const tile = this.addTile(x, -y + this.mapWidth, z, tileId);
                // tile.visible = false;
              }
            });
          }
        });

        // Create plane for testing mouse navigation
        const geometry = new PlaneGeometry(this.mapWidth, this.mapWidth);
        const material = new MeshStandardMaterial({
          color: 0xffff00,
          side: DoubleSide
        });
        this.plane = new Mesh(geometry, material);
        this.worldContainer.add(this.plane);

        this.setLoadingText(`✔️ map loaded`, 2);
        onComplete();
      });
    });
  }

  addTile(x, y, z, tileId) {
    const tileData = tileDefinitions.find(
      (d) => d.id === (tileId - 1).toString()
    );
    if (!tileData) {
      console.error('tile', tileId, 'not found');
      return;
    }

    // console.log('adding tile', tileId, x, y, z);
    const tile = new Sprite(this.materials[tileData.id]);
    tile.name = 'tile';
    tile.scale.set(TILE_SCALE, TILE_SCALE * 1.4, TILE_SCALE); // 1.4 is the ratio
    tile.position.set(x, y, z * TILE_HEIGHT);
    this.world.add(tile);

    this.tiles.insert({ x: x, y: y, z: z });
    return tile;
  }

  setupControls() {
    // Zoom camera in and out
    window.addEventListener('wheel', (e) => {
      this.camera.zoom -= (e.deltaY / Math.abs(e.deltaY)) * 0.2;
      this.camera.zoom = Math.min(Math.max(this.camera.zoom, 0.2), 4);
      this.camera.updateProjectionMatrix();
    });

    // Move the player toward the mouse
    const raycaster = new Raycaster();
    let mouse = new Vector2();
    window.addEventListener('mousemove', (e) => {
      if (!this.player) return;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObject(this.plane);

      if (intersects.length === 0) return;
      const intersect = intersects[0];
      const x = intersect.point.x + this.mapWidth / 2;
      const y = -intersect.point.z + this.mapWidth / 2;
      this.player.position.set(x, y, 0);
    });
  }

  setupPlayer() {
    console.log('player');
    this.player = new Sprite(this.materials['339']);
    this.world.add(this.player);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    if (!this.worldContainer) return;

    // Game loop

    this.renderer.render(this.scene, this.camera);
  }
}
