import { ColorTranslator } from 'colortranslator';
import { Box, QuadTree } from 'js-quadtree';
import {
  AmbientLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  Sprite,
  SpriteMaterial,
  TextureLoader,
  WebGLRenderer
} from 'three';
import { tileDefinitions as sprites } from './tile-definitions';

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
      // Load sprites
      this.loadSprites(() => {
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
    });
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    if (!this.worldContainer) return;

    // Game loop
    // this.worldContainer.rotation.z += 0.005;

    // Player movement
    const speed = 0.05;
    if (this.keys.left) this.player.position.x -= speed;
    if (this.keys.right) this.player.position.x += speed;
    if (this.keys.down) this.player.position.y -= speed;
    if (this.keys.up) this.player.position.y += speed;

    // Player elevation
    const z =
      this.elevationAtPoint(this.player.position.x, this.player.position.y) *
      TILE_HEIGHT;
    if (
      z > this.player.position.z ||
      Math.abs(this.player.position.z - z < 0.1)
    ) {
      this.player.position.z = z;
    } else if (z < this.player.position.z) {
      this.player.position.z -= 0.04;
    }
    // this.player.position.z += Math.sin(Date.now() * 0.001) * 0.5;
    this.renderer.render(this.scene, this.camera);
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
    this.setLoadingText(`loading ${sprites.length} 🖼️ textures`);
    this.materials = {};

    let textureCount = 0;
    sprites.forEach((d) => {
      const url = `tiles/${d.src}.png`;
      const texture = new TextureLoader().load(url, () => {
        textureCount++;
        if (textureCount < sprites.length) return;

        this.heightMaps = {
          flat: null,
          full: null,
          slope_n: null,
          slope_s: null,
          slope_e: null,
          slope_w: null
        };

        Object.keys(this.heightMaps).forEach((name) => {
          const url = `height-maps/${name}.png`;
          let img = new Image();
          img.onload = function (event) {
            this.heightMaps[name] = event.target;
            if (
              Object.keys(this.heightMaps).every(
                (name) => this.heightMaps[name] != null
              )
            ) {
              // Complete
              this.setLoadingText(`✔️ textures loaded`, 2);
              onComplete();
            }
          }.bind(this);
          img.src = url;
        });
      });
      const material = new SpriteMaterial({ map: texture });
      this.materials[d.id] = material;
    });
  }

  loadSprites(onComplete) {
    const sprites = [{ id: 'player', src: 'player' }];
    this.setLoadingText(`loading ${sprites.length} 🏃 sprites`);

    let spriteCount = 0;
    sprites.forEach((sprite) => {
      const url = `sprites/${sprite.src}.png`;
      console.log(sprite.id, url);
      const texture = new TextureLoader().load(url, () => {
        spriteCount++;
        if (spriteCount < sprites.length) return;
        // Complete
        this.setLoadingText(`✔️ sprites loaded`, 2);
        onComplete();
      });
      const material = new SpriteMaterial({ map: texture });
      this.materials[sprite.id] = material;
    });
  }

  loadMap(mapName, onComplete) {
    if (this.world) {
      // TODO unload the current map
    }

    let url = `${process.env.PUBLIC_URL}/maps/${mapName}.tmj`;
    this.setLoadingText(`loading map 🗺️ from ${url}`);
    fetch(url).then((response) => {
      response.json().then((json) => {
        // Parse the map data
        this.size = json.width;

        // Create the tile map
        this.world = new Group();
        this.world.position.x -= this.size / 2;
        this.world.position.y -= this.size / 2;
        this.worldContainer = new Group();
        this.worldContainer.rotation.x = -Math.PI / 2;
        this.worldContainer.add(this.world);
        this.scene.add(this.worldContainer);

        this.tiles = new QuadTree(new Box(0, 0, this.size, this.size));
        json.layers.forEach((layer, z) => {
          if (layer.data) {
            layer.data.forEach((tileId, i) => {
              if (tileId) {
                const x = i % this.size;
                const y = Math.floor(i / this.size);
                this.addTile(x, -y + this.size, z, tileId);
              }
            });
          }
        });

        // Create plane for testing mouse navigation
        const geometry = new PlaneGeometry(this.size, this.size);
        const material = new MeshStandardMaterial({
          color: 0xffff00,
          wireframe: true
        });
        this.plane = new Mesh(geometry, material);
        this.worldContainer.add(this.plane);

        this.setLoadingText(`✔️ map loaded`, 2);
        onComplete();
      });
    });
  }

  addTile(x, y, z, tileId) {
    const tileData = sprites.find((d) => d.id === (tileId - 1).toString());
    if (!tileData) {
      console.error('tile', tileId, 'not found');
      return;
    }

    // console.log('adding tile', tileId, x, y, z);
    const tile = new Sprite(this.materials[tileData.id]);
    tile.name = 'tile';
    tile.scale.set(TILE_SCALE, TILE_SCALE * 1.4, TILE_SCALE); // 1.4 is the ratio
    tile.position.set(x, y, z * TILE_HEIGHT - TILE_HEIGHT / 2);
    this.world.add(tile);

    this.tiles.insert({
      x: x,
      y: y,
      z: z,
      sprite: tile,
      heightMap: tileData.z
    });

    return tile;
  }

  setupControls() {
    // Zoom camera in and out
    window.addEventListener('wheel', (e) => {
      this.camera.zoom -= (e.deltaY / Math.abs(e.deltaY)) * 0.2;
      this.camera.zoom = Math.min(Math.max(this.camera.zoom, 0.2), 4);
      this.camera.updateProjectionMatrix();
    });

    // Initialize movement values
    this.keys = {
      left: false,
      right: false,
      up: false,
      down: false
    };

    // Key down listener
    document.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowUp':
          this.keys.up = true;
          break;
        case 'ArrowDown':
          this.keys.down = true;
          break;
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'ArrowRight':
          this.keys.right = true;
          break;
        default:
          break;
      }
    });

    // Key up listener
    document.addEventListener('keyup', (e) => {
      switch (e.key) {
        case 'ArrowUp':
          this.keys.up = false;
          break;
        case 'ArrowDown':
          this.keys.down = false;
          break;
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'ArrowRight':
          this.keys.right = false;
          break;
        default:
          break;
      }
    });

    // Move the player toward the mouse
    // const raycaster = new Raycaster();
    // let mouse = new Vector2();
    // window.addEventListener('mousemove', (e) => {
    //   if (!this.player) return;
    //   mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    //   mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    //   raycaster.setFromCamera(mouse, this.camera);
    //   const intersects = raycaster.intersectObject(this.plane);

    //   if (intersects.length === 0) return;
    //   const intersect = intersects[0];
    //   const x = intersect.point.x + this.size / 2;
    //   const y = -intersect.point.z + this.size / 2;
    //   const z = TILE_HEIGHT + this.elevationAtPoint(x, y) * TILE_HEIGHT;
    //   this.player.position.set(x, y, z);
    // });
  }

  elevationAtPoint(x, y) {
    // Offset
    x -= 1;

    // const allTiles = this.tiles.query(new Box(0, 0, this.size, this.size));
    // allTiles.forEach((tile) => (tile.sprite.visible = false));
    const results = this.tiles.query(new Box(x, y, 1, 1));
    // results.forEach((tile) => (tile.sprite.visible = true));

    let highestTile = null;
    results.forEach((tile) => {
      if (!highestTile || tile.z > highestTile.z) highestTile = tile;
    });

    if (!highestTile) return 0;

    // Get local elevation
    const localX = x - Math.floor(x);
    const localY = y - Math.floor(y);

    // Check against matching gradient
    const heightMapName = highestTile.heightMap;
    const context = document.createElement('canvas').getContext('2d');
    context.drawImage(this.heightMaps[heightMapName], 0, 0);
    const pixelX = Math.floor(localX * 60);
    const pixelY = Math.floor(localY * 60);
    const { data } = context.getImageData(pixelX, pixelY, 1, 1);
    // Get the pixel brightness
    const localHeight =
      new ColorTranslator(`rgb(${data[0]}, ${data[1]}, ${data[2]})`).HSLObject
        .l / 100;

    // console.log(
    //   'heightname',
    //   heightMapName,
    //   'localheight',
    //   localHeight.toFixed(2),
    //   'local',
    //   localX.toFixed(2),
    //   localY.toFixed(2),
    //   'pixel',
    //   pixelX,
    //   pixelY
    // );

    return highestTile.z * TILE_HEIGHT + localHeight * TILE_HEIGHT;
  }

  setupPlayer() {
    this.playerSprite = new Sprite(this.materials['player']);
    this.playerSprite.scale.set(0.5, 0.5);
    this.playerSprite.position.z = -0.25;

    this.player = new Group();
    this.player.add(this.playerSprite);

    // TODO Pick spawn point
    this.player.position.x = this.size / 2;
    this.player.position.y = this.size / 2;

    this.world.add(this.player);
  }
}
