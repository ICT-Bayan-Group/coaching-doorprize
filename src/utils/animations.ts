export const wheelSpinVariants = {
  idle: { rotate: 0 },
  spinning: {
    rotate: 360 * 5,
    transition: {
      duration: 3,
      ease: "easeInOut"
    }
  }
};

export const scrollTextVariants = {
  hidden: { y: 100, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  },
  exit: {
    y: -100,
    opacity: 0,
    transition: {
      duration: 0.3
    }
  }
};

export const cardShuffleVariants = {
  initial: { scale: 0.8, rotateY: 180, opacity: 0 },
  animate: {
    scale: 1,
    rotateY: 0,
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: "backOut"
    }
  },
  exit: {
    scale: 0.8,
    rotateY: -180,
    opacity: 0,
    transition: {
      duration: 0.5
    }
  }
};
