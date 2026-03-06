import React, { useEffect, useRef } from 'react';


interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    alpha: number;
    hue: number;
    life: number;
    maxLife: number;
}

const CursorParticles: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: -1000, y: -1000 });
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
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };
        window.addEventListener('mousemove', onMouseMove);

        const spawnParticle = () => {
            const spread = 12;
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.4 + Math.random() * 1.2;
            particlesRef.current.push({
                x: mouseRef.current.x + (Math.random() - 0.5) * spread,
                y: mouseRef.current.y + (Math.random() - 0.5) * spread,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 1.5 + Math.random() * 2.5,
                alpha: 0.8 + Math.random() * 0.2,
                hue: 200 + Math.random() * 40, // blue-cyan range
                life: 0,
                maxLife: 60 + Math.random() * 60,
            });
        };

        const loop = (timestamp: number) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Spawn particles
            if (timestamp - lastSpawnRef.current > 16) {
                spawnParticle();
                spawnParticle();
                lastSpawnRef.current = timestamp;
            }

            const mouse = mouseRef.current;
            const particles = particlesRef.current;

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.life++;

                // Gravity pull toward cursor
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const force = Math.min(150 / (dist * dist), 0.6);
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;

                // Damping
                p.vx *= 0.94;
                p.vy *= 0.94;

                p.x += p.vx;
                p.y += p.vy;

                const progress = p.life / p.maxLife;
                const alpha = p.alpha * (1 - progress);

                // Glow + core
                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
                gradient.addColorStop(0, `hsla(${p.hue}, 90%, 70%, ${alpha})`);
                gradient.addColorStop(0.5, `hsla(${p.hue}, 80%, 55%, ${alpha * 0.5})`);
                gradient.addColorStop(1, `hsla(${p.hue}, 70%, 40%, 0)`);

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                if (p.life >= p.maxLife) {
                    particles.splice(i, 1);
                }
            }

            // Limit total particles
            if (particles.length > 180) {
                particles.splice(0, particles.length - 180);
            }

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
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 9999,
            }}
        />
    );
};

export default CursorParticles;
