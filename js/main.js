			var camera, scene, renderer;
			var stats = new Stats();

			var vector = new THREE.Vector3();
			var mouse = {
				x: 1,
				y: 1
			}; //Position projector
			var projector = new THREE.Projector();
			var objectsClick = []; //Tout les objects "cliquable"
			var History_click = []; //Les derniers objects cliqué.
			var Earth_glow_color = "#1E7DCC";
			var Earth_segment = 25;
			var Earth_radius = 25;

			var Arc_color = "#259CFF";
			var Cloud_glow_color = "#259CFF";

			/*
				No USE
			var Cloud_radius = 0.5;
			var Cloud_segment = 8;
			*/

			var numero = 0; //Identification
			var time = 0; //Itération de render
			var rand = 0.05; //Math.random()*0.1 (Attention si random il y aura un décallage entre l'arc et les nuages)

			var text = [];

			//Paramètres de dat.GUI
			var params = {

				Save_all: function() {
					//TODO
					//indexeddb, cookie, localstorage

				},
				Link_add: function() {
					var p1 = History_click[History_click.length - 2].object;
					var p2 = History_click[History_click.length - 1].object;
					draw_curve(p1, p2);

				},
				Cloud_add: function() {

					window.addEventListener('mouseup', Add_cloud, false);
					document.body.style.cursor = "crosshair";
					console.log("Add cloud");
				},
				Cloud_delete: function() {

					//Pour tout les nuages
					while(scene.getObjectByName("Cloud")) {

						scene.remove(scene.getObjectByName("Cloud"));
						console.log("Delete cloud");
					}
				},
				link_1: function() {
					window.location = "http://witly.fr/portfolio/";
				},
				link_2: function() {
					window.location = "http://threejs.org/";
				},
				link_3: function() {
					window.location = "https://code.google.com/p/dat-gui/";
				},
				empty: function() {
					//Vide
				}
			};


			function init() {

				var gui = new dat.GUI();

				f1 = gui.addFolder("Gestion des nuages");
				f1.add(params, 'Cloud_add').name("Ajouter un nuage");
				f1.add(params, 'Link_add').name("Ajouter un lien");
				f1.add(params, 'Cloud_delete').name("Tout supprimer");
				f1.add(params, 'Save_all').name("WIP Enregistrer");
				f1.open();

				f2 = gui.addFolder("Crédits");
				f2.add(params, 'link_1').name("Auteur : Aurélien Vivet");
				f2.add(params, 'link_2').name("Lien : Threejs");
				f2.add(params, 'link_3').name("Lien : Dat.GUI");

				dev = gui.addFolder("DEV");
				dev.open();


				//Création de la div pour le canvas et les stats
				container = document.createElement('div');
				document.body.appendChild(container);


				camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
				camera.name = "Camera";
				camera.position.x = 0;
				camera.position.y = 30;
				camera.position.z = -80;

				//Gestion de la caméra
				Orbitcontrols = new THREE.OrbitControls(camera);

				scene = new THREE.Scene();

				//Glow pour la terre
				Glow();

				// Light Australie
				var light = new THREE.PointLight("white", 1, 100);
				light.position.set(-26, -13, -20);
				light.name = "PointLight";
				scene.add(light);

				//SUN
				var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
				directionalLight.position.set(1, 1, 0);
				directionalLight.name = "Sun";
				scene.add(directionalLight);

				//Aide axes XYZ Y-up
				var axisHelper = new THREE.AxisHelper(50);
				axisHelper.name = "AxisHelper";
				scene.add(axisHelper);

				//Aide light Australie
				var pointLightHelper = new THREE.PointLightHelper(light, 1);
				pointLightHelper.name = "PointLightHelper";
				scene.add(pointLightHelper);

				//Modélisation de la Terre
				var Earth_geo = new THREE.SphereGeometry(Earth_radius, Earth_segment, Earth_segment);

				//Matière de la Terre
				var Earth_material = new THREE.MeshPhongMaterial({
					map: THREE.ImageUtils.loadTexture("img/earthmap1k.jpg"),
					bumpMap: THREE.ImageUtils.loadTexture("img/earthbump1k.jpg"),
					bumpScale: 0.05,
					specularMap: THREE.ImageUtils.loadTexture("img/earthspec1k.jpg"),
					specular: new THREE.Color('grey'),
					shininess: 5
				});

				var earth = new THREE.Mesh(Earth_geo, Earth_material);
				earth.name = "Earth";
				scene.add(earth);
				objectsClick.push(earth);

				//Render

				renderer = new THREE.WebGLRenderer({
					antialias: true,
					alpha: true
				}); //Alpha pour le glow qui est un sprite en png
				renderer.setSize(window.innerWidth, window.innerHeight);
				container.appendChild(renderer.domElement);

				//Stats

				stats.domElement.style.position = 'absolute';
				stats.domElement.style.top = '0px';
				container.appendChild(stats.domElement);

				document.addEventListener('mousemove', onDocumentMouseMove, false);
				window.addEventListener('mousedown', Click, false);
				window.addEventListener('resize', onWindowResize, false);
			}

			function Add_cloud() {

				if(Click()) {

					var arg_position = Click().point;

					var Cloud_Material = new THREE.SpriteMaterial({
						map: new THREE.ImageUtils.loadTexture("img/glow.png"),
						useScreenCoordinates: false,
						color: Cloud_glow_color,
						transparent: false,
						blending: THREE.AdditiveBlending
					});

					var cloud = new THREE.Sprite(Cloud_Material);

					cloud.name = "Cloud";
					cloud.position.set(arg_position.x, arg_position.y, arg_position.z);
					console.log(mouse);

					cloud.lookAt(new THREE.Vector3(0, 0, 0));
					//A VOIR SI UTILE
					//cloud.worldToLocal(new THREE.Vector3(0,0,0));
					cloud.translateZ(-5); //Décalage Terre/nuage

					scene.add(cloud);
					objectsClick.push(cloud);

					window.removeEventListener('mouseup', Add_cloud, false);
					document.body.style.cursor = "";
				}
			}

			function Click() {

				vector.set(mouse.x, mouse.y, 0.1);
				projector.unprojectVector(vector, camera);

				var origin = camera.position;
				var direction = vector.sub(camera.position).normalize();
				var obstacles = objectsClick;

				var ray = new THREE.Raycaster(origin, direction);
				var intersects = ray.intersectObjects(obstacles, false);

				if(intersects[0]) {

					//var position = intersects[0].point;
					History_click.push(intersects[0]);
					text.push(History_click[History_click.length - 1].object.name);

					if(dev.__controllers.length > 0) {
						dev.__controllers[dev.__controllers.length - 1].remove();
					}
					dev.add(params, 'empty').name("Dernier clique : " + Last_click().object.name);

					return intersects[0];
				}

			}

			function Last_click() {
				return History_click[History_click.length - 1];
			}

			function Add_Curve(Start_position, End_position) {

				console.log("ok");
				var Second_click = History_click[History_click.length - 1].object;
				var First_click = History_click[History_click.length - 2].object;

				var point_Second = Second_click.position;
				var point_First = First_click.position;

				var distance = point_Second.distanceTo(point_First);
				var centre = distance / 2;
				console.log(distance);


				centre = new THREE.Vector3();
				centre.addVectors(Start_position, End_position).multiplyScalar(0.5);

				var material = new THREE.LineBasicMaterial({
					color: Arc_color,
					opacity: 1
				});

				/*
				var material = new THREE.LineDashedMaterial({
					color: 0xffaa00,
					dashSize: 3,
					gapSize: 1,
					linewidth: 2
				});
				*/

				/*
					Voir si le je peut définir 3 points de courbe puis faire une subdivision de c dernier
					pour que la courbe soit en forme de "U" ou de "cloche"
				*/

				//new THREE.ArcCurve(aX, aY, aRadius, aStartAngle, aEndAngle, aClockwise);
				var curvePoints = new THREE.ArcCurve(0, 0, distance / 2, 0, 1.0 * Math.PI, false);
				curvePath = new THREE.CurvePath();
				curvePath.add(curvePoints);
				var curveGeometry = curvePath.createPointsGeometry(2);
				curveGeometry.computeTangents();
				//var arc = new THREE.Line(curveGeometry, material, THREE.LinePieces);
				var arc = new THREE.Line(curveGeometry, material);
				arc.name = "Arc";

				arc.position.set(centre.x, centre.y, centre.z);

				var axe = new THREE.AxisHelper(50);
				axe.name = "Arc_Helper";
				scene.add(axe);

				axe.position.copy(arc.position);
				axe.lookAt(point_Second);
				arc.rotation.copy(axe.rotation);
				//scene.remove(axe);
				arc.rotateY(Math.PI / 2);
				scene.add(arc);
			}

			function Glow() {

				var spriteMaterial = new THREE.SpriteMaterial({
					map: new THREE.ImageUtils.loadTexture("img/glow.png"),
					useScreenCoordinates: false,
					//alignment: THREE.SpriteAlignment.center,
					color: Earth_glow_color,
					transparent: false,
					blending: THREE.AdditiveBlending
				});

				var sprite = new THREE.Sprite(spriteMaterial);
				sprite.name = "Earth_glow";
				sprite.scale.set(80, 80, 1.0);
				scene.add(sprite);
			}

			function onDocumentMouseMove(event) {

				event.preventDefault();
				mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
				mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

			}

			function onWindowResize() {

				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();
				renderer.setSize(window.innerWidth, window.innerHeight);
			}

			function animate() {

				var data = scene.children;
				//Pour chaque nuage mesh dans la scene
				for(var key in data) {

					//Pour les nuages
					if(data[key].name == "Cloud") {

						speed = rand;
						exp = ((Math.sin(time * speed)) / 2 * speed);

						//Tranlation du nuage sur son axe Z
						data[key].translateZ(exp);
					}

					//Pour les Arc dont la syntaxe du nom est : "Arc_0123456"
					var Regex = /^Arc_[0-9]+$/;
					if(Regex.test(data[key].name)) {
					
						//Premier vertice de la courbe
						start = data[key].geometry.vertices[0];
						//Dernier vertice de la courbe
						end = data[key].geometry.vertices[data[key].geometry.vertices.length-1];
						
						//Actualisation de la position des vertices par la postion des points Start et End
						data[key].geometry.vertices[0] = data[key].start;
						data[key].geometry.vertices[data[key].geometry.vertices.length-1] = data[key].end;
						//Force la géométrie à s'actualiser
						data[key].geometry.verticesNeedUpdate = true;
					}
				}

				Orbitcontrols.update();
				stats.update();
				requestAnimationFrame(animate);
				render();
			}

			function render() {

				time++;
				vector.set(mouse.x, mouse.y, 0.1);
				projector.unprojectVector(vector, camera);
				renderer.setClearColor(0x000000, 0); //couleur de fond du canvas et alpha
				renderer.render(scene, camera);
			}

			function draw_curve(start, end) {

				//Positions des points
				var start_point = start.position;
				var end_point = end.position;
				var start_nd_axe, end_nd_axe;
				var pos_centre = new THREE.Vector3();
				var distance = start_point.distanceTo(end_point);

				//Calcul de la position du centre des points start et end
				pos_centre.addVectors(start_point, end_point).multiplyScalar(0.5);

				//Ligne bleu
				var blue = new THREE.LineBasicMaterial({
					color: 0x0000FF
				});

				//Axe pour le centre
				var axe_centre = new THREE.AxisHelper(5);
				axe_centre.name = "Arc_Centre_" + numero;
				axe_centre.position.set(pos_centre.x, pos_centre.y, pos_centre.z);
				axe_centre.lookAt(new THREE.Vector3());
				axe_centre.translateZ(-distance / 2);
				scene.add(axe_centre);

				//Axe start bis
				start_nd_axe = new THREE.AxisHelper(5);
				start_nd_axe.name = "start_nd_axe_" + numero;
				start_nd_axe.position.set(start_point.x, start_point.y, start_point.z);
				start_nd_axe.rotation.copy(axe_centre.rotation);
				start_nd_axe.translateZ(-distance / 2);
				scene.add(start_nd_axe);
				
				//Axe end bis
				end_nd_axe = new THREE.AxisHelper(5);
				end_nd_axe.name = "end_nd_axe_" + numero;
				end_nd_axe.position.set(end_point.x, end_point.y, end_point.z);
				end_nd_axe.rotation.copy(axe_centre.rotation);
				end_nd_axe.translateZ(-distance / 2);
				scene.add(end_nd_axe);

				//Suppression des axes
				scene.remove(axe_centre);
				scene.remove(start_nd_axe);
				scene.remove(end_nd_axe);
				
				//Chemin
				var curvePath = new THREE.CurvePath();

				var curvePoints = new THREE.CubicBezierCurve3(
					start_point, //start_point
					start_nd_axe.position, //mid
					end_nd_axe.position, //mid
					end_point, //end_point
					0
				);

				//Ajout des points de l'arc dans le chemin
				curvePath.add(curvePoints);
				//Subdivision des points de l'arc
				var curveGeometry = curvePath.createPointsGeometry(150);
				//Calcul des tangentes
				curveGeometry.computeTangents();
				//Ajout de la geometry (vertices) dans un object qui affiche les lignes.
				var line = new THREE.Line(curveGeometry, blue);
				line.name = "Arc_" + numero;
				//Ajout de la courbe à la scène
				scene.add(line);
				
				//Identifications des points
				start.numero = numero;
				end.numero = numero;
				start_nd_axe.numero = numero;
				end_nd_axe.numero = numero;
				line.numero = numero;
				line.start = start.position;
				line.end = end.position;
				numero ++;
			}