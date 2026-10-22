const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const contadorElement = document.getElementById('contador');
const btnAudio = document.getElementById('btnAudio');
const bgMusic = document.getElementById('bgMusic');
const hitSound = document.getElementById('hitSound');

let contadorClicks = 0;
const TOTAL_OBJETOS = 25; //[cite: 2]
const objetos = [];
const animacionesChoque = [];

// 1. Cargar la imagen de fondo (Telarañas)
const bgImage = new Image();
bgImage.src = 'assets/background.png'; // Cambia a .png si tu archivo de fondo tiene esa extensión

// 2. Cargar la imagen completa del fantasma
const objectImage = new Image();
objectImage.src = 'assets/icons_sheet.png'; //[cite: 1]

// Clase para la animación breve de choque (Efecto de colisión)[cite: 2]
class AnimacionChoque {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radio = 4;
        this.maxRadio = 28;
        this.opacity = 1.0;
        this.activa = true;
    }

    update() {
        this.radio += 2;
        this.opacity -= 0.06;
        if (this.opacity <= 0 || this.radio >= this.maxRadio) {
            this.activa = false;
        }
    }

    draw(ctx) {
        if (!this.activa) return;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radio, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 152, 0, ${this.opacity})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
    }
}

// Clase Objeto 2D (Fantasmita en movimiento con 4 direcciones)[cite: 2]
class Objeto2D {
    constructor(id) {
        this.id = id;
        this.init();
    }

    init() {
        this.radius = 28;
        this.x = Math.random() * (canvas.width - this.radius * 4) + this.radius * 2;
        this.y = Math.random() * (canvas.height - this.radius * 4) + this.radius * 2;
        
        // 4 Tipos de Movimiento: 0: Vertical, 1: Diagonal, 2: Circular, 3: Diagonal Rápida[cite: 2]
        this.tipoMovimiento = Math.floor(Math.random() * 4);
        
        const speed = Math.random() * 2 + 1.2;
        this.vx = (Math.random() - 0.5) * speed * 2;
        this.vy = (Math.random() - 0.5) * speed * 2;

        if (this.tipoMovimiento === 0) {
            this.vx = 0;
            this.vy = (Math.random() < 0.5 ? 1 : -1) * (speed + 1);
        } else {
            if (Math.abs(this.vx) < 0.6) this.vx = 1.5;
            if (Math.abs(this.vy) < 0.6) this.vy = 1.5;
        }

        // Parámetros para movimiento circular[cite: 2]
        this.angle = Math.random() * Math.PI * 2;
        this.angularSpeed = (Math.random() * 0.05 + 0.02) * (Math.random() < 0.5 ? 1 : -1);
        this.centerX = this.x;
        this.centerY = this.y;
        this.orbitRadius = Math.random() * 30 + 15;
    }

    update() {
        if (this.tipoMovimiento === 2) {
            // Movimiento circular con traslación orbital[cite: 2]
            this.angle += this.angularSpeed;
            this.centerX += this.vx;
            this.centerY += this.vy;
            this.x = this.centerX + Math.cos(this.angle) * this.orbitRadius;
            this.y = this.centerY + Math.sin(this.angle) * this.orbitRadius;

            if (this.centerX - this.orbitRadius < this.radius || this.centerX + this.orbitRadius > canvas.width - this.radius) {
                this.vx *= -1;
            }
            if (this.centerY - this.orbitRadius < this.radius || this.centerY + this.orbitRadius > canvas.height - this.radius) {
                this.vy *= -1;
            }
        } else {
            // Movimiento en líneas rectas y diagonales[cite: 2]
            this.x += this.vx;
            this.y += this.vy;

            // Rebote en los bordes del canvas[cite: 2]
            if (this.x - this.radius <= 0 || this.x + this.radius >= canvas.width) {
                this.vx *= -1;
            }
            if (this.y - this.radius <= 0 || this.y + this.radius >= canvas.height) {
                this.vy *= -1;
            }
        }
    }

