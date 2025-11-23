// Game Constants
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GRAVITY_CONSTANT = 0.5;
const MAX_HEALTH = 100;
const PROJECTILE_DAMAGE = 25;

// Game State
let gameState = {
    currentPlayer: 1,
    players: [
        { x: 100, y: 500, health: MAX_HEALTH, color: '#4CAF50' },
        { x: 700, y: 500, health: MAX_HEALTH, color: '#2196F3' }
    ],
    planets: [],
    projectile: null,
    gameOver: false,
    angle: 45,
    power: 50
};

// UI Elements
const angleSlider = document.getElementById('angle');
const powerSlider = document.getElementById('power');
const angleValue = document.getElementById('angle-value');
const powerValue = document.getElementById('power-value');
const fireBtn = document.getElementById('fire-btn');
const restartBtn = document.getElementById('restart-btn');
const turnIndicator = document.getElementById('turn-indicator');
const p1Health = document.getElementById('p1-health');
const p2Health = document.getElementById('p2-health');
const p1HealthText = document.getElementById('p1-health-text');
const p2HealthText = document.getElementById('p2-health-text');
const player1Info = document.getElementById('player1-info');
const player2Info = document.getElementById('player2-info');

// Initialize Game
function initGame() {
    // Reset game state
    gameState = {
        currentPlayer: 1,
        players: [
            { x: 100, y: 500, health: MAX_HEALTH, color: '#4CAF50' },
            { x: 700, y: 500, health: MAX_HEALTH, color: '#2196F3' }
        ],
        planets: generatePlanets(),
        projectile: null,
        gameOver: false,
        angle: 45,
        power: 50
    };
    
    angleSlider.value = 45;
    powerSlider.value = 50;
    updateUI();
    restartBtn.style.display = 'none';
    fireBtn.disabled = false;
}

// Generate random planets
function generatePlanets() {
    const planets = [];
    const numPlanets = 3 + Math.floor(Math.random() * 3); // 3-5 planets
    
    for (let i = 0; i < numPlanets; i++) {
        planets.push({
            x: 200 + Math.random() * 400,
            y: 150 + Math.random() * 300,
            radius: 20 + Math.random() * 30,
            mass: 50 + Math.random() * 100,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
        });
    }
    
    return planets;
}

// Update UI
function updateUI() {
    angleValue.textContent = `${angleSlider.value}°`;
    powerValue.textContent = `${powerSlider.value}%`;
    gameState.angle = parseInt(angleSlider.value);
    gameState.power = parseInt(powerSlider.value);
    
    // Update health bars
    const p1HealthPercent = (gameState.players[0].health / MAX_HEALTH) * 100;
    const p2HealthPercent = (gameState.players[1].health / MAX_HEALTH) * 100;
    p1Health.style.width = `${p1HealthPercent}%`;
    p2Health.style.width = `${p2HealthPercent}%`;
    p1HealthText.textContent = `${Math.max(0, gameState.players[0].health)} HP`;
    p2HealthText.textContent = `${Math.max(0, gameState.players[1].health)} HP`;
    
    // Update turn indicator
    if (gameState.gameOver) {
        const winner = gameState.players[0].health > 0 ? 1 : 2;
        turnIndicator.textContent = `Player ${winner} Wins!`;
        turnIndicator.style.color = winner === 1 ? '#4CAF50' : '#2196F3';
    } else {
        turnIndicator.textContent = `Player ${gameState.currentPlayer}'s Turn`;
        turnIndicator.style.color = '#333';
    }
    
    // Update active player highlight
    player1Info.classList.toggle('active', gameState.currentPlayer === 1 && !gameState.gameOver);
    player2Info.classList.toggle('active', gameState.currentPlayer === 2 && !gameState.gameOver);
}

// Fire projectile
function fire() {
    if (gameState.projectile || gameState.gameOver) return;
    
    const player = gameState.players[gameState.currentPlayer - 1];
    const angleRad = (gameState.angle * Math.PI) / 180;
    const direction = gameState.currentPlayer === 1 ? 1 : -1;
    
    const velocity = gameState.power / 10;
    
    gameState.projectile = {
        x: player.x,
        y: player.y - 15,
        vx: Math.cos(angleRad) * velocity * direction,
        vy: -Math.sin(angleRad) * velocity,
        radius: 5,
        trail: []
    };
    
    fireBtn.disabled = true;
}

