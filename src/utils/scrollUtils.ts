import { useRef, useState, useEffect, useCallback } from 'react';

export const useScrollPosition = (preserveOnUpdate = false) => {
    const ref = useRef<HTMLDivElement | null>(null);
    const [scrollPosition, setScrollPosition] = useState(0);
    const lastScrollPosition = useRef(0);

    const handleScroll = useCallback(() => {
        if (ref.current) {
            const position = ref.current.scrollTop;
            setScrollPosition(position);
            lastScrollPosition.current = position;
        }
    }, []);

    useEffect(() => {
        if (ref.current && preserveOnUpdate) {
            ref.current.scrollTop = lastScrollPosition.current;
        }
    }); // 在每次更新后恢复滚动位置

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