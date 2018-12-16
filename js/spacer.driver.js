var activeScene;
var camera;
var renderer;
var loadManager;
var computeManager;
var sceneManager;
var uiManager;
var assetManager;
var inputManager;

window.onload = Initialize;
window.onresize = AdaptWindow;

function Initialize(windowEvent){

    function InitializeInputManager(){
        inputManager = {
            canvas: $("#main_canvas")[0],
            position: new THREE.Vector2(),
        };
        window.onmousemove = function (e) {
            inputManager.position.set(e.pageX/this.innerWidth - 0.5,e.pageY/this.innerHeight - 0.5);
        };
    }

    function InitializeComputeManager(){
        computeManager = {
            deltaTime: 0.0,
            lastFrame: performance.now(),
            randInt: function (min, max) {
                min = Math.ceil(min);
                max = Math.floor(max);
                return Math.floor(Math.random() * (max - min + 1)) + min;
            },
        };
    }

    function InitializeSceneManager(){
        sceneManager = {
            scenes: {},
            addScene: function (scene) {
                if(scene.name == ""){
                    throw "Scene.name property is required!";
                }
                scene.isReady = false;
                this.scenes[scene.name] = scene;
            },
            loadScene: function (name) {
                if(activeScene != undefined){
                    uiManager.loader.show("Loading...");
                    while(activeScene.children.length > 0){
                        activeScene.remove(activeScene.children[activeScene.children.length-1]);
                    }
                    if(activeScene.onDestroy != undefined){
                        activeScene.onDestroy();
                    }
                }
                activeScene = undefined;
                setTimeout(function(){
                    activeScene = sceneManager.scenes[name];
                    setTimeout(function () {
                        Start();
                        uiManager.loader.hide();
                    },1000);
                },1000);
            }
        };
    }
    
    function InitializeUIManager(){
        uiManager = {
            menus: {},
            showMenu: function (param) {
                this.hideMenu();
                this.menus[param].removeClass("hide");
            },
            hideMenu: function (param) {
                if(param == undefined){
                    for(var key in this.menus){
                        this.menus[key].addClass("hide");
                    }
                }else{
                    this.menus[param].addClass("hide");
                }
            },
            addMenu: function (param) {
                this.menus[param.attr("id")] = param;
            },
            loader: {
                element: $("#loader"),
                show: function(text, callback){
                    this.element.find("#label").html(text);
                    this.element.removeClass("hide");
                    if(callback != undefined){
                        callback();
                    }
                },
                hide: function () {
                    this.element.addClass("hide");
                }
            }
        };
    }

    function InitializeAssetManager(){
        assetManager = {
            objects: {},
            cameraSize: (typeof window.orientation !== 'undefined') ? 5 : 30,
            shadowSize: (typeof window.orientation !== 'undefined') ? 512 : 512 * 6,
            loader: new Array(),
            addObject: function (param) {
                if(param.name == ""){
                    throw "Obj.name property is Required!";
                }
                this.objects[param.name] = param;
            }
        }
    }

    function InitializeLoaderManager(){
        function OnComplete(e){
            uiManager.loader.show("Finished Loading");
            setTimeout(function () {
                uiManager.loader.hide();
            }, 2000);
            InitializeScene();
        }
        function OnProgress(url, currentLoaded, totalItem){
            uiManager.loader.show("Loading " + currentLoaded.toString() + " / " + totalItem.toString() + " items (" + Math.ceil((currentLoaded/totalItem*100.0)).toString()+"%)");
        }
        function OnError(e){
            throw e;
        }
        loadManager = new THREE.LoadingManager(OnComplete,OnProgress,OnError);
    }

    InitializeComputeManager();
    InitializeSceneManager();
    InitializeUIManager();
    InitializeAssetManager();
    InitializeLoaderManager();
    InitializeInputManager();
    
    InitializeInput();

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({
        canvas: $('#main_canvas')[0],
        antialias: true,
    });
    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.shadowMap.enabled = true;
    
    AdaptWindow(windowEvent);
    Prepare();
}

