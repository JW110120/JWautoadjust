import { useRef, useState, useEffect, useCallback } from 'react';

export const useScrollPosition = () => {
    const ref = useRef<HTMLDivElement | null>(null);
    const [scrollPosition, setScrollPosition] = useState(0);

    const handleScroll = useCallback(() => {
        if (ref.current) {
            setScrollPosition(ref.current.scrollTop);
        }
    }, []);

    useEffect(() => {
        if (ref.current) {
            ref.current.scrollTop = scrollPosition;
        }
    }, [scrollPosition]);

    useEffect(() => {
        const element = ref.current;
        if (element) {
            element.addEventListener('scroll', handleScroll);
            return () => {
                element.removeEventListener('scroll', handleScroll);
            };
        }
    }, [handleScroll]);

    return { ref, scrollPosition, setScrollPosition };
};