# Gravity Wars - AntiGravity Port

A classic turn-based artillery game where two players battle in space, using gravity wells from planets to guide their projectiles.

![Gravity Wars Screenshot](https://github.com/user-attachments/assets/aa45919b-4c57-4256-8eaf-3443d74fc4fb)

## Features

- **Turn-based gameplay** - Two players take turns firing projectiles at each other
- **Realistic gravity physics** - Projectiles are affected by gravitational pull from planets
- **Dynamic planet generation** - Each game generates a unique battlefield with 3-5 random planets
- **Health system** - Players have 100 HP and take 25 damage per hit
- **Visual feedback** - Projectile trails, aim indicators, and player turn highlights
- **Beautiful UI** - Modern, polished interface with smooth animations

## How to Play

1. **Open the game** - Simply open `index.html` in a web browser
2. **Adjust your aim** - Use the Angle slider to set your firing angle (0-180°)
3. **Set your power** - Use the Power slider to control shot strength (10-100%)
4. **Fire!** - Click the Fire button to launch your projectile
5. **Watch the physics** - Your projectile will be affected by gravity from nearby planets
6. **Take turns** - Players alternate turns until one player's health reaches 0
7. **Win the game** - Reduce your opponent's health to 0 to win!

## Game Controls

- **Angle Slider**: Adjusts the launch angle of your projectile (0° = horizontal right, 90° = straight up, 180° = horizontal left)
- **Power Slider**: Controls the initial velocity of your projectile (higher power = faster/farther shot)
- **Fire Button**: Launches your projectile with the current angle and power settings
- **New Game Button**: Appears after a game ends - click to start a new game with a fresh battlefield

## Technical Details

The game is built with:
- **HTML5 Canvas** for rendering
- **JavaScript** for game logic and physics
- **CSS3** for styling and animations

### Physics Engine

The game implements a simple but effective gravity simulation:
- Each planet has a mass and exerts gravitational force on projectiles
- Force decreases with the square of the distance (inverse square law)
- Projectile trajectories update in real-time based on combined gravitational forces

### Files

- `index.html` - Main game page with UI structure
- `styles.css` - All visual styling and layout
- `game.js` - Game logic, physics engine, and rendering

## Running the Game

### Option 1: Direct File Open
Simply open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge)

### Option 2: Local Server
For best results, serve via a local HTTP server:

```bash
# Using Python 3
python3 -m http.server 8080

# Then open http://localhost:8080 in your browser
```

## Browser Compatibility

Works in all modern browsers that support:
- HTML5 Canvas
- ES6 JavaScript
- CSS3

Tested on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Credits

Original Gravity Wars concept by classic artillery games
Port and implementation by AntiGravity team

---

Enjoy the game! 🚀