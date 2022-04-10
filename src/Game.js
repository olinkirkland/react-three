import { Box, QuadTree } from 'js-quadtree';
import { AmbientLight } from 'three';
import { GridHelper } from 'three';
import {
  OrthographicCamera,
  Scene,
  Sprite,
  SpriteMaterial,
  TextureLoader,
  WebGLRenderer
} from 'three';
import { tileDefinitions } from './tile-definitions';

const TILE_SCALE = 1.55;

export default class Game {
  constructor(canvas, setLoadingText) {
    this.canvas = canvas;
    this.setLoadingText = setLoadingText;

    // Scene, camera, renderer
    this.setupScene();

    // Load textures
    this.loadTextures();

    // Load map
    this.loadMap('map-1');

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

    const gridHelper = new GridHelper(10, 10);
    scene.add(gridHelper);

    const ambientLight = new AmbientLight(0xffffff);
    scene.add(ambientLight);

    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
  }

  loadTextures() {
    this.setLoadingText(`loading textures (${tileDefinitions.length})`);
    this.materials = {};
    tileDefinitions.forEach((d) => {
      const texture = new TextureLoader().load(`tiles/${d.src}.png`);
      const material = new SpriteMaterial({ map: texture });
      this.materials[d.id] = material;
    });
    this.setLoadingText(`textures loaded`, 2);
  }

  loadMap(mapName) {
    if (this.map) {
      // TODO unload the current map
    }

    let url = `${process.env.PUBLIC_URL}/maps/${mapName}.tmj`;
    this.setLoadingText(`loading map from ${url}`);
    fetch(url).then((response) => {
      response.json().then((json) => {
        // Parse the map data
        this.mapWidth = json.width;
        this.mapHeight = json.height;

        this.tiles = new QuadTree(new Box(0, 0, this.mapWidth, this.mapHeight));
        json.layers.forEach((layer, elevation) => {
          if (layer.data) {
            layer.data.forEach((t, i) => {
              if (t) {
                const x = i % this.width;
                const y = Math.floor(i / this.width);
                this.addTile(x, y, elevation, t);
              }
            });
          }
        });

        this.setLoadingText(`✔️ map loaded`, 2);
      });
    });
  }

  addTile(x, y, elevation, tileId) {
    const tileData = tileDefinitions.find((d) => d.id === tileId.toString());
    if (!tileData) {
      console.error('tile', tileId, 'not found');
      return;
    }

    console.log('add tile', tileId);
    const tile = new Sprite(this.materials['139']);
    tile.scale.set(TILE_SCALE, TILE_SCALE, TILE_SCALE);
    tile.position.set(0, 0, 0);
    this.scene.add(tile);

    this.tiles.insert({ x, y, elevation });
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    // Game loop

    this.renderer.render(this.scene, this.camera);
  }
}
