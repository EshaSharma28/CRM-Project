import { useState, useEffect } from "react";

export default function CountUp({ value, formatter }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const end = parseFloat(value);
    if (isNaN(end)) return;
    
    const duration = 1000;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // ease-out-expo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(easeProgress * end);
      
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplay(end);
      }
    };
    window.requestAnimationFrame(step);
  }, [value]);

  if (formatter) {
    return <>{formatter(display)}</>;
  }
  return <>{Math.floor(display).toLocaleString()}</>;
}
