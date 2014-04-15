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
	Q.SPRITE_PRINCESS = 8;
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
				type: Q.SPRITE_PLAYER,
				collisionMask: Q.SPRITE_DEFAULT | Q.SPRITE_COLLECTABLE
			});

			this.dying= false;
			this.p.points = this.p.standingPoints;

			this.add('2d, platformerControls, animation, tween');

			Q.state.on("change.lives", this, "lives");
			this.on("bump.top","breakTile");
			this.on("enemy.hit","enemyHit");
			this.on("jump");
			this.on("jumped");
		},

		jump: function(obj) {
			// Only play sound once.
			if (!obj.p.playedJump) {
				obj.p.playedJump = true;
				Q.audio.play('jump.mp3');
			}
		},

		jumped: function(obj) {
			obj.p.playedJump = false;
		},

		resetLevel: function() {
			if(this.dying)
				return;
			this.dying = true;

			Q.audio.stop();
			Q.audio.play('music_die.mp3');
			this.play('die');
			this.animate({ x: this.p.x, y:  this.p.y - 100 }, 
						 0.35, 
						 Q.Easing.Quadratic.Out)
			.chain({ x: this.p.x, y: this.p.y + 250 }, 
				   0.65, 
				   { callback: function() { Q.stageScene("endGame",2, { label: "You lose!" });
										   this.destroy(); } });
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
			Q.state.dec("lives", 1);
		},

		lives: function(lives) {
			if(lives == 0){
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
			if(this.dying)
				return;
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

			if(this.p.y > 600) {
				this.stage.unfollow();
			}

			if(this.p.y > 1000) {
				this.resetLevel();
			}
		}
	});

	Q.Sprite.extend("Princess",{

		init: function(p) {

			this._super(p, {
				sheet: 'princess',
				sprite: 'princess',
				type: Q.SPRITE_PRINCESS,
				collisionMask: Q.SPRITE_PLAYER,				
				sensor: true,
				vx: 0,
				vy: 0,
				gravity: 0
			});

			this.add('2d, tween');
			this.on("sensor");
		},

		sensor: function(colObj) {
			// Win the game
			if(colObj.isA("Player") && this.p.sensor) {

				Q.audio.stop();
				Q.audio.play('music_level_complete.mp3');
				this.p.sensor = false;				
				this.animate({ x: this.p.x, y:  0 }, 
							 1, 
							 Q.Easing.Quadratic.InOut, { callback: function() { Q.stageScene("endGame", 2, { label: "You won!" });
																			   this.destroy(); colObj.destroy() } });
				colObj.animate({ x: colObj.p.x, y:  0 }, 
							   1, 
							   Q.Easing.Quadratic.InOut);
			}
		}
	});

	Q.component("defaultEnemy", {
		added: function() {
			this.entity.add("2d, aiBounce, animation");
			this.entity.on("bump.top",this,"die");
			this.entity.on("hit.sprite",this,"hit");
		},

		hit: function(col) {
			if(col.obj.isA("Player") && !this.entity.p.dead) {
				col.obj.trigger('enemy.hit', {"enemy":this,"col":col});
			}
		},

		die: function(col) {
			if(col.obj.isA("Player")) {
				this.entity.p.vx=this.entity.p.vy=0;
				this.entity.play('dead');
				this.entity.p.dead = true;
				var that = this;
				col.obj.p.vy = -300;
				this.entity.p.deadTimer = 0;
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

			this.add('defaultEnemy');
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
		}
	});

	Q.Enemy.extend("Bloopa", {
		init: function(p) {
			this._super(p,{
				sheet: "bloopa",  
				sprite: "bloopa",
				vx: 0,
				vy: -150,
				rangeY: 100,
				gravity: 0,
				jumpSpeed: -250
			});

			this.p.initialY = this.p.y;

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
				sheet: "goomba",  
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
				amount: true,
				gravity: 0
			});
			this.add('animation');
			this.add('tween');
			this.on("sensor");
			this.play('shine');
		},

		// When a Collectable is hit.
		sensor: function(colObj) {
			// Increment the score.
			if (this.p.amount) {
				Q.audio.play('coin.mp3');
				Q.state.inc("score", 1);
				console.log
				this.p.amount = false;
				this.animate({ x: this.p.x, y:  this.p.y - 50 }, 
							 0.2, 
							 Q.Easing.Quadratic.Out, 
							 { callback: function() { this.destroy(); } });
			}
		}
	});

	Q.scene("levelOK",function(stage) {
		Q.state.reset({ score: 0, lives: 1 });
		Q.stageTMX("levelOK.tmx",stage);
		stage.add("viewport").follow(Q("Player").first(), { x:true, y:false });
		stage.centerOn(160, 372);
	});

	Q.scene('initialScreen', function(stage) {
		Q.audio.stop();
		Q.audio.play('music_main.mp3', { loop: true });

		stage.insert(new Q.UI.Button({
			asset: "mainTitle.png",
			y: Q.height/2,
			x: Q.width/2
		}, function() {
			Q.clearStages();			
			Q.stageScene("levelOK"); 
			Q.stageScene('hud', 1);
		}, {keyActionName: 'confirm' }));
		var container = stage.insert(new Q.UI.Container({
			x: 0, y: 0
		}));
		var label = container.insert(new Q.UI.Text({x:120, y: 40,
													label: "Press the screen\nor confirm to start!", color: "white" }));
		container.fit(20);
	});

	Q.UI.Text.extend("Score",{ 
		init: function(p) {
			this._super({
				label: "Score: 0",
				x: 60,
				y: 20,
				color: 'white'
			});

			Q.state.on("change.score",this,"score");
		},

		score: function(score) {
			this.p.label = "Score: " + score;
		}
	});

	Q.scene('hud',function(stage) {
		var container = stage.insert(new Q.UI.Container({
			x: 0, y: 0
		}));

		var label = container.insert(new Q.Score());

		container.fit(20);
	});

	Q.loadTMX("levelOK.tmx, mario_small.json, mario_small.png, bloopa.json, bloopa.png, goomba.json, goomba.png, coin.png, coin.json, princess.png, mainTitle.png, coin.mp3, jump.mp3, music_main.mp3, music_level_complete.mp3, music_die.mp3", function() {
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
			duck_left: { frames:  [6], rate: 1/9, flip: "x" },
			die: { frames:  [12], rate: 1/9, flip: false }
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
		Q.stageScene("initialScreen");

	}, {
		progressCallback: function(loaded,total) {
			var element = document.getElementById("loading_progress");
			element.style.width = Math.floor(loaded/total*100) + "%";
			if (loaded == total) {
				document.getElementById("loading").remove();
			}
		}
	});

	Q.scene('endGame',function(stage) {

		var container = stage.insert(new Q.UI.Container({
			x: Q.width/2, y: Q.height/2, fill: "rgba(0,0,0,0.5)"
		}));

		var button = container.insert(new Q.UI.Button({ x: 0, y: 0, fill: "#CCCCCC",
													   label: "Play Again" }))         
		var label = container.insert(new Q.UI.Text({x:10, y: -10 - button.p.h, 
													label: stage.options.label }));
		button.on("click",function() {
			Q.clearStages();			
			Q.stageScene('initialScreen');
		});

		container.fit(20);
	});
});
