declare global {
  interface Window {
    goatcounter?: {
      count: (opts: { path: string; title: string; event: true }) => void;
    };
  }
}

export {};

