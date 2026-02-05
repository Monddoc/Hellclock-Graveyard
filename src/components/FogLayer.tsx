// FogLayer.tsx
// Renders a dual-layer scrolling fog effect using Framer Motion.
// Adds depth and movement to the background.

import { motion } from 'framer-motion';

export default function FogLayer() {
    const FOG_IMAGE = 'https://static.vecteezy.com/system/resources/thumbnails/047/309/383/small/isolate-realistic-white-fog-on-transparent-backgrounds-specials-effect-3d-render-png.png';

    // Gradient mask to soften horizontal edges, determining visibility fade
    const maskStyle = {
        maskImage: 'linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)'
    };

    return (
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-10 h-[30vh] overflow-hidden select-none">
            {/* Scroll Track - Moving Left */}
            <motion.div
                className="flex h-full w-[200vw]" // Double width for sliding
                animate={{ x: ['0%', '-50%'] }} // Move 1 full viewport width (50% of this container)
                transition={{
                    repeat: Infinity,
                    ease: 'linear',
                    duration: 40,
                }}
            >
                {/* Child 1 */}
                <div
                    className="h-full w-[100vw] shrink-0 bg-bottom bg-no-repeat opacity-20 mix-blend-screen"
                    style={{
                        backgroundImage: `url('${FOG_IMAGE}')`,
                        backgroundSize: '100% 100%',
                        ...maskStyle
                    }}
                />
                {/* Child 2 (Clone) */}
                <div
                    className="h-full w-[100vw] shrink-0 bg-bottom bg-no-repeat opacity-20 mix-blend-screen"
                    style={{
                        backgroundImage: `url('${FOG_IMAGE}')`,
                        backgroundSize: '100% 100%',
                        ...maskStyle
                    }}
                />
            </motion.div>

            {/* Second Layer - Slower, Reverse Direction, Offset */}
            <motion.div
                className="absolute bottom-0 left-0 flex h-full w-[200vw]"
                initial={{ x: '-100%' }}
                animate={{ x: ['-100%', '0%'] }}
                transition={{
                    repeat: Infinity,
                    ease: 'linear',
                    duration: 60,
                }}
            >
                <div
                    className="h-full w-[100vw] shrink-0 bg-bottom bg-no-repeat opacity-20 mix-blend-screen"
                    style={{
                        backgroundImage: `url('${FOG_IMAGE}')`,
                        backgroundSize: '100% 100%',
                        ...maskStyle
                    }}
                />
                <div
                    className="h-full w-[100vw] shrink-0 bg-bottom bg-no-repeat opacity-20 mix-blend-screen"
                    style={{
                        backgroundImage: `url('${FOG_IMAGE}')`,
                        backgroundSize: '100% 100%',
                        ...maskStyle
                    }}
                />
            </motion.div>

            {/* Vertical Fade Mask (Top of fog) */}
            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-stone-950/20" />
        </div>
    );
}
