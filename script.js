const doc = window.parent.document;
const parentWin = window.parent;
const currentToken = window.cosmicRerunToken;
const targetUrl = window.cosmicTargetMediaUrl;
const targetType = window.cosmicTargetMediaType;

// Force native dark theme inside parent localStorage and reload once to apply if needed
try {
    if (parentWin.localStorage.getItem('stActiveTheme-Source') !== 'Dark') {
        parentWin.localStorage.setItem('stActiveTheme-Source', 'Dark');
        parentWin.location.reload();
    }
} catch (e) {
    console.error('Failed to override localStorage theme:', e);
}

// ============================================================================
// 1. Interactive Starfield Canvas (Mouse Gravity Constellation)
// ============================================================================
// Force the parent body background to be the dark cosmic gradient (override Streamlit's light-mode !important body rules)
try {
    doc.body.style.setProperty('background', 'linear-gradient(135deg, #090816 0%, #05040d 60%, #150a25 100%)', 'important');
    doc.body.style.setProperty('background-color', '#090816', 'important');
    doc.body.style.setProperty('color', '#f0f0f8', 'important');
} catch (e) {
    console.error('Failed to set parent body style properties:', e);
}

let canvas = doc.getElementById('space-canvas');
if (!canvas) {
    canvas = doc.createElement('canvas');
    canvas.id = 'space-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '-1';
    canvas.style.pointerEvents = 'none';
    canvas.style.background = 'transparent';
    doc.body.appendChild(canvas);
}

const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = parentWin.innerWidth;
    canvas.height = parentWin.innerHeight;
}
parentWin.addEventListener('resize', resize);
resize();

const mouse = {
    x: null,
    y: null,
    radius: 140
};

function onMouseMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
}

function onMouseLeave() {
    mouse.x = null;
    mouse.y = null;
}

doc.addEventListener('mousemove', onMouseMove);
doc.addEventListener('mouseleave', onMouseLeave);

// Particles Setup
const particles = [];
const particleCount = 85;

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 0.4 - 0.2;
        this.speedY = Math.random() * 0.4 - 0.2;
    }
    
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
        
        // Gentle gravitational attraction to mouse cursor
        if (mouse.x !== null && mouse.y !== null) {
            let dx = mouse.x - this.x;
            let dy = mouse.y - this.y;
            let distance = Math.hypot(dx, dy);
            
            if (distance < mouse.radius) {
                const force = (mouse.radius - distance) / mouse.radius;
                const directionX = dx / distance;
                const directionY = dy / distance;
                
                this.x += directionX * force * 1.2;
                this.y += directionY * force * 1.2;
            }
        }
    }
    
    draw() {
        ctx.fillStyle = 'rgba(167, 139, 250, 0.7)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
    }
}

for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle());
}

