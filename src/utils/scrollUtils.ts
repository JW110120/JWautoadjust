import { useRef, useState, useEffect, useCallback } from 'react';

export const useScrollPosition = () => {
    const ref = useRef<HTMLDivElement | null>(null);
    const [scrollPosition, setScrollPosition] = useState(0);
    const scrollTimeout = useRef<NodeJS.Timeout>();

    const handleScroll = useCallback(() => {
        if (ref.current) {
            setScrollPosition(ref.current.scrollTop);
        }
    }, []);

    useEffect(() => {
        const element = ref.current;
        if (element) {
            element.addEventListener('scroll', handleScroll);
            return () => {
                if (scrollTimeout.current) {
                    clearTimeout(scrollTimeout.current);
                }
                element.removeEventListener('scroll', handleScroll);
            };
        }
    }, [handleScroll]);


    return { ref, scrollPosition, setScrollPosition };
};