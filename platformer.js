// # Quintus Super Mario example
//
// [Run the example](../mario/index.html)
// WARNING: this game must be run from a non-file:// url
// as it loads a level json file.
window.addEventListener("load",function() {

	// Set up an instance of the Quintus engine  and include
	// the Sprites, Scenes, Input and 2D module. The 2D module
	// includes the `TileLayer` class as well as the `2d` componet.
	var Q = window.Q = Quintus({audioSupported: [ 'mp3','ogg' ]})
	.include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, TMX, Audio")
	// Maximize this game to whatever the size of the browser is
	.setup({ width: 320, height: 480 })
	// And turn on default input controls and touch input (for UI)
	.controls(true).touch()
	// Enable sounds.
	.enableSound();

	// Load and init audio files.


	Q.SPRITE_PLAYER = 1;
	Q.SPRITE_COLLECTABLE = 2;
	Q.SPRITE_ENEMY = 4;
	Q.Sprite.extend("Player",{

		init: function(p) {

			this._super(p, {
				sheet: "mario_small",  // Setting a sprite sheet sets sprite width and height
				sprite: "mario_small",
				direction: "right",
				// puntos dentro del cuadrado de mario
				standingPoints: [ [ -16, 16], [ -16, -16 ], [16, -16], [16, 16] ],
				//copia/pega
				duckingPoints : [ [ -16, 16], [ -16, -16 ], [16, -16], [16, 16] ],

				jumpSpeed: -400,
				speed: 290,
				strength: 100,
				score: 0,
				type: Q.SPRITE_PLAYER,
				collisionMask: Q.SPRITE_DEFAULT | Q.SPRITE_COLLECTABLE
			});

			this.p.points = this.p.standingPoints;

			this.add('2d, platformerControls, animation, tween');

			this.on("bump.top","breakTile");

			this.on("enemy.hit","enemyHit");
			this.on("jump");
			this.on("jumped");
		},

		jump: function(obj) {
			// Only play sound once.
			if (!obj.p.playedJump) {
				//Q.audio.play('jump.mp3');
				obj.p.playedJump = true;
			}
		},

		jumped: function(obj) {
			obj.p.playedJump = false;
		},

		resetLevel: function() {
			Q.stageScene("levelOK");
			this.p.strength = 100;
			this.animate({opacity: 1});
			Q.stageScene('hud', 3, this.p);
		},

		enemyHit: function(data) {
			var col = data.col;
			var enemy = data.enemy;
			this.p.vy = -150;
			if (col.normalX == 1) {
				// Hit from left.
				this.p.x -=15;
				this.p.y -=15;
			}
			else {
				// Hit from right;
				this.p.x +=15;
				this.p.y -=15;
			}
			this.p.strength -= 25;
			Q.stageScene('hud', 3, this.p);
			if (this.p.strength == 0) {
				this.resetLevel();
			}
		},

		continueOverSensor: function() {
			this.p.vy = 0;
			if(this.p.vx != 0) {
				this.play("walk_" + this.p.direction);
			} else {
				this.play("stand_" + this.p.direction);
			}
		},

		breakTile: function(col) {
			if(col.obj.isA("TileLayer")) {
				if(col.tile == 24) { col.obj.setTile(col.tileX,col.tileY, 36); }
				else if(col.tile == 36) { col.obj.setTile(col.tileX,col.tileY, 24); }
			}
			////Q.audio.play('coin.mp3');
		},

		step: function(dt) {
			var processed = false;

			if(!processed) { 
				this.p.gravity = 1;

				if(Q.inputs['down']) {
					this.p.ignoreControls = true;
					this.play("duck_" + this.p.direction);
					if(this.p.landed > 0) {
						this.p.vx = this.p.vx * (1 - dt*2);
					}
					this.p.points = this.p.duckingPoints;
				} else {
					this.p.ignoreControls = false;
					this.p.points = this.p.standingPoints;

					if(this.p.vx > 0) {
						if(this.p.landed > 0) {
							this.play("walk_right");
						} else {
							this.play("jump_right");
						}
						this.p.direction = "right";
					} else if(this.p.vx < 0) {
						if(this.p.landed > 0) {
							this.play("walk_left");
						} else {
							this.play("jump_left");
						}
						this.p.direction = "left";
					} else {
						this.play("stand_" + this.p.direction);
					}

				}
			}



			if(this.p.y > 1000) {
				this.stage.unfollow();
			}

			if(this.p.y > 2000) {
				this.resetLevel();
			}
		}
	});

	Q.Sprite.extend("Enemy", {
		init: function(p,defaults) {

			this._super(p,Q._defaults(defaults||{},{
				sheet: p.sprite,
				vx: 50,
				defaultDirection: 'left',
				type: Q.SPRITE_ENEMY,
				collisionMask: Q.SPRITE_DEFAULT
			}));

			this.add("2d, aiBounce, animation");
			this.on("bump.top",this,"die");
			this.on("hit.sprite",this,"hit");
		},

		step: function(dt) {
			if(this.p.dead) {
				this.del('2d, aiBounce');
				this.p.deadTimer++;
				if (this.p.deadTimer > 24) {
					// Dead for 24 frames, remove it.
					this.destroy();
				}
				return;
			}
			var p = this.p;

			p.vx += p.ax * dt;
			p.vy += p.ay * dt;

			p.x += p.vx * dt;
			p.y += p.vy * dt;

			this.play('walk');
		},

		hit: function(col) {
			if(col.obj.isA("Player") && !this.p.dead) {
				col.obj.trigger('enemy.hit', {"enemy":this,"col":col});
				////Q.audio.play('hit.mp3');
			}
		},

		die: function(col) {
			if(col.obj.isA("Player")) {
				//Q.audio.play('coin.mp3');
				this.p.vx=this.p.vy=0;
				this.play('dead');
				this.p.dead = true;
				var that = this;
				col.obj.p.vy = -300;
				this.p.deadTimer = 0;
			}
		}
	});

	Q.Enemy.extend("Bloopa", {
		init: function(p) {
			this._super(p,{
				sheet: "bloopa",  // Setting a sprite sheet sets sprite width and height
				sprite: "bloopa",
				vx: 0,
				vy: -150,
				rangeY: 100,
				gravity: 0,
				jumpSpeed: -250
			});

			this.p.initialY = this.p.y;

			this.on("bump.left,bump.right,bump.bottom",function(collision) {
				if(collision.obj.isA("Player")) { 
					Q.stageScene("endGame",1, { label: "Game Over" }); 
					collision.obj.destroy();
				}
			});
			this.on("bump.top",function(collision) {
				if(collision.obj.isA("Player")) { 
					collision.obj.p.vy = -100;
					this.destroy();
				}
			});
			this.play('jump');
		},
		step: function(dt) {
			if(this.p.dead) {
				this.del('2d, aiBounce');
				this.p.deadTimer++;
				if (this.p.deadTimer > 24) {
					// Dead for 24 frames, remove it.
					this.destroy();
				}
				return;
			}

			if(this.p.y>= this.p.initialY && this.p.vy > 0) {				
				this.p.vy = -this.p.vy;
			} 
			else if(this.p.y < this.p.initialY - this.p.rangeY && this.p.vy < 0) {				
				this.p.vy = -this.p.vy;
			} 

		}
	});

	Q.Enemy.extend("Goomba", {
		init: function(p) {
			this._super(p,{
				sheet: "goomba",  // Setting a sprite sheet sets sprite width and height
				sprite: "goomba"
			});
		}
	});

	Q.Sprite.extend("Collectable", {
		init: function(p) {
			this._super(p,{
				sheet: "coin",
				sprite: "coin",
				type: Q.SPRITE_COLLECTABLE,
				collisionMask: Q.SPRITE_PLAYER,
				sensor: true,
				vx: 0,
				vy: 0,
				amount: 50,
				gravity: 0
			});
			this.add('animation');
			this.on("sensor");
			this.play('shine');
		},

		// When a Collectable is hit.
		sensor: function(colObj) {
			// Increment the score.
			if (this.p.amount) {
				colObj.p.score += this.p.amount;
				Q.stageScene('hud', 3, colObj.p);
			}
			//Q.audio.play('coin.mp3');
			this.destroy();
		}
	});

	Q.scene("levelOK",function(stage) {
		Q.stageTMX("levelOK.tmx",stage);

		stage.add("viewport").follow(Q("Player").first(), { x:true, y:false });
		stage.centerOn(160, 372);
	});

	Q.scene('hud',function(stage) {
		var container = stage.insert(new Q.UI.Container({
			x: 20, y: 0
		}));

		var label = container.insert(new Q.UI.Text({x:200, y: 20,
													label: "Puntos: " + stage.options.score, color: "white" }));

		var strength = container.insert(new Q.UI.Text({x:50, y: 20,
													   label: "Vida: " + stage.options.strength + '%', color: "white" }));

		container.fit(20);
	});

	Q.loadTMX("levelOK.tmx, mario_small.json, mario_small.png, bloopa.json, bloopa.png, goomba.json, goomba.png, coin.png, coin.json", function() {
		Q.compileSheets("mario_small.png","mario_small.json");
		Q.compileSheets("bloopa.png","bloopa.json");
		Q.compileSheets("goomba.png","goomba.json");
		Q.compileSheets("coin.png","coin.json");
		Q.animations("mario_small", {
			walk_right: { frames: [0,1,2], rate: 1/10, flip: false, loop: true },
			walk_left: { frames:  [0,1,2], rate: 1/10, flip:"x", loop: true },
			jump_right: { frames: [4], rate: 1/9, flip: false },
			jump_left: { frames:  [4], rate: 1/9, flip: "x" },
			stand_right: { frames:[0], rate: 1/9, flip: false },
			stand_left: { frames: [0], rate: 1/9, flip:"x" },
			duck_right: { frames: [6], rate: 1/9, flip: false },
			duck_left: { frames:  [6], rate: 1/9, flip: "x" }
		});
		var EnemyAnimations = {
			walk: { frames: [0,1], rate: 1/3, loop: true },
			dead: { frames: [2], rate: 1/8 }
		};
		Q.animations("bloopa", {
			jump: { frames: [0,1], rate: 1/2, loop: true },
			dead: { frames: [2], rate: 1/8 }
		});
		Q.animations("coin", {
			shine: { frames: [0,1,2], rate: 1/2, loop: true }
		});
		Q.animations("goomba", EnemyAnimations);
		Q.stageScene("levelOK");
		Q.stageScene('hud', 3, Q('Player').first().p);

	}, {
		progressCallback: function(loaded,total) {
			var element = document.getElementById("loading_progress");
			element.style.width = Math.floor(loaded/total*100) + "%";
			if (loaded == total) {
				document.getElementById("loading").remove();
			}
		}
	});
});
