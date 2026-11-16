import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('StockWise app shell', () => {
  function stubApi() {
    vi.stubGlobal('fetch', vi.fn((url) => Promise.resolve({
      ok: true,
      json: async () => url === '/api/dashboard'
        ? { productCount: 2, lowStockCount: 1, movementsToday: 3, lowStockItems: [], recentMovements: [] }
        : [],
    })))
  }

  it('shows the inventory overview and primary navigation', () => {
    stubApi()
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Inventory overview' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Products' })).toBeInTheDocument()
  })

  it('opens the product catalog from the navigation', async () => {
    stubApi()
    render(<App />)

    const navigation = screen.getByRole('navigation', { name: 'Main navigation' })
    fireEvent.click(within(navigation).getByRole('button', { name: 'Products' }))

    expect(screen.getByRole('heading', { name: 'Products' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Catalog' })).toBeInTheDocument()
    expect(await screen.findByText('Your catalog is empty')).toBeInTheDocument()
  })

  it('shows live dashboard metrics returned by the API', async () => {
    stubApi()
    render(<App />)

    expect(await screen.findByText('At or below their reorder level')).toBeInTheDocument()
    expect(screen.getByText('3', { selector: '.metric-value' })).toBeInTheDocument()
  })
})