function AdaptWindow(windowEvent){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

//Called ONCE per web load
function Prepare(){
    function PrepareCubeMapLoader(url, ext){
        var urls = [
            url + "px" + ext,
            url + "nx" + ext,
            url + "py" + ext,
            url + "ny" + ext,
            url + "pz" + ext,
            url + "nz" + ext
        ];
        function OnLoad(res){
            res.format = THREE.RGBFormat;
            assetManager.cubeMap = res;
        }
        assetManager.loader.push(function(){
            assetManager.cubeMap= new THREE.CubeTextureLoader(loadManager).load(urls,OnLoad);
        });
    }

    function PrepareObjectLoader(url, onLoad){
        assetManager.loader.push(function(){
            new THREE.FBXLoader(loadManager).load(url,onLoad);
        });
    }

    PrepareCubeMapLoader("img/cubemap/bkg1_",".jpg");
    PrepareObjectLoader("model/rendoru-spaceship.fbx",function (res) {
        var basePath = "img/texture/Rendoru-space-ship-anim-bone6_";
        res.traverse(function (child) {
            if(child.isMesh){
                var cleanName = child.name.replace(/[0-9]+/,"");
                if(cleanName == "RightEngine"){
                    cleanName = "Engine";
                }
                var emissiveTexture = new THREE.TextureLoader(loadManager).load(basePath + cleanName + "Material_Emissive.jpg");
                var metallicTexture = new THREE.TextureLoader(loadManager).load(basePath + cleanName + "Material_Metallic.jpg");
                var roughnessTexture = new THREE.TextureLoader(loadManager).load(basePath + cleanName + "Material_Roughness.jpg");
                var normalTexture = new THREE.TextureLoader(loadManager).load(basePath + cleanName + "Material_Normal.jpg");
                var baseColorTexture = new THREE.TextureLoader(loadManager).load(basePath + cleanName + "Material_BaseColor.jpg");
                child.material = new THREE.MeshPhysicalMaterial({
                    color: 0x000000,
                    map: baseColorTexture,
                    emissive: 0xffffff,
                    emissiveMap: emissiveTexture,
                    envMap: assetManager.cubeMap,
                    metalness: 1.0,
                    metalnessMap: metallicTexture,
                    normalMap: normalTexture,
                    roughness: 1.0,
                    roughnessMap: roughnessTexture,
                    reflectivity: 1.0,
                    clearCoat: 1.0,
                });
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        var boxGeometry = new THREE.BoxBufferGeometry(1,1,1);
        var hitBoxPosition = [
            new THREE.Vector3(0,-1.5,0), 4,
            new THREE.Vector3(1.5,-1.75,0.5), 2,
            new THREE.Vector3(-1.5,-1.75,0.5), 2,
            new THREE.Vector3(1.5,-1.75,-0.5), 2,
            new THREE.Vector3(-1.5,-1.75,-0.5), 2,
            new THREE.Vector3(3.75,-0.5,0), 2,
            new THREE.Vector3(-3.75,-0.5,0), 2,
            new THREE.Vector3(5,0.5,0), 2,
            new THREE.Vector3(-5,0.5,0), 2,
        ];
        res.hitBoxes = new Array();
        for(var i=0;i<9;i++){
            //var hitBox = new THREE.Mesh(boxGeometry, new THREE.MeshStandardMaterial({color: 0xffff,}));
            var hitBox = new THREE.Object3D();
            hitBox.scale.set(0.5,0.5,0.5);
            hitBox.name = "hit_box_"+i.toString();
            var hitboxIndex = i * 2;
            hitBox.position.set(hitBoxPosition[hitboxIndex].x,hitBoxPosition[hitboxIndex].y,hitBoxPosition[hitboxIndex].z);
            res.add(hitBox);
            let tolerance = hitBoxPosition[hitboxIndex + 1];
            hitBox.isColliding = function (other) {
                var resOther = new THREE.Vector3();
                other.getWorldPosition(resOther);
                var resCurrent = new THREE.Vector3();
                this.getWorldPosition(resCurrent);
                var distance = resCurrent.distanceTo(resOther);
                var isCollide = distance < tolerance;
                //this.material.color = new THREE.Color((isCollide) ? 0xff0000 : 0x00ff00);
                return isCollide;
            };
            res.hitBoxes.push(hitBox);
        }

        res.isColliding = function (other) {
            for(var i = 0;i<this.hitBoxes.length;i++){
                if(this.hitBoxes[i].isColliding(other)){
                    return true;
                }
            }
            return false;
        };

        res.name = "spaceship";
        res.mixer = new THREE.AnimationMixer(res);
        assetManager.addObject(res);
    });

    assetManager.loader.forEach(element => {
        element();
    });

    var planeGeometry = new THREE.PlaneBufferGeometry(10,10);
    var standardMaterial = new THREE.MeshStandardMaterial();
    var groundPlane = new THREE.Mesh(planeGeometry, standardMaterial);
    groundPlane.name = "ground";
    assetManager.addObject(groundPlane);
    
    var boxGeometry = new THREE.BoxBufferGeometry(1,1,1);
    var standardRedMaterial = new THREE.MeshStandardMaterial({color: 0xff0000, });
    for(var i=0;i<4;i++){
        var redBox = new THREE.Mesh(boxGeometry, standardRedMaterial);
        redBox.name = "red_box_"+i.toString();
        assetManager.addObject(redBox);
    }

    requestAnimationFrame(Update);
}

//Will be called on Scene initialization
function Start(){
    activeScene.traverse(function(child){
        if(child.awake != undefined){
            child.awake();
        }
    });

    activeScene.traverse(function(child){
        if(child.start != undefined){
            child.start();
        }
    });
    activeScene.isReady = true;
}

//Called continously
function Update(currentFrame){

    computeManager.deltaTime = (currentFrame - computeManager.lastFrame)/1000.0;
    computeManager.lastFrame = currentFrame;

    var currentScene = activeScene;
    if(currentScene != undefined && currentScene.isReady){
        try{
            currentScene.traverse(function(child){
                if(child.frameUpdate != undefined){
                    child.frameUpdate();
                }
                if(child.mixer != undefined){
                    child.mixer.update(computeManager.deltaTime);
                }
            });
            renderer.render(currentScene, camera);
        }catch(e){
        }
        
    }
    requestAnimationFrame(Update);
}

function InitializeScene(){
    //Default scene
    function InitializeMainMenu(){
        var scene = new THREE.Scene();
        scene.name = "main_menu";
        sceneManager.addScene(scene);

        scene.awake = function(){
            uiManager.showMenu("main_menu");
            this.state = "In";
            this.position.set(0,0,0);
            this.background = new THREE.Color(0x00);
            //this.fog = new THREE.Fog(0xa0a0a0,25, 30);
            var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
            this.add(hemiLight);
            var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.castShadow = true;
            directionalLight.position.set(0,10,-10);

            directionalLight.shadow.camera.left = -assetManager.cameraSize;
            directionalLight.shadow.camera.right = assetManager.cameraSize;
            directionalLight.shadow.camera.top = assetManager.cameraSize;
            directionalLight.shadow.camera.bottom = -assetManager.cameraSize;
            directionalLight.shadow.mapSize.width = assetManager.shadowSize;
            directionalLight.shadow.mapSize.height = assetManager.shadowSize;
            this.add(directionalLight);

            var spaceshipGroup = new THREE.Group();
            spaceshipGroup.name = "spaceship_group";
            var spaceship = assetManager.objects["spaceship"];
            spaceshipGroup.add(spaceship);
            var spaceshipAction = spaceship.mixer.clipAction(spaceship.animations[0]);
            spaceshipGroup.animAction = spaceshipAction;
            scene.add(spaceshipGroup);
            if(spaceshipGroup.targetColor == undefined){
                spaceshipGroup.targetColor = new THREE.Color(0x000000);
            }

            var ground = assetManager.objects["ground"];
            ground.awake = function () {
                ground.receiveShadow = true;
                ground.rotation.set(-1.5,0,0);
                ground.position.set(0,-2,0);
                ground.scale.set(100,100,100);
            };
            scene.add(ground);

            var redBoxes = new Array();
            for(var i=0;i<4;i++){
                var redBox = assetManager.objects["red_box_"+i.toString()];
                redBoxes.push(redBox);
                redBox.castShadow = true;
                redBox.scale.set(1,1,1);
                redBox.position.set(0,0,0);
                redBox.awake = redBox.start = redBox.frameUpdate = undefined;
                scene.add(redBox);
            };

            redBoxes[0].awake = function () {
                this.position.set(8,-1.5,0);
                this.rotation.set(0,1,0);
            };

            redBoxes[1].awake = function () {
                this.position.set(-15,3,3);
                this.rotation.set(0,1.5,0);
                this.scale.set(10,10,10);
            };

            redBoxes[2].awake = function () {
                this.position.set(9,-1.5,3);
                this.rotation.set(0,0.2,0);
            };

            redBoxes[3].awake = function () {
                this.position.set(11,-1,0);
                this.rotation.set(0,0.3,0);
                this.scale.set(2,2,2);
            };


            spaceshipGroup.awake = function () {
                this.isLaunched = false;
                this.isAssembled = false;
                this.velocity = new THREE.Vector3();
                this.position.set(0,0,-10);
                this.scale.set(0.01,0.01,0.01);

                var clip = this.animAction.getClip();
                this.animAction.timeScale = -1;
                this.animAction.loop = THREE.LoopRepeat;
                this.animAction.repetitions = 0;
                this.animAction.clampWhenFinished = true;
                this.animAction.reset();
                this.animAction.time = clip.duration;
                this.animAction.play();
                this.animAction.paused = true;

                this.materials = new Array();
                this.traverse(function (child) {
                    if(child.isMesh){
                        spaceshipGroup.materials.push(child.material);
                    }
                });
            };

            spaceshipGroup.launch = function () {
                if(this.isLaunched){
                    return;
                }
                this.isLaunched = true;
                spaceshipGroup.animAction.paused = false;
                spaceshipGroup.animAction.reset();
                spaceshipGroup.animAction.timeScale = 1;
                scene.state = "Out";
                setTimeout(function () {
                    spaceshipGroup.isAssembled = true;
                    setTimeout(function () {
                        sceneManager.loadScene("game_play");
                    }, 2000);
                }, 3000);
            };

            spaceshipGroup.frameUpdate = function () { 
                if(this.isAssembled){
                    this.velocity.z += 0.01;
                    this.position.add(this.velocity);
                }else{
                    var diff = -this.position.z;
                    if(Math.abs(diff) < 5){
                        this.animAction.paused = false;
                    }
                    this.position.set(0,0,this.position.z + diff * computeManager.deltaTime);
                }
            };
        };
        
        scene.start = function () {
            camera.position.set(0,10,10);
            var highscore = (localStorage.highScore != undefined) ? parseFloat(localStorage.highScore) : 0.0;
            uiManager.menus["main_menu"].find("#main_score")[0].innerHTML = "Highscore : " + highscore.toFixed(2).toString();
            setTimeout(function () {
                scene.state = "Idle";
            }, 2000);
        };

        scene.frameUpdate = function () {

            var diff = new THREE.Vector3(0,0,0);
            
            if(scene.state == "In"){
                diff.sub(new THREE.Vector3(0,5,10));
            }else if(scene.state == "Out"){
                diff.sub(new THREE.Vector3(0,2,-10));
            }else{
                diff.sub(new THREE.Vector3(Math.sin(computeManager.lastFrame * Math.PI/180 / 100)*10,10,Math.cos(computeManager.lastFrame * Math.PI/180 / 100)*10));
            }
            diff.add(camera.position);
            diff.multiplyScalar(computeManager.deltaTime);
            camera.position.sub(diff);

            //camera.position.set(Math.sin(computeManager.lastFrame * Math.PI/180 / 100)*10,10,Math.cos(computeManager.lastFrame * Math.PI/180 / 100)*10);
            camera.lookAt(0,0,0);
        };
    }

    function InitializeGamePlay(){
        var scene = new THREE.Scene();
        scene.name = "game_play";
        sceneManager.addScene(scene);

        var spaceshipGroup;
        scene.awake = function () {
            uiManager.showMenu("gameplay_menu");
            
            var redBoxIter = 0;
            var redBoxes = new Array();
            var possiblePosition = new Array();
            this.background = assetManager.cubeMap;
            this.scoreBoard = uiManager.menus["gameplay_menu"].scoreBoard;

            var hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
            this.add(hemiLight);
            var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.castShadow = true;
            directionalLight.position.set(0,10,-10);
            this.add(directionalLight);

            spaceshipGroup = new THREE.Group();
            spaceshipGroup.name = "spaceship_group";
            var spaceship = assetManager.objects["spaceship"];
            spaceshipGroup.add(spaceship);

            spaceshipGroup.awake = function () {
                this.scale.set(0.01, 0.01, 0.01);
            };

            spaceshipGroup.frameUpdate = function () {
                var diffPos = new THREE.Vector2(this.position.x - -10*inputManager.position.x,this.position.y - -10*inputManager.position.y);
                this.position.set(this.position.x - diffPos.x * computeManager.deltaTime * scene.speed, this.position.y - diffPos.y * computeManager.deltaTime * scene.speed,0);
                this.rotation.set(0,0,(this.rotation.z - (this.rotation.z - -inputManager.position.x) * scene.speed * computeManager.deltaTime));
                if(this.children[0].isColliding(redBoxes[redBoxIter])){
                    var currentHighscore = (localStorage.highScore != undefined) ? parseFloat(localStorage.highScore) : 0;
                    var currentScore = scene.speed * scene.distance;
                    if(currentHighscore < currentScore){
                        localStorage.highScore = currentScore;
                    }
                    sceneManager.loadScene("main_menu");
                }
            };

            directionalLight.target = spaceshipGroup;
            directionalLight.shadow.camera.left = -assetManager.cameraSize;
            directionalLight.shadow.camera.right = assetManager.cameraSize;
            directionalLight.shadow.camera.top = assetManager.cameraSize;
            directionalLight.shadow.camera.bottom = -assetManager.cameraSize;
            directionalLight.shadow.mapSize.width = assetManager.shadowSize;
            directionalLight.shadow.mapSize.height = assetManager.shadowSize;
            this.add(spaceshipGroup);

            var ground = assetManager.objects["ground"];
            ground.awake = function () {
                ground.receiveShadow = true;
                ground.rotation.set(-1.5,0,0);
                ground.position.set(0,-10,0);
                ground.scale.set(100,100,100);
            }
            
            scene.add(ground);

            
            for(var x=-1;x<2;x++){
                for(var y=-1;y<2;y++){
                    possiblePosition.push(new THREE.Vector2(x*3,y*3));
                }
            }

            for(var i=0;i<4;i++){
                var redBox = assetManager.objects["red_box_"+i.toString()];
                redBoxes.push(redBox);
                redBox.castShadow = true;
                redBox.scale.set(2,2,2);
                redBox.position.set(0,0,-1000);
                redBox.rotation.set(0,0,0);
                redBox.awake = redBox.start = redBox.frameUpdate = undefined;
                let zDistance = i;
                redBox.awake = function () {
                    var randNode = possiblePosition[computeManager.randInt(0,possiblePosition.length - 1)];
                    this.position.set(randNode.x,randNode.y,30*(zDistance+1));
                };
                redBox.frameUpdate = function () {
                    this.translateZ(-computeManager.deltaTime*10*scene.speed);
                    if(this.position.z < -30){
                        redBoxIter = (redBoxIter + 1) % 4;
                        var randNode = possiblePosition[computeManager.randInt(0,possiblePosition.length - 1)];
                        this.position.set(randNode.x,randNode.y,90);
                    }
                };
                this.add(redBox);
            };
        };

        scene.start = function () {
            camera.position.set(0,0,10);
            this.distance = 0;
            this.speed = 1;
        };

        
        scene.frameUpdate = function () {
            this.speed += computeManager.deltaTime/10;
            camera.position.set(Math.sin(spaceshipGroup.position.x/10) * 2,Math.sin(spaceshipGroup.position.y/10) * 2 + 5   ,-20);
            camera.lookAt(0,0,0);
            this.distance += computeManager.deltaTime;
            this.scoreBoard.innerHTML = "Score : " + this.distance.toFixed(2) + " X " + this.speed.toFixed(2) + " = " + (this.distance*this.speed).toFixed(2).toString();
        };
    }
    
    InitializeMainMenu();
    InitializeGamePlay();

    sceneManager.loadScene("main_menu");
    
}

function InitializeInput(){
    $.each($(".menu"), function (indexInArray, valueOfElement) { 
        $(valueOfElement).addClass("transitioned");
        uiManager.addMenu($(valueOfElement));
    });

    uiManager.hideMenu();

    function MainMenu(){
        var playBtn = $("#play_btn");
        playBtn.click(function (e) {
            var spaceshipGroup = activeScene.getObjectByName("spaceship_group");
            spaceshipGroup.launch();
            uiManager.hideMenu();
        });

        $("#switch_btn").click(function (e) {
            var spaceshipMaterial = activeScene.getObjectByName("spaceship_group");
            spaceshipMaterial.targetColor = (spaceshipMaterial.targetColor.r == 1) ? new THREE.Color(0x0) : new THREE.Color(0xffffff);
            for(var i=0;i<spaceshipMaterial.materials.length;i++){
                spaceshipMaterial.materials[i].color = spaceshipMaterial.targetColor;
            }
        });
    }

    function GameplayMenu(){
        var scoreBoard = $(uiManager.menus["gameplay_menu"]).find("#play_score")[0];
        uiManager.menus["gameplay_menu"].scoreBoard = scoreBoard;
        scoreBoard.innerHTML = "Initializing...";
    }

    MainMenu();
    GameplayMenu();
}