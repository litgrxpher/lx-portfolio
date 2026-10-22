import { motion } from 'framer-motion'

const ease = [0.2, 0.7, 0.2, 1]

// Letter-by-letter rise (used for the big hero names)
export function Chars({ text, delay = 0 }) {
  return (
    <>
      {[...text].map((ch, i) => (
        <span className="cw" key={i} aria-hidden="true">
          <motion.span
            className="ci"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, ease, delay: delay + i * 0.07 }}
          >
            {ch}
          </motion.span>
        </span>
      ))}
    </>
  )
}

// Word-by-word rise when scrolled into view
export function Words({ text, as: Tag = 'span', className = '', delay = 0 }) {
  const words = text.split(' ')
  return (
    <Tag className={className} aria-label={text}>
      {words.map((w, i) => (
        <span className="w" key={i} aria-hidden="true">
          <motion.span
            className="wi"
            initial={{ y: '108%' }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, margin: '0px 0px -8% 0px' }}
            transition={{ duration: 0.85, ease, delay: delay + i * 0.06 }}
          >
            {w}
          </motion.span>
          {i < words.length - 1 ? '\u00A0' : ''}
        </span>
      ))}
    </Tag>
  )
}

// Fade and lift when scrolled into view
export function FadeUp({ children, delay = 0, className = '', as = 'div' }) {
  const Comp = motion[as]
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.8, ease, delay }}
    >
      {children}
    </Comp>
  )
}
