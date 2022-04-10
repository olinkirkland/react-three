import { Box, QuadTree } from 'js-quadtree';
import {
  Group,
  OrthographicCamera,
  Scene,
  Sprite,
  SpriteMaterial,
  TextureLoader,
  WebGLRenderer
} from 'three';
import { tileDefinitions } from './tile-definitions';

const TILE_SCALE = 1.6;
const TILE_HEIGHT = 0.55;

export default class Game {
  constructor(canvas, setLoadingText) {
    this.canvas = canvas;
    this.setLoadingText = setLoadingText;

    // Scene, camera, renderer
    this.setupScene();

    // Load textures
    this.loadTextures();

    // Load map
    this.loadMap('map-2');

    // Controls
    this.setupControls();

    // Start the game loop
    this.animate();
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

    camera.position.set(20, 10, 20); // Dimetric perspective
    camera.lookAt(scene.position); // Look at the origin, to get the camera's angle right
    const renderer = new WebGLRenderer({
      canvas: this.canvas
    });

    renderer.setClearColor(0xd7bda5);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // const gridHelper = new GridHelper(5, 5);
    // scene.add(gridHelper);

    // const ambientLight = new AmbientLight(0xffffff);
    // scene.add(ambientLight);

    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
  }

  loadTextures() {
    this.setLoadingText(`loading textures (${tileDefinitions.length})`);
    this.materials = {};
    tileDefinitions.forEach((d) => {
      const url = `tiles/${d.src}.png`;
      const texture = new TextureLoader().load(url);
      const material = new SpriteMaterial({ map: texture });
      this.materials[d.id] = material;
    });
    this.setLoadingText(`✔️ textures loaded`, 2);
  }

  loadMap(mapName) {
    if (this.world) {
      // TODO unload the current map
    }

    let url = `${process.env.PUBLIC_URL}/maps/${mapName}.tmj`;
    this.setLoadingText(`loading map from ${url}`);
    fetch(url).then((response) => {
      response.json().then((json) => {
        // Parse the map data
        this.mapWidth = json.width;

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
                this.addTile(x, y, z, tileId);
              }
            });
          }
        });

        this.setLoadingText(`✔️ map loaded`, 2);
      });
    });
  }

  addTile(x, y, z, tileId) {
    const tileData = tileDefinitions.find((d) => d.id === tileId.toString());
    if (!tileData) {
      console.error('tile', tileId, 'not found');
      return;
    }

    // console.log('adding tile', tileId, x, y, z);
    const tile = new Sprite(this.materials[tileId]);
    tile.scale.set(TILE_SCALE, TILE_SCALE, TILE_SCALE);
    tile.position.set(x, y, z * TILE_HEIGHT);
    this.world.add(tile);

    // this.tiles.insert({ x, y, z });
  }

  setupControls() {
    // Zoom camera in and out
    window.addEventListener('wheel', (e) => {
      this.camera.zoom -= (e.deltaY / Math.abs(e.deltaY)) * 0.2;
      this.camera.zoom = Math.min(Math.max(this.camera.zoom, 0.2), 4);
      this.camera.updateProjectionMatrix();
    });
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    // Game loop
    // this.world.rotation.z += 0.01;

    this.renderer.render(this.scene, this.camera);
  }
}
