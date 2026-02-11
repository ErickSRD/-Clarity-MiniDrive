import React from 'react'

export default function Button({ children, variant = 'primary', className = '', ...props }: any) {
  const cls = variant === 'primary' ? 'pill-btn primary' : 'pill-btn secondary'
  const merged = `${cls} ${className}`.trim()
  return (
    <button className={merged} {...props}>{children}</button>
  )
}
