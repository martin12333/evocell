define(["CellSpace.State", "three"], function(gameState, THREE) {
	"use strict";

/////// PUBLIC ///////////
	
	// static
	var playSound = function(snd) {
		try {
			snd.currentTime=0;
			snd.play();
		} catch(ex) {}
	};

	// TODO: gamestate access, otherwise static
	// gets NDC (0 to 1) of clicked postion
	// itersects line form eye (0, 0, 0) to cliked position of a viewMatrix transformed plane in x/y plane
	// returns computed object coordinates (-1 to 1 for x and y, 0 for z)
	var intersectClick = function(clickedNDC) {
		var invMV = new THREE.Matrix4();
		invMV.getInverse(gameState.viewMatrix);

		var planeNormal = new THREE.Vector4(0, 0, -1, 0);
		var planePoint = new THREE.Vector4(0, 0, 0, 1);

		// here the projection matrix is used or at least the cameraAngle
		var camAH = gameState.cameraAngle/2;
		var sf = Math.sin(camAH)/Math.cos(camAH);
		var lineDir = new THREE.Vector4(sf*(2*clickedNDC.x - 1), sf*(2*clickedNDC.y - 1), -1, 0);
		var linePoint = new THREE.Vector4();

		planeNormal.applyMatrix4(gameState.viewMatrix);
		planePoint.applyMatrix4(gameState.viewMatrix);

		var a = new THREE.Vector4().subVectors(planePoint, linePoint).dot(planeNormal);
		var b = lineDir.dot(planeNormal);

		var pointPos = a / b;

		var point = new THREE.Vector4().addVectors(linePoint, lineDir.clone().multiplyScalar(pointPos));
		var deltaPoint = point.clone().applyMatrix4(invMV);

		return deltaPoint;
	};

	// access to gamestate
	var getNDCFromMouseEvent = function(canvas, evt) {
		var coords = canvas.relMouseCoords(evt);
		return new THREE.Vector2(coords.x/gameState.screenW, (gameState.screenH - coords.y)/gameState.screenH);
	};

	// access to gamestate
	var pollAutoFire = function() {		
		if (gameState.autoFireOn) {
			if (gameState.autoFireCounter === 0) {
				var clickedPoint = intersectClick(gameState.lastMouseNDC);
				fireShotAt(gameState.gameW*(clickedPoint.x+1)/2, gameState.gameH*(clickedPoint.y+1)/2);	

				gameState.autoFireCounter = 5;
			}
			else {
				gameState.autoFireCounter--;
			}
		}
	};

	// TODO: gameState access
	var fireShotAt = function(tx, ty) {
		// spawn shot
		var dX = tx-gameState.shipX;
		var dY = ty-gameState.shipY;
		var dL = Math.sqrt(dX*dX+dY*dY);
		var sX = gameState.shotSpeed * dX/dL;
		var sY = gameState.shotSpeed * dY/dL;

		var aa = gameState.frontShots > 1 ? -gameState.frontShotAngle/2 : 0;

		for (var i = 0; i < gameState.frontShots; i++) {
			gameState.shots.allocateParticle(gameState.shipX, gameState.shipY, Math.cos(aa)*sX + Math.sin(aa)*sY, -Math.sin(aa)*sX + Math.cos(aa)*sY);
			
			if (gameState.frontShots > 1)
				aa += gameState.frontShotAngle/(gameState.frontShots-1);
		}

		playSound(gameState.snd);
	};

	// TODO: could be done in backbone via a conceptual model ;)
	var updateButtons = function() {
		if (gameState.renderLoop.pauseRequested) {
			document.getElementById("playPause").children[0].className = "fa fa-play fa-2x";
		}
		else {
			document.getElementById("playPause").children[0].className = "fa fa-pause fa-2x";
		}
	};

	var refreshGUI = function() {
		for (var i in gameState.gui.__controllers) {
			gameState.gui.__controllers[i].updateDisplay();
		}

		for (var fIdx in gameState.gui.__folders) {
			var folder = gameState.gui.__folders[fIdx];
			for (i in folder.__controllers) {
				folder.__controllers[i].updateDisplay();
			}
		}
	};

	var resetGame = function() {
		gameState.cnt = 0;
		gameState.dishes.enemy.randomize(gameState.rules.enemy.nrStates, 0.02);
		gameState.dishes.enemy2.randomize(gameState.rules.enemy.nrStates, 0.01);
		if (gameState.shipX < 0 || gameState.shipX > gameState.gameW || 
			gameState.shipY < 0 || gameState.shipY > gameState.gameH) {
			gameState.shipX = gameState.gameW/2;
			gameState.shipY = gameState.gameH/2;
		}
		playSound(gameState.sndInit);
	};

	var gameStep = function() {
		gameState.renderLoop.stop();
		gameState.renderLoop.step();
		updateButtons();
	};

	var gamePlayPause = function() {
		gameState.renderLoop.toggle();
		updateButtons();
	};

	var onGameSizeChanged = function() {
		var reactor = gameState.reactor;

		reactor.setDefaultDishSize(gameState.gameW, gameState.gameH);

		// hack reinit shots
		gameState.shots = new EC.ParticleSystem(reactor, gameState.maxParticles, gameState.gameW, gameState.gameH);

		// reinit instead of resize (we lose state but who cares?)
		var dishes = gameState.dishes;
		dishes.enemy = reactor.compileDish();
		dishes.enemy2 = reactor.compileDish();
		dishes.ship = reactor.compileDish();
		dishes.shipExplosion = reactor.compileDish();
		dishes.weapon = reactor.compileDish();
		dishes.weaponExplosion = reactor.compileDish();
		dishes.copy = reactor.compileDish();
		dishes.buffer = reactor.compileDish(64, 64);
		dishes.render = reactor.compileDish();

		var rules = gameState.rules;
		rules.enemy.setCompileSizeDish(gameState.dishes.enemy);
		rules.enemy2.setCompileSizeDish(gameState.dishes.enemy2);
		rules.ship.setCompileSizeDish(gameState.dishes.ship);
		rules.weapon.setCompileSizeDish(gameState.dishes.enemy);
		rules.shipExplosion.setCompileSizeDish(gameState.dishes.enemy2);
		rules.weaponExplosion.setCompileSizeDish(gameState.dishes.enemy2);

		resetGame();
	}; 

////// PTIVATE //////////////

	return {
		playSound: playSound,
		getNDCFromMouseEvent: getNDCFromMouseEvent,
		intersectClick: intersectClick, 
	

		pollAutoFire: pollAutoFire,
		fireShotAt: fireShotAt,
		updateButtons: updateButtons,
		refreshGUI: refreshGUI,
		resetGame: resetGame,
		gameStep: gameStep,
		gamePlayPause: gamePlayPause,
		onGameSizeChanged: onGameSizeChanged,
	};
});