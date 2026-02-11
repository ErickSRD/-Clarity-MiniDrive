import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FileCard from '../components/FileCard'

describe('FileCard', () => {
  it('renders name and metadata', () => {
    render(<FileCard name="hello.txt" type="text/plain" size={123} />)
    expect(screen.getByText('hello.txt')).toBeDefined()
    expect(screen.getByText(/text\/plain/)).toBeDefined()
  })
})
