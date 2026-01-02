// 3D First Person World - Città Esplorabile con Fisica ed Esplosioni
class FirstPersonWorld {
    constructor() {
        this.canvas = document.getElementById('canvas3d');
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();

        // Player settings
        this.player = {
            height: 1.8,
            speed: 5,
            jumpSpeed: 8,
            gravity: -20,
            velocity: new THREE.Vector3(),
            onGround: false,
            canJump: true,
            health: 100,
            maxHealth: 100
        };

        // Monsters
        this.monsters = [];
        this.monstersKilled = 0;

        // Controls
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = false;

        // Mouse look
        this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
        this.PI_2 = Math.PI / 2;

        // Physics
        this.raycaster = new THREE.Raycaster();
        this.throwables = [];
        this.explosions = [];

        // Pointer lock
        this.isLocked = false;

        // Touch controls for mobile
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.joystickActive = false;

        this.init();
    }

    init() {
        this.setupScene();
        this.setupLights();
        this.createCity();
        this.spawnMonsters();
        this.setupControls();
        this.setupUI();
        this.simulateLoading();
    }

    setupScene() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
        this.scene.fog = new THREE.Fog(0x87ceeb, 1, 100);

        // Camera (First Person)
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, this.player.height, 10);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    setupLights() {
        // Sun
        const sun = new THREE.DirectionalLight(0xffffff, 1);
        sun.position.set(50, 50, 25);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.left = -50;
        sun.shadow.camera.right = 50;
        sun.shadow.camera.top = 50;
        sun.shadow.camera.bottom = -50;
        this.scene.add(sun);

        // Ambient light
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        // Street lights
        this.createStreetLights();
    }

    createStreetLights() {
        const positions = [
            [-20, 0, -20], [20, 0, -20],
            [-20, 0, 20], [20, 0, 20],
            [0, 0, -30], [0, 0, 30]
        ];

        positions.forEach(pos => {
            // Pole
            const poleGeom = new THREE.CylinderGeometry(0.1, 0.1, 5, 8);
            const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
            const pole = new THREE.Mesh(poleGeom, poleMat);
            pole.position.set(pos[0], 2.5, pos[2]);
            pole.castShadow = true;
            this.scene.add(pole);

            // Light
            const light = new THREE.PointLight(0xffaa33, 1, 20);
            light.position.set(pos[0], 5, pos[2]);
            light.castShadow = true;
            this.scene.add(light);

            // Light bulb
            const bulbGeom = new THREE.SphereGeometry(0.2, 8, 8);
            const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffaa33 });
            const bulb = new THREE.Mesh(bulbGeom, bulbMat);
            bulb.position.set(pos[0], 5, pos[2]);
            this.scene.add(bulb);
        });
    }

    createCity() {
        // Ground
        const groundGeom = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x228b22,
            roughness: 0.8
        });
        const ground = new THREE.Mesh(groundGeom, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Roads
        this.createRoads();

        // Buildings with signs
        this.createBuilding(-15, 0, -15, 8, 12, 8, 0x8b4513, "PORTFOLIO");
        this.createBuilding(15, 0, -15, 6, 15, 6, 0x4a5568, "PROGETTI");
        this.createBuilding(-15, 0, 15, 10, 10, 10, 0x2d3748, "CITTÀ OSCURA");
        this.createBuilding(15, 0, 15, 7, 18, 7, 0x1a202c, "CONTATTI");
        this.createBuilding(0, 0, -25, 12, 8, 8, 0x6b46c1, "ESPERIMENTI");
        this.createBuilding(0, 0, 25, 5, 20, 5, 0xdc2626, "GALLERIA");

        // Smaller buildings
        this.createBuilding(-25, 0, 0, 4, 6, 4, 0x92400e, "SHOP");
        this.createBuilding(25, 0, 0, 4, 7, 4, 0x065f46, "CAFE");

        // Trees
        this.createTrees();

        // Throwable objects
        this.createThrowableObjects();
    }

    createRoads() {
        // Main road horizontal
        const roadH = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 5),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        roadH.rotation.x = -Math.PI / 2;
        roadH.position.y = 0.01;
        roadH.receiveShadow = true;
        this.scene.add(roadH);

        // Main road vertical
        const roadV = new THREE.Mesh(
            new THREE.PlaneGeometry(5, 100),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        roadV.rotation.x = -Math.PI / 2;
        roadV.position.y = 0.01;
        roadV.receiveShadow = true;
        this.scene.add(roadV);

        // Road lines
        for (let i = -40; i < 40; i += 5) {
            const line = new THREE.Mesh(
                new THREE.PlaneGeometry(2, 0.2),
                new THREE.MeshStandardMaterial({ color: 0xffff00 })
            );
            line.rotation.x = -Math.PI / 2;
            line.position.set(i, 0.02, 0);
            this.scene.add(line);
        }
    }

    createBuilding(x, y, z, width, height, depth, color, text) {
        // Building
        const building = new THREE.Mesh(
            new THREE.BoxGeometry(width, height, depth),
            new THREE.MeshStandardMaterial({ color: color })
        );
        building.position.set(x, y + height / 2, z);
        building.castShadow = true;
        building.receiveShadow = true;
        this.scene.add(building);

        // Windows
        const windowCount = Math.floor(height / 2);
        for (let i = 0; i < windowCount; i++) {
            for (let j = 0; j < 2; j++) {
                const window = new THREE.Mesh(
                    new THREE.PlaneGeometry(1, 1),
                    new THREE.MeshBasicMaterial({ color: 0xffff88 })
                );
                window.position.set(
                    x + (j === 0 ? width / 2 + 0.01 : -width / 2 - 0.01),
                    y + 2 + i * 2,
                    z
                );
                if (j === 0) window.rotation.y = Math.PI / 2;
                else window.rotation.y = -Math.PI / 2;
                this.scene.add(window);
            }
        }

        // Sign
        this.createSign(x, y + height + 1, z, text, width);
    }

    createSign(x, y, z, text, width) {
        // Sign board
        const sign = new THREE.Mesh(
            new THREE.BoxGeometry(width * 0.8, 2, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x000000 })
        );
        sign.position.set(x, y, z);
        this.scene.add(sign);

        // Text (using canvas texture)
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const textMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(width * 0.75, 1.8),
            new THREE.MeshBasicMaterial({ map: texture })
        );
        textMesh.position.set(x, y, z + 0.11);
        this.scene.add(textMesh);
    }

    createTrees() {
        const positions = [
            [-30, 0, -30], [30, 0, -30],
            [-30, 0, 30], [30, 0, 30],
            [-10, 0, -35], [10, 0, -35],
            [-10, 0, 35], [10, 0, 35]
        ];

        positions.forEach(pos => {
            // Trunk
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.4, 3, 8),
                new THREE.MeshStandardMaterial({ color: 0x8b4513 })
            );
            trunk.position.set(pos[0], 1.5, pos[2]);
            trunk.castShadow = true;
            this.scene.add(trunk);

            // Leaves
            const leaves = new THREE.Mesh(
                new THREE.SphereGeometry(2, 8, 8),
                new THREE.MeshStandardMaterial({ color: 0x228b22 })
            );
            leaves.position.set(pos[0], 4, pos[2]);
            leaves.castShadow = true;
            this.scene.add(leaves);
        });
    }

    createThrowableObjects() {
        // Crates
        for (let i = 0; i < 10; i++) {
            const crate = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 1),
                new THREE.MeshStandardMaterial({ color: 0x8b4513 })
            );
            crate.position.set(
                Math.random() * 40 - 20,
                0.5,
                Math.random() * 40 - 20
            );
            crate.castShadow = true;
            crate.receiveShadow = true;
            crate.userData.throwable = true;
            this.scene.add(crate);
        }

        // Barrels (explosive)
        for (let i = 0; i < 5; i++) {
            const barrel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
                new THREE.MeshStandardMaterial({ color: 0xff0000 })
            );
            barrel.position.set(
                Math.random() * 40 - 20,
                0.5,
                Math.random() * 40 - 20
            );
            barrel.castShadow = true;
            barrel.receiveShadow = true;
            barrel.userData.explosive = true;
            this.scene.add(barrel);
        }

        // Balls
        for (let i = 0; i < 15; i++) {
            const ball = new THREE.Mesh(
                new THREE.SphereGeometry(0.3, 16, 16),
                new THREE.MeshStandardMaterial({
                    color: Math.random() * 0xffffff,
                    metalness: 0.5,
                    roughness: 0.5
                })
            );
            ball.position.set(
                Math.random() * 40 - 20,
                0.3,
                Math.random() * 40 - 20
            );
            ball.castShadow = true;
            ball.userData.throwable = true;
            this.scene.add(ball);
        }
    }

    spawnMonsters() {
        const monsterCount = 8;
        for (let i = 0; i < monsterCount; i++) {
            this.createMonster(
                Math.random() * 60 - 30,
                Math.random() * 60 - 30
            );
        }

        // Spawn new monster every 15 seconds
        setInterval(() => {
            if (this.monsters.length < 15) {
                this.createMonster(
                    Math.random() * 60 - 30,
                    Math.random() * 60 - 30
                );
            }
        }, 15000);
    }

    createMonster(x, z) {
        const monsterGroup = new THREE.Group();

        // Body
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5, 0.3, 1.5, 8),
            new THREE.MeshStandardMaterial({ color: 0x228b22 })
        );
        body.position.y = 0.75;
        body.castShadow = true;
        monsterGroup.add(body);

        // Head
        const head = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x2d5016 })
        );
        head.position.y = 1.7;
        head.castShadow = true;
        monsterGroup.add(head);

        // Eyes (red and glowing)
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.15, 1.7, 0.35);
        monsterGroup.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.15, 1.7, 0.35);
        monsterGroup.add(rightEye);

        // Arms
        const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
        const armMaterial = new THREE.MeshStandardMaterial({ color: 0x1a4000 });

        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.6, 0.75, 0);
        leftArm.rotation.z = Math.PI / 4;
        leftArm.castShadow = true;
        monsterGroup.add(leftArm);

        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.6, 0.75, 0);
        rightArm.rotation.z = -Math.PI / 4;
        rightArm.castShadow = true;
        monsterGroup.add(rightArm);

        // Position monster
        monsterGroup.position.set(x, 0, z);

        // Monster data
        monsterGroup.userData = {
            isMonster: true,
            health: 3,
            speed: 2,
            damage: 10,
            chasing: false,
            chaseStartTime: 0,
            idleTime: Math.random() * 5000,
            lastAttackTime: 0,
            attackCooldown: 1000,
            targetPosition: new THREE.Vector3(),
            animationOffset: Math.random() * Math.PI * 2
        };

        this.scene.add(monsterGroup);
        this.monsters.push(monsterGroup);

        return monsterGroup;
    }

    setupControls() {
        // Start button
        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                document.getElementById('instructions').style.display = 'none';
                this.canvas.requestPointerLock();
            });
        }

        // Keyboard
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));

        // Mouse
        document.addEventListener('click', () => {
            if (!this.isLocked) {
                this.canvas.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === this.canvas;
            if (this.isLocked) {
                document.body.classList.add('pointer-locked');
            } else {
                document.body.classList.remove('pointer-locked');
            }
        });

        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));

        // Touch controls for mobile
        this.setupTouchControls();

        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupTouchControls() {
        // Virtual joystick
        const joystick = document.getElementById('joystick');
        const joystickKnob = document.getElementById('joystick-knob');

        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.joystickActive = true;
            const touch = e.touches[0];
            const rect = joystick.getBoundingClientRect();
            this.updateJoystick(touch.clientX - rect.left - 50, touch.clientY - rect.top - 50);
        });

        joystick.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.joystickActive) {
                const touch = e.touches[0];
                const rect = joystick.getBoundingClientRect();
                this.updateJoystick(touch.clientX - rect.left - 50, touch.clientY - rect.top - 50);
            }
        });

        joystick.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.joystickActive = false;
            joystickKnob.style.transform = 'translate(0px, 0px)';
            this.moveForward = false;
            this.moveBackward = false;
            this.moveLeft = false;
            this.moveRight = false;
        });

        // Camera look
        const lookArea = document.getElementById('look-area');
        lookArea.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                const movementX = touch.clientX - this.touchStartX;
                const movementY = touch.clientY - this.touchStartY;

                this.euler.setFromQuaternion(this.camera.quaternion);
                this.euler.y -= movementX * 0.002;
                this.euler.x -= movementY * 0.002;
                this.euler.x = Math.max(-this.PI_2, Math.min(this.PI_2, this.euler.x));
                this.camera.quaternion.setFromEuler(this.euler);

                this.touchStartX = touch.clientX;
                this.touchStartY = touch.clientY;
            }
        });

        lookArea.addEventListener('touchstart', (e) => {
            if (e.touches.length > 0) {
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
            }
        });

        // Action buttons
        document.getElementById('jump-btn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.canJump) this.player.velocity.y = this.player.jumpSpeed;
        });

        document.getElementById('throw-btn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.throwObject();
        });
    }

    updateJoystick(x, y) {
        const distance = Math.sqrt(x * x + y * y);
        const maxDistance = 40;

        if (distance > maxDistance) {
            x = x / distance * maxDistance;
            y = y / distance * maxDistance;
        }

        document.getElementById('joystick-knob').style.transform = `translate(${x}px, ${y}px)`;

        const threshold = 10;
        this.moveForward = y < -threshold;
        this.moveBackward = y > threshold;
        this.moveLeft = x < -threshold;
        this.moveRight = x > threshold;
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'KeyW': case 'ArrowUp':
                this.moveForward = true;
                break;
            case 'KeyS': case 'ArrowDown':
                this.moveBackward = true;
                break;
            case 'KeyA': case 'ArrowLeft':
                this.moveLeft = true;
                break;
            case 'KeyD': case 'ArrowRight':
                this.moveRight = true;
                break;
            case 'Space':
                if (this.canJump) this.player.velocity.y = this.player.jumpSpeed;
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': case 'ArrowUp':
                this.moveForward = false;
                break;
            case 'KeyS': case 'ArrowDown':
                this.moveBackward = false;
                break;
            case 'KeyA': case 'ArrowLeft':
                this.moveLeft = false;
                break;
            case 'KeyD': case 'ArrowRight':
                this.moveRight = false;
                break;
        }
    }

    onMouseMove(event) {
        if (!this.isLocked) return;

        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        this.euler.setFromQuaternion(this.camera.quaternion);
        this.euler.y -= movementX * 0.002;
        this.euler.x -= movementY * 0.002;
        this.euler.x = Math.max(-this.PI_2, Math.min(this.PI_2, this.euler.x));
        this.camera.quaternion.setFromEuler(this.euler);
    }

    onMouseDown(event) {
        if (!this.isLocked) return;

        if (event.button === 0) { // Left click
            this.throwObject();
        } else if (event.button === 2) { // Right click
            this.explodeNearby();
        }
    }

    throwObject() {
        const ball = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 16, 16),
            new THREE.MeshStandardMaterial({
                color: Math.random() * 0xffffff,
                metalness: 0.8,
                roughness: 0.2
            })
        );

        ball.position.copy(this.camera.position);
        ball.castShadow = true;

        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);

        ball.userData.velocity = direction.multiplyScalar(20);
        ball.userData.isThrown = true;

        this.scene.add(ball);
        this.throwables.push(ball);

        // Remove after 5 seconds
        setTimeout(() => {
            this.scene.remove(ball);
            this.throwables = this.throwables.filter(t => t !== ball);
        }, 5000);
    }

    explodeNearby() {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            const target = intersects[0];

            // Check if hit a monster
            let monsterHit = null;
            if (target.object.parent && target.object.parent.userData.isMonster) {
                monsterHit = target.object.parent;
            }

            if (monsterHit) {
                this.damageMonster(monsterHit, 1);
                this.createExplosion(target.point);
            } else if (target.object.userData.explosive || target.distance < 5) {
                this.createExplosion(target.point);

                if (target.object.userData.explosive) {
                    this.scene.remove(target.object);
                }

                // Damage nearby monsters
                this.monsters.forEach(monster => {
                    const distance = monster.position.distanceTo(target.point);
                    if (distance < 5) {
                        this.damageMonster(monster, 2);
                    }
                });
            }
        }
    }

    damageMonster(monster, damage) {
        monster.userData.health -= damage;

        // Flash red when hit
        monster.children.forEach(child => {
            if (child.material && child.material.color) {
                const originalColor = child.material.color.clone();
                child.material.color.set(0xff0000);
                setTimeout(() => {
                    child.material.color.copy(originalColor);
                }, 100);
            }
        });

        if (monster.userData.health <= 0) {
            this.killMonster(monster);
        } else {
            // Start chasing if damaged
            monster.userData.chasing = true;
            monster.userData.chaseStartTime = Date.now();
        }
    }

    killMonster(monster) {
        this.createExplosion(monster.position);
        this.scene.remove(monster);
        this.monsters = this.monsters.filter(m => m !== monster);
        this.monstersKilled++;
        this.updateHUD();
    }

    updateMonsters(delta) {
        const currentTime = Date.now();
        const playerPos = this.camera.position;

        this.monsters.forEach(monster => {
            const monsterData = monster.userData;
            const distanceToPlayer = monster.position.distanceTo(playerPos);

            // Random chance to start chasing
            if (!monsterData.chasing && Math.random() < 0.001) {
                monsterData.chasing = true;
                monsterData.chaseStartTime = currentTime;
            }

            // Stop chasing after random time (5-15 seconds)
            if (monsterData.chasing) {
                const chaseDuration = 5000 + Math.random() * 10000;
                if (currentTime - monsterData.chaseStartTime > chaseDuration && distanceToPlayer > 10) {
                    monsterData.chasing = false;
                }
            }

            // Start chasing if player is very close
            if (distanceToPlayer < 8) {
                monsterData.chasing = true;
                monsterData.chaseStartTime = currentTime;
            }

            if (monsterData.chasing) {
                // Move towards player
                const direction = new THREE.Vector3();
                direction.subVectors(playerPos, monster.position);
                direction.y = 0;
                direction.normalize();

                monster.position.add(direction.multiplyScalar(monsterData.speed * delta));

                // Look at player
                monster.lookAt(playerPos.x, monster.position.y, playerPos.z);

                // Walking animation (bobbing)
                const bobSpeed = 8;
                const bobAmount = 0.2;
                monster.position.y = Math.sin(currentTime * 0.01 * bobSpeed + monsterData.animationOffset) * bobAmount;

                // Arm swinging animation
                const armAngle = Math.sin(currentTime * 0.01 * bobSpeed + monsterData.animationOffset) * 0.5;
                if (monster.children[4]) monster.children[4].rotation.x = armAngle; // Left arm
                if (monster.children[5]) monster.children[5].rotation.x = -armAngle; // Right arm
            } else {
                // Idle animation (slight bobbing)
                const idleBob = Math.sin(currentTime * 0.001 + monsterData.animationOffset) * 0.05;
                monster.position.y = idleBob;
            }

            // Attack player if close enough
            if (distanceToPlayer < 2) {
                if (currentTime - monsterData.lastAttackTime > monsterData.attackCooldown) {
                    this.damagePlayer(monsterData.damage);
                    monsterData.lastAttackTime = currentTime;

                    // Attack animation (lunge forward)
                    const lungeDirection = new THREE.Vector3();
                    lungeDirection.subVectors(playerPos, monster.position);
                    lungeDirection.y = 0;
                    lungeDirection.normalize();
                    monster.position.add(lungeDirection.multiplyScalar(0.5));
                }
            }
        });
    }

    damagePlayer(damage) {
        this.player.health -= damage;
        this.updateHUD();

        // Screen flash red
        document.body.style.backgroundColor = '#ff0000';
        setTimeout(() => {
            document.body.style.backgroundColor = '#000000';
        }, 100);

        if (this.player.health <= 0) {
            this.gameOver();
        }
    }

    gameOver() {
        alert(`GAME OVER! Hai ucciso ${this.monstersKilled} mostri!`);
        location.reload();
    }

    updateHUD() {
        const healthBar = document.getElementById('health-bar');
        const healthText = document.getElementById('health-text');
        const killCounter = document.getElementById('kill-counter');

        if (healthBar) {
            const healthPercent = (this.player.health / this.player.maxHealth) * 100;
            healthBar.style.width = healthPercent + '%';

            if (healthPercent > 60) {
                healthBar.style.background = '#00ff00';
            } else if (healthPercent > 30) {
                healthBar.style.background = '#ffaa00';
            } else {
                healthBar.style.background = '#ff0000';
            }
        }

        if (healthText) {
            healthText.textContent = Math.max(0, this.player.health);
        }

        if (killCounter) {
            killCounter.textContent = this.monstersKilled;
        }
    }

    createExplosion(position) {
        // Explosion sphere
        const explosion = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xff6600 })
        );
        explosion.position.copy(position);
        explosion.userData.scale = 0.1;
        explosion.userData.maxScale = 5;
        explosion.userData.life = 1;
        this.scene.add(explosion);
        this.explosions.push(explosion);

        // Particles
        for (let i = 0; i < 20; i++) {
            const particle = new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 8, 8),
                new THREE.MeshBasicMaterial({ color: 0xff3300 })
            );
            particle.position.copy(position);

            const direction = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5
            ).normalize();

            particle.userData.velocity = direction.multiplyScalar(5 + Math.random() * 5);
            particle.userData.life = 1;
            particle.userData.isParticle = true;

            this.scene.add(particle);
            this.explosions.push(particle);
        }
    }

    updatePhysics(delta) {
        // Player physics
        const speed = this.player.speed;
        const direction = new THREE.Vector3();

        direction.z = Number(this.moveForward) - Number(this.moveBackward);
        direction.x = Number(this.moveLeft) - Number(this.moveRight);
        direction.normalize();

        if (this.moveForward || this.moveBackward) {
            this.player.velocity.z = -direction.z * speed;
        } else {
            this.player.velocity.z = 0;
        }

        if (this.moveLeft || this.moveRight) {
            this.player.velocity.x = -direction.x * speed;
        } else {
            this.player.velocity.x = 0;
        }

        // Apply gravity
        this.player.velocity.y += this.player.gravity * delta;

        // Move camera
        const moveVector = this.player.velocity.clone().multiplyScalar(delta);
        moveVector.applyQuaternion(this.camera.quaternion);
        this.camera.position.add(moveVector);

        // Ground collision
        if (this.camera.position.y < this.player.height) {
            this.player.velocity.y = 0;
            this.camera.position.y = this.player.height;
            this.canJump = true;
        } else {
            this.canJump = false;
        }

        // Update monsters AI
        this.updateMonsters(delta);

        // Throwable objects physics
        this.throwables.forEach(obj => {
            if (obj.userData.isThrown) {
                obj.userData.velocity.y += this.player.gravity * delta;
                obj.position.add(obj.userData.velocity.clone().multiplyScalar(delta));
                obj.rotation.x += 0.1;
                obj.rotation.y += 0.1;

                if (obj.position.y < 0) {
                    obj.position.y = 0;
                    obj.userData.velocity.y = -obj.userData.velocity.y * 0.5;
                    obj.userData.velocity.x *= 0.9;
                    obj.userData.velocity.z *= 0.9;
                }
            }
        });

        // Explosion animation
        this.explosions = this.explosions.filter(exp => {
            exp.userData.life -= delta * 2;

            if (exp.userData.isParticle) {
                exp.userData.velocity.y += this.player.gravity * delta * 0.5;
                exp.position.add(exp.userData.velocity.clone().multiplyScalar(delta));
                exp.material.opacity = exp.userData.life;
                exp.material.transparent = true;
            } else {
                exp.userData.scale = THREE.MathUtils.lerp(exp.userData.scale, exp.userData.maxScale, delta * 10);
                exp.scale.setScalar(exp.userData.scale);
                exp.material.opacity = exp.userData.life;
                exp.material.transparent = true;
            }

            if (exp.userData.life <= 0) {
                this.scene.remove(exp);
                return false;
            }
            return true;
        });
    }

    setupUI() {
        // Prevent right click menu
        document.addEventListener('contextmenu', e => e.preventDefault());
    }

    simulateLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        const loadingProgress = document.getElementById('loading-progress');
        let progress = 0;

        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                loadingProgress.style.width = '100%';
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                    this.updateHUD();
                    this.animate();
                }, 500);
                clearInterval(interval);
            } else {
                loadingProgress.style.width = progress + '%';
            }
        }, 100);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();
        this.updatePhysics(delta);

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize
const world = new FirstPersonWorld();
