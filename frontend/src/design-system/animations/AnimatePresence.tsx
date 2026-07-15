import { AnimatePresence as FramerAnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import {
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  scaleIn,
  slideInFromLeft,
  slideInFromRight,
  slideInFromTop,
  slideInFromBottom,
} from './index'

export { FramerAnimatePresence as AnimatePresence }

interface TransitionWrapperProps {
  show: boolean
  children: ReactNode
  variant?: 'fade' | 'slide' | 'scale'
  side?: 'top' | 'bottom' | 'left' | 'right'
}

function getSlideVariant(side: 'top' | 'bottom' | 'left' | 'right') {
  switch (side) {
    case 'top':
      return slideInFromTop
    case 'bottom':
      return slideInFromBottom
    case 'left':
      return slideInFromLeft
    case 'right':
      return slideInFromRight
  }
}

function getFadeVariant(side: 'top' | 'bottom' | 'left' | 'right') {
  switch (side) {
    case 'top':
      return fadeInDown
    case 'bottom':
      return fadeInUp
    case 'left':
      return fadeInLeft
    case 'right':
      return fadeInRight
  }
}

function getVariants(
  variant: 'fade' | 'slide' | 'scale',
  side: 'top' | 'bottom' | 'left' | 'right'
) {
  switch (variant) {
    case 'fade':
      return getFadeVariant(side)
    case 'slide':
      return getSlideVariant(side)
    case 'scale':
      return scaleIn
  }
}

export function FadeTransition({
  show,
  children,
  side = 'bottom',
}: Omit<TransitionWrapperProps, 'variant'>) {
  return (
    <FramerAnimatePresence>
      {show && (
        <motion.div
          variants={getFadeVariant(side)}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {children}
        </motion.div>
      )}
    </FramerAnimatePresence>
  )
}

export function SlideTransition({
  show,
  children,
  side = 'right',
}: Omit<TransitionWrapperProps, 'variant'>) {
  return (
    <FramerAnimatePresence>
      {show && (
        <motion.div
          variants={getSlideVariant(side)}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {children}
        </motion.div>
      )}
    </FramerAnimatePresence>
  )
}

export function ScaleTransition({
  show,
  children,
}: Omit<TransitionWrapperProps, 'variant' | 'side'>) {
  return (
    <FramerAnimatePresence>
      {show && (
        <motion.div
          variants={scaleIn}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {children}
        </motion.div>
      )}
    </FramerAnimatePresence>
  )
}

export function TransitionWrapper({
  show,
  children,
  variant = 'fade',
  side = 'bottom',
}: TransitionWrapperProps) {
  const variants = getVariants(variant, side)

  return (
    <FramerAnimatePresence>
      {show && (
        <motion.div
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {children}
        </motion.div>
      )}
    </FramerAnimatePresence>
  )
}
