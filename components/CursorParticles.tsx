import React, { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    alpha: number;
    hue: number;        // 190-230 = sky-blue to periwinkle
    saturation: number;
    life: number;
    maxLife: number;
    type: 'orb' | 'spark' | 'ring';
}

const CursorParticles: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: -2000, y: -2000, vx: 0, vy: 0 });
    const prevMouseRef = useRef({ x: -2000, y: -2000 });
    const particlesRef = useRef<Particle[]>([]);
    const rafRef = useRef<number>(0);
    const lastSpawnRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const onMouseMove = (e: MouseEvent) => {
            const prev = prevMouseRef.current;
            mouseRef.current.vx = e.clientX - prev.x;
            mouseRef.current.vy = e.clientY - prev.y;
            mouseRef.current.x = e.clientX;
            mouseRef.current.y = e.clientY;
            prevMouseRef.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('mousemove', onMouseMove);

        const spawn = () => {
            const { x, y } = mouseRef.current;
            if (x === -2000) return;

            // Determine speed of mouse
            const speed = Math.sqrt(mouseRef.current.vx ** 2 + mouseRef.current.vy ** 2);
            const count = Math.min(3, 1 + Math.floor(speed / 8));

            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const vel = 0.3 + Math.random() * 1.0;
                const type: Particle['type'] =
                    Math.random() < 0.7 ? 'orb' : Math.random() < 0.5 ? 'spark' : 'ring';

                particlesRef.current.push({
                    x: x + (Math.random() - 0.5) * 8,
                    y: y + (Math.random() - 0.5) * 8,
                    vx: Math.cos(angle) * vel,
                    vy: Math.sin(angle) * vel - 0.3, // slight upward drift
                    radius: type === 'ring' ? 6 + Math.random() * 6 : 1.5 + Math.random() * 3,
                    alpha: type === 'ring' ? 0.35 : 0.6 + Math.random() * 0.35,
                    hue: 195 + Math.random() * 45,            // sky blue → electric violet
                    saturation: 75 + Math.random() * 25,
                    life: 0,
                    maxLife: type === 'ring' ? 30 + Math.random() * 20 : 50 + Math.random() * 60,
                    type,
                });
            }
        };

        const loop = (timestamp: number) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (timestamp - lastSpawnRef.current > 18) {
                spawn();
                lastSpawnRef.current = timestamp;
            }

            const mouse = mouseRef.current;
            const particles = particlesRef.current;

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.life++;

                // Gentle gravity pull toward cursor
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;

                if (dist > 40) {
                    const force = Math.min(80 / (dist * dist), 0.25);
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }

                // Damping
                p.vx *= 0.96;
                p.vy *= 0.96;
                p.x += p.vx;
                p.y += p.vy;

                const progress = p.life / p.maxLife;
                const fadeIn = Math.min(progress * 6, 1);
                const fadeOut = 1 - progress;
                const a = p.alpha * fadeIn * fadeOut;

                if (a <= 0.005) {
                    particles.splice(i, 1);
                    continue;
                }

                ctx.save();
                ctx.globalCompositeOperation = 'screen';

                if (p.type === 'orb') {
                    const r = p.radius * (1 + progress * 0.6);
                    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.5);
                    g.addColorStop(0, `hsla(${p.hue}, ${p.saturation}%, 90%, ${a})`);
                    g.addColorStop(0.3, `hsla(${p.hue}, ${p.saturation}%, 70%, ${a * 0.6})`);
                    g.addColorStop(0.7, `hsla(${p.hue + 20}, ${p.saturation - 10}%, 55%, ${a * 0.2})`);
                    g.addColorStop(1, `hsla(${p.hue}, ${p.saturation}%, 40%, 0)`);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, r * 3.5, 0, Math.PI * 2);
                    ctx.fillStyle = g;
                    ctx.fill();

                } else if (p.type === 'spark') {
                    const len = p.radius * 3 * (1 - progress * 0.5);
                    ctx.strokeStyle = `hsla(${p.hue}, ${p.saturation}%, 88%, ${a})`;
                    ctx.lineWidth = p.radius * 0.6;
                    ctx.lineCap = 'round';
                    ctx.shadowColor = `hsla(${p.hue}, ${p.saturation}%, 80%, ${a})`;
                    ctx.shadowBlur = 6;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x - p.vx * len, p.y - p.vy * len);
                    ctx.stroke();

                } else {
                    // ring — expanding ring
                    const r = p.radius * (1 + progress * 2.5);
                    ctx.strokeStyle = `hsla(${p.hue}, ${p.saturation}%, 85%, ${a * 0.7})`;
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                    ctx.stroke();
                }

                ctx.restore();
                if (p.life >= p.maxLife) particles.splice(i, 1);
            }

            // Keep pool tight
            if (particles.length > 200) particles.splice(0, particles.length - 200);

            rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMouseMove);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 9999,
            }}
        />
    );
};

export default CursorParticles;