    draw(ctx) {
        if (objectImage.complete && objectImage.naturalWidth !== 0) {
            ctx.drawImage(
                objectImage,
                this.x - this.radius,
                this.y - this.radius,
                this.radius * 2,
                this.radius * 2
            );
        } else {
            ctx.save();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

// Inicializar exactamente los 25 objetos requeridos[cite: 2]
for (let i = 0; i < TOTAL_OBJETOS; i++) {
    objetos.push(new Objeto2D(i));
}

// Detección y respuesta de colisión entre objetos (Rebote con animación)[cite: 2]
function resolverColisiones() {
    for (let i = 0; i < objetos.length; i++) {
        for (let j = i + 1; j < objetos.length; j++) {
            const o1 = objetos[i];
            const o2 = objetos[j];

            const dx = o2.x - o1.x;
            const dy = o2.y - o1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = o1.radius + o2.radius;

            if (dist < minDist) {
                // Intercambio de velocidades (rebote elástico)[cite: 2]
                const tempVx = o1.vx;
                const tempVy = o1.vy;
                o1.vx = o2.vx;
                o1.vy = o2.vy;
                o2.vx = tempVx;
                o2.vy = tempVy;

                // Generar animación breve de choque[cite: 2]
                const colX = (o1.x + o2.x) / 2;
                const colY = (o1.y + o2.y) / 2;
                animacionesChoque.push(new AnimacionChoque(colX, colY));
            }
        }
    }
}

// Manejo de Clics del Mouse para eliminar objetos y reaparecer aleatoriamente[cite: 2]
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    for (let i = 0; i < objetos.length; i++) {
        const obj = objetos[i];
        const dist = Math.hypot(mouseX - obj.x, mouseY - obj.y);

        if (dist <= obj.radius + 6) {
            contadorClicks++;
            contadorElement.textContent = contadorClicks;

            // Reproducir tu archivo físico de audio hit_sound.mp3
            if (hitSound) {
                hitSound.currentTime = 0;
                hitSound.play().catch(error => {
                    console.log("Audio de clic bloqueado o requiere interacción:", error);
                });
            }

            // Reaparecer aleatoriamente en otra zona manteniendo siempre 25 objetos[cite: 2]
            obj.init();
            animacionesChoque.push(new AnimacionChoque(mouseX, mouseY));
            break;
        }
    }
});

// Control de audio ambiental de fondo corregido
if (btnAudio && bgMusic) {
    bgMusic.volume = 0.5;

    btnAudio.addEventListener('click', (e) => {
        e.preventDefault(); // Evita doble disparo del evento
        
        if (bgMusic.paused) {
            bgMusic.play().then(() => {
                btnAudio.textContent = "🔊 Música On";
            }).catch(err => console.log("Error al reproducir:", err));
        } else {
            bgMusic.pause();
            bgMusic.currentTime = 0; // Detiene y regresa el audio al inicio obligatoriamente
            btnAudio.textContent = "🔇 Música Off";
        }
    });
}

// Bucle Principal de Renderizado del Escenario 2D[cite: 2]
function loop() {
    // 1. Limpiar canvas y dibujar imagen de fondo (Telarañas)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (bgImage.complete && bgImage.naturalWidth !== 0) {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    }

    // 2. Actualizar y renderizar cada objeto 2D
    objetos.forEach(obj => {
        obj.update();
        obj.draw(ctx);
    });

    // 3. Resolver colisiones y rebotes[cite: 2]
    resolverColisiones();

    // 4. Actualizar animaciones de choque
    for (let i = animacionesChoque.length - 1; i >= 0; i--) {
        const anim = animacionesChoque[i];
        anim.update();
        anim.draw(ctx);
        if (!anim.activa) {
            animacionesChoque.splice(i, 1);
        }
    }

    requestAnimationFrame(loop);
}

// Iniciar bucle de juego
loop();