// Update physics
function updatePhysics(deltaTime) {
    if (!gameState.projectile) return;
    
    const proj = gameState.projectile;
    
    // Add current position to trail
    proj.trail.push({ x: proj.x, y: proj.y });
    if (proj.trail.length > 30) proj.trail.shift();
    
    // Apply gravity from planets
    gameState.planets.forEach(planet => {
        const dx = planet.x - proj.x;
        const dy = planet.y - proj.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        
        if (dist > 0) {
            const force = (planet.mass * GRAVITY_CONSTANT) / distSq;
            proj.vx += (dx / dist) * force * deltaTime;
            proj.vy += (dy / dist) * force * deltaTime;
        }
    });
    
    // Update position
    proj.x += proj.vx * deltaTime;
    proj.y += proj.vy * deltaTime;
    
    // Check collision with players
    gameState.players.forEach((player, index) => {
        const dx = proj.x - player.x;
        const dy = proj.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 15 + proj.radius) {
            // Hit!
            if (index + 1 !== gameState.currentPlayer) {
                player.health -= PROJECTILE_DAMAGE;
                if (player.health <= 0) {
                    player.health = 0;
                    gameState.gameOver = true;
                    restartBtn.style.display = 'block';
                }
            }
            gameState.projectile = null;
            nextTurn();
        }
    });
    
    // Check collision with planets
    gameState.planets.forEach(planet => {
        const dx = proj.x - planet.x;
        const dy = proj.y - planet.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < planet.radius + proj.radius) {
            gameState.projectile = null;
            nextTurn();
        }
    });
    
    // Check if out of bounds
    if (proj && (proj.x < -50 || proj.x > canvas.width + 50 || 
                 proj.y < -50 || proj.y > canvas.height + 50)) {
        gameState.projectile = null;
        nextTurn();
    }
}

// Next turn
function nextTurn() {
    if (!gameState.gameOver) {
        gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
        updateUI();
        fireBtn.disabled = false;
    }
}

// Render
function render() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars
    ctx.fillStyle = 'white';
    for (let i = 0; i < 100; i++) {
        const x = (i * 123.45) % canvas.width;
        const y = (i * 234.56) % canvas.height;
        ctx.fillRect(x, y, 1, 1);
    }
    
    // Draw planets
    gameState.planets.forEach(planet => {
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
        ctx.fillStyle = planet.color;
        ctx.fill();
        
        // Add some detail
        ctx.beginPath();
        ctx.arc(planet.x - planet.radius * 0.3, planet.y - planet.radius * 0.3, 
                planet.radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill();
    });
    
    // Draw players
    gameState.players.forEach((player, index) => {
        // Ship body
        ctx.fillStyle = player.color;
        ctx.beginPath();
        const direction = index === 0 ? 1 : -1;
        ctx.moveTo(player.x, player.y - 10);
        ctx.lineTo(player.x + 15 * direction, player.y + 10);
        ctx.lineTo(player.x - 15 * direction, player.y + 10);
        ctx.closePath();
        ctx.fill();
        
        // Ship outline
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Aim line
        if (index + 1 === gameState.currentPlayer && !gameState.projectile && !gameState.gameOver) {
            const angleRad = (gameState.angle * Math.PI) / 180;
            const lineLength = gameState.power;
            ctx.beginPath();
            ctx.moveTo(player.x, player.y - 10);
            ctx.lineTo(
                player.x + Math.cos(angleRad) * lineLength * direction,
                player.y - 10 - Math.sin(angleRad) * lineLength
            );
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
    
    // Draw projectile
    if (gameState.projectile) {
        const proj = gameState.projectile;
        
        // Draw trail
        ctx.strokeStyle = 'rgba(255, 200, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        proj.trail.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.stroke();
        
        // Draw projectile
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// Game loop
let lastTime = Date.now();
function gameLoop() {
    const currentTime = Date.now();
    const deltaTime = Math.min((currentTime - lastTime) / 16.67, 2); // Cap at 2x speed
    lastTime = currentTime;
    
    updatePhysics(deltaTime);
    render();
    updateUI();
    
    requestAnimationFrame(gameLoop);
}

// Event listeners
angleSlider.addEventListener('input', updateUI);
powerSlider.addEventListener('input', updateUI);
fireBtn.addEventListener('click', fire);
restartBtn.addEventListener('click', initGame);

// Start game
initGame();
gameLoop();