let animationFrameId;
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw constellation lines between close particles
    for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
            let dx = particles[a].x - particles[b].x;
            let dy = particles[a].y - particles[b].y;
            let dist = Math.hypot(dx, dy);
            
            if (dist < 100) {
                let opacity = (100 - dist) / 100 * 0.15;
                ctx.strokeStyle = `rgba(167, 139, 250, ${opacity})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(particles[a].x, particles[a].y);
                ctx.lineTo(particles[b].x, particles[b].y);
                ctx.stroke();
            }
        }
    }
    
    // Draw mouse-connection webs
    if (mouse.x !== null && mouse.y !== null) {
        for (let i = 0; i < particles.length; i++) {
            let dx = mouse.x - particles[i].x;
            let dy = mouse.y - particles[i].y;
            let dist = Math.hypot(dx, dy);
            if (dist < mouse.radius) {
                let opacity = (mouse.radius - dist) / mouse.radius * 0.22;
                ctx.strokeStyle = `rgba(236, 72, 153, ${opacity})`;
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
            }
        }
    }
    
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    
    animationFrameId = requestAnimationFrame(animate);
}

animate();

// ============================================================================
// 2. Intelligent Frontend Loading Screen (Blur Page until Media fully Loads)
// ============================================================================
let loader = doc.getElementById('cosmic-loader');
if (!loader) {
    loader = doc.createElement('div');
    loader.id = 'cosmic-loader';
    loader.className = 'loader-overlay';
    loader.innerHTML = `
        <div class="loader-spinner"></div>
        <div class="loader-text">Navigating the Cosmos...</div>
    `;
    doc.body.appendChild(loader);
}

// Initialize global state on parent page to persist status across Streamlit reruns
if (!parentWin.cosmicState) {
    parentWin.cosmicState = {
        lastToken: null,
        isFetching: true,
        targetUrl: null,
        targetType: null
    };
}

// Check if this is a new rerun execution triggered by Python
if (currentToken && currentToken !== parentWin.cosmicState.lastToken) {
    parentWin.cosmicState.lastToken = currentToken;
    parentWin.cosmicState.isFetching = true;
    parentWin.cosmicState.targetUrl = targetUrl;
    parentWin.cosmicState.targetType = targetType;
    
    // Immediately display the loading screen
    loader.style.display = 'flex';
}

function checkMediaLoaded() {
    const isFetching = parentWin.cosmicState.isFetching;
    const currentTargetUrl = parentWin.cosmicState.targetUrl;
    const currentTargetType = parentWin.cosmicState.targetType;
    
    if (isFetching) {
        const img = doc.querySelector('[data-testid="stImage"] img') || doc.querySelector('img[data-testid="stImageObject"]');
        const video = doc.querySelector('video') || doc.querySelector('[data-testid="stVideo"] iframe') || doc.querySelector('iframe[title="streamlit_player"]');
        const errorNotify = doc.querySelector('[data-testid="stNotification"]');
        
        if (currentTargetType === 'image' && img && img.src) {
            // Check if the rendered image has the new target URL
            if (img.src.includes(currentTargetUrl)) {
                if (img.complete) {
                    hideLoader();
                } else {
                    img.addEventListener('load', hideLoader);
                    img.addEventListener('error', hideLoader);
                }
            } else {
                // Still showing the old image while Streamlit runs in background
                setTimeout(checkMediaLoaded, 80);
            }
        } else if (currentTargetType === 'video' && video) {
            // New video is rendered in DOM
            hideLoader();
        } else if (errorNotify) {
            // An error has occurred, clear loader
            hideLoader();
        } else {
            // Content is still compiling/fetching, check again in 80ms
            setTimeout(checkMediaLoaded, 80);
        }
    } else {
        // Safe check: make sure loader is closed if we are in static state
        hideLoader();
    }
}

function hideLoader() {
    parentWin.cosmicState.isFetching = false;
    if (loader) {
        loader.style.display = 'none';
    }
}

// Start checking media status
checkMediaLoaded();

// Intercept clicks on sidebar interactive components to immediately fire loading state
// Defer showing overlay using setTimeout to prevent blocking React event listeners / WebSockets
function setupInteractionListeners() {
    const sidebar = doc.querySelector('[data-testid="stSidebar"]');
    if (sidebar) {
        sidebar.addEventListener('click', (e) => {
            const button = e.target.closest('button') || e.target.closest('[role="button"]');
            if (button) {
                const btnText = button.textContent || '';
                // Only trigger loading state for our specific action buttons
                if (btnText.includes('Surprise') || btnText.includes('Today')) {
                    parentWin.cosmicState.isFetching = true;
                    setTimeout(() => {
                        loader.style.display = 'flex';
                    }, 10);
                }
            }
        });
        
        const dateInput = sidebar.querySelector('input');
        if (dateInput) {
            dateInput.addEventListener('change', () => {
                parentWin.cosmicState.isFetching = true;
                setTimeout(() => {
                    loader.style.display = 'flex';
                }, 10);
            });
        }
    } else {
        setTimeout(setupInteractionListeners, 300);
    }
}
setupInteractionListeners();

// ============================================================================
// 3. Script Unload Cleanups
// ============================================================================
window.addEventListener('unload', () => {
    cancelAnimationFrame(animationFrameId);
    parentWin.removeEventListener('resize', resize);
    doc.removeEventListener('mousemove', onMouseMove);
    doc.removeEventListener('mouseleave', onMouseLeave);
});
