import React from 'react'

export default function Input({ className = '', ...props }: any) {
  const merged = `input-glass ${className}`.trim()
  return <input className={merged} {...props} />
}
