// AtmosphericLighting.tsx
// Renders a dynamic, mouse-tracking lighting effect with a vignette overlay.
// Used to create the "lantern in the dark" atmosphere.

import { useRef } from 'react';
import { motion, useSpring, useMotionTemplate } from 'framer-motion';
import { useEffect } from 'react';

export default function AtmosphericLighting() {
    const ref = useRef<HTMLDivElement>(null);

    // Configure spring physics to simulate a heavy, drifting lantern
    const springConfig = { damping: 25, stiffness: 150, mass: 0.5 };

    // Initial position (center of screen)
    const startX = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
    const startY = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;

    const mouseX = useSpring(startX, springConfig);
    const mouseY = useSpring(startY, springConfig);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };

        const handleMouseLeave = () => {
            // Animate back to center on leave
            mouseX.set(window.innerWidth / 2);
            mouseY.set(window.innerHeight / 2);
        };

        window.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseleave', handleMouseLeave);

        // Force jump to initial pos on mount to ensure no "slide" from 0
        mouseX.jump(startX);
        mouseY.jump(startY);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [mouseX, mouseY, startX, startY]);

    // Dynamic gradient background:
    // transparent 10% = Lit area
    // rgba(12, 10, 9, 0.85) at 100% = Vignette (Stone-950)
    const background = useMotionTemplate`radial-gradient(circle 600px at ${mouseX}px ${mouseY}px, transparent 10%, rgba(12, 10, 9, 0.85) 100%)`;

    return (
        <motion.div
            ref={ref}
            className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
            style={{ background }}
        />
    );
}
