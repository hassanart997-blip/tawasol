import { useState, useEffect, useRef, useCallback } from 'react';

function useInfiniteScroll(callback) {
  const [isFetching, setIsFetching] = useState(false);
  const observerRef = useRef(null);

  const lastElementRef = useCallback(node => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !isFetching) {
        setIsFetching(true);
      }
    });
    if (node) observerRef.current.observe(node);
  }, [isFetching]);

  useEffect(() => {
    if (!isFetching) return;
    callback(() => setIsFetching(false));
  }, [isFetching]);

  return { isFetching, lastElementRef };
}

export default useInfiniteScroll;
