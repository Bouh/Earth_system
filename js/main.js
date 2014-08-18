/*
	Une texture en threejs n'est jamais en SVG
	
	Si je prend les pts de 	https://github.com/wrobstory/vincent_map_data
	et que une fois converti en 3D je trace des lignes entre chaque points pour refaire un mesh par pays soit 177
	les lignes passerons dans la terre et ne suiveront pas la courbure de la terre
	
	
	pour re avoir le rendu de base je doit viré la scene_glow et les render sauf renderer.render()
*/

			var camera, scene, renderer, gui;
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
			var Earth_segment = 50;
			var Earth_radius = 50;
			var distance_Terre_Cloud = 2;
			var Arc_color = "#259CFF";
			var Cloud_glow_color = "#259CFF";

			var blackMaterial = new THREE.MeshBasicMaterial( {color: 0x000000} ); 
			/*
				No USE
			var Cloud_radius = 0.5;
			var Cloud_segment = 8;
			*/

			var numero = 0; //Identification des nuages et liens
			var time = 0; //Itération de render        TODO possibilitée de faire autrement : en utilisant une méthode de renderer ?
			var rand = 0.05; //Math.random()*0.1 (Attention si random il y aura un décallage entre l'arc et les nuages)

			var text = [];//A VERIF

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

			function latLongToVector3( lat, lon, radius, offset_height) {
				var phi = (lat)*Math.PI/180;
				var theta = (lon-180)*Math.PI/180;
				var x = -(radius+offset_height) * Math.cos(phi) * Math.cos(theta);
				var y = (radius+offset_height) * Math.sin(phi);
				var z = (radius+offset_height) * Math.cos(phi) * Math.sin(theta);   
				return new THREE.Vector3(x,y,z);
			}
			
			function Glow() {

			
				/*
					Voir si un shader serais mieux ou non
				*/
				
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
				sprite.scale.set(4*Earth_radius, 4*Earth_radius, 1.0);
				scene.add(sprite);
				
				//glsl
				/*
				var customMaterial = new THREE.ShaderMaterial({
					uniforms: {},
					vertexShader:   document.getElementById( 'vertexShader'   ).textContent,
					fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
					side: THREE.BackSide,
					blending: THREE.AdditiveBlending,
					transparent: true
				});
				
				var Earth_glow_geo = new THREE.SphereGeometry(Earth_radius+20, Earth_segment, Earth_segment);
				var Earth_glow = new THREE.Mesh(Earth_glow_geo, customMaterial);
				scene.add(Earth_glow);
				
				*/
			}
			
			
			function init() {

				gui = new dat.GUI();
				scene = new THREE.Scene();
				scene_glow = new THREE.Scene();

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
				camera.position.x = 160;
				camera.position.y = 0;
				camera.position.z = 0;

				scene.add(camera);
				camera2 = camera;
				scene_glow.add(camera2);
				
				//Gestion de la caméra
				Orbitcontrols = new THREE.OrbitControls(camera);


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
				var axisHelper = new THREE.AxisHelper(100);
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
				var earth2 = new THREE.Mesh(Earth_geo, blackMaterial);
				scene_glow.add(earth2);
				objectsClick.push(earth);

				//Render principal
				renderer = new THREE.WebGLRenderer({
					antialias: true,
					alpha: true
				}); //Alpha pour le glow qui est un sprite en png	Voir si peut etre remplacé par un shader ou non...
				renderer.setSize(window.innerWidth, window.innerHeight);
				container.appendChild(renderer.domElement);

				//Render pour postprocessing
				var renderTargetParameters = {
					minFilter: THREE.LinearFilter,
					magFilter: THREE.LinearFilter,
					format: THREE.RGBFormat,
					stencilBuffer: false
				};
				
				var renderTarget = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, renderTargetParameters );
				
				//Reprise du rendu de base
				rendu_basic = new THREE.EffectComposer( renderer, renderTarget );
				
				//Ajout de la scene contenant les objects sur lesquel faire le flou
				var scene_to_blur = new THREE.RenderPass( scene_glow, camera2 );
				rendu_basic.addPass( scene_to_blur );

				//Les effets de  postprocessing à mettre sur le second rendu
				//Ici ont y met du flou
				var value_blur = 1 ;
				var effectHorizBlur = new THREE.ShaderPass( THREE.HorizontalBlurShader );
				var effectVertiBlur = new THREE.ShaderPass( THREE.VerticalBlurShader );
				effectHorizBlur.uniforms[ "h" ].value = value_blur / window.innerWidth;
				effectVertiBlur.uniforms[ "v" ].value = value_blur / window.innerHeight;
				rendu_basic.addPass( effectHorizBlur );
				rendu_basic.addPass( effectVertiBlur );
				
				//Prepare le rendu final
				finalComposer = new THREE.EffectComposer( renderer, renderTarget );

				//Prepare la pass final du rendu
				var renderModel = new THREE.RenderPass( scene, camera );
				finalComposer.addPass( renderModel );

				
				var effectBlend = new THREE.ShaderPass( THREE.AdditiveBlendShader, "tDiffuse1" );
				effectBlend.uniforms[ 'tDiffuse2' ].value = rendu_basic.renderTarget2;
				effectBlend.renderToScreen = true;
				finalComposer.addPass( effectBlend );
				
				//Stats

				stats.domElement.style.position = 'absolute';
				stats.domElement.style.top = '0px';
				container.appendChild(stats.domElement);

				document.addEventListener('mousemove', onDocumentMouseMove, false);
				window.addEventListener('mousedown', Click, false);
				window.addEventListener('resize', onWindowResize, false);
				
				//var pos_Paris = latLongToVector3(48.856614, 2.3522219000000177, Earth_radius,0);
				var pos_Paris = latLongToVector3(50.12805176, 6.04305983, Earth_radius,0);
			
				var Cloud_Material = new THREE.SpriteMaterial({
					map: new THREE.ImageUtils.loadTexture("img/glow.png"),
					useScreenCoordinates: false,
					color: Cloud_glow_color,
					transparent: false,
					blending: THREE.AdditiveBlending
				});

				var cloud = new THREE.Sprite(Cloud_Material);

				cloud.name = "Cloud";
				cloud.position.set(pos_Paris.x, pos_Paris.y, pos_Paris.z);
				console.log(mouse);

				cloud.lookAt(new THREE.Vector3(0, 0, 0));
				cloud.translateZ(-distance_Terre_Cloud); //Décalage Terre/nuage

				scene.add(cloud);
				objectsClick.push(cloud);
				
				/*
					world = data_countries;
					console.log(world.countrie[0].geometry.coordinates);
					console.log(world.countrie[1].geometry.coordinates);
				*/
			
			}
			
			/*
			===============================================================================================
			===============================================================================================
			*/
			/*
			  _______ ____  _____   ____  
			 |__   __/ __ \|  __ \ / __ \ 
				| | | |  | | |  | | |  | |
				| | | |  | | |  | | |  | |
				| | | |__| | |__| | |__| |
				|_|  \____/|_____/ \____/ 
			*/
			
			function AJAX_JSON_Req( url ) {
						console.clear();
				var AJAX_req = new XMLHttpRequest();
				AJAX_req.open( "GET", url, true );
				AJAX_req.setRequestHeader("Content-type", "application/javascript");
			console.log("1");
			 
				AJAX_req.onreadystatechange = function()
				{
			console.log(AJAX_req.responseText);
					if( AJAX_req.readyState == 4 && AJAX_req.status == 200 )
					{
						var response = JSON.parse( AJAX_req.responseText );
						
						//document.write( response.features[0].properties.name );
						console.log( response.features[0].properties.name );
				//return response
					}
				}
				AJAX_req.send();
			}
			
			
			function loadJSON(callback) {   

				var xobj = new XMLHttpRequest();
				xobj.overrideMimeType("application/json");
				xobj.open("GET", "./js/world-countries.json", true); // Replace 'my_data' with the path to your file
				xobj.onreadystatechange = function () {
					if (xobj.readyState == 4 && xobj.status == "200") {
					// Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
					callback(xobj);
					}
				};
				xobj.send(null);  
			}

			/*
			===============================================================================================
			===============================================================================================
			*/

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
					cloud.translateZ(-distance_Terre_Cloud); //Décalage Terre/nuage

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
				var data2 = scene_glow.children;
				//Pour chaque nuage mesh dans la scene
				for(var key in data) {

					//Pour les nuages
					if(data[key].name == "Cloud") {

						speed = rand;
						exp = ((Math.sin(time * speed)) / 2 * speed);

						//Tranlation du nuage sur son axe Z
						data[key].translateZ(exp);
					}


				}
				//Mouvement des arcs
				/*
				for(var key in data2) {
					
					//Pour les Arc dont la syntaxe du nom est : "Arc_0123456"
					var Regex = /^Arc_[0-9]+$/;
					if(Regex.test(data2[key].name)) {
					
						//Premier vertice de la courbe
						start = data2[key].geometry.vertices[0];
						//Dernier vertice de la courbe
						end = data2[key].geometry.vertices[data2[key].geometry.vertices.length-1];
						
						//Actualisation de la position des vertices par la postion des points Start et End
						//data2[key].geometry.vertices[0] = data2[key].start;
						//data2[key].geometry.vertices[data2[key].geometry.vertices.length-1] = data2[key].end;
						
						for(var i=0;i<data2[key].geometry.vertices.length;i++) {
						
							speed = rand;
							exp = ((Math.sin(time * speed)) / 2 * speed);
							
							x = data2[key].geometry.vertices[i].x - exp;
							y = data2[key].geometry.vertices[i].y - exp;
							z = data2[key].geometry.vertices[i].z;
							
						
							data2[key].geometry.vertices[i].set(x,y,z);
						}
						
						//Force la géométrie à s'actualiser
						data2[key].geometry.verticesNeedUpdate = true;
					}
				}
				*/

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
			
				
				rendu_basic.render();
				finalComposer.render();
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
				start_nd_axe.translateZ(-distance / 2 - Earth_radius/2);
				scene.add(start_nd_axe);
				
				//Axe end bis
				end_nd_axe = new THREE.AxisHelper(5);
				end_nd_axe.name = "end_nd_axe_" + numero;
				end_nd_axe.position.set(end_point.x, end_point.y, end_point.z);
				end_nd_axe.rotation.copy(axe_centre.rotation);
				end_nd_axe.translateZ(-distance / 2 - Earth_radius/2);
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

				scene.add(line);
				
				/*
					ou bien un tube avec le shader dedans
				*/
				
				/*
				
				var customMaterial = new THREE.ShaderMaterial({
					uniforms: {},
					vertexShader:   document.getElementById( 'vertexShader'   ).textContent,
					fragmentShader: document.getElementById( 'fragmentShader' ).textContent,
					side: THREE.BackSide,
					blending: THREE.AdditiveBlending,
					transparent: true
				});
				
				var wireFrameMat = new THREE.MeshBasicMaterial();
				wireFrameMat.wireframe = true;
				
				*/
				

				var mat_for_glow = new THREE.MeshBasicMaterial( { color: 0x0088ff, transparent:true, opacity:1 } );

			
				var TubeGeometry = new THREE.TubeGeometry(curvePoints, 150, 0.1, 20, false);
				var Tube2 = new THREE.Mesh(TubeGeometry, mat_for_glow);
				Tube2.name ="Arc_" + numero;
				
				scene_glow.add(Tube2);
				//Ajout de la courbe à la scène
				
				//Identifications des points
				start.numero = numero;
				end.numero = numero;
				start_nd_axe.numero = numero;
				end_nd_axe.numero = numero;
				/*
				line.numero = numero;
				line.start = start.position;
				line.end = end.position;
				*/
				numero ++;
			}